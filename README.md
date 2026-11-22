<div align="center">

<img src="icons/icon.svg" width="96" alt="rexx.space logo">

# rexx.space

**Ask the universe.** One search for events, people, places, ideas, and what the internet is saying right now.
Installable, private, and **works offline**.

`zero backend` · `zero API keys` · `zero build step` · `zero trackers`

</div>

---

## ✦ What it does

Type anything, like *Marie Curie*, *Tokyo*, *black holes* or *the Moon landing*. rexx works out what kind of thing it is (a person, place, country, event or work) and builds a dashboard for it from about a dozen open data sources at once:

| Orbit | What you get | Source |
|---|---|---|
| 🧠 **Knowledge** | Summary, full article, related topics | Wikipedia (9 languages) |
| 🧬 **Facts** | Born/died, occupation, awards, population, capital, founders… | Wikidata |
| 🔗 **Socials** | Official website, X, Instagram, YouTube, GitHub, Mastodon, Bluesky… | Wikidata |
| 🗺️ **Places** | Interactive map, live weather and a 5‑day forecast | OpenStreetMap, Open‑Meteo |
| 🏳️ **Countries** | Flag, capital, languages, currency, population | REST Countries |
| 📰 **News & events** | Latest coverage worldwide | GDELT |
| 🦋 **Social pulse** | What people are posting | Bluesky, Mastodon, Hacker News |
| 📚 **Books** | Books about the topic | Open Library |
| 🌋 **Live planet** | Earthquakes this week and the ISS position, updated live | USGS, wheretheiss.at |
| ⏳ **Today** | Featured article, in the news, most-read, on this day, picture of the day | Wikimedia feeds |

### Sections

- **Today:** the world's front page, refreshed daily.
- **Pulse:** trending on Wikipedia, Hacker News, Mastodon and Bluesky.
- **Planet:** a live map of earthquakes and the International Space Station.
- **Vault:** articles you saved to your device. They work without a connection.
- **Offline:** download knowledge packs (*Today's top 50*, *Space*, *History*, *Survival kit*) and manage storage.

Little extras: <kbd>/</kbd> focuses search, arrow keys move through suggestions, 🎲 **Teleport** opens a random article, the starfield moves with your cursor, and reduced-motion settings are respected.

---

## 🛸 Can it work offline?

**Yes for knowledge. No for anything live.**

| Layer | Offline? | How |
|---|---|---|
| The app itself | ✅ | A service worker caches the app shell, so it opens in airplane mode. |
| Anything you've viewed | ✅ | The last good response from every source is cached automatically. |
| Saved articles and packs | ✅ | IndexedDB "Vault": full text, facts, socials and an inline thumbnail. |
| **All of Wikipedia** | ✅* | Kiwix ZIM files: about 110 GB with images, about 50 GB text-only, 1–5 GB for "top articles" editions. |
| An AI you can ask questions | 🟡 | Small open models (1–8B parameters) run on-device with WebGPU over the offline pack. |
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

### Deploy to GitHub Pages

A workflow is included at `.github/workflows/pages.yml`. In the repo, go to **Settings → Pages → Source: GitHub Actions**, then push to `main`. The site will be served at `https://<user>.github.io/rexx.space/`. To use a custom domain, add a `CNAME` file containing it.

### Install it like an app

Open the site in Chrome, Edge or Safari, then choose **Install** or **Add to Home Screen**. It runs full-screen and keeps your Vault.

---

## 🧩 How it's built

```
index.html            app shell
css/style.css         cosmic theme (no framework)
js/app.js             router + views (Today, Search, Pulse, Planet, Vault, Offline)
js/api.js             every data source; all free, keyless and CORS-enabled
js/vault.js           IndexedDB storage for offline articles
js/stars.js           parallax starfield
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
- [ ] On-device Q&A ("Ask rexx") with WebLLM and retrieval over the Vault
- [ ] Timeline view: everything that happened on any date
- [ ] Compare mode: two people, cities or countries side by side
- [ ] Export and share Vault packs as a single file (sneakernet)
- [ ] More languages for the UI

PRs welcome.

## 📜 Credits

Data comes from the projects listed above, each under its own license. Wikipedia and Wikidata text is CC BY-SA / CC0, OpenStreetMap data is © OpenStreetMap contributors (ODbL), and earthquake data is from USGS (public domain). rexx.space stores nothing about you; your Vault never leaves your device.
