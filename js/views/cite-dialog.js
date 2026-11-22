// "Cite" dialog: shows a record in five citation styles with copy buttons.
import { citations } from '../cite.js';
import { esc, toast, copyText } from '../ui.js';

const STYLES = ['APA', 'MLA', 'Chicago', 'Harvard', 'BibTeX'];
let last = 'APA';
try { last = localStorage.getItem('rexx-cite-style') || 'APA'; } catch { /* ignore */ }

// Citations contain <i> for titles. Escape everything, then restore only <i> and </i>.
const safe = (s) => esc(s).replace(/&lt;(\/?)i&gt;/g, '<$1i>');
const plain = (s) => s.replace(/<\/?i>/g, '');

export function openCite(record) {
  const all = citations(record);
  const dlg = document.createElement('dialog');
  dlg.className = 'cite-dialog';
  dlg.setAttribute('aria-labelledby', 'cite-title');
  dlg.innerHTML = `
    <div class="cite-head"><h2 id="cite-title">Cite this</h2><button type="button" class="ghost close" aria-label="Close">✕</button></div>
    <p class="muted cite-what">${esc(record.title)}</p>
    <div class="cite-tabs" role="tablist">${STYLES.map((s) => `<button type="button" role="tab" data-s="${s}" aria-selected="${s === last}">${s}</button>`).join('')}</div>
    <div class="cite-out" id="cite-out"></div>
    <div class="cite-actions"><button type="button" class="copy">Copy citation</button></div>
    <p class="meta">Check citations against your style guide before submitting: details such as capitalisation and missing dates may need adjusting.</p>`;
  document.body.append(dlg);
  const out = dlg.querySelector('#cite-out');
  const show = (s) => {
    last = s;
    try { localStorage.setItem('rexx-cite-style', s); } catch { /* ignore */ }
    dlg.querySelectorAll('[role=tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.s === s)));
    out.className = `cite-out ${s === 'BibTeX' ? 'mono' : ''}`;
    out.innerHTML = s === 'BibTeX' ? `<pre>${esc(all[s])}</pre>` : `<p>${safe(all[s])}</p>`;
  };
  show(STYLES.includes(last) ? last : 'APA');
  dlg.querySelector('.cite-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (b) show(b.dataset.s); });
  dlg.querySelector('.copy').addEventListener('click', async () => {
    const ok = await copyText(plain(all[last]), out);
    toast(ok ? `${last} citation copied.` : 'Press Ctrl+C (or ⌘C) to copy the selected citation.');
  });
  const close = () => { dlg.close(); dlg.remove(); };
  dlg.querySelector('.close').addEventListener('click', close);
  dlg.addEventListener('cancel', close);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  dlg.showModal();
}

/** Citation record for a Wikipedia summary. */
export const wikiRecord = (s, lang) => ({
  kind: 'web', title: s.titles?.normalized || s.title, container: 'Wikipedia', publisher: 'Wikimedia Foundation',
  date: s.timestamp || null, url: s.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(s.title)}`,
});

/** Citation record for a paper from api.papers / api.biomed. */
export const paperRecord = (p) => ({ kind: 'paper', title: p.title, authors: p.authors || [], year: p.year, date: p.date, container: p.venue, doi: p.doi, url: p.url });

/** Citation record for a Project Gutenberg book. */
export const bookRecord = (b) => ({ kind: 'book', title: b.title, authors: b.authors || [], container: 'Project Gutenberg', url: b.url });
