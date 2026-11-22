import * as api from './api.js';
import * as vault from './vault.js';
import { mountPicker } from './themes.js';
import { researchView, paperHTML, wirePapers } from './views/research.js';
import { libraryView, bookView } from './views/library.js';
import { askView } from './views/ask.js';
import { dayView } from './views/day.js';
import { openCite, wikiRecord, paperRecord } from './views/cite-dialog.js';
import { html, raw, esc, $, $$, ago, compact, bytes, toast, slot, mercator, card, qlink } from './ui.js';

const view = $('#view');
const hero = $('#hero');
const input = $('#q');
const langSel = $('#lang');

/* ───────────── boot ───────────── */

mountPicker($('#theme-btn'), $('#theme-panel'));

try { const l = localStorage.getItem('rexx-lang'); if (l) { langSel.value = l; api.setLang(l); } } catch { /* storage blocked */ }
langSel.addEventListener('change', () => {
  api.setLang(langSel.value);
  try { localStorage.setItem('rexx-lang', langSel.value); } catch { /* ignore */ }
  route();
});

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW', e)));
}

function netStatus() {
  const el = $('#net');
  el.textContent = navigator.onLine ? 'online' : 'offline';
  el.className = `net ${navigator.onLine ? 'on' : 'off'}`;
  document.body.classList.toggle('is-offline', !navigator.onLine);
}
addEventListener('online', () => { netStatus(); toast('Back online.'); });
addEventListener('offline', () => { netStatus(); toast('You\'re offline. Your Vault still works.'); });
netStatus();

async function refreshVaultCount() {
  try { const n = await vault.count(); $('#vault-count').textContent = n || ''; } catch { /* IDB unavailable */ }
}
refreshVaultCount();

/* ───────────── search box + suggestions ───────────── */

const suggest = $('#suggest');
let sugTimer, sugIdx = -1;

$('#search').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = input.value.trim();
  suggest.hidden = true;
  if (q) location.hash = `#/q/${encodeURIComponent(q)}`;
});

input.addEventListener('input', () => {
  clearTimeout(sugTimer);
  const q = input.value.trim();
  if (q.length < 2 || !navigator.onLine) { suggest.hidden = true; return; }
  sugTimer = setTimeout(async () => {
    try {
      const items = await api.wikiSuggest(q);
      sugIdx = -1;
      suggest.innerHTML = items.map((s) => html`<li role="option" data-t="${s.title}"><b>${s.title}</b><span>${s.desc}</span></li>`).join('');
      suggest.hidden = !items.length;
    } catch { suggest.hidden = true; }
  }, 160);
});

input.addEventListener('keydown', (e) => {
  const items = $$('li', suggest);
  if (suggest.hidden || !items.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    sugIdx = (sugIdx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items.forEach((li, i) => li.classList.toggle('active', i === sugIdx));
    input.value = items[sugIdx].dataset.t;
  } else if (e.key === 'Escape') suggest.hidden = true;
});

suggest.addEventListener('mousedown', (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  e.preventDefault();
  input.value = li.dataset.t;
  suggest.hidden = true;
  location.hash = `#/q/${encodeURIComponent(li.dataset.t)}`;
});
input.addEventListener('blur', () => setTimeout(() => { suggest.hidden = true; }, 120));

addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== input && !/input|textarea|select/i.test(document.activeElement.tagName)) {
    e.preventDefault(); input.focus(); input.select();
  }
});

$('#teleport').addEventListener('click', async () => {
  try {
    const r = await api.wikiRandom();
    location.hash = `#/q/${encodeURIComponent(r.title)}`;
  } catch { toast('Teleport needs a connection. Try the Vault.'); }
});

/* ───────────── router ───────────── */

const ctx = { refreshVaultCount: () => refreshVaultCount() };
const routes = {
  '': home, pulse, planet, vault: vaultView, offline: offlineView,
  research: (arg) => researchView(view, arg, ctx),
  library: (arg) => libraryView(view, arg, ctx),
  book: (arg) => bookView(view, arg, ctx),
  ask: (arg) => askView(view, arg, ctx),
  day: (arg) => dayView(view, arg, ctx),
  q: (arg) => search(decodeURIComponent(arg)),
  read: (arg) => reader(decodeURIComponent(arg)),
};

