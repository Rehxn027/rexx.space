// Live: News, Markets, Sports, Social and Planet, under one tab with sub-sections.
import * as api from '../api.js';
import { getKey, summarizeArticle, explainError } from '../ask.js';
import { html, raw, esc, $, $$, ago, compact, toast, slot, card, miniMarkdown } from '../ui.js';
import { sparkline, lineChart, wireCharts } from '../chart.js';

export const LIVE_SECTIONS = [
  ['news', 'News'], ['markets', 'Markets'], ['sports', 'Sports'], ['social', 'Social'], ['planet', 'Planet'],
];

/** Sub-navigation shown above every Live section. */
export const liveNav = (active) => html`<nav class="subtabs" aria-label="Live sections">${LIVE_SECTIONS.map(([id, label]) => raw(html`<a href="#/live/${id}" class="${id === active ? 'active' : ''}" ${raw(id === active ? 'aria-current="page"' : '')}>${label}</a>`))}</nav>`;

/* ───────────── News ───────────── */

/** A list of news articles, each with a "Summarize" button that asks Claude to read the full article. */
export function newsItemsHTML(items, { images = false } = {}) {
  return html`<ul class="list news-list">${items.map((a, i) => raw(html`<li class="news-item" data-i="${i}">
    ${images && a.image ? raw(html`<img class="news-img" src="${a.image}" alt="" loading="lazy" referrerpolicy="no-referrer">`) : ''}
    <div class="news-main">
      <a href="${a.url}" target="_blank" rel="noopener" class="news-title">${a.title}</a>
      <span class="meta">${a.source}${a.country ? ` · ${a.country}` : ''}${a.language && a.language !== 'English' ? ` · ${a.language}` : ''}${a.time ? ` · ${ago(a.time)}` : ''}</span>
      <span class="news-actions"><button type="button" class="ghost small" data-act="summarize">Summarize article</button></span>
      <div class="summary" hidden></div>
    </div>
  </li>`))}</ul>`;
}

/** Wire the Summarize buttons inside root for the given articles. */
export function wireSummaries(root, items) {
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act="summarize"]');
    if (!b) return;
    const li = b.closest('.news-item');
    const a = items[Number(li.dataset.i)];
    const box = li.querySelector('.summary');
    if (!getKey()) {
      box.hidden = false;
      box.innerHTML = '<p class="muted">Summaries are written by Claude, which reads the full article for you. Add your Anthropic API key on the <a href="#/ask">Ask</a> page first.</p>';
      return;
    }
    if (api.DEMO || !navigator.onLine) { toast('Summaries need a connection.'); return; }
    b.disabled = true; b.textContent = 'Reading the article…';
    box.hidden = false; box.className = 'summary streaming'; box.innerHTML = '';
    let text = '';
    try {
      const msg = await summarizeArticle(a.url, a.title, (d) => { text += d; box.innerHTML = miniMarkdown(text); });
      box.className = 'summary';
      if (msg.stop_reason === 'refusal') box.innerHTML = '<p class="muted">Claude declined to summarize this article.</p>';
      else box.innerHTML = `${miniMarkdown(msg.content.filter((c) => c.type === 'text').map((c) => c.text).join(''))}<p class="meta">Summary by Claude from the article at ${esc(a.source)}. Check the original before quoting it.</p>`;
      b.remove();
    } catch (err) {
      box.className = 'summary';
      box.innerHTML = `<p class="error-text">${esc(await explainError(err))}</p>`;
      b.disabled = false; b.textContent = 'Summarize article';
    }
  });
}

const TOPICS = ['climate change', 'artificial intelligence', 'elections', 'public health', 'space exploration', 'economy', 'education', 'renewable energy'];

