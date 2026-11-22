// "Ask": answers a question from sources the app gathers (Wikipedia articles and research abstracts),
// using Claude through the official Anthropic SDK. Runs entirely in the browser with the user's own
// API key, which is sent only to api.anthropic.com.

import * as api from './api.js';

const MODEL = 'claude-opus-5-5';
const KEY = 'rexx-anthropic-key';
let sessionKey = '';

const SYSTEM = `You answer questions for students and researchers using rexx.space, a knowledge app.
The user's message contains source documents gathered for the question: encyclopedia articles and research paper abstracts.
Base your answer on those sources and cite them. Where the sources don't cover part of the question, say so plainly; if you add general knowledge, label it as not from the sources.
Answer in the language of the question. Start with a direct answer in one or two sentences, then give the key details. Use short paragraphs, and a bulleted list where it helps. Keep it under about 350 words unless the question needs more.`;

export function getKey() {
  if (sessionKey) return sessionKey;
  try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
}

export function setKey(key, remember) {
  sessionKey = key.trim();
  try {
    if (remember && sessionKey) localStorage.setItem(KEY, sessionKey);
    else localStorage.removeItem(KEY);
  } catch { /* storage blocked: the key lasts for this visit only */ }
}

export function forgetKey() { setKey('', false); }

/** Collect sources for a question: the best-matching Wikipedia articles (full text) and paper abstracts. */
export async function gatherSources(question, onProgress = () => {}) {
  const sources = [];
  onProgress('Searching Wikipedia…');
  const hits = await api.wikiSearch(question, 4).catch(() => []);
  const texts = await Promise.all(hits.slice(0, 3).map(async (h) => {
    const text = await api.wikiFullText(h.title).catch(() => '');
    return { kind: 'Encyclopedia article', title: h.title, url: `https://${api.getLang()}.wikipedia.org/wiki/${encodeURIComponent(h.title.replace(/ /g, '_'))}`, text: text.slice(0, 14000) };
  }));
  sources.push(...texts.filter((t) => t.text));
  onProgress('Searching research papers…');
  const ps = await api.papers(question, { per: 4 }).catch(() => ({ items: [] }));
  for (const p of ps.items.filter((x) => x.abstract).slice(0, 3)) {
    sources.push({
      kind: 'Research paper abstract',
      title: `${p.title} (${p.authors[0] || 'Unknown'}${p.authors.length > 1 ? ' et al.' : ''}, ${p.year || 'n.d.'})`,
      url: p.url,
      text: `${p.title}. ${p.venue ? `${p.venue}. ` : ''}${p.year || ''}.\n\n${p.abstract}`,
    });
  }
  return sources;
}

/**
 * Stream an answer. onText receives text as it arrives. Resolves with the final message,
 * whose text blocks carry citations pointing back into `sources` by document_index.
 */
export async function answer(question, sources, onText, signal) {
  const { default: Anthropic } = await import('./vendor/anthropic-sdk.js');
  const client = new Anthropic({ apiKey: getKey(), dangerouslyAllowBrowser: true });
  const docs = sources.map((s) => ({
    type: 'document',
    source: { type: 'text', media_type: 'text/plain', data: s.text },
    title: s.title,
    context: `${s.kind}. ${s.url}`,
    citations: { enabled: true },
  }));
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    // If Claude Opus 5.5's safety classifier declines, the API retries on a suitable fallback model.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium' },
    system: SYSTEM,
    messages: [{ role: 'user', content: [...docs, { type: 'text', text: question }] }],
  }, { signal });
  stream.on('text', onText);
  return stream.finalMessage();
}

/** Turn an SDK error into a sentence the user can act on. */
export async function explainError(err) {
  const { default: Anthropic } = await import('./vendor/anthropic-sdk.js');
  if (err instanceof Anthropic.AuthenticationError) return 'Your API key wasn\'t accepted. Check that you copied the whole key, or create a new one in the Claude Console.';
  if (err instanceof Anthropic.PermissionDeniedError) return 'This API key doesn\'t have permission to use the model. Check your organization\'s settings in the Claude Console.';
  if (err instanceof Anthropic.RateLimitError) return 'Too many requests for this key right now. Wait a minute and ask again.';
  if (err instanceof Anthropic.BadRequestError) return `The request was rejected: ${err.message}. If this mentions credit or billing, add credit in the Claude Console.`;
  if (err instanceof Anthropic.APIUserAbortError) return 'Stopped.';
  if (err instanceof Anthropic.APIConnectionError) return 'Couldn\'t reach the Claude API. Check your connection and try again.';
  if (err instanceof Anthropic.APIError) return `The Claude API returned an error (${err.status}). Try again in a moment.`;
  return err?.message || 'Something went wrong.';
}
