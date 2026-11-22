<div align="center">

<img src="icons/icon.svg" width="96" alt="rexx.space logo">

# rexx.space

**Ask anything.** One search for events, people, places, ideas, and what the internet is saying right now.
Installable, private, and **works offline**.

`zero backend` · `zero API keys` · `zero build step` · `zero trackers`

</div>

---

## ✦ What it does

Type anything, like *Marie Curie*, *Tokyo*, *serendipity* or *the Moon landing*. rexx works out what kind of thing it is (a person, place, country, event, word or idea) and builds a page for it from more than 20 open data sources at once:

| Area | What you get | Source |
|---|---|---|
| 🧠 **Encyclopedia** | Summary, full article, related topics | Wikipedia (31 languages) |
| 🧬 **Facts** | Born/died, occupation, awards, population, capital, founders… | Wikidata |
| 🔗 **Official accounts** | Website, X, Instagram, YouTube, GitHub, Mastodon, Bluesky… | Wikidata |
| 📖 **Dictionary** | Definitions, pronunciation with audio, examples, synonyms, translation | Free Dictionary API, Wiktionary, MyMemory |
| 🌐 **Other languages** | The topic's name and article in every Wikipedia language | Wikipedia interlanguage links |
| 📄 **Research papers** | Search all fields, arXiv preprints, PubMed or Crossref; paste a DOI to look one up | OpenAlex, arXiv, Europe PMC / PubMed, Crossref |
| 📗 **Free books** | 75,000+ public-domain books to read in the app or save offline | Project Gutenberg (via Gutendex) |
| 📜 **Scanned books** | Original page scans of public-domain books, readable in the app | Internet Archive (via Open Library) |
| 📚 **Other books** | Books about the topic | Open Library |
| 🖼️ **Images** | Freely licensed photos and illustrations | Wikimedia Commons |
| 🗺️ **Places** | Map, weather, 5-day forecast, sunrise/sunset, air quality, nearby places, travel guide | OpenStreetMap, Open‑Meteo, Wikipedia, Wikivoyage |
| 🏳️ **Countries** | Flag, capital, languages, currency and its exchange rate | REST Countries, Frankfurter (ECB) |
| 📰 **News** | Coverage worldwide in many languages, a 3-month coverage trend, and AI summaries of full articles | GDELT, Claude (web fetch) |
| 💹 **Markets** | Crypto prices with 7-day trends, official exchange rates with a converter and 90-day chart, live stock quotes | CoinGecko, Frankfurter (ECB), Finnhub (free key) |
| 🏆 **Sports** | Today's scores including live games (football, NBA, NFL, MLB, NHL), and results and fixtures for any team in any sport | ESPN scoreboard feed, TheSportsDB |
| 🦋 **Public conversation** | What people are posting, plus one-tap search on X, Instagram, TikTok, Facebook, YouTube and more | Bluesky, Mastodon, Hacker News, Reddit, Lemmy |
| ⏳ **History** | On this day, for any date: events, births, deaths, holidays | Wikimedia feeds |
| 🌋 **Live planet** | Earthquakes this week and the ISS position | USGS, wheretheiss.at |
| 💬 **Ask** | Answers to questions in any language, citing the sources it used; can also search the live web | Claude (Anthropic), with your own API key |
| 📝 **Cite** | APA, MLA, Chicago, Harvard and BibTeX for articles, papers and books | Built in |

### Sections

