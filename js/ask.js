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
When web search is available, use it for recent events or anything the provided sources don't cover, and cite the web pages you use.
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

async function client() {
  const { default: Anthropic } = await import('./vendor/anthropic-sdk.js');
  return new Anthropic({ apiKey: getKey(), dangerouslyAllowBrowser: true });
}

/**
 * Stream one request, resuming if a server-side tool loop pauses (stop_reason "pause_turn").
 * Returns the last message with `content` holding every block from all continuations.
 */
async function streamWithResume(c, params, onText, signal) {
  const messages = [...params.messages];
  const blocks = [];
  let final;
  for (let i = 0; i < 4; i++) {
    const stream = c.beta.messages.stream({ ...params, messages }, { signal });
    stream.on('text', onText);
    final = await stream.finalMessage();
    blocks.push(...final.content);
    if (final.stop_reason !== 'pause_turn') break;
    // Re-send the paused turn as-is; the server picks up where it left off.
    messages.push({ role: 'assistant', content: final.content });
  }
  return { ...final, content: blocks };
}

/**
 * Stream an answer. onText receives text as it arrives. Resolves with the final message, whose
 * text blocks carry citations: document_index points into `sources`; web results carry a url.
 * With webSearch, Claude may also search the live web (billed per search on the user's account).
 */
export async function answer(question, sources, onText, signal, { webSearch = false } = {}) {
  const c = await client();
  const docs = sources.map((s) => ({
    type: 'document',
    source: { type: 'text', media_type: 'text/plain', data: s.text },
    title: s.title,
    context: `${s.kind}. ${s.url}`,
    citations: { enabled: true },
  }));
  return streamWithResume(c, {
    model: MODEL,
    max_tokens: 64000,
    // If Claude Opus 5.5's safety classifier declines, the API retries on a suitable fallback model.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium' },
    system: SYSTEM,
    ...(webSearch ? { tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }] } : {}),
    messages: [{ role: 'user', content: [...docs, { type: 'text', text: question }] }],
  }, onText, signal);
}

const SUMMARY_SYSTEM = `You summarize news articles for students and researchers.
Fetch the article at the URL you are given with the web_fetch tool, then summarize only what it says.
If the page can't be fetched, is behind a paywall, or doesn't contain the article, say so plainly and stop: never guess what an article says.
Write in the language of the article's headline. Format:
- One sentence: what happened.
- Three to five bullet points: the key facts, numbers, people and places.
- One short paragraph of context: why it matters or what came before, if the article gives it.
- Note any claims the article attributes to a single source or presents as disputed.
Keep it under 220 words.`;

/** Read a news article at `url` (fetched by Claude's web_fetch tool) and stream a summary. */
export async function summarizeArticle(url, title, onText, signal) {
  const c = await client();
  return streamWithResume(c, {
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system: SUMMARY_SYSTEM,
    tools: [{ type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 2 }],
    messages: [{ role: 'user', content: `Summarize this article.\nHeadline: ${title}\nURL: ${url}` }],
  }, onText, signal);
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
