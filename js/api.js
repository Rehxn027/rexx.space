// rexx.space — data sources.
// Every source here is free, keyless and CORS-friendly, so the whole app runs
// as a static site (GitHub Pages) with no backend.

/** True only in the self-contained demo build (sample data, no network). */
export const DEMO = false;

let LANG = 'en';
export const setLang = (l) => { LANG = l; };
export const getLang = () => LANG;

const wiki = () => `https://${LANG}.wikipedia.org`;

async function getJSON(url, { timeout = 12000, headers } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

const pad = (n) => String(n).padStart(2, '0');

/* ───────────── Knowledge: Wikipedia ───────────── */

export async function wikiSuggest(q) {
  const u = `${wiki()}/w/api.php?action=opensearch&format=json&origin=*&limit=7&namespace=0&search=${encodeURIComponent(q)}`;
  const [, titles = [], descs = []] = await getJSON(u, { timeout: 5000 });
  return titles.map((t, i) => ({ title: t, desc: descs[i] || '' }));
}

export async function wikiSearch(q, limit = 8) {
  const u = `${wiki()}/w/api.php?action=query&list=search&format=json&origin=*&srlimit=${limit}&srsearch=${encodeURIComponent(q)}`;
  const d = await getJSON(u);
  return (d.query?.search || []).map((r) => ({
    title: r.title,
    snippet: r.snippet.replace(/<[^>]+>/g, ''),
  }));
}

export async function wikiSummary(title) {
  const u = `${wiki()}/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}?redirect=true`;
  return getJSON(u);
}

export async function wikiRandom() {
  return getJSON(`${wiki()}/api/rest_v1/page/random/summary`);
}

/** Full article as plain text, split into sections — this is what the Vault stores offline. */
export async function wikiFullText(title) {
  const u = `${wiki()}/w/api.php?action=query&prop=extracts&explaintext=1&exsectionformat=wiki&redirects=1&format=json&origin=*&titles=${encodeURIComponent(title)}`;
  const d = await getJSON(u, { timeout: 20000 });
  const page = Object.values(d.query?.pages || {})[0];
  return page?.extract || '';
}

/** Wikipedia's daily feed: featured article, in the news, most read, on this day, picture of the day. */
export async function wikiFeed(date = new Date()) {
  const y = date.getUTCFullYear(), m = pad(date.getUTCMonth() + 1), d = pad(date.getUTCDate());
  try {
    return await getJSON(`${wiki()}/api/rest_v1/feed/featured/${y}/${m}/${d}`);
  } catch {
    // The feed for "today" sometimes lags in UTC — fall back one day.
    const prev = new Date(date.getTime() - 864e5);
    return getJSON(`${wiki()}/api/rest_v1/feed/featured/${prev.getUTCFullYear()}/${pad(prev.getUTCMonth() + 1)}/${pad(prev.getUTCDate())}`);
  }
}

/* ───────────── Facts: Wikidata ───────────── */

const PROPS = {
  P31: 'Instance of', P569: 'Born', P570: 'Died', P19: 'Birthplace', P20: 'Died in',
  P27: 'Citizenship', P106: 'Occupation', P166: 'Awards', P69: 'Educated at',
  P17: 'Country', P36: 'Capital', P1082: 'Population', P2046: 'Area (km²)',
  P571: 'Founded', P112: 'Founded by', P159: 'Headquarters', P169: 'CEO',
  P50: 'Author', P577: 'Published', P57: 'Director', P136: 'Genre',
  P38: 'Currency', P37: 'Official language', P6: 'Head of government', P35: 'Head of state',
  P2044: 'Elevation (m)', P585: 'Date', P276: 'Location', P1120: 'Deaths',
};

const SOCIAL = {
  P856: { name: 'Website', url: (v) => v },
  P2002: { name: 'X / Twitter', url: (v) => `https://x.com/${v}` },
  P2003: { name: 'Instagram', url: (v) => `https://instagram.com/${v}` },
  P2013: { name: 'Facebook', url: (v) => `https://facebook.com/${v}` },
  P2397: { name: 'YouTube', url: (v) => `https://youtube.com/channel/${v}` },
  P7085: { name: 'TikTok', url: (v) => `https://tiktok.com/@${v}` },
  P6634: { name: 'LinkedIn', url: (v) => `https://linkedin.com/in/${v}` },
  P2037: { name: 'GitHub', url: (v) => `https://github.com/${v}` },
  P4033: { name: 'Mastodon', url: (v) => { const [u, h] = v.split('@'); return h ? `https://${h}/@${u}` : `https://mastodon.social/@${v}`; } },
  P12361: { name: 'Bluesky', url: (v) => `https://bsky.app/profile/${v}` },
  P345: { name: 'IMDb', url: (v) => `https://www.imdb.com/${v.startsWith('nm') ? 'name' : 'title'}/${v}` },
  P1902: { name: 'Spotify', url: (v) => `https://open.spotify.com/artist/${v}` },
};

const TYPES = {
  Q5: 'person', Q6256: 'country', Q3624078: 'country', Q515: 'city', Q1549591: 'city',
  Q200250: 'city', Q1637706: 'city', Q5119: 'city', Q4830453: 'organization', Q43229: 'organization',
  Q783794: 'organization', Q891723: 'organization', Q1656682: 'event', Q1190554: 'event',
  Q198: 'event', Q178561: 'event', Q645883: 'event', Q7725634: 'work', Q571: 'work', Q11424: 'work',
  Q482994: 'work', Q134556: 'work', Q8502: 'place', Q4022: 'place', Q23397: 'place', Q39594: 'place',
  Q634: 'space', Q3863: 'space', Q523: 'space', Q318: 'space', Q2: 'place',
};

function fmtTime(t) {
  // "+1867-11-07T00:00:00Z" -> "7 Nov 1867" ; handles BCE.
  const m = /^([+-])(\d+)-(\d\d)-(\d\d)/.exec(t);
  if (!m) return t;
  const [, sign, y, mo, d] = m;
  const year = `${Number(y)}${sign === '-' ? ' BCE' : ''}`;
  if (mo === '00') return year;
  const month = new Date(Date.UTC(2000, Number(mo) - 1, 1)).toLocaleString('en', { month: 'short', timeZone: 'UTC' });
  return d === '00' ? `${month} ${year}` : `${Number(d)} ${month} ${year}`;
}

export async function wikidataEntity(qid) {
  const u = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=claims|labels|descriptions&languages=${LANG}|en&format=json&origin=*`;
  const d = await getJSON(u);
  const ent = d.entities?.[qid];
  if (!ent) return null;

  const claims = ent.claims || {};
  const needLabels = new Set();
  const facts = [];
  for (const [pid, label] of Object.entries(PROPS)) {
    const cs = (claims[pid] || []).filter((c) => c.rank !== 'deprecated').slice(0, pid === 'P31' ? 2 : 4);
    const vals = [];
    for (const c of cs) {
      const v = c.mainsnak?.datavalue?.value;
      if (v == null) continue;
      if (v['entity-type'] === 'item') { needLabels.add(v.id); vals.push({ qid: v.id }); }
      else if (v.time) vals.push(fmtTime(v.time));
      else if (v.amount) vals.push(Number(v.amount).toLocaleString());
      else if (typeof v === 'string') vals.push(v);
    }
    if (pid === 'P1082' && vals.length) vals.splice(1); // newest population only
    if (vals.length) facts.push({ pid, label, vals });
  }

  const socials = [];
  for (const [pid, s] of Object.entries(SOCIAL)) {
    const v = claims[pid]?.[0]?.mainsnak?.datavalue?.value;
    if (typeof v === 'string') socials.push({ name: s.name, url: s.url(v), handle: v });
  }

  const coord = claims.P625?.[0]?.mainsnak?.datavalue?.value;
  const instanceIds = (claims.P31 || []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
  const type = instanceIds.map((id) => TYPES[id]).find(Boolean) || (coord ? 'place' : 'thing');
  const iso2 = claims.P297?.[0]?.mainsnak?.datavalue?.value;

  // Resolve item labels in one batch.
  if (needLabels.size) {
    const ids = [...needLabels].slice(0, 50).join('|');
    try {
      const l = await getJSON(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids}&props=labels&languages=${LANG}|en&format=json&origin=*`);
      for (const f of facts) {
        f.vals = f.vals.map((v) => (v.qid ? (l.entities?.[v.qid]?.labels?.[LANG]?.value || l.entities?.[v.qid]?.labels?.en?.value || v.qid) : v));
      }
    } catch { /* keep raw ids */ }
  }
  for (const f of facts) f.vals = f.vals.map((v) => (v.qid ? v.qid : v));

  return {
    qid, type, iso2, socials,
    facts: facts.filter((f) => f.pid !== 'P31' || type === 'thing'),
    coord: coord ? { lat: coord.latitude, lon: coord.longitude } : null,
  };
}

