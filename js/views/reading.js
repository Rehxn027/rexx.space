// In-app reading: full wiki articles, a reader view for any web page, paper pages with full text,
// discussion threads, profiles, book pages, video, and image / earthquake detail panels.
import * as api from '../api.js';
import * as vault from '../vault.js';
import { getKey, summarizeArticle, explainError } from '../ask.js';
import { html, raw, esc, $, ago, compact, toast, slot, card, miniMarkdown } from '../ui.js';
import { sanitizeHTML, renderMarkdown, jatsToHTML, toInternal } from '../links.js';
import { openCite, paperRecord } from './cite-dialog.js';
import { paperHTML, wirePapers } from './research.js';

const enc = encodeURIComponent;
const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };
const minutes = (text) => Math.max(1, Math.round(text.split(/\s+/).length / 230));
const SITE_NAMES = { wikipedia: 'Wikipedia', wikivoyage: 'Wikivoyage', wiktionary: 'Wiktionary', commons: 'Wikimedia Commons' };
const loading = '<div class="skel"></div><div class="skel"></div><div class="skel"></div><div class="skel"></div>';

/** In-page section links inside rendered articles (see data-anchor in links.js). */
export function wireAnchors(root) {
  root.addEventListener('click', (e) => {
    const a = e.target.closest('[data-anchor]');
    if (!a) return;
    e.preventDefault();
    const id = a.dataset.anchor;
    const el = root.querySelector(`[id="${CSS.escape(id)}"]`) || root.querySelector(`[id="${CSS.escape(id.replace(/ /g, '_'))}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

/** A table of contents built from the article's section headings. */
function tocHTML(root) {
  const hs = [...root.querySelectorAll('h2')].filter((h) => h.textContent.trim());
  if (hs.length < 3) return '';
  hs.forEach((h, i) => { if (!h.id) h.id = `sec-${i}`; });
  return `<details class="toc"><summary>Contents</summary><ol>${hs.map((h) => `<li><a href="#" data-anchor="${esc(h.id)}">${esc(h.textContent.trim())}</a></li>`).join('')}</ol></details>`;
}

/* ───────────── Wikipedia, Wikivoyage, Wiktionary, Commons ───────────── */

export async function articleView(view, arg, { refreshVaultCount }) {
  const [site = 'wikipedia', lang = api.getLang(), ...rest] = arg.split('/');
  const [rawTitle, anchor] = decodeURIComponent(rest.join('/')).split('#');
  const title = rawTitle.replace(/_/g, ' ');
  const vid = site === 'wikipedia' ? vault.idFor(lang, title) : `${site}:${lang}:${title}`;
  view.innerHTML = `<article class="reader wide-reader">${loading}</article>`;
  document.title = `${title} — rexx.space`;
  const saved = await vault.get(vid).catch(() => null);

  let bodyHTML = '', sourceUrl = '', fromVault = false;
  try {
    const r = await api.wikiArticleHTML(site, lang, title);
    bodyHTML = sanitizeHTML(r.html, { base: `https://${r.host}/wiki/`, wikiRoute: (t) => `#/article/${site}/${lang}/${enc(t)}` });
    sourceUrl = r.url;
  } catch {
    if (saved) { bodyHTML = saved.html || saved.text?.split(/\n+/).map((l) => `<p>${esc(l)}</p>`).join('') || ''; sourceUrl = saved.url; fromVault = true; }
  }
  if (!bodyHTML) {
    view.innerHTML = html`<section class="empty"><h2>Couldn't open “${title}”.</h2><p class="muted">${navigator.onLine ? `${SITE_NAMES[site] || 'The wiki'} didn't respond, or there's no page with that name.` : 'You\'re offline and this article isn\'t in your Vault.'}</p></section>`;
    return;
  }
  view.innerHTML = html`<article class="reader wide-reader">
    <span class="badge">${SITE_NAMES[site] || site} · ${lang.toUpperCase()}${fromVault ? ' · from your Vault' : ''}</span>
    <h2>${title}</h2>
    <div class="actions">
      <button id="asave" class="${saved ? 'saved' : ''}">${saved ? '✓ In your Vault' : '⬇ Save for offline'}</button>
      <button class="ghost" id="acite">Cite</button>
      ${site === 'wikipedia' ? raw(html`<a class="ghost btn" href="#/q/${enc(title)}">Topic overview</a>`) : ''}
      <a class="ghost btn" href="#/ask/${enc(`Explain ${title}`)}">Ask about this</a>
    </div>
    <div id="atoc"></div>
    <div class="prose article-body" id="abody">${raw(bodyHTML)}</div>
    <p class="meta credit">Text from ${SITE_NAMES[site] || site}, available under CC BY-SA 4.0. Images have their own licences.</p>
  </article>`;
  const body = $('#abody');
  $('#atoc').innerHTML = tocHTML(body);
  wireAnchors(view);
  if (anchor) setTimeout(() => body.querySelector(`[id="${CSS.escape(anchor)}"]`)?.scrollIntoView({ block: 'start' }), 50);
  $('#acite').addEventListener('click', () => openCite({ kind: 'web', title, container: SITE_NAMES[site] || site, publisher: 'Wikimedia Foundation', url: sourceUrl }));
  $('#asave').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (btn.classList.contains('saved')) { await vault.remove(vid); btn.classList.remove('saved'); btn.textContent = '⬇ Save for offline'; toast('Removed from your Vault.'); }
    else {
      await vault.put({ id: vid, title, lang, description: SITE_NAMES[site], url: sourceUrl, html: body.innerHTML, text: body.innerText.slice(0, 200000), site });
      btn.classList.add('saved'); btn.textContent = '✓ In your Vault'; toast('Saved with its images\' text and tables. Readable offline.');
    }
    refreshVaultCount();
  });
}

