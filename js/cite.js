// Citations in APA 7, MLA 9, Chicago (author-date), Harvard and BibTeX.
// Input is a normalised record:
//   { kind: 'web' | 'paper' | 'book', title, authors: ['First Last', ...], year, date (ISO, optional),
//     container: site / journal / publisher, url, doi, accessed: Date }

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MLA_MONTHS = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];

function parts(name) {
  const bits = name.trim().split(/\s+/);
  const last = bits.pop() || '';
  return { first: bits.join(' '), last };
}
const initials = (first) => first.split(/[\s-]+/).filter(Boolean).map((p) => `${p[0].toUpperCase()}.`).join(' ');

function apaAuthors(list) {
  const a = list.map((n) => { const p = parts(n); return p.first ? `${p.last}, ${initials(p.first)}` : p.last; });
  if (a.length === 0) return '';
  if (a.length === 1) return a[0];
  if (a.length <= 20) return `${a.slice(0, -1).join(', ')}, & ${a[a.length - 1]}`;
  return `${a.slice(0, 19).join(', ')}, … ${a[a.length - 1]}`;
}
function mlaAuthors(list) {
  if (!list.length) return '';
  const p = parts(list[0]);
  const first = p.first ? `${p.last}, ${p.first}` : p.last;
  if (list.length === 1) return first;
  if (list.length === 2) return `${first}, and ${list[1]}`;
  return `${first}, et al.`;
}
function chicagoAuthors(list) {
  if (!list.length) return '';
  const p = parts(list[0]);
  const first = p.first ? `${p.last}, ${p.first}` : p.last;
  if (list.length === 1) return first;
  if (list.length > 10) return `${first}, ${list.slice(1, 7).join(', ')}, et al.`;
  return `${first}, ${list.slice(1, -1).map((n) => `${n}, `).join('')}and ${list[list.length - 1]}`;
}
function harvardAuthors(list) {
  const a = list.map((n) => { const p = parts(n); return p.first ? `${p.last}, ${initials(p.first)}` : p.last; });
  if (!a.length) return '';
  if (a.length === 1) return a[0];
  if (a.length > 3) return `${a[0]} et al.`;
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
}

const dt = (iso) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00Z`) : null);
const longDate = (d) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
const dmy = (d) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const mlaDate = (d) => `${d.getUTCDate()} ${MLA_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const bare = (url) => url.replace(/^https?:\/\//, '');
const end = (s) => (/[.?!]$/.test(s) ? s : `${s}.`);
const bibKey = (r0) => { const r = { ...r0, year: r0.year || (r0.date ? r0.date.slice(0, 4) : "") }; return `${(parts(r.authors[0] || r.container || 'ref').last || 'ref').toLowerCase().replace(/[^a-z]/g, '')}${r.year || ''}${(r.title.match(/[A-Za-z]{4,}/) || ["x"])[0].toLowerCase()}`; };
const bibEsc = (s) => String(s).replace(/([{}&%$#_])/g, '\\$1');

export function citations(rec) {
  const r = { authors: [], ...rec };
  const acc = r.accessed || new Date();
  const accUTC = new Date(Date.UTC(acc.getFullYear(), acc.getMonth(), acc.getDate(), 12));
  const d = dt(r.date);
  const link = r.doi ? `https://doi.org/${r.doi}` : r.url;
  const year = r.year || (d ? d.getUTCFullYear() : null);

  if (r.kind === 'web') {
    // Encyclopedia entry with no named author (e.g. Wikipedia): the title leads.
    const ymd = d ? `${d.getUTCFullYear()}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}` : 'n.d.';
    return {
      APA: `${r.title}. (${ymd}). In ${r.container}. ${r.url}`,
      MLA: `“${r.title}.” ${r.container}${r.publisher ? `, ${r.publisher}` : ''}${d ? `, ${mlaDate(d)}` : ''}, ${bare(r.url)}. Accessed ${mlaDate(accUTC)}.`,
      Chicago: `${r.container}. ${year || 'n.d.'}. “${r.title}.” ${d ? `Last modified ${longDate(d)}. ` : ''}${r.url}.`,
      Harvard: `${r.container} (${year || 'n.d.'}) ${r.title}. Available at: ${r.url} (Accessed: ${dmy(accUTC)}).`,
      BibTeX: `@misc{${bibKey(r)},\n  title = {${bibEsc(r.title)}},\n  howpublished = {${bibEsc(r.container)}},\n  year = {${year || ''}},\n  url = {${r.url}},\n  note = {Accessed ${dmy(accUTC)}}\n}`,
    };
  }

  if (r.kind === 'book') {
    return {
      APA: `${apaAuthors(r.authors)}${r.authors.length ? ' ' : ''}(${year || 'n.d.'}). <i>${r.title}</i>. ${r.container}. ${r.url}`,
      MLA: `${r.authors.length ? `${end(mlaAuthors(r.authors))} ` : ''}<i>${r.title}</i>. ${r.container}${year ? `, ${year}` : ''}, ${bare(r.url)}.`,
      Chicago: `${r.authors.length ? `${end(chicagoAuthors(r.authors))} ` : ''}${year || 'n.d.'}. <i>${r.title}</i>. ${r.container}. ${r.url}.`,
      Harvard: `${r.authors.length ? `${harvardAuthors(r.authors)} ` : ''}(${year || 'n.d.'}) <i>${r.title}</i>. ${r.container}. Available at: ${r.url} (Accessed: ${dmy(accUTC)}).`,
      BibTeX: `@book{${bibKey(r)},\n  author = {${bibEsc(r.authors.join(' and '))}},\n  title = {${bibEsc(r.title)}},\n  publisher = {${bibEsc(r.container)}},\n  year = {${year || ''}},\n  url = {${r.url}}\n}`,
    };
  }

  // Journal article / paper.
  return {
    APA: `${apaAuthors(r.authors)}${r.authors.length ? ' ' : ''}(${year || 'n.d.'}). ${end(r.title)} ${r.container ? `<i>${r.container}</i>. ` : ''}${link}`,
    MLA: `${r.authors.length ? `${end(mlaAuthors(r.authors))} ` : ''}“${end(r.title)}” ${r.container ? `<i>${r.container}</i>, ` : ''}${year || 'n.d.'}${link ? `, ${r.doi ? `https://doi.org/${r.doi}` : bare(link)}` : ''}.`,
    Chicago: `${r.authors.length ? `${end(chicagoAuthors(r.authors))} ` : ''}${year || 'n.d.'}. “${end(r.title)}” ${r.container ? `<i>${r.container}</i>. ` : ''}${link}.`,
    Harvard: `${r.authors.length ? `${harvardAuthors(r.authors)} ` : ''}(${year || 'n.d.'}) ‘${r.title}’, ${r.container ? `<i>${r.container}</i>. ` : ''}${r.doi ? `doi: ${r.doi}` : `Available at: ${link} (Accessed: ${dmy(accUTC)})`}.`,
    BibTeX: `@article{${bibKey(r)},\n  author = {${bibEsc(r.authors.join(' and '))}},\n  title = {${bibEsc(r.title)}},\n  journal = {${bibEsc(r.container || '')}},\n  year = {${year || ''}},${r.doi ? `\n  doi = {${r.doi}},` : ''}\n  url = {${link}}\n}`,
  };
}
