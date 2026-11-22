// Library: free public-domain books from Project Gutenberg, readable in the app and savable offline.
import * as api from '../api.js';
import * as vault from '../vault.js';
import { html, raw, esc, $, compact, toast, slot, card } from '../ui.js';
import { openCite, bookRecord } from './cite-dialog.js';

const bookTile = (b) => html`<a class="book-tile" href="#/book/${b.id}">
  ${b.cover ? raw(html`<img src="${b.cover}" alt="" loading="lazy">`) : raw(html`<span class="nocover">${b.title.slice(0, 1)}</span>`)}
  <b>${b.title.length > 70 ? `${b.title.slice(0, 68)}…` : b.title}</b>
  <span class="meta">${b.authors.join(', ') || 'Anonymous'}</span>
</a>`;

export function libraryView(view, arg) {
  const q = decodeURIComponent(arg || '');
  view.innerHTML = html`<section class="section-head">
      <h2>Library</h2>
      <p class="muted">More than 75,000 free books whose copyright has expired, from Project Gutenberg. Read them here, cite them, or save them to read offline.</p>
    </section>
    <form class="tool-form" id="lform" role="search">
      <label class="sr-only" for="lq">Search books</label>
      <input id="lq" type="search" placeholder="Title or author, e.g. Shakespeare, Pride and Prejudice, Tagore" value="${q}" autocomplete="off">
      <button type="submit">Search books</button>
    </form>
    <div class="grid"><article class="card wide"><h3>${raw(q ? `📚 Books matching “${esc(q)}”` : '📚 Most read this month')}</h3><div class="body" id="lres"></div></article></div>`;
  $('#lform').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#lq').value.trim();
    location.hash = v ? `#/library/${encodeURIComponent(v)}` : '#/library';
  });
  const out = $('#lres');
  let page = 1;
  out.innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
  slot(out, api.freeBooks(q, page), (r) => {
    if (!r.items.length) return html`<p class="muted">No free books matched. Books still under copyright aren't in Project Gutenberg.</p>`;
    setTimeout(() => {
      $('#lmore')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget; btn.disabled = true; btn.textContent = 'Loading…';
        try {
          const next = await api.freeBooks(q, ++page);
          out.querySelector('.book-grid').insertAdjacentHTML('beforeend', next.items.map(bookTile).join(''));
          if (!next.next) btn.remove(); else { btn.disabled = false; btn.textContent = 'Load more'; }
        } catch { btn.disabled = false; btn.textContent = 'Load more'; toast('Couldn\'t load more books.'); }
      });
    });
    return html`<p class="meta">${compact(r.total)} books</p><div class="book-grid">${r.items.map((b) => raw(bookTile(b)))}</div>
      ${r.next ? raw('<button type="button" class="ghost" id="lmore">Load more</button>') : ''}`;
  });
}

/** Render book text: chapter-like lines become headings, the rest paragraphs. */
export function bookToHTML(text) {
  return text.replace(/\r/g, '').split(/\n{2,}/).map((para) => {
    const t = para.replace(/\s*\n\s*/g, ' ').trim();
    if (!t) return '';
    if (/^(chapter|book|part|act|scene|canto|letter|section)\b[\s\dIVXLCivxlc.:-]*.{0,60}$/i.test(t) || (t.length < 60 && t === t.toUpperCase() && /[A-Z]/.test(t))) return `<h3>${esc(t)}</h3>`;
    return `<p>${esc(t)}</p>`;
  }).join('');
}

export async function bookView(view, arg, { refreshVaultCount }) {
  const id = decodeURIComponent(arg);
  const saved = await vault.get(`book:${id}`).catch(() => null);
  view.innerHTML = '<section class="entity"><div class="skel big"></div></section>';
  let b = saved;
  if (!b) {
    try { b = await api.freeBook(id); } catch {
      view.innerHTML = html`<section class="empty"><h2>Couldn't load this book.</h2><p class="muted">${navigator.onLine ? 'Project Gutenberg didn\'t respond. Try again in a moment.' : 'You\'re offline and this book isn\'t saved in your Vault.'}</p></section>`;
      return;
    }
  }
  document.title = `${b.title} — rexx.space`;
  view.innerHTML = html`<section class="entity book-head">
      ${b.cover || b.image ? raw(html`<img class="portrait cover" src="${b.image || b.cover}" alt="">`) : ''}
      <div class="entity-main">
        <span class="badge">Free book · Project Gutenberg</span>
        <h2>${b.title}</h2>
        <p class="lead">${b.authors.join(', ') || 'Anonymous'}${b.authorYears && b.authorYears !== '?–?' ? ` (${b.authorYears})` : ''}</p>
        ${b.subjects?.length ? raw(html`<p class="meta">${b.subjects.join(' · ')}</p>`) : ''}
        <div class="actions">
          <button id="bsave" class="${saved ? 'saved' : ''}">${saved ? '✓ In your Vault' : '⬇ Save for offline'}</button>
          <button class="ghost" id="bcite">Cite</button>
          <a class="ghost btn" href="${b.url}" target="_blank" rel="noopener">Project Gutenberg ↗</a>
        </div>
      </div>
    </section>
    <article class="reader book-text" id="btext"><div class="skel"></div><div class="skel"></div><div class="skel"></div></article>`;
  $('#bcite').addEventListener('click', () => openCite(bookRecord(b)));

  const textEl = $('#btext');
  let text = saved?.fullText || '';
  if (!text) {
    try { text = await api.bookText(b); } catch {
      textEl.innerHTML = html`<p class="muted">The full text couldn't be loaded inside the app. You can read it on <a href="${b.html || b.url}" target="_blank" rel="noopener">Project Gutenberg ↗</a>.</p>`;
    }
  }
  if (text) {
    const words = text.split(/\s+/).length;
    const mins = Math.max(1, Math.round(words / 230));
    const time = mins < 90 ? `${mins} minute${mins === 1 ? '' : 's'}` : `${Math.round(mins / 60)} hours`;
    textEl.innerHTML = html`<p class="meta">${compact(words)} words · about ${time} to read</p><div class="prose">${raw(bookToHTML(text))}</div>`;
  }

  $('#bsave').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (btn.classList.contains('saved')) {
      await vault.remove(`book:${id}`);
      btn.classList.remove('saved'); btn.textContent = '⬇ Save for offline';
      toast('Removed from your Vault.');
    } else {
      if (!text) { toast('This book\'s text couldn\'t be loaded, so it can\'t be saved for offline reading.'); return; }
      btn.disabled = true; btn.textContent = 'Saving…';
      try {
        await vault.put({
          id: `book:${id}`, kind: 'book', title: b.title, description: b.authors.join(', '), lang: (b.languages || ['en'])[0],
          authors: b.authors, authorYears: b.authorYears, subjects: b.subjects, url: b.url, html: b.html, cover: b.cover,
          image: await vault.inlineImage(b.cover), fullText: text,
        });
        btn.classList.add('saved'); btn.textContent = '✓ In your Vault';
        toast('Book saved. You can read it offline.');
      } catch { btn.textContent = '⬇ Save for offline'; toast('Couldn\'t save the book. Your device may be low on storage.'); }
      btn.disabled = false;
    }
    refreshVaultCount();
  });
}