export function newsView(el, arg) {
  const q = decodeURIComponent(arg || '');
  el.innerHTML = html`${raw(liveNav('news'))}
    <section class="section-head"><h2>News</h2>
      <p class="muted">Coverage from news sites worldwide, in many languages, updated every 15 minutes (GDELT). Tap <b>Summarize article</b> and Claude reads the full article and briefs you on it.</p></section>
    <form class="tool-form" id="nform" role="search">
      <label class="sr-only" for="nq">News topic</label>
      <input id="nq" type="search" placeholder="Any topic, person, place or company" value="${q}" autocomplete="off">
      <button type="submit">Search news</button>
    </form>
    <div class="tags topic-chips">${TOPICS.map((t) => raw(html`<a href="#/live/news/${encodeURIComponent(t)}">${t}</a>`))}</div>
    <div class="grid" id="ngrid"></div>`;
  $('#nform', el).addEventListener('submit', (e) => { e.preventDefault(); const v = $('#nq', el).value.trim(); if (v) location.hash = `#/live/news/${encodeURIComponent(v)}`; });
  const grid = $('#ngrid', el);
  if (!q) {
    grid.innerHTML = card('📰 Top stories (Wikipedia “In the news”)', null, { wide: true });
    slot($('.card .body', grid), api.wikiFeed(), (f) => f.news?.length && html`<ul class="list">${f.news.map((n) => raw(html`<li>${n.story.replace(/<[^>]+>/g, '')}${n.links?.[0] ? raw(html` <a class="q" href="#/live/news/${encodeURIComponent(n.links[0].titles?.normalized || n.links[0].title)}">Coverage →</a>`) : ''}</li>`))}</ul>`);
    return;
  }
  grid.innerHTML = card(`📈 How much news mentions “${esc(q)}”, last 3 months`, null, { wide: true, optional: true }) + card(`📰 Latest on “${esc(q)}”`, null, { wide: true });
  const [chartEl, listEl] = $$('.card .body', grid);
  const pct = (v) => `${v.toFixed(v < 0.1 ? 3 : 2)}%`;
  slot(chartEl, api.newsTimeline(q), (pts) => {
    if (pts.length < 2) return '';
    setTimeout(() => wireCharts(chartEl, pct));
    return lineChart(pts, { format: pct, label: `Share of monitored news coverage mentioning ${q}` }) + html`<p class="meta">Share of all articles GDELT monitored each day that mention the topic. Hover or tap the chart for exact values.</p>`;
  });
  let items = [];
  slot(listEl, api.gdeltNews(q, 30), (arts) => {
    items = arts;
    if (!items.length) return html`<p class="muted">No recent coverage found. Try a broader topic.</p>`;
    setTimeout(() => wireSummaries(listEl, items));
    return newsItemsHTML(items, { images: true });
  });
}

/* ───────────── Markets ───────────── */

const money = (v, cur = 'USD') => {
  if (v == null || !Number.isFinite(v)) return '–';
  const digits = Math.abs(v) >= 1 ? 2 : Math.abs(v) >= 0.01 ? 4 : 6;
  try { return new Intl.NumberFormat('en', { style: 'currency', currency: cur, maximumFractionDigits: digits }).format(v); } catch { return v.toFixed(digits); }
};
/** Percentage change with sign and arrow, so direction never relies on colour alone. */
const change = (p) => (p == null || !Number.isFinite(p) ? '<span class="chg">–</span>' : `<span class="chg ${p >= 0 ? 'up' : 'down'}">${p >= 0 ? '▲ +' : '▼ −'}${Math.abs(p).toFixed(2)}%</span>`);

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'CHF', 'CAD', 'AUD', 'SGD', 'HKD', 'KRW', 'BRL', 'MXN', 'ZAR', 'TRY', 'SEK', 'NOK', 'PLN', 'IDR', 'MYR', 'THB', 'PHP', 'NZD', 'ILS', 'CZK', 'HUF', 'DKK', 'RON', 'ISK'];
const WATCH = 'rexx-watchlist';
const watchlist = () => { try { return JSON.parse(localStorage.getItem(WATCH)) || ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'TSLA']; } catch { return ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'TSLA']; } };
const saveWatch = (l) => { try { localStorage.setItem(WATCH, JSON.stringify(l)); } catch { /* ignore */ } };

