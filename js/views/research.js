// Research: scholarly papers from OpenAlex (all fields) and Europe PMC (biomedicine).
import * as api from '../api.js';
import * as vault from '../vault.js';
import { html, raw, esc, $, compact, toast, slot, card } from '../ui.js';
import { openCite, paperRecord } from './cite-dialog.js';

/** One paper as a list item, with Abstract / Cite / Save actions. Used here and on search pages. */
export function paperHTML(p, i) {
  const authors = p.authors.length > 3 ? `${p.authors.slice(0, 3).join(', ')} et al.` : p.authors.join(', ');
  return html`<li class="paper" data-i="${i}">
    <a class="paper-title" href="${p.url}" target="_blank" rel="noopener">${p.title}</a>
    <span class="meta">${authors || 'Unknown authors'}${p.year ? ` · ${p.year}` : ''}${p.venue ? ` · ${p.venue}` : ''}</span>
    <span class="chips">
      ${p.cited != null ? raw(html`<span class="chip">Cited by ${compact(p.cited)}</span>`) : ''}
      ${p.oa ? raw('<span class="chip ok-chip">Free to read</span>') : ''}
      ${p.pdf ? raw(html`<a class="chip" href="${p.pdf}" target="_blank" rel="noopener">PDF ↗</a>`) : ''}
      ${p.doi ? raw(html`<span class="chip mono">doi:${p.doi}</span>`) : ''}
    </span>
    ${p.abstract ? raw(html`<details><summary>Abstract</summary><p>${p.abstract}</p></details>`) : ''}
    <span class="paper-actions"><button type="button" class="ghost small" data-act="cite">Cite</button><button type="button" class="ghost small" data-act="save">Save</button></span>
  </li>`;
}

/** Wire Cite/Save buttons inside a container that lists `items` via paperHTML. */
export function wirePapers(root, items, onSaved = () => {}) {
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    const li = e.target.closest('.paper');
    if (!b || !li) return;
    const p = items[Number(li.dataset.i)];
    if (b.dataset.act === 'cite') openCite(paperRecord(p));
    if (b.dataset.act === 'save') {
      await vault.put({
        id: `paper:${p.doi || p.id}`, kind: 'paper', title: p.title, description: `${p.authors[0] || ''}${p.authors.length > 1 ? ' et al.' : ''}${p.year ? `, ${p.year}` : ''}`,
        lang: 'paper', authors: p.authors, year: p.year, date: p.date, venue: p.venue, doi: p.doi, url: p.url, pdf: p.pdf, cited: p.cited, abstract: p.abstract, oa: p.oa,
      });
      b.textContent = '✓ Saved'; b.disabled = true;
      toast('Paper saved to your Vault.');
      onSaved();
    }
  });
}

let state = { sort: 'relevance', oa: false, bio: false };
try { state = { ...state, ...JSON.parse(localStorage.getItem('rexx-research') || '{}') }; } catch { /* ignore */ }

export function researchView(view, arg, { refreshVaultCount }) {
  const q = decodeURIComponent(arg || '');
  view.innerHTML = html`<section class="section-head">
      <h2>Research</h2>
      <p class="muted">Search about 250 million scholarly works from OpenAlex (journals, conference papers, books and arXiv preprints), plus biomedical literature from Europe PMC.</p>
    </section>
    <form class="tool-form" id="rform" role="search">
      <label class="sr-only" for="rq">Search papers</label>
      <input id="rq" type="search" placeholder="Topic, title, author or DOI, e.g. CRISPR gene editing" value="${q}" autocomplete="off">
      <select id="rsort" aria-label="Sort by">
        <option value="relevance">Most relevant</option><option value="cited">Most cited</option><option value="newest">Newest</option>
      </select>
      <label class="check"><input type="checkbox" id="roa"> Free to read only</label>
      <label class="check"><input type="checkbox" id="rbio"> Include biomedicine (Europe PMC)</label>
      <button type="submit">Search papers</button>
    </form>
    <div id="rresults"></div>`;

  const form = $('#rform'), sort = $('#rsort'), oa = $('#roa'), bio = $('#rbio'), out = $('#rresults');
  sort.value = state.sort; oa.checked = state.oa; bio.checked = state.bio;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    state = { sort: sort.value, oa: oa.checked, bio: bio.checked };
    try { localStorage.setItem('rexx-research', JSON.stringify(state)); } catch { /* ignore */ }
    const v = $('#rq').value.trim();
    if (v) location.hash = `#/research/${encodeURIComponent(v)}`;
  });
  [sort, oa, bio].forEach((el) => el.addEventListener('change', () => form.requestSubmit()));

  if (!q) {
    out.innerHTML = html`<div class="grid">${raw(card('💡 Try', raw(html`<div class="tags">${['climate change adaptation', 'transformer neural network', 'CRISPR', 'black hole imaging', 'microplastics health', 'Indus Valley script', 'mRNA vaccine', 'quantum error correction'].map((t) => raw(html`<a href="#/research/${encodeURIComponent(t)}">${t}</a>`))}</div>`), { wide: true }))}</div>`;
    return;
  }

  out.innerHTML = html`<div class="grid">
    ${raw(card(`📄 Papers on “${esc(q)}”`, null, { wide: true, cls: 'papers-card' }))}
    ${state.bio ? raw(card('🧬 Biomedical literature (Europe PMC)', null, { wide: true, cls: 'papers-card' })) : ''}
  </div>`;
  const [mainEl, bioEl] = view.querySelectorAll('.papers-card .body');
  let page = 1;
  let items = [];
  const load = () => api.papers(q, { sort: state.sort, oa: state.oa, per: 15, page });
  slot(mainEl, load(), (r) => {
    items = r.items;
    if (!items.length) return html`<p class="muted">No papers matched. Try broader words, or turn off “Free to read only”.</p>`;
    const more = r.total > items.length;
    setTimeout(() => {
      wirePapers(mainEl, items, refreshVaultCount);
      $('#rmore')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget; btn.disabled = true; btn.textContent = 'Loading…';
        page++;
        try {
          const next = await load();
          const start = items.length;
          items.push(...next.items);
          mainEl.querySelector('ol').insertAdjacentHTML('beforeend', next.items.map((p, k) => paperHTML(p, start + k)).join(''));
          if (items.length >= r.total || !next.items.length) btn.remove(); else { btn.disabled = false; btn.textContent = 'Load more'; }
        } catch { btn.disabled = false; btn.textContent = 'Load more'; toast('Couldn\'t load more papers.'); }
      });
    });
    return html`<p class="meta">${compact(r.total)} results</p><ol class="list papers">${items.map((p, i) => raw(paperHTML(p, i)))}</ol>
      ${more ? raw('<button type="button" class="ghost" id="rmore">Load more</button>') : ''}`;
  });
  if (bioEl) {
    let bioItems = [];
    slot(bioEl, api.biomed(q, 10), (r) => {
      bioItems = r;
      if (!r.length) return html`<p class="muted">No biomedical papers matched.</p>`;
      setTimeout(() => wirePapers(bioEl, bioItems, refreshVaultCount));
      return html`<ol class="list papers">${r.map((p, i) => raw(paperHTML(p, i)))}</ol>`;
    });
  }
}