let planetTimer;
function route() {
  clearInterval(planetTimer);
  const [, name = '', ...rest] = location.hash.replace(/^#/, '').split('/');
  const fn = routes[name] || home;
  const tab = { book: 'library', q: '', read: 'vault', day: 'home' }[name] ?? (name || 'home');
  $$('.tabs a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));
  hero.classList.toggle('compact', name !== '');
  suggest.hidden = true;
  if (name !== 'q') input.value = '';
  view.innerHTML = '';
  fn(rest.join('/'));
  if (name) scrollTo({ top: 0, behavior: 'smooth' });
}
addEventListener('hashchange', route);

/* ───────────── shared bits ───────────── */


function postList(posts) {
  if (!posts?.length) return '';
  return html`<ul class="posts">${posts.map((p) => raw(html`
    <li>
      ${p.avatar ? raw(html`<img class="av" src="${p.avatar}" alt="" loading="lazy">`) : raw('<span class="av"></span>')}
      <div>
        <div class="meta"><b>${p.author}</b> <span>@${p.handle}</span> · <span>${ago(p.time)}</span></div>
        <p>${p.text.slice(0, 280)}${p.text.length > 280 ? '…' : ''}</p>
        <div class="meta"><a href="${p.url}" target="_blank" rel="noopener">open ↗</a> · ♥ ${compact(p.likes)} · ⟲ ${compact(p.reposts)}</div>
      </div>
    </li>`))}</ul>`;
}

function hnList(items) {
  if (!items?.length) return '';
  return html`<ol class="list">${items.map((h) => raw(html`
    <li><a href="${h.url}" target="_blank" rel="noopener">${h.title}</a>
    <span class="meta">▲ ${h.points} · <a href="${h.discuss}" target="_blank" rel="noopener">${h.comments} comments</a> · ${ago(h.time)}</span></li>`))}</ol>`;
}

function newsList(items) {
  if (!items?.length) return '';
  return html`<ul class="list news">${items.map((a) => raw(html`
    <li><a href="${a.url}" target="_blank" rel="noopener">${a.title}</a>
    <span class="meta">${a.source}${a.country ? ` · ${a.country}` : ''}${a.time ? ` · ${ago(a.time)}` : ''}</span></li>`))}</ul>`;
}

function mostReadList(articles, n = 10) {
  return html`<ol class="list ranks">${(articles || []).slice(0, n).map((a) => raw(html`
    <li>${a.thumbnail ? raw(html`<img src="${a.thumbnail.source}" alt="" loading="lazy">`) : ''}
      <div>${raw(qlink(a.titles?.normalized || a.title))}<span class="meta">${a.description || ''}${a.views ? ` · ${compact(a.views)} views` : ''}</span></div></li>`))}</ol>`;
}

/** Wikipedia "In the news" blurbs: keep only the text and internal links, re-pointed into rexx. */
function storyHTML(story) {
  const links = [];
  const marked = story.replace(/<a [^>]*href="\.\/([^"#]+)[^"]*"[^>]*>(.*?)<\/a>/g, (_, t, label) => {
    links.push([decodeURIComponent(t).replace(/_/g, ' '), label.replace(/<[^>]+>/g, '')]);
    return `\uE000${links.length - 1}\uE000`;
  });
  const decode = (h) => { const d = document.createElement('textarea'); d.innerHTML = h; return d.value; };
  const text = esc(decode(marked.replace(/<[^>]+>/g, '')));
  return text.replace(/\uE000(\d+)\uE000/g, (_, i) => qlink(links[i][0], decode(links[i][1])));
}

/* ───────────── Today ───────────── */

function home() {
  view.innerHTML = html`<div class="grid">
    ${raw(card('🌟 Featured today', null, { wide: true, cls: 'featured' }))}
    ${raw(card('📰 In the news', null))}
    ${raw(card('🔥 What the world is reading', null))}
    ${raw(card('⏳ On this day', null, { wide: true }))}
    ${raw(card('🌋 Planet right now', null))}
    ${raw(card('💬 Hacker News front page', null, { optional: true }))}
    ${raw(card('🖼️ Picture of the day', null))}
  </div>`;
  const [feat, news, read, otd, quake, hn, pic] = $$('.card .body', view);
  const feed = api.wikiFeed();

  slot(feat, feed, (f) => {
    const t = f.tfa;
    if (!t) return '';
    return html`<div class="feature">
      ${t.originalimage ? raw(html`<img src="${t.thumbnail?.source || t.originalimage.source}" alt="">`) : ''}
      <div><h2>${raw(qlink(t.titles?.normalized || t.title))}</h2><p class="muted">${t.description || ''}</p><p>${t.extract}</p></div>
    </div>`;
  });
  slot(news, feed, (f) => f.news?.length && html`<ul class="list">${f.news.slice(0, 6).map((n) => raw(html`
    <li>${raw(storyHTML(n.story))}</li>`))}</ul>`);
  slot(read, feed, (f) => f.mostread?.articles && mostReadList(f.mostread.articles, 8));
  slot(otd, feed, (f) => f.onthisday?.length && html`<ul class="timeline">${f.onthisday.slice(0, 8).map((e) => raw(html`
    <li><span class="yr">${e.year}</span><p>${e.text} ${e.pages?.[0] ? raw(qlink(e.pages[0].titles?.normalized || e.pages[0].title, '→')) : ''}</p></li>`))}</ul>
    <a class="more" href="#/day">Births, deaths and any other date →</a>`);
  slot(pic, feed, (f) => f.image && html`<figure class="pod"><img src="${f.image.thumbnail?.source}" alt="${f.image.title}" loading="lazy">
      <figcaption>${(f.image.description?.text || '').slice(0, 260)}</figcaption></figure>`);
  slot(quake, api.earthquakes(), (qs) => {
    const big = qs.sort((a, b) => b.mag - a.mag).slice(0, 5);
    return html`<p class="muted">${qs.length} earthquakes ≥ M4.5 this week. Strongest:</p>
      <ul class="list">${big.map((q) => raw(html`<li><span class="mag m${Math.floor(q.mag)}">M${q.mag.toFixed(1)}</span> ${q.place} <span class="meta">${ago(q.time)}</span></li>`))}</ul>
      <a class="more" href="#/planet">Open the live planet →</a>`;
  });
  slot(hn, api.hackerNews(), (items) => hnList(items.slice(0, 7)));
}

/* ───────────── Search ───────────── */

async function resolveTitle(q) {
  try {
    const s = await api.wikiSummary(q);
    if (s.type !== 'disambiguation') return s;
  } catch { /* fall through to search */ }
  const hits = await api.wikiSearch(q, 1);
  if (!hits.length) throw new Error('nothing');
  return api.wikiSummary(hits[0].title);
}

async function search(q) {
  input.value = q;
  document.title = `${q} — rexx.space`;
  view.innerHTML = html`<section class="entity"><div class="skel big"></div></section>`;

  let s;
  try {
    s = await resolveTitle(q);
  } catch {
    // Offline? Look in the vault before giving up.
    const saved = await vault.get(vault.idFor(api.getLang(), q)).catch(() => null);
    if (saved) { location.replace(`#/read/${encodeURIComponent(saved.id)}`); return; }
    view.innerHTML = html`<section class="empty"><h2>Nothing found.</h2>
      <p class="muted">${api.DEMO ? `“${q}” isn't one of this demo's sample topics. Try one of the topics in the note above.` : navigator.onLine ? `Nothing matched “${q}”. Try another spelling, or teleport somewhere random.` : 'You\'re offline and this isn\'t in your Vault yet.'}</p></section>`;
    return;
  }

  const title = s.titles?.normalized || s.title;
  const id = vault.idFor(api.getLang(), title);
  const isSaved = !!(await vault.get(id).catch(() => null));
  const entityP = s.wikibase_item ? api.wikidataEntity(s.wikibase_item).catch(() => null) : Promise.resolve(null);

  view.innerHTML = html`
    <section class="entity">
      ${s.originalimage || s.thumbnail ? raw(html`<img class="portrait" src="${s.thumbnail?.source || s.originalimage?.source}" alt="">`) : ''}
      <div class="entity-main">
        <span class="badge" id="etype">${s.description || 'Article'}</span>
        <h2>${title}</h2>
        <p class="lead">${s.extract}</p>
        <div class="actions">
          <button id="save" class="${isSaved ? 'saved' : ''}">${isSaved ? '✓ In your Vault' : '⬇ Save for offline'}</button>
          <button class="ghost" id="cite">Cite</button>
          <a class="ghost btn" href="#/ask/${encodeURIComponent(`Tell me about ${title}`)}">Ask about this</a>
          <a class="ghost btn" href="${s.content_urls?.desktop?.page}" target="_blank" rel="noopener">Wikipedia ↗</a>
          <button class="ghost" id="share">Share</button>
        </div>
        <div id="socials" class="socials"></div>
      </div>
    </section>
    <div class="grid" id="sgrid">
      ${raw(card('📖 Dictionary', null, { optional: true, wide: true, cls: 'dict' }))}
      ${raw(card('🧬 Key facts', null, { cls: 'facts' }))}
      ${raw(card('🗺️ On the map', null, { cls: 'mapcard', optional: true }))}
      ${raw(card('🌤️ Weather there now', null, { optional: true }))}
      ${raw(card('🏳️ Country snapshot', null, { optional: true }))}
      ${raw(card('🧳 Travel guide', null, { optional: true }))}
      ${raw(card('📍 Nearby', null, { optional: true }))}
      ${raw(card('📄 Research papers', null, { optional: true, wide: true, cls: 'papers-card' }))}
      ${raw(card('🖼️ Images', null, { optional: true, wide: true }))}
      ${raw(card('📰 Latest news', null, { optional: true }))}
      ${raw(card('🦋 Bluesky says', null, { optional: true }))}
      ${raw(card('🐘 Mastodon #tag', null, { optional: true }))}
      ${raw(card('💬 Hacker News', null, { optional: true }))}
      ${raw(card('📚 Books', null, { optional: true }))}
      ${raw(card('📗 Free to read', null, { optional: true }))}
      ${raw(card('🔭 Related', null))}
    </div>`;

  $('#save').addEventListener('click', () => toggleSave(s, title, id));
  $('#share').addEventListener('click', async () => {
    const url = location.href;
    try { if (navigator.share) await navigator.share({ title, url }); else { await navigator.clipboard.writeText(url); toast('Link copied.'); } } catch { /* cancelled */ }
  });

  $('#cite').addEventListener('click', () => openCite(wikiRecord(s, api.getLang())));
  const [dictEl, factsEl, mapEl, wxEl, ctyEl, travelEl, nearEl, paperEl, imgEl, newsEl, bskyEl, mastoEl, hnEl, booksEl, freeEl, relEl] = $$('#sgrid .card .body');
  const plainTitle = title.replace(/\s*\(.*\)$/, '');
  const coordFromSummary = s.coordinates ? { lat: s.coordinates.lat, lon: s.coordinates.lon } : null;

  slot(factsEl, entityP, (e) => {
    if (!e) return '';
    $('#etype').textContent = `${e.type !== 'thing' ? e.type + ' · ' : ''}${s.description || ''}`;
    if (e.socials.length) {
      $('#socials').innerHTML = e.socials.map((x) => html`<a href="${x.url}" target="_blank" rel="noopener" title="${x.handle}">${x.name}</a>`).join('');
    }
    return e.facts.length ? html`<dl>${e.facts.map((f) => raw(html`<dt>${f.label}</dt><dd>${f.vals.join(', ')}</dd>`))}</dl>` : '';
  });

  const coordP = entityP.then((e) => e?.coord || coordFromSummary);
  // The demo build can't embed the OpenStreetMap iframe, so it drops the map card.
  if (api.DEMO) mapEl.closest('.card').remove();
  else slot(mapEl, coordP, (c) => {
    if (!c) return '';
    const d = 0.6;
    return html`<iframe title="Map of ${title}" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=${c.lon - d},${c.lat - d / 2},${c.lon + d},${c.lat + d / 2}&layer=mapnik&marker=${c.lat},${c.lon}"></iframe>
      <p class="meta">${c.lat.toFixed(3)}, ${c.lon.toFixed(3)} · <a href="https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lon}#map=10/${c.lat}/${c.lon}" target="_blank" rel="noopener">OpenStreetMap ↗</a></p>`;
  });
  const aqP = coordP.then((c) => (c ? api.airQuality(c.lat, c.lon).catch(() => null) : null));
  slot(wxEl, coordP.then(async (c) => (c ? { ...(await api.weather(c.lat, c.lon)), aq: await aqP } : null)), (w) => {
    if (!w?.current) return '';
    const aqi = w.aq?.us_aqi;
    const aqLabel = aqi == null ? '' : aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : aqi <= 150 ? 'Unhealthy for sensitive groups' : aqi <= 200 ? 'Unhealthy' : 'Very unhealthy';
    const sun = w.daily.sunrise?.[0] ? `☀ ${w.daily.sunrise[0].slice(11, 16)} – ${w.daily.sunset[0].slice(11, 16)}` : '';
    const [icon, label] = api.WMO[w.current.weather_code] || ['🌡️', ''];
    const days = w.daily.time.map((t, i) => ({ t, max: w.daily.temperature_2m_max[i], min: w.daily.temperature_2m_min[i], c: w.daily.weather_code[i] }));
    return html`<div class="wx"><span class="wx-icon">${icon}</span><div><b class="wx-t">${Math.round(w.current.temperature_2m)}°C</b>
      <span class="muted">${label} · feels ${Math.round(w.current.apparent_temperature)}° · 💨 ${Math.round(w.current.wind_speed_10m)} km/h · 💧${w.current.relative_humidity_2m}%</span>
      <span class="meta">${sun ? `${sun} local · ` : ''}${w.timezone}</span>
      ${aqi != null ? raw(html`<span class="meta">Air quality: <b>${aqLabel}</b> (US AQI ${Math.round(aqi)}${w.aq.pm2_5 != null ? `, PM2.5 ${w.aq.pm2_5} µg/m³` : ''})</span>`) : ''}</div></div>
      <ul class="days">${days.map((d) => raw(html`<li><span>${new Date(d.t).toLocaleDateString('en', { weekday: 'short' })}</span><span>${(api.WMO[d.c] || ['·'])[0]}</span><b>${Math.round(d.max)}°</b><span class="muted">${Math.round(d.min)}°</span></li>`))}</ul>`;
  });
  slot(ctyEl, entityP.then(async (e) => {
    if (!e?.iso2) return null;
    const c = await api.country(e.iso2);
    const code = Object.keys(c.currencies || {})[0];
    if (code && code !== 'USD') c.fx = await api.exchangeRate(code).catch(() => null);
    return c;
  }), (c) => c && html`
    <div class="country"><img src="${c.flags?.svg || c.flags?.png}" alt="${c.flags?.alt || 'flag'}">
    <dl><dt>Official name</dt><dd>${c.name?.official}</dd><dt>Capital</dt><dd>${(c.capital || []).join(', ')}</dd>
    <dt>Region</dt><dd>${c.subregion || c.region}</dd><dt>Population</dt><dd>${compact(c.population)}</dd>
    <dt>Languages</dt><dd>${Object.values(c.languages || {}).join(', ')}</dd>
    <dt>Currency</dt><dd>${Object.values(c.currencies || {}).map((x) => `${x.name} (${x.symbol || ''})`).join(', ')}</dd>
    ${c.fx?.rates?.USD ? raw(html`<dt>Exchange rate</dt><dd>1 ${Object.keys(c.currencies)[0]} = ${c.fx.rates.USD.toPrecision(4)} USD${c.fx.rates.EUR ? ` · ${c.fx.rates.EUR.toPrecision(4)} EUR` : ''} <span class="meta">ECB reference rate, ${c.fx.date}</span></dd>`) : ''}</dl></div>`);

  // Places: travel guide and nearby articles.
  const isPlace = entityP.then((e) => (e && ['city', 'country', 'place'].includes(e.type) ? e : null));
  slot(travelEl, isPlace.then((e) => (e ? api.travelGuide(title) : null)), (t) => t && html`<p>${t.extract.slice(0, 600)}${t.extract.length > 600 ? '…' : ''}</p>
    <a class="more" href="${t.url}" target="_blank" rel="noopener">Full guide on Wikivoyage ↗</a>`);
  slot(nearEl, coordP.then((c) => (c ? api.nearby(c.lat, c.lon, 8) : null)), (ns) => ns?.length && html`<ul class="list">${ns.map((n) => raw(html`<li>${raw(qlink(n.title))} <span class="meta">${n.dist < 1000 ? `${Math.round(n.dist)} m` : `${(n.dist / 1000).toFixed(1)} km`} away</span></li>`))}</ul>`);

  // Dictionary: only for short queries that look like words, not for people or places.
  const looksLikeWord = q.trim().split(/\s+/).length <= 2 && !/\d/.test(q);
  slot(dictEl, looksLikeWord ? entityP.then((e) => (e && ['person', 'city', 'country', 'organization', 'place'].includes(e.type) ? null : api.define(q))) : Promise.resolve(null), (d) => d && html`
    <div class="dict-head"><b class="dict-word">${d.word}</b>${d.phonetic ? raw(html` <span class="muted">${d.phonetic}</span>`) : ''}
      ${d.audio ? raw(html` <button type="button" class="ghost small" id="say" data-src="${d.audio}" aria-label="Play pronunciation">🔊 Listen</button>`) : ''}</div>
    <div class="dict-body">${d.meanings.slice(0, 4).map((m) => raw(html`<div class="pos"><i>${m.pos}</i><ol>${m.defs.map((x) => raw(html`<li>${x.text}${x.example ? raw(html`<span class="meta">“${x.example}”</span>`) : ''}</li>`))}</ol>
      ${m.synonyms.length ? raw(html`<span class="meta">Synonyms: ${m.synonyms.join(', ')}</span>`) : ''}</div>`))}</div>
    <a class="more" href="${d.source}" target="_blank" rel="noopener">More on Wiktionary ↗</a>`);
  dictEl.addEventListener('click', (e) => { const b = e.target.closest('#say'); if (b) new Audio(b.dataset.src).play().catch(() => toast('Couldn\'t play the recording.')); });

  // Research papers about the topic, most cited first.
  let topPapers = [];
  slot(paperEl, api.papers(plainTitle, { sort: 'cited', per: 5 }), (r) => {
    topPapers = r.items;
    if (!topPapers.length) return '';
    setTimeout(() => wirePapers(paperEl, topPapers, refreshVaultCount));
    return html`<ol class="list papers">${topPapers.map((p, i) => raw(paperHTML(p, i)))}</ol>
      <a class="more" href="#/research/${encodeURIComponent(plainTitle)}">All papers on ${plainTitle} →</a>`;
  });

  // Freely licensed images.
  slot(imgEl, api.images(plainTitle, 12), (ims) => ims.length > 1 && html`<div class="gallery">${ims.map((m) => raw(html`
    <a href="${m.page}" target="_blank" rel="noopener" title="${m.title}${m.author ? ` · ${m.author}` : ''}${m.license ? ` · ${m.license}` : ''}"><img src="${m.thumb}" alt="${m.title}" loading="lazy"></a>`))}</div>
    <p class="meta">From Wikimedia Commons. Click an image for its author and licence.</p>`);

  // Free public-domain books by or about the topic.
  slot(freeEl, api.freeBooks(plainTitle), (r) => r.items.length && html`<ul class="list">${r.items.slice(0, 5).map((b) => raw(html`<li><a href="#/book/${b.id}">${b.title}</a><span class="meta">${b.authors.join(', ')}</span></li>`))}</ul>
    <a class="more" href="#/library/${encodeURIComponent(plainTitle)}">More free books →</a>`);

  slot(newsEl, api.gdeltNews(`"${title.replace(/\s*\(.*\)$/, '')}"`), newsList);
  slot(bskyEl, api.blueskySearch(title.replace(/\s*\(.*\)$/, '')), postList);
  slot(mastoEl, api.mastodonTag(title.replace(/\s*\(.*\)$/, '')), (p) => {
    mastoEl.closest('.card').querySelector('h3').textContent = `🐘 Mastodon #${title.replace(/\s*\(.*\)$/, '').replace(/[^\p{L}\p{N}_]/gu, '')}`;
    return postList(p);
  });
  slot(hnEl, api.hackerNews(title.replace(/\s*\(.*\)$/, '')), hnList);
  slot(booksEl, api.books(title.replace(/\s*\(.*\)$/, '')), (bs) => bs.length && html`<ul class="books">${bs.map((b) => raw(html`
    <li><a href="${b.url}" target="_blank" rel="noopener">${b.cover ? raw(html`<img src="${b.cover}" alt="" loading="lazy">`) : raw('<span class="nocover">📘</span>')}
    <b>${b.title}</b><span class="meta">${b.author || ''}${b.year ? ` · ${b.year}` : ''}</span></a></li>`))}</ul>`);
  slot(relEl, api.wikiSearch(q, 9), (rs) => {
    const list = rs.filter((r) => r.title !== title).slice(0, 8);
    return list.length && html`<ul class="list">${list.map((r) => raw(html`<li>${raw(qlink(r.title))}<span class="meta">${r.snippet}</span></li>`))}</ul>`;
  });
}

async function saveArticle(summary, title, id) {
  const [text, img, entity] = await Promise.all([
    api.wikiFullText(title),
    vault.inlineImage(summary.thumbnail?.source),
    summary.wikibase_item ? api.wikidataEntity(summary.wikibase_item).catch(() => null) : null,
  ]);
  await vault.put({
    id, title, lang: api.getLang(), description: summary.description || '',
    extract: summary.extract, text, image: img, facts: entity?.facts || [], socials: entity?.socials || [],
    url: summary.content_urls?.desktop?.page,
  });
}

async function toggleSave(summary, title, id) {
  const btn = $('#save');
  if (btn.classList.contains('saved')) {
    await vault.remove(id);
    btn.classList.remove('saved'); btn.textContent = '⬇ Save for offline';
    toast('Removed from your Vault.');
  } else {
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      await saveArticle(summary, title, id);
      btn.classList.add('saved'); btn.textContent = '✓ In your Vault';
      toast('Saved. Readable anywhere — even in airplane mode.');
    } catch (e) { console.warn(e); btn.textContent = '⬇ Save for offline'; toast('Couldn\'t save — check your connection.'); }
    btn.disabled = false;
  }
  refreshVaultCount();
}