/** Stock quote card used on Markets and on company search pages. */
export function stockCardHTML(qt) {
  return html`<div class="quote">
    <div class="quote-head">${qt.logo ? raw(html`<img src="${qt.logo}" alt="" loading="lazy">`) : ''}<div><b>${qt.name}</b><span class="meta">${qt.symbol}${qt.exchange ? ` · ${qt.exchange}` : ''}</span></div></div>
    <p class="big-price">${money(qt.price, qt.currency)} ${raw(change(qt.changePct))}</p>
    <dl class="quote-stats"><dt>Open</dt><dd>${money(qt.open, qt.currency)}</dd><dt>Day range</dt><dd>${money(qt.low, qt.currency)} – ${money(qt.high, qt.currency)}</dd><dt>Previous close</dt><dd>${money(qt.prevClose, qt.currency)}</dd></dl>
    <p class="meta">Finnhub · ${qt.time ? new Date(qt.time).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' }) : ''}. Prices on the free plan can be delayed.</p>
  </div>`;
}

export function finnhubKeyForm(onSaved) {
  const id = `fk${Math.random().toString(36).slice(2, 7)}`;
  setTimeout(() => {
    $(`#${id}`)?.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = $(`#${id} input`).value.trim();
      if (v.length < 10) { toast('That key looks too short. Copy it from your Finnhub dashboard.'); return; }
      api.setFinnhubKey(v); toast('Finnhub key saved on this device.'); onSaved();
    });
  });
  return html`<p>Live stock prices need a free key from <a href="https://finnhub.io/register" target="_blank" rel="noopener">Finnhub ↗</a> (no card needed). It stays in this browser and is sent only to Finnhub.</p>
    <form class="tool-form" id="${id}"><label class="sr-only" for="${id}-in">Finnhub API key</label><input id="${id}-in" type="password" placeholder="Your Finnhub API key" autocomplete="off" spellcheck="false"><button type="submit">Save key</button></form>`;
}

