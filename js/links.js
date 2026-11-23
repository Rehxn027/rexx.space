// Keeping people inside the app: map outside links to in-app pages, and render outside content safely.

import { esc } from './ui.js';

/** Platforms whose content can't be shown inside another app; links to them open in a new tab. */
const EXTERNAL_HOSTS = [
  'x.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'facebook.com', 'threads.net', 'linkedin.com',
  'console.anthropic.com', 'platform.claude.com', 'finnhub.io', 'github.com', 'open.spotify.com', 'scholar.google.com', 'news.google.com',
];

export const isExternalOnly = (url) => {
  try { const h = new URL(url).hostname.replace(/^www\./, ''); return EXTERNAL_HOSTS.some((d) => h === d || h.endsWith(`.${d}`)); } catch { return false; }
};

const enc = encodeURIComponent;

/**
 * The in-app route for an outside URL, or null if it must open outside.
 * Wikimedia articles, papers, books, discussions and videos get dedicated pages; anything else opens in
 * the in-app reader.
 */
export function toInternal(href) {
  let u;
  try { u = new URL(href, location.href); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  if (u.origin === location.origin) return null;
  if (isExternalOnly(u.href)) return null;
  const host = u.hostname.replace(/^(www|m)\./, '').replace('.m.', '.');
  const path = decodeURIComponent(u.pathname);
  let m;

  // Wikimedia wikis: read the article in the app.
  if ((m = /^([a-z-]+)\.(wikipedia|wikivoyage|wiktionary)\.org$/.exec(host)) && path.startsWith('/wiki/')) {
    return `#/article/${m[2]}/${m[1]}/${enc(path.slice(6))}${u.hash}`;
  }
  if (host === 'commons.wikimedia.org' && path.startsWith('/wiki/')) return `#/article/commons/commons/${enc(path.slice(6))}`;

  // Research papers.
  if (host === 'doi.org' || host === 'dx.doi.org') return `#/paper/doi:${enc(path.slice(1))}`;
  if (host === 'arxiv.org' && (m = /^\/(?:abs|pdf|html)\/([^/]+?)(?:v\d+)?(?:\.pdf)?$/.exec(path))) return `#/paper/arxiv:${enc(m[1])}`;
  if (host === 'pubmed.ncbi.nlm.nih.gov' && (m = /^\/(\d+)/.exec(path))) return `#/paper/pmid:${m[1]}`;
  if (host === 'openalex.org' && (m = /^\/(W\d+)/.exec(path))) return `#/paper/openalex:${m[1]}`;

  // Books.
  if (host === 'gutenberg.org' && (m = /^\/(?:ebooks|cache\/epub)\/(\d+)/.exec(path))) return `#/book/${m[1]}`;
  if (host === 'archive.org' && (m = /^\/(?:details|embed)\/([^/]+)/.exec(path))) return `#/scan/${enc(m[1])}`;
  if (host === 'openlibrary.org' && (m = /^\/works\/(OL\d+W)/.exec(path))) return `#/olbook/${m[1]}`;

  // Discussions.
  if (host === 'news.ycombinator.com' && u.searchParams.get('id')) return `#/hn/${enc(u.searchParams.get('id'))}`;
  if (host === 'bsky.app' && (m = /^\/profile\/([^/]+)\/post\/([^/]+)/.exec(path))) return `#/post/bsky/${enc(`at://${m[1]}/app.bsky.feed.post/${m[2]}`)}`;
  if (host === 'bsky.app' && (m = /^\/profile\/([^/]+)\/?$/.exec(path))) return `#/profile/bsky/${enc(m[1])}`;
  if (host === 'mastodon.social' && (m = /^\/@[^/]+\/(\d+)/.exec(path))) return `#/post/masto/${m[1]}`;
  if ((m = /^\/@([^/@]+)\/?$/.exec(path)) && /mastodon|social|toot|fosstodon|hachyderm/.test(host)) return `#/profile/masto/${enc(`${m[1]}@${host}`)}`;
  if (host === 'lemmy.world' && (m = /^\/post\/(\d+)/.exec(path))) return `#/post/lemmy/${m[1]}`;
  // Hashtags become an in-app search for the topic.
  if ((m = /^\/(?:tags|hashtag)\/([^/]+)/.exec(path)) && /mastodon|social|bsky|toot/.test(host)) return `#/q/${enc(m[1])}`;
  if (/(^|\.)reddit\.com$/.test(host) && (m = /\/comments\/([a-z0-9]+)/i.exec(path))) return `#/post/reddit/${m[1]}`;

  // Videos play inside the app.
  if ((host === 'youtube.com' && u.searchParams.get('v')) || host === 'youtu.be') {
    return `#/video/${enc(host === 'youtu.be' ? path.slice(1) : u.searchParams.get('v'))}`;
  }
  if (host === 'youtube.com') return null; // channels and searches only work on YouTube itself

  return `#/reader/${enc(u.href)}`;
}

/* ───────────── Safe HTML ───────────── */

const ALLOWED = new Set(['p', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'b', 'strong', 'i', 'em', 'u', 's', 'sub', 'sup',
  'br', 'hr', 'blockquote', 'pre', 'code', 'a', 'img', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'caption', 'span', 'div', 'section', 'small', 'abbr', 'cite', 'q', 'time', 'mark', 'math', 'kbd', 'var', 'del', 'ins', 'details', 'summary']);
const DROP = new Set(['script', 'style', 'link', 'meta', 'noscript', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'select', 'textarea', 'svg', 'video', 'audio', 'base', 'template']);
const DROP_CLASSES = /\b(mw-editsection|navbox|vertical-navbox|metadata|mbox-small|ambox|noprint|mw-empty-elt|reference|mw-ref|sistersitebox|portalbox|authority-control|catlinks|mw-jump-link|shortdescription|hatnote-placeholder)\b/;

/** Make an absolute https URL for media, or '' if it isn't http(s). */
const mediaUrl = (src, base) => {
  try { const u = new URL(src.startsWith('//') ? `https:${src}` : src, base); return /^https?:$/.test(u.protocol) ? u.href.replace(/^http:/, 'https:') : ''; } catch { return ''; }
};

/**
 * Clean outside HTML down to a safe subset and point its links into the app.
 * `base` resolves relative links; `wikiRoute(title)` turns same-wiki links into in-app article routes.
 */
export function sanitizeHTML(html, { base, wikiRoute } = {}) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walk = (node, out) => {
    for (const n of [...node.childNodes]) {
      if (n.nodeType === 3) { out.append(document.createTextNode(n.textContent)); continue; }
      if (n.nodeType !== 1) continue;
      const tag = n.tagName.toLowerCase();
      if (DROP.has(tag) || DROP_CLASSES.test(n.className || '') || n.getAttribute('role') === 'navigation') continue;
      if (!ALLOWED.has(tag)) { walk(n, out); continue; }
      const tagOut = tag === 'h1' ? 'h2' : tag;
      const el = document.createElement(tagOut);
      if (tag === 'a') {
        const href = n.getAttribute('href') || '';
        let target = '';
        // In-page links (#Section) can't use the URL hash, which the app uses for pages; see data-anchor.
        if (href.startsWith('#')) { el.dataset.anchor = decodeURIComponent(href.slice(1)); el.setAttribute('href', '#'); walk(n, el); out.append(el); continue; }
        else if (wikiRoute && /^\.\/[^?]/.test(href)) target = wikiRoute(decodeURIComponent(href.slice(2).split('#')[0]).replace(/_/g, ' '));
        else {
          const abs = mediaUrl(href, base);
          target = abs ? (toInternal(abs) || abs) : '';
          if (abs && !toInternal(abs)) { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener'); el.dataset.external = '1'; }
        }
        if (target) el.setAttribute('href', target);
      } else if (tag === 'img') {
        const rawSrc = n.getAttribute('src') || n.getAttribute('data-src') || '';
        // Images in <img> can't run scripts, so inline data: images are safe to keep.
        const src = rawSrc.startsWith('data:image/') ? rawSrc : mediaUrl(rawSrc, base);
        if (!src) continue;
        el.setAttribute('src', src);
        el.setAttribute('alt', n.getAttribute('alt') || '');
        el.setAttribute('loading', 'lazy');
        el.setAttribute('referrerpolicy', 'no-referrer');
        const w = Number(n.getAttribute('width')), h = Number(n.getAttribute('height'));
        if (w && h) { el.setAttribute('width', w); el.setAttribute('height', h); }
      } else if (tag === 'td' || tag === 'th') {
        for (const a of ['colspan', 'rowspan']) if (n.getAttribute(a)) el.setAttribute(a, n.getAttribute(a));
      } else if (tag === 'table' && /infobox/.test(n.className)) {
        el.className = 'infobox';
      } else if (tag === 'figure' || (tag === 'div' && /\bthumb\b/.test(n.className))) {
        el.className = 'art-figure';
      } else if ((tag === 'section' || tag === 'h2' || tag === 'h3') && n.id) {
        el.id = n.id;
      }
      walk(n, el);
      out.append(el);
    }
  };
  const frag = document.createElement('div');
  walk(doc.body, frag);
  // Drop empty paragraphs and wrappers left after cleaning.
  frag.querySelectorAll('p, span, div').forEach((e) => { if (!e.textContent.trim() && !e.querySelector('img')) e.remove(); });
  return frag.innerHTML;
}

/* ───────────── Markdown from the reader service ───────────── */

/** Render reader-service Markdown as safe HTML: headings, paragraphs, lists, quotes, code, links and images. */
export function renderMarkdown(md, base) {
  const inline = (text) => {
    let t = esc(text);
    t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_, alt, src) => {
      const s = mediaUrl(src.replace(/&amp;/g, '&'), base);
      return s ? `<img src="${esc(s)}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer">` : '';
    });
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_, label, href) => {
      const abs = mediaUrl(href.replace(/&amp;/g, '&'), base);
      if (!abs) return label;
      const inside = toInternal(abs);
      return inside ? `<a href="${esc(inside)}">${label}</a>` : `<a href="${esc(abs)}" target="_blank" rel="noopener" data-external="1">${label}</a>`;
    });
    return t.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*\w])\*(?!\s)(.+?)\*(?!\*)/g, '$1<i>$2</i>').replace(/(^|\W)_(?!\s)(.+?)_(?=\W|$)/g, '$1<i>$2</i>').replace(/`([^`]+)`/g, '<code>$1</code>');
  };
  const out = [];
  let list = null, inCode = false, code = [], quote = [];
  const close = () => {
    if (list) { out.push(`</${list}>`); list = null; }
    if (quote.length) { out.push(`<blockquote>${quote.map((q) => `<p>${inline(q)}</p>`).join('')}</blockquote>`); quote = []; }
  };
  const lines = md.replace(/\r/g, '').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line.trim())) {
      if (inCode) { out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`); code = []; inCode = false; } else { close(); inCode = true; }
      continue;
    }
    if (inCode) { code.push(line); continue; }
    const t = line.trim();
    let m;
    if (!t) { close(); continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { close(); out.push('<hr>'); continue; }
    // Setext headings: a line followed by === or ---.
    if (lines[i + 1] && /^(=+|-+)\s*$/.test(lines[i + 1].trim()) && !/^[-*+]\s/.test(t)) { close(); out.push(`<h${lines[i + 1].trim()[0] === '=' ? 2 : 3}>${inline(t)}</h${lines[i + 1].trim()[0] === '=' ? 2 : 3}>`); i++; continue; }
    if ((m = /^(#{1,6})\s+(.*)$/.exec(t))) { close(); const lvl = Math.min(6, Math.max(2, m[1].length)); out.push(`<h${lvl}>${inline(m[2].replace(/#+$/, ''))}</h${lvl}>`); continue; }
    if ((m = /^>\s?(.*)$/.exec(t))) { if (list) { out.push(`</${list}>`); list = null; } quote.push(m[1]); continue; }
    if ((m = /^[-*+]\s+(.*)$/.exec(t))) { if (list !== 'ul') { close(); out.push('<ul>'); list = 'ul'; } out.push(`<li>${inline(m[1])}</li>`); continue; }
    if ((m = /^\d+[.)]\s+(.*)$/.exec(t))) { if (list !== 'ol') { close(); out.push('<ol>'); list = 'ol'; } out.push(`<li>${inline(m[1])}</li>`); continue; }
    if (/^\|.*\|$/.test(t)) {
      // Simple pipe table.
      close();
      const rows = [];
      while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) { rows.push(lines[i].trim()); i++; }
      i--;
      const cells = (r) => r.slice(1, -1).split('|').map((c) => c.trim());
      const body = rows.filter((r) => !/^\|[\s:|-]+\|$/.test(r));
      out.push(`<div class="table-wrap"><table>${body.map((r, k) => `<tr>${cells(r).map((c) => (k === 0 ? `<th>${inline(c)}</th>` : `<td>${inline(c)}</td>`)).join('')}</tr>`).join('')}</table></div>`);
      continue;
    }
    close();
    out.push(`<p>${inline(t)}</p>`);
  }
  close();
  if (inCode) out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
  return out.join('');
}