/* ───────────── Places ───────────── */

export async function weather(lat, lon) {
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,is_day&daily=temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset&timezone=auto&forecast_days=5`;
  return getJSON(u);
}

export async function country(iso2) {
  const d = await getJSON(`https://restcountries.com/v3.1/alpha/${iso2}?fields=name,flags,capital,region,subregion,population,languages,currencies,timezones,cca2,area`);
  return Array.isArray(d) ? d[0] : d;
}

export const WMO = {
  0: ['☀️', 'Clear'], 1: ['🌤️', 'Mostly clear'], 2: ['⛅', 'Partly cloudy'], 3: ['☁️', 'Overcast'],
  45: ['🌫️', 'Fog'], 48: ['🌫️', 'Rime fog'], 51: ['🌦️', 'Light drizzle'], 53: ['🌦️', 'Drizzle'], 55: ['🌧️', 'Heavy drizzle'],
  61: ['🌧️', 'Light rain'], 63: ['🌧️', 'Rain'], 65: ['🌧️', 'Heavy rain'], 71: ['🌨️', 'Light snow'], 73: ['🌨️', 'Snow'],
  75: ['❄️', 'Heavy snow'], 77: ['❄️', 'Snow grains'], 80: ['🌦️', 'Showers'], 81: ['🌧️', 'Showers'], 82: ['⛈️', 'Violent showers'],
  85: ['🌨️', 'Snow showers'], 86: ['🌨️', 'Snow showers'], 95: ['⛈️', 'Thunderstorm'], 96: ['⛈️', 'Storm + hail'], 99: ['⛈️', 'Storm + hail'],
};