/* ───────────── Reader view for any web page ───────────── */

export async function readerView(view, arg, { refreshVaultCount }) {
  const url = decodeURIComponent(arg);
  const inside = toInternal(url);
  if (inside && !inside.startsWith('#/reader/')) { location.replace(inside); return; }
  const host = hostOf(url);
  const vid = `web:${url}`;
  view.innerHTML = html`<article class="reader"><span class="badge">Reader view · ${host}</span>${raw(loading)}</article>`;
  const saved = await vault.get(vid).catch(() => null);
  let page = saved ? { title: saved.title, markdown: saved.markdown, published: saved.published, source: url } : null;
  if (!page) {
    try { page = await api.readUrl(url); } catch { page = null; }
  }
  const original = html`<a href="${url}" target="_blank" rel="noopener" data-external="1">Open the original page ↗</a>`;
  if (!page) {
    view.innerHTML = html`<article class="reader">
      <span class="badge">Reader view · ${host}</span>
      <h2>This page couldn't be loaded into the app</h2>
      <p class="muted">${navigator.onLine ? `${host} may block reading tools, need a subscription, or be temporarily down.` : 'You\'re offline and this page isn\'t saved in your Vault.'}</p>
      <div class="actions"><button id="rsum">Summarize with Claude</button></div>
      <div class="summary" id="rsumout" hidden></div>
      <p class="meta credit">${raw(original)}</p>
    </article>`;
    wireSummary(url, host, host);
    return;
  }
  const title = page.title || host;
  document.title = `${title} — rexx.space`;
  const bodyHTML = renderMarkdown(page.markdown, page.source || url);
  view.innerHTML = html`<article class="reader">
    <span class="badge">Reader view · ${host}${saved ? ' · from your Vault' : ''}</span>
    <h2>${title}</h2>
    <p class="meta">${page.published ? `${new Date(page.published).toLocaleDateString('en', { dateStyle: 'medium' })} · ` : ''}${minutes(page.markdown)} min read</p>
    <div class="actions">
      <button id="rsave" class="${saved ? 'saved' : ''}">${saved ? '✓ In your Vault' : '⬇ Save for offline'}</button>
      <button class="ghost" id="rsum">Summarize</button>
      <button class="ghost" id="rcite2">Cite</button>
      <a class="ghost btn" href="#/ask/${enc(`What does this article say? ${url}`)}">Ask about this</a>
    </div>
    <div class="summary" id="rsumout" hidden></div>
    <div class="prose web-body">${raw(bodyHTML)}</div>
    <p class="meta credit">Text from ${host}, shown in a reading view so you can stay in the app. ${raw(original)}</p>
  </article>`;
  wireSummary(url, title, host);
  $('#rcite2').addEventListener('click', () => openCite({ kind: 'web', title, container: host, date: page.published ? new Date(page.published).toISOString() : null, url }));
  $('#rsave').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (btn.classList.contains('saved')) { await vault.remove(vid); btn.classList.remove('saved'); btn.textContent = '⬇ Save for offline'; toast('Removed from your Vault.'); }
    else { await vault.put({ id: vid, kind: 'web', title, description: host, url, markdown: page.markdown, published: page.published }); btn.classList.add('saved'); btn.textContent = '✓ In your Vault'; toast('Saved. Readable offline.'); }
    refreshVaultCount();
  });
}