/* ───────────── Scholarly full text (JATS XML from PubMed Central) ───────────── */

export function jatsToHTML(xml) {
  const text = (n) => esc((n?.textContent || '').replace(/\s+/g, ' ').trim());
  const inlineX = (n) => [...n.childNodes].map((c) => {
    if (c.nodeType === 3) return esc(c.textContent);
    const tag = c.nodeName.toLowerCase();
    if (tag === 'italic') return `<i>${inlineX(c)}</i>`;
    if (tag === 'bold') return `<b>${inlineX(c)}</b>`;
    if (tag === 'sup') return `<sup>${inlineX(c)}</sup>`;
    if (tag === 'sub') return `<sub>${inlineX(c)}</sub>`;
    if (tag === 'xref') return `<sup class="xref">${inlineX(c)}</sup>`;
    return inlineX(c);
  }).join('');
  const block = (n, depth) => [...n.children].map((c) => {
    const tag = c.nodeName.toLowerCase();
    if (tag === 'sec') {
      const title = c.querySelector(':scope > title');
      const h = Math.min(5, depth + 2);
      return `<section>${title ? `<h${h}>${text(title)}</h${h}>` : ''}${block(c, depth + 1)}</section>`;
    }
    if (tag === 'p') return `<p>${inlineX(c)}</p>`;
    if (tag === 'list') return `<ul>${[...c.querySelectorAll(':scope > list-item')].map((li) => `<li>${text(li)}</li>`).join('')}</ul>`;
    if (tag === 'fig') return `<figure class="art-figure"><figcaption><b>${text(c.querySelector('label'))}</b> ${text(c.querySelector('caption'))}</figcaption></figure>`;
    if (tag === 'table-wrap') return `<figure class="art-figure"><figcaption><b>${text(c.querySelector('label'))}</b> ${text(c.querySelector('caption'))}</figcaption></figure>`;
    if (tag === 'disp-quote') return `<blockquote>${block(c, depth)}</blockquote>`;
    if (tag === 'title') return '';
    return block(c, depth);
  }).join('');
  const body = xml.querySelector('body');
  return body ? block(body, 1) : '';
}