/* ───────────── Live planet ───────────── */

export async function earthquakes() {
  const d = await getJSON('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson');
  return d.features.map((f) => ({
    id: f.id,
    mag: f.properties.mag,
    place: f.properties.place,
    time: f.properties.time,
    url: f.properties.url,
    tsunami: f.properties.tsunami,
    lon: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
    depth: f.geometry.coordinates[2],
  }));
}

export async function issPosition() {
  const d = await getJSON('https://api.wheretheiss.at/v1/satellites/25544', { timeout: 6000 });
  return { lat: d.latitude, lon: d.longitude, alt: d.altitude, vel: d.velocity };
}

/* ───────────── News & events ───────────── */

export async function gdeltNews(q, max = 8) {
  const u = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=artlist&format=json&sort=datedesc&maxrecords=${max}`;
  const d = await getJSON(u, { timeout: 10000 });
  return (d.articles || []).map((a) => ({
    title: a.title, url: a.url, source: a.domain, image: a.socialimage, country: a.sourcecountry,
    time: a.seendate ? Date.parse(a.seendate.replace(/(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)Z/, '$1-$2-$3T$4:$5:$6Z')) : null,
  }));
}

/* ───────────── Social pulse ───────────── */

export async function hackerNews(q) {
  const u = q
    ? `https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=8&query=${encodeURIComponent(q)}`
    : 'https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=12';
  const d = await getJSON(u);
  return d.hits.map((h) => ({
    title: h.title, url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
    discuss: `https://news.ycombinator.com/item?id=${h.objectID}`,
    points: h.points, comments: h.num_comments, author: h.author, time: h.created_at_i * 1000,
  }));
}