function wireSummary(url, title, host) {
  $('#rsum')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget, box = $('#rsumout');
    box.hidden = false;
    if (!getKey()) { box.innerHTML = '<p class="muted">Summaries are written by Claude. Add your Anthropic API key on the <a href="#/ask">Ask</a> page first.</p>'; return; }
    btn.disabled = true; btn.textContent = 'Reading…'; box.className = 'summary streaming'; box.innerHTML = '';
    let text = '';
    try {
      const msg = await summarizeArticle(url, title, (d) => { text += d; box.innerHTML = miniMarkdown(text); });
      box.className = 'summary';
      box.innerHTML = msg.stop_reason === 'refusal' ? '<p class="muted">Claude declined to summarize this page.</p>'
        : `${miniMarkdown(msg.content.filter((c) => c.type === 'text').map((c) => c.text).join(''))}<p class="meta">Summary by Claude of the page on ${esc(host)}.</p>`;
      btn.remove();
    } catch (err) { box.className = 'summary'; box.innerHTML = `<p class="error-text">${esc(await explainError(err))}</p>`; btn.disabled = false; btn.textContent = 'Summarize'; }
  });
}

/* ───────────── Papers ───────────── */

export async function paperView(view, arg, { refreshVaultCount }) {
  const key = decodeURIComponent(arg);
  view.innerHTML = `<article class="reader wide-reader">${loading}</article>`;
  let p = null;
  try { p = await api.paperByKey(key); } catch { /* fall back to what we already know */ }
  if (!p) { try { p = JSON.parse(sessionStorage.getItem(`rexx-paper:${key}`)); } catch { /* ignore */ } }
  if (!p) p = await vault.get(`paper:${key.replace(/^doi:/, '')}`).catch(() => null);
  if (!p) {
    view.innerHTML = html`<section class="empty"><h2>Couldn't load this paper.</h2><p class="muted">${navigator.onLine ? 'OpenAlex doesn\'t have a record for it, or didn\'t respond.' : 'You\'re offline and this paper isn\'t saved in your Vault.'}</p></section>`;
    return;
  }
  document.title = `${p.title} — rexx.space`;
  const canFull = !!(p.pmcid || p.arxiv || p.pdf || (p.oa && p.landing));
  const savedId = `paper:${p.doi || p.id}`;
  const saved = await vault.get(savedId).catch(() => null);
  view.innerHTML = html`<article class="reader wide-reader paper-page">
    <span class="badge">Research paper${p.type ? ` · ${p.type}` : ''}</span>
    <h2 class="paper-h">${p.title}</h2>
    <p class="lead">${p.authors.slice(0, 12).join(', ')}${p.authors.length > 12 ? ` and ${p.authors.length - 12} more` : ''}</p>
    <p class="meta">${p.venue || ''}${p.year ? ` · ${p.year}` : ''}${p.doi ? ` · doi:${p.doi}` : ''}</p>
    <span class="chips">${p.cited != null ? raw(html`<span class="chip">Cited by ${compact(p.cited)}</span>`) : ''}${p.oa ? raw('<span class="chip ok-chip">Free to read</span>') : ''}${(p.topics || []).map((t) => raw(html`<a class="chip" href="#/research/${enc(t)}">${t}</a>`))}</span>
    <div class="actions">
      ${canFull ? raw('<button id="pfull">📖 Read full text</button>') : ''}
      <button class="ghost ${saved ? 'saved' : ''}" id="psave">${saved ? '✓ Saved' : 'Save'}</button>
      <button class="ghost" id="pcite2">Cite</button>
      <a class="ghost btn" href="#/ask/${enc(`Explain the paper “${p.title}” in simple terms`)}">Ask about this</a>
    </div>
    <section class="prose"><h3>Abstract</h3>${p.abstract ? raw(html`<p>${p.abstract}</p>`) : raw('<p class="muted">No abstract is available for this paper.</p>')}</section>
    <section id="pfulltext" class="prose full-text" hidden></section>
    ${canFull ? '' : raw('<p class="meta">The full text of this paper isn\'t freely available, so only its abstract and details are shown.</p>')}
  </article>
  <div class="grid" id="pgrid"></div>`;
  $('#pcite2').addEventListener('click', () => openCite(paperRecord(p)));
  $('#psave').addEventListener('click', async (e) => {
    const b = e.currentTarget;
    await vault.put({ id: savedId, kind: 'paper', title: p.title, description: `${p.authors[0] || ''}${p.authors.length > 1 ? ' et al.' : ''}${p.year ? `, ${p.year}` : ''}`, lang: 'paper', ...p, fullText: $('#pfulltext').hidden ? saved?.fullText || '' : $('#pfulltext').innerHTML });
    b.textContent = '✓ Saved'; toast('Paper saved to your Vault.'); refreshVaultCount();
  });
  if (saved?.fullText) { const ft = $('#pfulltext'); ft.innerHTML = saved.fullText; ft.hidden = false; $('#pfull')?.remove(); }
  $('#pfull')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget, ft = $('#pfulltext');
    btn.disabled = true; btn.textContent = 'Loading full text…';
    ft.hidden = false; ft.innerHTML = loading;
    try {
      let out = '';
      if (p.pmcid) { try { out = jatsToHTML(await api.pmcFullText(p.pmcid)); } catch { /* try the next source */ } }
      if (!out && p.arxiv) { try { const r = await api.readUrl(`https://arxiv.org/abs/${p.arxiv}`.replace('/abs/', '/html/')); out = renderMarkdown(r.markdown, r.source); } catch { /* next */ } }
      if (!out) { const r = await api.readUrl(p.pdf || p.landing || p.url); out = renderMarkdown(r.markdown, r.source); }
      ft.innerHTML = `<h3>Full text</h3>${out}`;
      btn.remove();
    } catch {
      ft.innerHTML = '<p class="muted">The full text couldn\'t be loaded into the app. The publisher may block reading tools.</p>';
      btn.disabled = false; btn.textContent = '📖 Try again';
    }
  });

  // References, papers that cite this one, and related work: all open in the app.
  if (!p.openalex) return;
  const grid = $('#pgrid');
  grid.innerHTML = card(`📚 References (${p.references?.length || 0})`, null, { optional: true, cls: 'papers-card' }) + card('🔁 Cited by', null, { optional: true, cls: 'papers-card' }) + card('🧭 Related papers', null, { optional: true, cls: 'papers-card' });
  const [refEl, citEl, relEl] = grid.querySelectorAll('.card .body');
  const list = (el, items) => { if (!items.length) return ''; setTimeout(() => wirePapers(el, items, refreshVaultCount)); return html`<ol class="list papers compact-papers">${items.map((x, i) => raw(paperHTML(x, i)))}</ol>`; };
  slot(refEl, api.worksByIds(p.references || []), (items) => list(refEl, items));
  slot(citEl, api.citedBy(p.openalex, 10), (r) => { citEl.closest('.card').querySelector('h3').textContent = `🔁 Cited by ${compact(r.total)} papers (most cited shown)`; return list(citEl, r.items); });
  slot(relEl, api.worksByIds(p.related || []), (items) => list(relEl, items));
}

