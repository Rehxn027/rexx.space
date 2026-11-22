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
      ${p.pmid ? raw(html`<a class="chip" href="https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/" target="_blank" rel="noopener">PubMed ↗</a>`) : ''}
      ${p.source && p.source !== 'OpenAlex' ? raw(html`<span class="chip">${p.source}</span>`) : ''}
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

const SOURCES = {
  all: { label: 'All fields (OpenAlex)', note: 'About 250 million works: journals, conferences, books, theses and preprints.' },
  arxiv: { label: 'arXiv preprints', note: 'Physics, mathematics, computer science, biology, economics and more, often before peer review.' },
  pubmed: { label: 'PubMed (medicine)', note: 'More than 37 million biomedical and life-science citations, via Europe PMC.' },
  crossref: { label: 'Crossref (all DOIs)', note: 'The registry behind DOIs: about 170 million records straight from publishers.' },
};

let state = { sort: 'relevance', oa: false, src: 'all' };
try { state = { ...state, ...JSON.parse(localStorage.getItem('rexx-research') || '{}') }; } catch { /* ignore */ }
if (!SOURCES[state.src]) state.src = 'all';

/** Search the chosen source. Returns { total, items, note } where note explains any fallback. */
async function searchSource(q, page, per) {
  const { sort, oa, src } = state;
  if (src === 'arxiv') {
    try { return await api.arxiv(q, { per, start: (page - 1) * per, sort }); } catch {
      // arXiv may refuse browser requests; OpenAlex indexes arXiv too, so fall back to its preprints.
      const r = await api.papers(q, { sort, oa, preprints: true, per, page });
      return { ...r, note: 'arXiv didn\'t respond, so these are preprints (including arXiv\'s) from OpenAlex.' };
    }
  }
  if (src === 'pubmed') {
    const items = await api.biomed(q, per * page, { pubmedOnly: true, sort });
    return { total: items.length, items: items.slice((page - 1) * per), more: items.length === per * page };
  }
  if (src === 'crossref') return api.crossref(q, { per, page, sort });
  return api.papers(q, { sort, oa, per, page });
}

export function researchView(view, arg, { refreshVaultCount }) {
  const q = decodeURIComponent(arg || '');
  view.innerHTML = html`<section class="section-head">
      <h2>Research</h2>
      <p class="muted">Search scholarly papers across every field, or paste a DOI to look one up. Every result can be cited or saved for offline reading.</p>
    </section>
    <form class="tool-form" id="rform" role="search">
      <label class="sr-only" for="rq">Search papers</label>
      <input id="rq" type="search" placeholder="Topic, title, author or DOI, e.g. CRISPR gene editing or 10.1038/nature14539" value="${q}" autocomplete="off">
      <select id="rsrc" aria-label="Source">${Object.entries(SOURCES).map(([k, v]) => raw(html`<option value="${k}">${v.label}</option>`))}</select>
      <select id="rsort" aria-label="Sort by">
        <option value="relevance">Most relevant</option><option value="cited">Most cited</option><option value="newest">Newest</option>
      </select>
      <label class="check"><input type="checkbox" id="roa"> Free to read only</label>
      <button type="submit">Search papers</button>
    </form>
    <p class="meta" id="rnote"></p>
    <div id="rresults"></div>`;

  const form = $('#rform'), src = $('#rsrc'), sort = $('#rsort'), oa = $('#roa'), out = $('#rresults');
  src.value = state.src; sort.value = state.sort; oa.checked = state.oa;
  const note = () => { $('#rnote').textContent = SOURCES[src.value].note; oa.closest('label').hidden = !['all', 'arxiv'].includes(src.value); };
  note();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    state = { sort: sort.value, oa: oa.checked, src: src.value };
    try { localStorage.setItem('rexx-research', JSON.stringify(state)); } catch { /* ignore */ }
    const v = $('#rq').value.trim();
    if (v) { if (location.hash === `#/research/${encodeURIComponent(v)}`) researchView(view, encodeURIComponent(v), { refreshVaultCount }); else location.hash = `#/research/${encodeURIComponent(v)}`; }
  });
  src.addEventListener('change', () => { note(); if (q) form.requestSubmit(); });
  [sort, oa].forEach((el) => el.addEventListener('change', () => { if (q) form.requestSubmit(); }));

  if (!q) {
    out.innerHTML = html`<div class="grid">${raw(card('💡 Try', raw(html`<div class="tags">${['climate change adaptation', 'transformer neural network', 'CRISPR', 'black hole imaging', 'microplastics health', 'Indus Valley script', 'mRNA vaccine', 'quantum error correction'].map((t) => raw(html`<a href="#/research/${encodeURIComponent(t)}">${t}</a>`))}</div>`), { wide: true }))}</div>`;
    return;
  }

  // A DOI goes straight to that one paper.
  const doi = api.asDOI(q);
  if (doi) {
    out.innerHTML = html`<div class="grid">${raw(card(`📄 ${esc(doi)}`, null, { wide: true, cls: 'papers-card' }))}</div>`;
    const el = $('.papers-card .body', view);
    slot(el, api.byDOI(doi), (p) => {
      setTimeout(() => wirePapers(el, [p], refreshVaultCount));
      return html`<ol class="list papers">${raw(paperHTML(p, 0))}</ol>`;
    });
    return;
  }

  out.innerHTML = html`<div class="grid">${raw(card(`📄 ${esc(SOURCES[state.src].label)}: “${esc(q)}”`, null, { wide: true, cls: 'papers-card' }))}</div>`;
  const mainEl = $('.papers-card .body', view);
  const per = 15;
  let page = 1;
  let items = [];
  slot(mainEl, searchSource(q, page, per), (r) => {
    items = r.items;
    if (!items.length) return html`<p class="muted">No papers matched. Try broader words, another source, or turn off “Free to read only”.</p>`;
    const more = r.more ?? r.total > items.length;
    setTimeout(() => {
      wirePapers(mainEl, items, refreshVaultCount);
      $('#rmore')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget; btn.disabled = true; btn.textContent = 'Loading…';
        page++;
        try {
          const next = await searchSource(q, page, per);
          const start = items.length;
          items.push(...next.items);
          mainEl.querySelector('ol').insertAdjacentHTML('beforeend', next.items.map((p, k) => paperHTML(p, start + k)).join(''));
          if (!(next.more ?? next.total > items.length) || !next.items.length) btn.remove(); else { btn.disabled = false; btn.textContent = 'Load more'; }
        } catch { btn.disabled = false; btn.textContent = 'Load more'; toast('Couldn\'t load more papers.'); }
      });
    });
    return html`${r.note ? raw(html`<p class="meta">${r.note}</p>`) : ''}<p class="meta">${r.total ? `${compact(r.total)} results` : ''}</p><ol class="list papers">${items.map((p, i) => raw(paperHTML(p, i)))}</ol>
      ${more ? raw('<button type="button" class="ghost" id="rmore">Load more</button>') : ''}`;
  });
}
