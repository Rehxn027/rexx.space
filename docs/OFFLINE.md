# Can an "everything app" work offline?

**Short answer:** You can carry the world's *knowledge* in your pocket. You can't carry the world's *present*.

Information comes in two kinds:

| | Static knowledge | Live signal |
|---|---|---|
| Examples | Encyclopedias, biographies, places, history, science, books, maps | News, social posts, weather, earthquakes, prices, the ISS's position |
| Changes | Slowly (days to years) | Constantly (seconds to hours) |
| Offline? | **Yes.** Download it once and keep it. | **No.** It must travel to you over some network. Offline, you only see a snapshot. |

## What rexx.space does today (v1)

1. **App shell cache.** `sw.js` precaches the HTML, CSS and JS, so the app opens with no connection.
2. **Runtime cache.** Every API response uses a network-first strategy with a 7‑second timeout and falls back to the last good copy. Pages you've already visited keep working offline.
3. **The Vault (IndexedDB).** "Save for offline" stores the *full* article text, Wikidata facts, social links and an inline thumbnail. Readable forever, with no network.
4. **Knowledge packs.** One click downloads today's top 25 or 50 most-read articles, or curated sets (Space, History, Survival kit).
5. **Persistent storage.** The Offline tab can ask the browser not to evict your data.

A typical article takes 20–80 KB in the Vault, so **1,000 articles fit in about 50 MB**.

## How far you can push it

### All of Wikipedia, offline
[Kiwix](https://kiwix.org) publishes all of Wikipedia as compressed `.zim` files:

| Edition | Approx. size |
|---|---|
| English, full with images | ~110 GB |
| English, no images | ~50 GB |
| English, "top 100k" / medicine / etc. | 1–5 GB |
| Smaller languages | a few hundred MB to a few GB |

A `.zim` file can be read in the browser with WebAssembly (`libzim` compiled to WASM, as in Kiwix JS) and the Origin Private File System. **Next milestone:** an "Import .zim" button in the Offline tab that plugs into the same search box.

### Offline maps
OpenStreetMap vector tiles for a whole country take hundreds of MB to a few GB (PMTiles format). Search for places by bundling a Nominatim-style gazetteer.

### An offline AI that answers questions
Small open-weight language models (1–8B parameters, ~1–5 GB quantized) run fully on-device with WebGPU (e.g. WebLLM, transformers.js). Combined with retrieval over the Vault or a `.zim`, this gives you an offline "ask anything" assistant. It is limited to what you downloaded and can be wrong, so always link back to the source article.

### Fresh data without the internet
"Live" doesn't have to mean "the internet":

- **Sneakernet:** export a Vault pack as one file and share it by USB or AirDrop. This is how Kiwix reaches schools without connectivity.
- **Local hotspots:** a Raspberry Pi serving rexx and a `.zim` to a whole village or classroom over Wi‑Fi.
- **Mesh networks:** Bluetooth or Wi‑Fi mesh (Meshtastic/LoRa, Briar) can relay small text updates such as headlines and alerts across devices.
- **Broadcast:** satellite datacasting (e.g. Othernet) pushes news and weather one-way to cheap receivers.

## Bottom line

| Goal | Feasible offline? |
|---|---|
| Read about any person, place, event or idea | ✅ Yes |
| Search everything you've packed | ✅ Yes |
| Maps of places | ✅ Yes, with downloaded tiles |
| Ask questions in natural language | 🟡 Yes, with an on-device model |
| See what's happening *right now* | ❌ Needs some connection: internet, mesh or broadcast |