export async function blueskySearch(q) {
  const u = `https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?limit=8&sort=top&q=${encodeURIComponent(q)}`;
  const d = await getJSON(u, { timeout: 8000 });
  return (d.posts || []).map((p) => ({
    text: p.record?.text || '',
    author: p.author?.displayName || p.author?.handle,
    handle: p.author?.handle,
    avatar: p.author?.avatar,
    likes: p.likeCount, reposts: p.repostCount,
    time: Date.parse(p.record?.createdAt || p.indexedAt),
    url: `https://bsky.app/profile/${p.author?.handle}/post/${p.uri.split('/').pop()}`,
  }));
}

const stripHTML = (h) => {
  const el = document.createElement('div');
  el.innerHTML = h;
  return el.textContent || '';
};

export async function mastodonTag(tag) {
  const clean = tag.replace(/[^\p{L}\p{N}_]/gu, '');
  if (!clean) return [];
  const d = await getJSON(`https://mastodon.social/api/v1/timelines/tag/${encodeURIComponent(clean)}?limit=8`, { timeout: 8000 });
  return d.map((s) => ({
    text: stripHTML(s.content), author: s.account.display_name || s.account.username,
    handle: s.account.acct, avatar: s.account.avatar, likes: s.favourites_count, reposts: s.reblogs_count,
    time: Date.parse(s.created_at), url: s.url,
  }));
}

export async function mastodonTrends() {
  const [tags, links] = await Promise.allSettled([
    getJSON('https://mastodon.social/api/v1/trends/tags?limit=12', { timeout: 8000 }),
    getJSON('https://mastodon.social/api/v1/trends/links?limit=8', { timeout: 8000 }),
  ]);
  return {
    tags: tags.status === 'fulfilled' ? tags.value.map((t) => ({ name: t.name, uses: (t.history || []).slice(0, 2).reduce((a, h) => a + Number(h.uses), 0) })) : [],
    links: links.status === 'fulfilled' ? links.value.map((l) => ({ title: l.title, url: l.url, source: l.provider_name, image: l.image })) : [],
  };
}

/* ───────────── Books ───────────── */

export async function books(q) {
  const d = await getJSON(`https://openlibrary.org/search.json?limit=6&fields=key,title,author_name,first_publish_year,cover_i&q=${encodeURIComponent(q)}`);
  return (d.docs || []).map((b) => ({
    title: b.title, author: b.author_name?.[0], year: b.first_publish_year,
    cover: b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : null,
    url: `https://openlibrary.org${b.key}`,
  }));
}

/* ───────────── Research papers ───────────── */

/** OpenAlex stores abstracts as {word: [positions]}; rebuild the text. */
function invertedToText(inv) {
  if (!inv) return '';
  const words = [];
  for (const [w, pos] of Object.entries(inv)) for (const p of pos) words[p] = w;
  return words.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Scholarly works from OpenAlex (about 250 million papers, books and datasets, including arXiv preprints).
 * sort: 'relevance' | 'cited' | 'newest'. oa: only works with a free full text.
 */
export async function papers(q, { sort = 'relevance', oa = false, per = 10, page = 1 } = {}) {
  const sorts = { relevance: '', cited: '&sort=cited_by_count:desc', newest: '&sort=publication_date:desc' };
  const filter = oa ? '&filter=is_oa:true' : '';
  const fields = 'id,doi,display_name,publication_year,publication_date,cited_by_count,authorships,primary_location,open_access,best_oa_location,abstract_inverted_index,type';
  const u = `https://api.openalex.org/works?search=${encodeURIComponent(q)}&per-page=${per}&page=${page}${sorts[sort] || ''}${filter}&select=${fields}`;
  const d = await getJSON(u);
  return {
    total: d.meta?.count || 0,
    items: (d.results || []).map((w) => ({
      kind: 'paper',
      id: w.id?.split('/').pop(),
      title: w.display_name || 'Untitled',
      authors: (w.authorships || []).map((a) => a.author?.display_name).filter(Boolean),
      year: w.publication_year,
      date: w.publication_date,
      venue: w.primary_location?.source?.display_name || '',
      cited: w.cited_by_count,
      doi: w.doi ? w.doi.replace('https://doi.org/', '') : '',
      url: w.doi || w.primary_location?.landing_page_url || w.id,
      oa: !!w.open_access?.is_oa,
      pdf: w.best_oa_location?.pdf_url || w.open_access?.oa_url || '',
      abstract: invertedToText(w.abstract_inverted_index),
      type: w.type,
    })),
  };
}

/** Biomedical and life-science literature from Europe PMC (includes PubMed). */
export async function biomed(q, per = 6) {
  const u = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(q)}&format=json&pageSize=${per}&resultType=core&sort=CITED%20desc`;
  const d = await getJSON(u);
  return (d.resultList?.result || []).map((r) => ({
    kind: 'paper',
    id: r.id,
    title: (r.title || '').replace(/<[^>]+>/g, '').replace(/\.$/, ''),
    authors: (r.authorString || '').replace(/\.$/, '').split(', ').filter(Boolean),
    year: Number(r.pubYear) || null,
    venue: r.journalInfo?.journal?.title || r.journalTitle || '',
    cited: r.citedByCount,
    doi: r.doi || '',
    url: r.doi ? `https://doi.org/${r.doi}` : `https://europepmc.org/article/${r.source}/${r.id}`,
    oa: r.isOpenAccess === 'Y',
    pdf: (r.fullTextUrlList?.fullTextUrl || []).find((f) => f.documentStyle === 'pdf' && f.availabilityCode === 'OA')?.url || '',
    abstract: (r.abstractText || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  }));
}