/* ───────────── Reader (offline) ───────────── */

function textToHTML(text) {
  return text.split(/\n+/).map((line) => {
    const h = /^(={2,4})\s*(.+?)\s*\1$/.exec(line.trim());
    if (h) return `<h${h[1].length + 1}>${esc(h[2])}</h${h[1].length + 1}>`;
    return line.trim() ? `<p>${esc(line)}</p>` : '';
  }).join('');
}

async function reader(id) {
  const a = await vault.get(id).catch(() => null);
  if (!a) { view.innerHTML = '<section class="empty"><h2>Not in your Vault.</h2></section>'; return; }
  if (a.kind === 'book') { location.replace(`#/book/${a.id.slice(5)}`); return; }
  if (a.kind === 'paper') {
    document.title = `${a.title} — rexx.space`;
    view.innerHTML = html`<article class="reader">
      <span class="badge">📄 Research paper · saved ${ago(a.savedAt)}</span>
      <h2 class="paper-h">${a.title}</h2>
      <p class="lead">${a.authors.join(', ')}</p>
      <p class="meta">${a.venue || ''}${a.year ? ` · ${a.year}` : ''}${a.cited != null ? ` · cited by ${compact(a.cited)}` : ''}${a.doi ? ` · doi:${a.doi}` : ''}</p>
      <div class="actions"><button class="ghost" id="pcite">Cite</button>
        <a class="ghost btn" href="${a.url}" target="_blank" rel="noopener">Publisher page ↗</a>
        ${a.pdf ? raw(html`<a class="ghost btn" href="${a.pdf}" target="_blank" rel="noopener">Free PDF ↗</a>`) : ''}</div>
      <div class="prose"><h3>Abstract</h3>${a.abstract ? raw(html`<p>${a.abstract}</p>`) : raw('<p class="muted">No abstract is available for this paper.</p>')}</div>
    </article>`;
    $('#pcite').addEventListener('click', () => openCite(paperRecord(a)));
    return;
  }
  document.title = `${a.title} — rexx.space (offline)`;
  view.innerHTML = html`<article class="reader">
    <span class="badge">📦 From your Vault · saved ${ago(a.savedAt)}</span>
    <h2>${a.title}</h2><p class="muted">${a.description}</p>
    ${a.image ? raw(html`<img class="portrait" src="${a.image}" alt="">`) : ''}
    ${a.facts?.length ? raw(html`<dl class="facts-inline">${a.facts.map((f) => raw(html`<dt>${f.label}</dt><dd>${f.vals.join(', ')}</dd>`))}</dl>`) : ''}
    ${a.socials?.length ? raw(html`<div class="socials">${a.socials.map((x) => raw(html`<a href="${x.url}" target="_blank" rel="noopener">${x.name}</a>`))}</div>`) : ''}
    <div class="prose">${raw(textToHTML(a.text || a.extract))}</div>
    <p class="meta">Source: <a href="${a.url}" target="_blank" rel="noopener">Wikipedia</a> (CC BY-SA 4.0) · <button type="button" class="ghost small" id="rcite">Cite</button></p>
  </article>`;
  $('#rcite').addEventListener('click', () => openCite({ kind: 'web', title: a.title, container: 'Wikipedia', publisher: 'Wikimedia Foundation', url: a.url }));
}