export function marketsView(el) {
  el.innerHTML = html`${raw(liveNav('markets'))}
    <section class="section-head"><h2>Markets</h2><p class="muted">Cryptocurrency prices, official exchange rates and, with a free key, live stock quotes.</p></section>
    <div class="grid">
      ${raw(card('📈 Stocks', null, { wide: true, cls: 'stocks' }))}
      ${raw(card('💱 Currencies', null, { wide: true, cls: 'fx' }))}
      ${raw(card('🪙 Cryptocurrencies (top 20 by market value)', null, { wide: true }))}
    </div>`;
  const [stockEl, fxEl, cryptoEl] = $$('.card .body', el);

  // Stocks
  const drawStocks = async () => {
    if (!api.finnhubKey()) { stockEl.innerHTML = finnhubKeyForm(drawStocks); return; }
    const list = watchlist();
    stockEl.innerHTML = html`<form class="tool-form" id="sform"><label class="sr-only" for="sq">Add a stock</label><input id="sq" type="search" placeholder="Add a company or ticker, e.g. Infosys or TSM" autocomplete="off"><button type="submit">Find</button></form>
      <div id="sfound"></div>
      <table class="mkt"><thead><tr><th>Company</th><th class="num">Price</th><th class="num">Today</th><th></th></tr></thead><tbody id="sbody">${list.map((s) => raw(html`<tr data-s="${s}"><td><b>${s}</b></td><td class="num">…</td><td class="num"></td><td><button type="button" class="ghost small" data-rm="${s}" aria-label="Remove ${s}">✕</button></td></tr>`))}</tbody></table>
      <p class="meta">Quotes from Finnhub. Free-plan prices can be delayed and cover mainly US exchanges. <button type="button" class="ghost small" id="sforget">Remove key</button></p>`;
    const rows = $('#sbody', stockEl);
    for (const s of list) {
      api.stockQuote(s).then((q) => {
        const tr = rows.querySelector(`[data-s="${CSS.escape(s)}"]`);
        if (!tr) return;
        if (!q) { tr.children[1].textContent = 'No data'; return; }
        tr.children[0].innerHTML = html`<b>${q.symbol}</b> <span class="meta">${q.name}</span>`;
        tr.children[1].textContent = money(q.price, q.currency);
        tr.children[2].innerHTML = change(q.changePct);
      }).catch(async (err) => {
        const tr = rows.querySelector(`[data-s="${CSS.escape(s)}"]`);
        if (tr) tr.children[1].textContent = /401|403/.test(err.message) ? 'Key not accepted' : 'Unavailable';
      });
    }
    $('#sforget', stockEl).addEventListener('click', () => { api.setFinnhubKey(''); drawStocks(); });
    $('#sform', stockEl).addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = $('#sq', stockEl).value.trim();
      if (!v) return;
      const found = $('#sfound', stockEl);
      found.innerHTML = '<div class="skel"></div>';
      try {
        const r = await api.stockSearch(v);
        found.innerHTML = r.length ? html`<ul class="list">${r.map((x) => raw(html`<li><button type="button" class="ghost small" data-add="${x.symbol}">+ Add</button> <b>${x.symbol}</b> <span class="meta">${x.name}${x.type ? ` · ${x.type}` : ''}</span></li>`))}</ul>` : '<p class="muted">No matching companies.</p>';
      } catch { found.innerHTML = '<p class="muted">Search failed. Check your Finnhub key.</p>'; }
    });
  };
  stockEl.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-rm]');
    if (rm) { saveWatch(watchlist().filter((x) => x !== rm.dataset.rm)); drawStocks(); return; }
    const add = e.target.closest('[data-add]');
    if (add) { const l = watchlist(); if (!l.includes(add.dataset.add)) { l.unshift(add.dataset.add); saveWatch(l); } drawStocks(); }
  });
  drawStocks();

  // Currencies: converter, table, 90-day chart.
  let base = 'USD', target = 'EUR';
  try { [base, target] = JSON.parse(localStorage.getItem('rexx-fx')) || [base, target]; } catch { /* ignore */ }
  const opts = (sel) => CURRENCIES.map((c) => `<option ${c === sel ? 'selected' : ''}>${c}</option>`).join('');
  const drawFx = async () => {
    try { localStorage.setItem('rexx-fx', JSON.stringify([base, target])); } catch { /* ignore */ }
    fxEl.innerHTML = html`<div class="fx-row">
        <label>Amount <input type="number" id="famt" value="1" min="0" step="any"></label>
        <label>From <select id="fbase">${raw(opts(base))}</select></label>
        <label>To <select id="ftarget">${raw(opts(target))}</select></label>
        <p class="fx-result" id="fres">…</p>
      </div>
      <div id="fchart"></div><div id="ftable"></div>`;
    const res = $('#fres', fxEl), amt = $('#famt', fxEl);
    $('#fbase', fxEl).addEventListener('change', (e) => { base = e.target.value; drawFx(); });
    $('#ftarget', fxEl).addEventListener('change', (e) => { target = e.target.value; drawFx(); });
    try {
      const latest = await api.fxLatest(base);
      const rate = base === target ? 1 : latest.rates[target];
      const show = () => { res.innerHTML = html`<b>${money(Number(amt.value || 0) * rate, target)}</b> <span class="meta">1 ${base} = ${rate?.toPrecision(5)} ${target} · ECB reference rate, ${latest.date}</span>`; };
      amt.addEventListener('input', show); show();
      $('#ftable', fxEl).innerHTML = html`<table class="mkt fx-table"><thead><tr><th>Currency</th><th class="num">1 ${base} =</th></tr></thead><tbody>${Object.entries(latest.rates).filter(([c]) => CURRENCIES.includes(c)).map(([c, r]) => raw(html`<tr><td>${c}</td><td class="num">${r.toPrecision(5)}</td></tr>`))}</tbody></table>`;
      if (base !== target) {
        const pts = await api.fxSeries(base, target, 90);
        const fmt = (v) => v.toPrecision(4);
        $('#fchart', fxEl).innerHTML = html`<h4 class="chart-title">${base} → ${target}, last 90 days</h4>${raw(lineChart(pts, { format: fmt, label: `${base} to ${target}` }))}`;
        wireCharts($('#fchart', fxEl), fmt);
      }
    } catch { res.textContent = 'Exchange rates are unavailable right now.'; }
  };
  drawFx();

  // Crypto
  slot(cryptoEl, api.crypto(20), (coins) => html`<table class="mkt"><thead><tr><th>#</th><th>Coin</th><th class="num">Price</th><th class="num">24 h</th><th class="num">7 d</th><th class="spark-col">Last 7 days</th></tr></thead><tbody>
    ${coins.map((c, i) => raw(html`<tr><td class="muted">${i + 1}</td><td>${c.image ? raw(html`<img class="coin" src="${c.image}" alt="" loading="lazy">`) : ''}<b>${c.name}</b> <span class="meta-inline">${c.symbol}</span></td>
      <td class="num">${money(c.price)}</td><td class="num">${raw(change(c.change24))}</td><td class="num">${raw(change(c.change7))}</td>
      <td class="spark-col">${raw(sparkline(c.spark.filter((_, k) => k % 4 === 0), { label: `${c.name} price over 7 days, USD` }))}</td></tr>`))}
    </tbody></table><p class="meta">Prices in US dollars from ${coins[0]?.source || 'CoinGecko'}. Cryptocurrency prices are volatile; this is information, not advice.</p>`);
}