/* ───────────── Dictionary ───────────── */

/**
 * Definitions, pronunciation and examples. English uses the Free Dictionary API (with audio);
 * other languages use Wiktionary's definition service.
 */
export async function define(word) {
  const w = word.trim().toLowerCase();
  if (!w || w.split(/\s+/).length > 3) return null;
  if (LANG === 'en') {
    try {
      const d = await getJSON(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`, { timeout: 7000 });
      const e = d[0];
      return {
        word: e.word,
        phonetic: e.phonetic || e.phonetics?.find((p) => p.text)?.text || '',
        audio: e.phonetics?.find((p) => p.audio)?.audio || '',
        meanings: d.flatMap((x) => x.meanings).map((m) => ({
          pos: m.partOfSpeech,
          defs: m.definitions.slice(0, 3).map((x) => ({ text: x.definition, example: x.example })),
          synonyms: [...new Set([...(m.synonyms || []), ...m.definitions.flatMap((x) => x.synonyms || [])])].slice(0, 8),
        })),
        source: `https://en.wiktionary.org/wiki/${encodeURIComponent(w)}`,
      };
    } catch { /* fall through to Wiktionary */ }
  }
  const d = await getJSON(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(w)}`, { timeout: 7000 });
  const entries = d[LANG] || d.en || Object.values(d)[0] || [];
  const strip = (h) => String(h || '').replace(/<[^>]+>/g, '').trim();
  const meanings = entries.map((m) => ({
    pos: m.partOfSpeech,
    defs: (m.definitions || []).filter((x) => strip(x.definition)).slice(0, 3).map((x) => ({ text: strip(x.definition), example: strip(x.examples?.[0]) })),
    synonyms: [],
  })).filter((m) => m.defs.length);
  if (!meanings.length) return null;
  return { word: w, phonetic: '', audio: '', meanings, source: `https://en.wiktionary.org/wiki/${encodeURIComponent(w)}` };
}

/* ───────────── Free books ───────────── */

/** Public-domain books from Project Gutenberg (via the Gutendex catalogue). Empty query = most popular. */
export async function freeBooks(q = '', page = 1) {
  const lang = LANG === 'en' ? 'en' : `${LANG},en`;
  const u = `https://gutendex.com/books/?languages=${lang}&page=${page}${q ? `&search=${encodeURIComponent(q)}` : ''}`;
  const d = await getJSON(u, { timeout: 15000 });
  return {
    total: d.count,
    next: !!d.next,
    items: (d.results || []).map(gutenbergBook),
  };
}