/* ───────────── Pulse ───────────── */

function pulse() {
  view.innerHTML = html`<div class="grid">
    ${raw(card('🔥 Most-read on Wikipedia today', null))}
    ${raw(card('💬 Hacker News', null, { optional: true }))}
    ${raw(card('🐘 Trending on Mastodon', null, { optional: true }))}
    ${raw(card('🔗 Links people are sharing', null, { optional: true }))}
    ${raw(card('🦋 Bluesky: what\'s buzzing', null, { optional: true, wide: true }))}
  </div>`;
  const [wr, hn, mt, ml, bs] = $$('.card .body', view);
  slot(wr, api.wikiFeed(), (f) => mostReadList(f.mostread?.articles, 15));
  slot(hn, api.hackerNews(), hnList);
  const trends = api.mastodonTrends();
  slot(mt, trends, (t) => t.tags.length && html`<div class="tags">${t.tags.map((x) => raw(html`<a href="#/q/${encodeURIComponent(x.name)}" style="--w:${Math.min(1, x.uses / 400)}">#${x.name}<small>${compact(x.uses)}</small></a>`))}</div>`);
  slot(ml, trends, (t) => newsList(t.links));
  slot(bs, (async () => {
    // Search a handful of what the world is reading right now.
    const f = await api.wikiFeed();
    const topic = f.mostread?.articles?.find((a) => !/^(Main_Page|Special:)/.test(a.title))?.titles?.normalized || 'news';
    bs.closest('.card').querySelector('h3').textContent = `🦋 Bluesky on “${topic}” (today's #1 read)`;
    return api.blueskySearch(topic);
  })(), postList);
}

/* ───────────── Planet ───────────── */

function planet() {
  if (api.DEMO) {
    view.innerHTML = html`<div class="grid">${raw(card('🌋 Live planet', raw('<p class="muted live-note">The live map of this week\'s earthquakes and the space station\'s position needs an internet connection, so it isn\'t part of this demo. Run the full app to see it.</p>'), { wide: true }))}</div>`;
    return;
  }
  // Zoom-1 OSM tiles stitched into a 512px world (Web Mercator), styled dark. Cached by the SW for offline.
  const tiles = [0, 1].flatMap((y) => [0, 1].map((x) => `<img src="https://tile.openstreetmap.org/1/${x}/${y}.png" alt="" style="left:${x * 50}%;top:${y * 50}%">`)).join('');
  view.innerHTML = html`<section class="planet">
    <div class="worldmap" id="world">${raw(tiles)}<div id="pins"></div></div>
    <div class="legend"><span><i class="dot quake"></i> Earthquake ≥ M4.5 (past 7 days, size = magnitude)</span><span><i class="dot iss"></i> International Space Station (live)</span></div>
  </section>
  <div class="grid">${raw(card('🛰️ ISS right now', null, { optional: true }))}${raw(card('🌋 Strongest quakes this week', null, { wide: true }))}</div>`;
  const pins = $('#pins');
  const [issEl, listEl] = $$('.card .body', view);

  api.earthquakes().then((qs) => {
    pins.insertAdjacentHTML('beforeend', qs.map((q) => {
      const p = mercator(q.lat, q.lon);
      const size = Math.max(6, (q.mag - 4) * 9);
      return html`<a class="pin quake" href="${q.url}" target="_blank" rel="noopener" style="left:${(p.x * 100).toFixed(3)}%;top:${(p.y * 100).toFixed(3)}%;--s:${size}px" title="M${q.mag} · ${q.place}"></a>`;
    }).join(''));
    listEl.innerHTML = html`<ul class="list cols">${qs.sort((a, b) => b.mag - a.mag).slice(0, 16).map((q) => raw(html`
      <li><span class="mag m${Math.floor(q.mag)}">M${q.mag.toFixed(1)}</span> <a href="${q.url}" target="_blank" rel="noopener">${q.place || 'Unknown'}</a>
      <span class="meta">${ago(q.time)} · depth ${Math.round(q.depth)} km${q.tsunami ? ' · 🌊 tsunami alert' : ''}</span></li>`))}</ul>`;
  }).catch(() => { listEl.innerHTML = '<p class="muted">USGS feed unavailable right now.</p>'; });

  const iss = async () => {
    try {
      const p = await api.issPosition();
      const m = mercator(p.lat, p.lon);
      let pin = $('#iss-pin');
      if (!pin) { pins.insertAdjacentHTML('beforeend', '<span id="iss-pin" class="pin iss" title="ISS">🛰️</span>'); pin = $('#iss-pin'); }
      pin.style.left = `${m.x * 100}%`; pin.style.top = `${m.y * 100}%`;
      issEl.innerHTML = html`<p class="big-num">${p.lat.toFixed(2)}°, ${p.lon.toFixed(2)}°</p>
        <p class="muted">Altitude ${Math.round(p.alt)} km · ${compact(Math.round(p.vel))} km/h — that's about once around Earth every 92 minutes.</p>`;
    } catch { if (!$('#iss-pin')) issEl.closest('.card')?.remove(); }
  };
  iss();
  planetTimer = setInterval(iss, 5000);
}

/* ───────────── Vault ───────────── */

async function vaultView() {
  let items = [];
  try { items = await vault.all(); } catch { /* ignore */ }
  const total = items.reduce((n, i) => n + JSON.stringify(i).length, 0);
  view.innerHTML = html`<section class="vault">
    <header class="section-head"><h2>📦 Your Vault</h2><p class="muted">${items.length} saved item${items.length === 1 ? '' : 's'} (${items.filter((i) => !i.kind).length} articles, ${items.filter((i) => i.kind === 'paper').length} papers, ${items.filter((i) => i.kind === 'book').length} books) · ${bytes(total)} on this device · readable with no connection.</p></header>
    ${items.length ? raw(html`<div class="shelf">${items.map((a) => raw(html`
      <a class="tile" href="#/read/${encodeURIComponent(a.id)}">
        ${a.image ? raw(html`<img src="${a.image}" alt="">`) : raw(`<span class="ph">${a.kind === 'paper' ? '📄' : a.kind === 'book' ? '📗' : '✦'}</span>`)}
        <b>${a.title}</b><span class="meta">${a.kind === 'paper' ? 'Paper · ' : a.kind === 'book' ? 'Book · ' : ''}${a.description || (a.lang || '').toUpperCase()}</span>
        <button class="x" data-id="${a.id}" title="Remove" aria-label="Remove ${a.title}">✕</button>
      </a>`))}</div>`)
    : raw('<div class="empty"><h3>Nothing saved yet.</h3><p class="muted">Search anything and tap <b>Save for offline</b>, or grab a whole pack from the <a href="#/offline">Offline</a> tab.</p></div>')}
  </section>`;
  view.addEventListener('click', async (e) => {
    const x = e.target.closest('.x');
    if (!x) return;
    e.preventDefault();
    await vault.remove(x.dataset.id);
    refreshVaultCount();
    vaultView();
  }, { once: true });
}

/* ───────────── Offline ───────────── */

async function offlineView() {
  const est = navigator.storage?.estimate ? await navigator.storage.estimate() : null;
  const persisted = navigator.storage?.persisted ? await navigator.storage.persisted() : false;

  view.innerHTML = html`<section class="offline">
    <header class="section-head"><h2>Offline mode</h2>
      <p class="muted">rexx.space is a Progressive Web App: the app itself is cached on your device, everything you open is remembered, and you can pack knowledge to carry with you.</p></header>

    <div class="grid">
      <article class="card">
        <h3>📊 This device</h3>
        <div class="body"><dl>
          <dt>Status</dt><dd>${navigator.onLine ? 'Online' : 'Offline'}</dd>
          <dt>Storage used</dt><dd>${est ? bytes(est.usage) : 'unknown'}</dd>
          <dt>Storage available</dt><dd>${est ? bytes(est.quota) : 'unknown'}</dd>
          <dt>Protected from cleanup</dt><dd>${persisted ? 'Yes' : 'No'}</dd>
        </dl>
        ${persisted ? '' : raw('<button id="persist" class="ghost">Ask the browser to keep my data</button>')}</div>
      </article>

      <article class="card wide">
        <h3>🎒 Download a knowledge pack</h3>
        <div class="body">
          <p>Saves full articles (text, key facts, thumbnail) into your Vault for reading anywhere.</p>
          <div class="packs">
            <button data-pack="mostread" data-n="25">🔥 Today's 25 most-read</button>
            <button data-pack="mostread" data-n="50">🔥 Top 50 most-read</button>
            <button data-pack="list" data-list="Earth,Moon,Sun,Solar System,Milky Way,Universe,Big Bang,Black hole,Mars,Jupiter,Saturn,Galaxy,Star,Exoplanet,International Space Station">🔭 Space essentials</button>
            <button data-pack="list" data-list="World War I,World War II,Roman Empire,Ancient Egypt,Industrial Revolution,French Revolution,Cold War,Mughal Empire,Renaissance,Silk Road,Ottoman Empire,Indus Valley Civilisation">🏛️ History essentials</button>
            <button data-pack="list" data-list="First aid,Cardiopulmonary resuscitation,Water purification,Knot,Edible plant,Navigation,Fire making,Shelter (building),Hypothermia,Dehydration">⛺ Survival kit</button>
          </div>
          <div class="progress" hidden><div class="bar"><i></i></div><span class="ptext"></span></div>
        </div>
      </article>

      <article class="card wide explainer">
        <h3>🧠 Can it work <em>fully</em> offline?</h3>
        <div class="body">
          <p><b>Short answer: yes for knowledge, no for “live”.</b> Anything that has already happened can be packed onto your device. Anything that is happening <em>right now</em> — news, posts, weather, quakes — has to travel over a network to reach you. Physics, not code.</p>
          <table>
            <thead><tr><th>Layer</th><th>Offline?</th><th>How</th></tr></thead>
            <tbody>
              <tr><td>The app itself</td><td class="ok">✅ Yes</td><td>Service worker caches the whole shell — opens in airplane mode.</td></tr>
              <tr><td>Things you've viewed</td><td class="ok">✅ Yes</td><td>Last good copy of every response is cached automatically.</td></tr>
              <tr><td>Saved articles / packs</td><td class="ok">✅ Yes</td><td>Stored in IndexedDB (your Vault) with facts and images.</td></tr>
              <tr><td>All of Wikipedia</td><td class="ok">✅ Yes*</td><td>Full English Wikipedia as a Kiwix ZIM: ~110 GB with images, ~50 GB text-only, ~1–5 GB for “top articles” editions.</td></tr>
              <tr><td>Saved papers and free books</td><td class="ok">✅ Yes</td><td>Paper abstracts and whole Project Gutenberg books go into your Vault too.</td></tr>
              <tr><td>Ask (AI answers)</td><td class="mid">🟡 Online only</td><td>Ask uses Claude with your own API key, so it needs a connection. Fully offline answers would need a small model running on the device.</td></tr>
              <tr><td>News, socials, weather, quakes</td><td class="no">❌ No</td><td>Live by definition. Offline you see the last snapshot, timestamped.</td></tr>
            </tbody>
          </table>
          <p class="muted">*Mesh networks, satellite messengers and “sneakernet” USB drops (think Kiwix hotspots in schools) can move fresh data without the internet — that's the frontier. See <a href="https://github.com/rehxn027/rexx.space/blob/main/docs/OFFLINE.md" target="_blank" rel="noopener">docs/OFFLINE.md</a> for the full roadmap.</p>
        </div>
      </article>
    </div>
  </section>`;

  $('#persist')?.addEventListener('click', async () => {
    const ok = await navigator.storage.persist();
    toast(ok ? 'Done — your Vault is protected.' : 'The browser declined for now (installing the app usually helps).');
    offlineView();
  });

  $$('.packs button').forEach((b) => b.addEventListener('click', () => downloadPack(b)));
}

async function downloadPack(btn) {
  if (!navigator.onLine) { toast('Packing needs a connection — come back when you\'re online.'); return; }
  const prog = $('.progress'), bar = $('.progress i'), txt = $('.ptext');
  $$('.packs button').forEach((b) => { b.disabled = true; });
  prog.hidden = false;

  let titles = [];
  try {
    if (btn.dataset.pack === 'mostread') {
      const f = await api.wikiFeed();
      titles = (f.mostread?.articles || []).map((a) => a.titles?.normalized || a.title).slice(0, Number(btn.dataset.n));
    } else titles = btn.dataset.list.split(',');
  } catch { toast('Couldn\'t fetch the pack list.'); }

  let done = 0, failed = 0;
  const queue = [...titles];
  const worker = async () => {
    while (queue.length) {
      const t = queue.shift();
      try {
        const s = await api.wikiSummary(t);
        const title = s.titles?.normalized || s.title;
        await saveArticle(s, title, vault.idFor(api.getLang(), title));
      } catch { failed++; }
      done++;
      bar.style.width = `${(done / titles.length) * 100}%`;
      txt.textContent = `${done} / ${titles.length} · ${t}`;
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  txt.textContent = `Packed ${done - failed} articles${failed ? ` (${failed} skipped)` : ''}. They're in your Vault.`;
  $$('.packs button').forEach((b) => { b.disabled = false; });
  refreshVaultCount();
}

route();