/* ───────────── Sports ───────────── */

let sportsTimer;
export function sportsView(el, arg) {
  clearInterval(sportsTimer);
  const league = api.LEAGUES.find((l) => l.id === decodeURIComponent(arg || '')) || api.LEAGUES[0];
  el.innerHTML = html`${raw(liveNav('sports'))}
    <section class="section-head"><h2>Sports</h2><p class="muted">Today's scores, including games in progress, plus results and fixtures for any team in any sport.</p></section>
    <div class="tags league-chips">${api.LEAGUES.map((l) => raw(html`<a href="#/live/sports/${encodeURIComponent(l.id)}" class="${l.id === league.id ? 'on' : ''}">${l.name}</a>`))}</div>
    <div class="grid">
      ${raw(card(`🏟️ ${esc(league.name)} today`, null, { wide: true }))}
      ${raw(card('🔎 Any team: results and fixtures', raw(html`<form class="tool-form" id="tform"><label class="sr-only" for="tq">Team</label><input id="tq" type="search" placeholder="e.g. Pakistan cricket, Real Madrid, Mumbai Indians, Lakers" autocomplete="off"><button type="submit">Look up</button></form><div id="tres"></div>`), { wide: true }))}
    </div>`;
  const [boardEl] = $$('.card .body', el);
  const draw = () => slot(boardEl, api.scoreboard(league.id), (games) => {
    if (!games.length) return html`<p class="muted">No ${league.name} games today.</p>`;
    const live = games.some((g) => g.state === 'in');
    clearInterval(sportsTimer);
    if (live) sportsTimer = setInterval(() => { if (location.hash.startsWith('#/live/sports')) draw(); else clearInterval(sportsTimer); }, 30000);
    return html`<ul class="scores">${games.map((g) => raw(html`<li class="game ${g.state}">
        <span class="state">${g.state === 'in' ? raw(html`<span class="live-dot" aria-hidden="true"></span>Live · ${g.detail}`) : g.state === 'post' ? g.detail || 'Final' : new Date(g.date).toLocaleString('en', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        ${[g.away, g.home].map((t) => raw(html`<span class="team ${t.winner ? 'win' : ''}">${t.logo ? raw(html`<img src="${t.logo}" alt="" loading="lazy">`) : ''}<span>${t.name}</span><b>${g.state === 'pre' ? '' : t.score}</b></span>`))}
        ${g.venue ? raw(html`<span class="meta">${g.venue}</span>`) : ''}
      </li>`))}</ul>
      <p class="meta">${live ? 'Updates every 30 seconds while games are live. ' : ''}Scores from ESPN's public scoreboard feed.</p>`;
  });
  draw();
  $('#tform', el).addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#tq', el).value.trim();
    if (!v) return;
    const out = $('#tres', el);
    out.innerHTML = '<div class="skel"></div>';
    slot(out, api.team(v), (t) => (t ? teamHTML(t) : html`<p class="muted">No team called “${v}” found. Try its full name.</p>`));
  });
}