/* ───────────── Discussions ───────────── */

const avatar = (src) => (src ? html`<img class="av" src="${src}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<span class="av"></span>');

function commentHTML({ author, handle, avatarUrl, time, body, stats = '', children = '', op = false }) {
  return html`<div class="cmt ${op ? 'op' : ''}">
    <div class="cmt-head">${raw(avatar(avatarUrl))}<b>${author || 'unknown'}</b>${handle ? raw(html` <span class="meta-inline">@${handle}</span>`) : ''}${time ? raw(html` <span class="meta-inline">· ${ago(time)}</span>`) : ''}</div>
    <div class="cmt-body prose">${raw(body)}</div>
    ${stats ? raw(html`<div class="meta">${stats}</div>`) : ''}
    ${children ? raw(`<div class="cmt-children">${children}</div>`) : ''}
  </div>`;
}

export async function hnView(view, arg) {
  view.innerHTML = `<article class="reader wide-reader">${loading}</article>`;
  let item;
  try { item = await api.hnItem(decodeURIComponent(arg)); } catch {
    view.innerHTML = '<section class="empty"><h2>Couldn\'t load this discussion.</h2><p class="muted">Hacker News search didn\'t respond. Try again in a moment.</p></section>';
    return;
  }
  let count = 0;
  const render = (c, depth) => {
    if (!c.author || count > 400) return '';
    count++;
    const kids = depth < 8 ? (c.children || []).map((k) => render(k, depth + 1)).join('') : '';
    return commentHTML({ author: c.author, time: c.created_at_i * 1000, body: sanitizeHTML(`<p>${c.text || ''}</p>`, { base: 'https://news.ycombinator.com/' }), children: kids });
  };
  const comments = (item.children || []).map((c) => render(c, 0)).join('');
  document.title = `${item.title || 'Discussion'} — rexx.space`;
  view.innerHTML = html`<article class="reader wide-reader">
    <span class="badge">Hacker News discussion</span>
    <h2>${item.title || 'Comment'}</h2>
    <p class="meta">▲ ${item.points ?? 0} points · by ${item.author} · ${ago(item.created_at_i * 1000)} · ${count} comments</p>
    ${item.url ? raw(html`<div class="actions"><a class="btn" href="${toInternal(item.url) || item.url}">📖 Read the linked article in the app</a></div>`) : ''}
    ${item.text ? raw(`<div class="prose">${sanitizeHTML(`<p>${item.text}</p>`, { base: 'https://news.ycombinator.com/' })}</div>`) : ''}
    <section class="thread">${raw(comments || '<p class="muted">No comments yet.</p>')}</section>
  </article>`;
}

function bskyBody(post) {
  const rec = post.record || {};
  let body = `<p>${esc(rec.text || '').replace(/\n/g, '<br>')}</p>`;
  const emb = post.embed || {};
  const imgs = emb.images || emb.media?.images || [];
  if (imgs.length) body += `<div class="post-media">${imgs.map((i) => `<img src="${esc(i.thumb)}" alt="${esc(i.alt || '')}" loading="lazy" referrerpolicy="no-referrer">`).join('')}</div>`;
  const ext = emb.external || emb.media?.external;
  if (ext) body += `<a class="link-card" href="${esc(toInternal(ext.uri) || ext.uri)}"><b>${esc(ext.title || ext.uri)}</b><span>${esc((ext.description || '').slice(0, 200))}</span></a>`;
  return body;
}

export async function postView(view, arg) {
  const [net, ...rest] = arg.split('/');
  const id = decodeURIComponent(rest.join('/'));
  view.innerHTML = `<article class="reader wide-reader">${loading}</article>`;
  const fail = (what) => { view.innerHTML = html`<section class="empty"><h2>Couldn't load this post.</h2><p class="muted">${what} didn't respond, or the post was removed.</p></section>`; };
  let head = '', thread = '', label = '';
  try {
    if (net === 'bsky') {
      label = 'Bluesky';
      const t = await api.bskyThread(id);
      const node = (n, depth) => {
        if (!n?.post) return '';
        const p = n.post;
        const kids = depth < 6 ? (n.replies || []).sort((a, b) => (b.post?.likeCount || 0) - (a.post?.likeCount || 0)).slice(0, 40).map((r) => node(r, depth + 1)).join('') : '';
        return commentHTML({ author: p.author.displayName || p.author.handle, handle: p.author.handle, avatarUrl: p.author.avatar, time: Date.parse(p.record?.createdAt || p.indexedAt), body: bskyBody(p), stats: `♥ ${compact(p.likeCount || 0)} · ⟲ ${compact(p.repostCount || 0)} · 💬 ${compact(p.replyCount || 0)}`, children: kids });
      };
      const parents = [];
      for (let x = t.parent; x?.post && parents.length < 3; x = x.parent) parents.unshift(x);
      head = parents.map((x) => node({ post: x.post }, 9)).join('') + commentHTML({ author: t.post.author.displayName || t.post.author.handle, handle: t.post.author.handle, avatarUrl: t.post.author.avatar, time: Date.parse(t.post.record?.createdAt), body: bskyBody(t.post), stats: `♥ ${compact(t.post.likeCount || 0)} · ⟲ ${compact(t.post.repostCount || 0)} · 💬 ${compact(t.post.replyCount || 0)}`, op: true });
      thread = (t.replies || []).map((r) => node(r, 1)).join('');
    } else if (net === 'masto') {
      label = 'Mastodon';
      const t = await api.mastoThread(id);
      const body = (s) => sanitizeHTML(s.content, { base: s.url }) + (s.media_attachments?.length ? `<div class="post-media">${s.media_attachments.filter((m) => m.type === 'image').map((m) => `<img src="${esc(m.preview_url)}" alt="${esc(m.description || '')}" loading="lazy" referrerpolicy="no-referrer">`).join('')}</div>` : '');
      const one = (s, op, kids = '') => commentHTML({ author: s.account.display_name || s.account.username, handle: s.account.acct, avatarUrl: s.account.avatar, time: Date.parse(s.created_at), body: body(s), stats: `♥ ${compact(s.favourites_count)} · ⟲ ${compact(s.reblogs_count)} · 💬 ${compact(s.replies_count)}`, op, children: kids });
      const byParent = {};
      for (const d of t.descendants) (byParent[d.in_reply_to_id] ||= []).push(d);
      const tree = (pid, depth) => (byParent[pid] || []).map((d) => one(d, false, depth < 6 ? tree(d.id, depth + 1) : '')).join('');
      head = t.ancestors.slice(-3).map((a) => one(a, false)).join('') + one(t.status, true);
      thread = tree(t.status.id, 1);
    } else if (net === 'lemmy') {
      label = 'Lemmy';
      const t = await api.lemmyThread(id);
      const p = t.post;
      head = html`<h2>${p.post.name}</h2><p class="meta">!${p.community?.name} · by ${p.creator?.name} · ▲ ${compact(p.counts?.score)} · ${compact(p.counts?.comments)} comments</p>
        ${p.post.url ? raw(html`<div class="actions"><a class="btn" href="${toInternal(p.post.url) || p.post.url}">📖 Read the linked page in the app</a></div>`) : ''}
        ${p.post.body ? raw(`<div class="prose">${renderMarkdown(p.post.body, p.post.ap_id)}</div>`) : ''}`;
      const nodes = t.comments.map((c) => ({ c, path: c.comment.path.split('.').slice(1) }));
      const kids = (parentPath) => nodes.filter((n) => n.path.length === parentPath.length + 1 && n.path.slice(0, -1).join('.') === parentPath.join('.'))
        .map((n) => commentHTML({ author: n.c.creator?.name, avatarUrl: n.c.creator?.avatar, time: Date.parse(n.c.comment.published), body: renderMarkdown(n.c.comment.content, p.post.ap_id), stats: `▲ ${compact(n.c.counts?.score)}`, children: kids(n.path) })).join('');
      thread = kids([]);
    } else if (net === 'reddit') {
      label = 'Reddit';
      const t = await api.redditThread(id);
      const p = t.post;
      head = html`<h2>${p.title}</h2><p class="meta">${p.subreddit_name_prefixed} · by u/${p.author} · ▲ ${compact(p.score)} · ${compact(p.num_comments)} comments</p>
        ${p.url && !p.is_self ? raw(html`<div class="actions"><a class="btn" href="${toInternal(p.url) || p.url}">📖 Open the linked page in the app</a></div>`) : ''}
        ${p.selftext ? raw(`<div class="prose">${renderMarkdown(p.selftext, 'https://www.reddit.com/')}</div>`) : ''}`;
      const node = (c, depth) => commentHTML({ author: `u/${c.author}`, time: c.created_utc * 1000, body: renderMarkdown(c.body || '', 'https://www.reddit.com/'), stats: `▲ ${compact(c.score)}`,
        children: depth < 6 ? (c.replies?.data?.children || []).filter((k) => k.kind === 't1').map((k) => node(k.data, depth + 1)).join('') : '' });
      thread = t.comments.slice(0, 60).map((c) => node(c, 1)).join('');
    } else { fail('That network'); return; }
  } catch { fail(label || 'The network'); return; }
  view.innerHTML = html`<article class="reader wide-reader">
    <span class="badge">${label} discussion</span>
    <section class="thread thread-head">${raw(head)}</section>
    <h3 class="replies-h">Replies</h3>
    <section class="thread">${raw(thread || '<p class="muted">No replies yet.</p>')}</section>
  </article>`;
}

export async function profileView(view, arg) {
  const [net, ...rest] = arg.split('/');
  const handle = decodeURIComponent(rest.join('/'));
  view.innerHTML = `<article class="reader wide-reader">${loading}</article>`;
  try {
    if (net === 'bsky') {
      const { profile: p, feed } = await api.bskyProfile(handle);
      view.innerHTML = html`<article class="reader wide-reader">
        <span class="badge">Bluesky profile</span>
        <div class="profile-head">${raw(avatar(p.avatar))}<div><h2>${p.displayName || p.handle}</h2><p class="meta">@${p.handle} · ${compact(p.followersCount)} followers · ${compact(p.postsCount)} posts</p></div></div>
        ${p.description ? raw(html`<p class="lead">${p.description}</p>`) : ''}
        <h3 class="replies-h">Recent posts</h3>
        <section class="thread">${raw(feed.map((x) => `<a class="post-link" href="#/post/bsky/${enc(x.uri)}">${commentHTML({ author: x.author.displayName || x.author.handle, handle: x.author.handle, avatarUrl: x.author.avatar, time: Date.parse(x.record?.createdAt), body: bskyBody(x), stats: `♥ ${compact(x.likeCount || 0)} · 💬 ${compact(x.replyCount || 0)}` })}</a>`).join('') || '<p class="muted">No posts.</p>')}</section>
      </article>`;
    } else {
      const { account: a, statuses } = await api.mastoProfile(handle);
      view.innerHTML = html`<article class="reader wide-reader">
        <span class="badge">Mastodon profile</span>
        <div class="profile-head">${raw(avatar(a.avatar))}<div><h2>${a.display_name || a.username}</h2><p class="meta">@${a.acct} · ${compact(a.followers_count)} followers · ${compact(a.statuses_count)} posts</p></div></div>
        ${raw(`<div class="lead prose">${sanitizeHTML(a.note || '', { base: a.url })}</div>`)}
        <h3 class="replies-h">Recent posts</h3>
        <section class="thread">${raw(statuses.map((s) => `<a class="post-link" href="#/post/masto/${s.id}">${commentHTML({ author: s.account.display_name, handle: s.account.acct, avatarUrl: s.account.avatar, time: Date.parse(s.created_at), body: sanitizeHTML(s.content, { base: s.url }), stats: `♥ ${compact(s.favourites_count)} · 💬 ${compact(s.replies_count)}` })}</a>`).join('') || '<p class="muted">No public posts here.</p>')}</section>
      </article>`;
    }
  } catch {
    view.innerHTML = html`<section class="empty"><h2>Couldn't load this profile.</h2><p class="muted">The account may not exist, or the network didn't respond.</p></section>`;
  }
}

/* ───────────── Open Library books ───────────── */

export async function olBookView(view, arg) {
  const key = decodeURIComponent(arg);
  view.innerHTML = `<section class="entity"><div class="skel big"></div></section>`;
  let b;
  try { b = await api.olWork(key); } catch {
    view.innerHTML = '<section class="empty"><h2>Couldn\'t load this book.</h2><p class="muted">Open Library didn\'t respond. Try again in a moment.</p></section>';
    return;
  }
  document.title = `${b.title} — rexx.space`;
  view.innerHTML = html`<section class="entity book-head">
      ${b.cover ? raw(html`<img class="portrait cover" src="${b.cover}" alt="">`) : ''}
      <div class="entity-main">
        <span class="badge">Book · Open Library</span>
        <h2>${b.title}</h2>
        <p class="lead">${b.authors.join(', ') || 'Unknown author'}${b.year ? ` · first published ${b.year}` : ''}</p>
        <div class="actions">
          ${b.scan ? raw(html`<a class="btn" href="#/scan/${enc(b.scan)}">📖 Read the scanned book</a>`) : ''}
          <a class="ghost btn" href="#/library/${enc(b.title)}">Find free editions</a>
          <button class="ghost" id="olcite">Cite</button>
          <a class="ghost btn" href="#/ask/${enc(`What is the book “${b.title}” about?`)}">Ask about this</a>
        </div>
      </div>
    </section>
    <article class="reader">
      ${b.firstSentence ? raw(html`<blockquote>${b.firstSentence}</blockquote>`) : ''}
      ${b.description ? raw(`<div class="prose">${renderMarkdown(b.description, 'https://openlibrary.org/')}</div>`) : raw('<p class="muted">Open Library has no description for this book yet.</p>')}
      ${b.subjects.length ? raw(html`<h3>Subjects</h3><div class="tags">${b.subjects.map((s) => raw(html`<a href="#/archive/${enc(s)}">${s}</a>`))}</div>`) : ''}
      ${b.scan ? '' : raw('<p class="meta">This book is still under copyright or has no free scan, so it can\'t be read in the app.</p>')}
    </article>`;
  $('#olcite').addEventListener('click', () => openCite({ kind: 'book', title: b.title, authors: b.authors, year: Number(b.year) || null, container: 'Open Library', url: `https://openlibrary.org/works/${key}` }));
}

