#!/usr/bin/env python3
"""Build a self-contained demo of rexx.space that runs with built-in sample data.

Usage: python3 demo/build.py OUT_DIR

The demo swaps js/api.js for demo/api.demo.js, adds a banner explaining what is sample
data, and drops PWA bits that need a normal web host. Everything else is the real app.
"""
import pathlib, re, shutil, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
out = pathlib.Path(sys.argv[1]).resolve()
if out.exists():
    shutil.rmtree(out)
out.mkdir(parents=True)

for d in ('css', 'js', 'fonts', 'icons'):
    shutil.copytree(ROOT / d, out / d)
shutil.copy(ROOT / 'demo' / 'api.demo.js', out / 'js' / 'api.js')
(out / 'fonts' / 'README.md').unlink(missing_ok=True)

html = (ROOT / 'index.html').read_text()
# The host wraps the page in its own document, so keep only what's inside <head> and <body>.
head = re.search(r'<head>(.*?)</head>', html, re.S).group(1)
body = re.search(r'<body>(.*?)</body>', html, re.S).group(1)
head = re.sub(r'\s*<meta charset[^>]*>|\s*<meta name="viewport"[^>]*>|\s*<link rel="manifest"[^>]*>', '', head)
head = head.replace('<title>rexx.space — the world, in one search</title>', '<title>rexx.space</title>')

banner = '''
  <style>
    .demo-banner { max-width: 1240px; margin: 14px auto 0; padding: 0 clamp(16px, 4vw, 40px); }
    .demo-banner p { margin: 0; padding: 10px 14px; border: 1px dashed var(--line-strong); border-radius: var(--radius-sm);
      background: var(--accent-soft); color: var(--text); font-size: 13.5px; }
    .demo-banner a { font-weight: 600; }
    .packs [data-pack="list"] { display: none; }
  </style>
  <div class="demo-banner" role="note"><p><b>Demo copy.</b> This preview runs on built-in sample topics:
    <a href="#/q/Marie%20Curie">Marie Curie</a>, <a href="#/q/Albert%20Einstein">Albert Einstein</a>,
    <a href="#/q/Tokyo">Tokyo</a>, <a href="#/q/Taj%20Mahal">Taj Mahal</a>, <a href="#/q/Black%20hole">Black hole</a> and
    <a href="#/q/Apollo%2011">Apollo 11</a>. Themes, saving to the Vault and offline reading all work here.
    Citations work too. Live sources (research papers, free books, dictionary, images, news, social posts, weather, maps and Ask) need the full app.</p></div>
'''
body = body.replace('  <div id="theme-panel"', banner + '  <div id="theme-panel"', 1)
body = re.sub(r'<p>Data from Wikipedia.*?</p>',
              '<p>Demo build with sample text written for this preview. The full app loads live data from Wikipedia, Wikidata, OpenStreetMap, Open‑Meteo, USGS, REST Countries, Hacker News, Bluesky, Mastodon, Open Library and GDELT.</p>',
              body, flags=re.S)
(out / 'index.html').write_text(head.strip() + '\n' + body.strip() + '\n')
print(f'Demo written to {out}')