/** A team's recent results and next fixtures. Also used on team search pages. */
export function teamHTML(t) {
  const row = (e, done) => raw(html`<li><span class="meta">${e.date || ''}${e.league ? ` · ${e.league}` : ''}</span>${done ? `${e.home} ${e.homeScore ?? ''} – ${e.awayScore ?? ''} ${e.away}` : `${e.home} vs ${e.away}${e.time ? ` · ${e.time.slice(0, 5)} UTC` : ''}`}</li>`);
  return html`<div class="team-head">${t.badge ? raw(html`<img src="${t.badge}" alt="" loading="lazy">`) : ''}<div><b>${t.name}</b><span class="meta">${[t.sport, t.league, t.country].filter(Boolean).join(' · ')}</span></div></div>
    <div class="team-cols">
      <div><h4>Recent results</h4>${t.last.length ? raw(html`<ul class="list">${t.last.map((e) => row(e, true))}</ul>`) : raw('<p class="muted">No recent results listed.</p>')}</div>
      <div><h4>Next fixtures</h4>${t.next.length ? raw(html`<ul class="list">${t.next.map((e) => row(e, false))}</ul>`) : raw('<p class="muted">No upcoming fixtures listed.</p>')}</div>
    </div><p class="meta">From TheSportsDB (free tier).</p>`;
}

/* ───────────── Social extras ───────────── */

/** Reddit or Lemmy posts as a list. */
export function forumList(posts) {
  if (!posts?.length) return '';
  return html`<ol class="list">${posts.map((p) => raw(html`<li><a href="${p.url}" target="_blank" rel="noopener">${p.title}</a>
    <span class="meta">${p.community} · ▲ ${compact(p.score)} · ${compact(p.comments)} comments${p.time ? ` · ${ago(p.time)}` : ''}</span></li>`))}</ol>`;
}

/** Links that search the closed platforms directly; their content can't be pulled into the app. */
export function elsewhereHTML(q) {
  const e = encodeURIComponent(q);
  const tag = encodeURIComponent(q.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase());
  const links = [
    ['X', `https://x.com/search?q=${e}`], ['Instagram', `https://www.instagram.com/explore/tags/${tag}/`],
    ['TikTok', `https://www.tiktok.com/search?q=${e}`], ['Facebook', `https://www.facebook.com/search/top?q=${e}`],
    ['YouTube', `https://www.youtube.com/results?search_query=${e}`], ['Reddit', `https://www.reddit.com/search/?q=${e}`],
    ['Threads', `https://www.threads.net/search?q=${e}`], ['LinkedIn', `https://www.linkedin.com/search/results/all/?keywords=${e}`],
    ['Google Scholar', `https://scholar.google.com/scholar?q=${e}`], ['Google News', `https://news.google.com/search?q=${e}`],
  ];
  return html`<div class="elsewhere">${links.map(([n, u]) => raw(html`<a class="btn ghost small" href="${u}" target="_blank" rel="noopener">${n} ↗</a>`))}</div>
    <p class="meta">These platforms don't offer open access to their posts, so rexx opens their own search instead.</p>`;
}