/* ───────────── Video ───────────── */

export async function videoView(view, arg) {
  const id = decodeURIComponent(arg).replace(/[^\w-]/g, '');
  view.innerHTML = html`<article class="reader wide-reader">
    <span class="badge">Video</span><h2 id="vtitle">Video</h2>
    <div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="Video player" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>
  </article>`;
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=${enc(`https://www.youtube.com/watch?v=${id}`)}&format=json`);
    const d = await r.json();
    $('#vtitle').textContent = d.title; $('.badge', view).textContent = `Video · ${d.author_name}`;
  } catch { /* the player still works without a title */ }
}

/* ───────────── Detail panels ───────────── */

function panel(inner, cls = '') {
  const dlg = document.createElement('dialog');
  dlg.className = `detail-dialog ${cls}`;
  dlg.innerHTML = `<button type="button" class="ghost close-x" aria-label="Close">✕</button>${inner}`;
  document.body.append(dlg);
  const close = () => { dlg.close(); dlg.remove(); };
  dlg.querySelector('.close-x').addEventListener('click', close);
  dlg.addEventListener('cancel', close);
  dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('a[href^="#/"]')) close(); });
  dlg.showModal();
  return dlg;
}

/** A Wikimedia Commons image, large, with its description, author and licence. */
export function openImage(m) {
  const dlg = panel(html`<figure class="image-view"><img src="${m.large || m.thumb}" alt="${m.title}">
    <figcaption><b>${m.title}</b>${m.description ? raw(html`<p>${m.description}</p>`) : ''}
    <span class="meta">${[m.author && `By ${m.author}`, m.license, m.date].filter(Boolean).join(' · ')}</span>
    ${m.page ? raw(html`<a class="more" href="${toInternal(m.page) || m.page}">Full file details</a>`) : ''}</figcaption></figure>`, 'image-dialog');
  // Fall back to the small preview if no large version exists.
  const img = dlg.querySelector('img');
  img.addEventListener('error', () => { if (m.thumb && img.src !== m.thumb) img.src = m.thumb; }, { once: true });
}

/** An earthquake: magnitude, depth, time, alerts, a map of the epicentre, and Wikipedia articles nearby. */
export function openQuake(q) {
  const d = 1.5;
  const dlg = panel(html`<h2><span class="mag m${Math.floor(q.mag)}">M${q.mag.toFixed(1)}</span> ${q.place || 'Earthquake'}</h2>
    <dl class="quake-facts">
      <dt>When</dt><dd>${new Date(q.time).toLocaleString('en', { dateStyle: 'full', timeStyle: 'short' })} (${ago(q.time)})</dd>
      <dt>Depth</dt><dd>${Math.round(q.depth)} km${q.depth < 70 ? ' (shallow)' : q.depth < 300 ? ' (intermediate)' : ' (deep)'}</dd>
      <dt>Location</dt><dd>${q.lat.toFixed(3)}°, ${q.lon.toFixed(3)}°</dd>
      ${q.felt ? raw(html`<dt>Felt reports</dt><dd>${compact(q.felt)} people reported feeling it</dd>`) : ''}
      ${q.alert ? raw(html`<dt>Impact alert</dt><dd>${q.alert.toUpperCase()} (USGS PAGER estimate)</dd>`) : ''}
      <dt>Tsunami</dt><dd>${q.tsunami ? '🌊 A tsunami message was issued for this event' : 'No tsunami message'}</dd>
    </dl>
    <iframe class="quake-map" title="Map of the epicentre" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=${q.lon - d},${q.lat - d / 2},${q.lon + d},${q.lat + d / 2}&layer=mapnik&marker=${q.lat},${q.lon}"></iframe>
    <h3>Places nearby</h3><div id="qnear"><div class="skel"></div></div>
    <p class="meta">Data from the US Geological Survey.</p>`, 'quake-dialog');
  slot(dlg.querySelector('#qnear'), api.nearby(q.lat, q.lon, 6).catch(() => []), (ns) => (ns.length ? html`<ul class="list">${ns.map((n) => raw(html`<li><a href="#/q/${enc(n.title)}">${n.title}</a> <span class="meta">${(n.dist / 1000).toFixed(1)} km away</span></li>`))}</ul>` : html`<p class="muted">No Wikipedia articles within 10 km. It may be offshore.</p>`));
}