function gutenbergBook(b) {
  const f = b.formats || {};
  const txt = Object.entries(f).find(([k, v]) => k.startsWith('text/plain') && !v.endsWith('.zip'))?.[1] || '';
  return {
    kind: 'book',
    id: String(b.id),
    title: b.title,
    authors: (b.authors || []).map((a) => a.name.split(', ').reverse().join(' ')),
    authorYears: (b.authors || [])[0] ? `${b.authors[0].birth_year ?? '?'}–${b.authors[0].death_year ?? '?'}` : '',
    subjects: (b.subjects || []).slice(0, 4),
    languages: b.languages,
    cover: f['image/jpeg'] || '',
    text: txt,
    html: f['text/html'] || '',
    url: `https://www.gutenberg.org/ebooks/${b.id}`,
    downloads: b.download_count,
  };
}

export async function freeBook(id) {
  return gutenbergBook(await getJSON(`https://gutendex.com/books/${encodeURIComponent(id)}/`));
}

/** Full text of a Gutenberg book, with the licence header and footer trimmed. */
export async function bookText(book) {
  const urls = [book.text, `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.txt`].filter(Boolean);
  let raw = '';
  for (const u of urls) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 30000);
      const res = await fetch(u, { signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) { raw = await res.text(); break; }
    } catch { /* try next */ }
  }
  if (!raw) throw new Error('Book text unavailable');
  const start = raw.search(/\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG[^\n]*\n/i);
  const end = raw.search(/\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG/i);
  return raw.slice(start >= 0 ? raw.indexOf('\n', start) + 1 : 0, end > 0 ? end : undefined).trim();
}

/* ───────────── Images ───────────── */

/** Freely licensed images from Wikimedia Commons. */
export async function images(q, n = 12) {
  const u = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(`${q} filetype:bitmap`)}&gsrnamespace=6&gsrlimit=${n}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=480&format=json&origin=*`;
  const d = await getJSON(u);
  return Object.values(d.query?.pages || {})
    .sort((a, b) => a.index - b.index)
    .map((p) => {
      const ii = p.imageinfo?.[0] || {};
      const m = ii.extmetadata || {};
      const strip = (h) => String(h || '').replace(/<[^>]+>/g, '').trim();
      return {
        title: p.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, ''),
        thumb: ii.thumburl, full: ii.url, page: ii.descriptionurl,
        author: strip(m.Artist?.value).slice(0, 60), license: strip(m.LicenseShortName?.value),
      };
    })
    .filter((x) => x.thumb);
}

/* ───────────── More about places ───────────── */

/** Travel guide summary from Wikivoyage. */
export async function travelGuide(title) {
  const slug = encodeURIComponent(title.replace(/ /g, '_'));
  for (const lang of [...new Set([LANG, 'en'])]) {
    try {
      const d = await getJSON(`https://${lang}.wikivoyage.org/api/rest_v1/page/summary/${slug}`, { timeout: 7000 });
      if (d.extract && d.type !== 'disambiguation') return { extract: d.extract, url: d.content_urls?.desktop?.page };
    } catch { /* try English */ }
  }
  return null;
}

/** Wikipedia articles about places within ~10 km. */
export async function nearby(lat, lon, n = 10) {
  const d = await getJSON(`${wiki()}/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=10000&gslimit=${n + 1}&format=json&origin=*`);
  return (d.query?.geosearch || []).filter((g) => g.dist > 50).slice(0, n).map((g) => ({ title: g.title, dist: g.dist }));
}

export async function airQuality(lat, lon) {
  const d = await getJSON(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10`, { timeout: 7000 });
  return d.current || null;
}

/** Latest reference exchange rates (European Central Bank, via Frankfurter). */
export async function exchangeRate(code) {
  const d = await getJSON(`https://api.frankfurter.app/latest?from=${encodeURIComponent(code)}&to=USD,EUR`, { timeout: 7000 });
  return { date: d.date, rates: d.rates };
}

/* ───────────── Any date in history ───────────── */

/** Events, births, deaths and holidays for a day of the year (MM, DD). */
export async function onThisDay(mm, dd) {
  const l = ['en', 'de', 'fr', 'sv', 'pt', 'ru', 'es', 'ar', 'bs', 'uk', 'it', 'tr', 'zh'].includes(LANG) ? LANG : 'en';
  return getJSON(`https://api.wikimedia.org/feed/v1/wikipedia/${l}/onthisday/all/${pad(mm)}/${pad(dd)}`);
}