- **Today:** the world's front page, refreshed daily, plus "On this day" for any date.
- **Research:** search papers, sort by relevance, citations or date, filter to free-to-read, cite or save any paper.
- **Library:** browse and read free books, cite them, and save whole books for offline reading.
- **Ask:** ask a question and get an answer with numbered citations back to Wikipedia articles, papers and (optionally) live web pages.
- **Live:** News, Markets, Sports, Social and Planet in one place.
- **Pulse:** trending on Wikipedia, Hacker News, Mastodon and Bluesky.
- **Planet:** a live map of earthquakes and the International Space Station.
- **Vault:** articles, papers and books you saved to your device. They work without a connection.
- **Offline:** download knowledge packs (*Today's top 50*, *Space*, *History*, *Survival kit*) and manage storage.

Little extras: <kbd>/</kbd> focuses search, arrow keys move through suggestions, 🎲 **Teleport** opens a random article, and reduced-motion settings are respected.

### 🎨 28 themes, a custom theme builder, and Auto

On first visit you get a **Pick your look** screen with a live preview. Change it any time with the **Theme** button or by pressing <kbd>t</kbd>. Your choice is remembered, and every theme works offline because the fonts are self-hosted (`fonts/`, SIL OFL).

**Everyday:** **Light** (clean, with a sky-blue accent), **Dark** (calm dark in the same sky blue), and **Custom**: choose Light or Dark, then an accent from a grid of 24 colours (or any colour at all) and a background from a grid of 8. Custom themes adjust text and link shades automatically so every combination meets WCAG AA contrast.

**Immersive (animated backgrounds):** Cosmos (starfield and nebula), Abyss (deep sea with bubbles and bioluminescence), Aurora (northern lights), Synthwave (neon sun over a moving grid), Fireflies, Rainfall, Embers (campfire sparks), Snowfall and Neural (a network that reaches for your cursor).

**Classic:** Auto (Broadsheet by day, Broadsheet Night when your device is in dark mode), Broadsheet, Broadsheet Night, Swiss Grid, Brutalist, Terminal, Fjord, Evergreen, Golden Hour, Prism, Graphite, Notebook, Retro OS, Old Atlas, Lagoon, Bubblegum, Ink and Sakura.

Animations pause when the tab is hidden and become a still image if your device asks for reduced motion.

---

## 🛸 Can it work offline?

**Yes for knowledge. No for anything live.**

| Layer | Offline? | How |
|---|---|---|
| The app itself | ✅ | A service worker caches the app shell, so it opens in airplane mode. |
| Anything you've viewed | ✅ | The last good response from every source is cached automatically. |
| Saved articles and packs | ✅ | IndexedDB "Vault": full text, facts, socials and an inline thumbnail. |
| **All of Wikipedia** | ✅* | Kiwix ZIM files: about 110 GB with images, about 50 GB text-only, 1–5 GB for "top articles" editions. |
| Saved papers and free books | ✅ | Paper abstracts and whole books are stored in the Vault. |
| Ask (AI answers) | 🟡 | Needs a connection: it calls Claude with your key. Fully offline answers would need an on-device model. |
| News, socials, weather, quakes | ❌ | Live by definition. Offline, you see the last snapshot. |

Anything that has already happened can be stored on your device. Anything happening *right now* has to reach you over some network. The full roadmap (Kiwix import, on-device AI, mesh and sneakernet sync) is in **[docs/OFFLINE.md](docs/OFFLINE.md)**.

---

## 🚀 Run it

It's plain HTML, CSS and ES modules, so any static server works:

```bash
git clone https://github.com/rehxn027/rexx.space
cd rexx.space
python3 -m http.server 8080      # or: npx serve .
# open http://localhost:8080
```

> Service workers need `http://localhost` or HTTPS. Opening `index.html` from `file://` won't enable offline mode.

### Build the demo copy

`python3 demo/build.py out/` writes a self-contained preview that runs on built-in sample topics with no network access (used for the hosted preview). Live sources show a note instead of data.

### Deploy to GitHub Pages

A workflow is included at `.github/workflows/pages.yml`. In the repo, go to **Settings → Pages → Source: GitHub Actions**, then push to `main`. The site will be served at `https://<user>.github.io/rexx.space/`. To use a custom domain, add a `CNAME` file containing it.

### Install it like an app

Open the site in Chrome, Edge or Safari, then choose **Install** or **Add to Home Screen**. It runs full-screen and keeps your Vault.

---

## 💬 About Ask and your API key

Ask sends your question, plus the Wikipedia articles and paper abstracts it found, to Claude (model `claude-opus-5-5`) through the official [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript), bundled in `js/vendor/`. Claude reads those sources as documents with citations turned on, so each claim in the answer links back to where it came from.

- You add your own key from the [Claude Console](https://console.anthropic.com/settings/keys). Questions are billed to your Anthropic account, usually a few US cents each.
- The key stays in your browser and is sent only to `api.anthropic.com`. rexx.space has no server. Choose "Remember on this device" only on a device you trust.
- If Claude's safety system declines a question, the request automatically falls back to another model (`fallbacks: "default"`).

## 🔑 Optional keys

Everything works without an account except three features, which use free or pay-as-you-go keys that each user adds in the app. Keys stay in that user's browser and go only to the service they belong to.

| Feature | Key | Cost |
|---|---|---|
| Ask, article summaries, live web search | Anthropic API key ([Claude Console](https://console.anthropic.com/settings/keys)) | A few US cents per question; web search adds about 1 cent per search |
| Live stock prices | Finnhub key ([finnhub.io](https://finnhub.io/register)) | Free plan |

## 🚧 What it still can't do

- **X, Instagram, TikTok, Facebook:** they don't offer open access to posts, so rexx shows official accounts (from Wikidata) and opens each platform's own search. Reddit limits anonymous access too; its card hides if Reddit refuses.
- **Paywalled and private information:** not available to any app. For papers, rexx shows free legal copies where they exist (OpenAlex/Unpaywall data). Article summaries say so when a page is paywalled instead of guessing.
- **Live cricket scores:** no free live source; search a team for its latest results and fixtures instead.
- **Stock prices without a key:** free stock data needs a key; crypto and currency rates don't.

## 🧩 How it's built

```
index.html            app shell
css/style.css         layout, driven entirely by design tokens
css/themes.css        28 themes (each just redefines the tokens); Custom is computed in js/themes.js
css/fonts.css         self-hosted @font-face rules (fonts/ folder)
js/app.js             router + views (Today, Search, Pulse, Planet, Vault, Offline)
js/api.js             every data source; all free, keyless and CORS-enabled
js/ask.js             Ask: gathers sources and calls Claude through the Anthropic SDK
js/cite.js            APA / MLA / Chicago / Harvard / BibTeX formatter
js/views/             Research, Library, Ask, Live (news, markets, sports), On this day and the Cite dialog
js/chart.js           sparklines and line charts with hover tooltips
js/vendor/            the Anthropic SDK bundled as one browser module
js/vault.js           IndexedDB storage for offline articles
js/themes.js          theme list + picker
js/fx.js              animated backgrounds for the immersive themes
js/ui.js              tiny escaped-HTML templating + helpers
sw.js                 service worker: shell precache, network-first data, image cache
manifest.webmanifest  PWA install metadata
```

- **No backend.** Your browser talks directly to the open APIs, so nothing is proxied or logged.
- **Safe rendering.** All remote text goes through an auto-escaping template tag.
- **Graceful degradation.** Each card loads on its own. If a source is down or rate-limited, only that card disappears.

### Add a source

1. Add a function to `js/api.js` that returns plain objects.
2. Add a `card(...)` in the relevant view in `js/app.js` and fill it with `slot(el, promise, render)`.
3. Done. The service worker caches it for offline use automatically.

---

## 🗺️ Roadmap

- [ ] Import a Kiwix `.zim` file for all of Wikipedia offline
- [ ] Fully offline Ask with a small on-device model over the Vault
- [ ] Compare mode: two people, cities or countries side by side
- [ ] Export and share Vault packs as a single file (sneakernet)
- [ ] More languages for the UI

PRs welcome.

## 📜 Credits

Data comes from the projects listed above, each under its own license. Wikipedia and Wikidata text is CC BY-SA / CC0, OpenStreetMap data is © OpenStreetMap contributors (ODbL), and earthquake data is from USGS (public domain). rexx.space stores nothing about you; your Vault never leaves your device.
