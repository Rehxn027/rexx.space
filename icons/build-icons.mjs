// Builds rexx.space's app icons from one design: a white magnifying glass with a grey globe in
// its lens, on black. Only black, grey and white.
//
//   node icons/build-icons.mjs        (needs Playwright with Chromium installed)
//
// Writes the SVG sources and every PNG size that browsers, Android and iOS ask for.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');

const here = dirname(fileURLToPath(import.meta.url));

const BLACK = '#111111';
const GREY = '#9a9a9a';
const WHITE = '#ffffff';

const defs = `<defs><clipPath id="lens"><circle cx="232" cy="232" r="100"/></clipPath></defs>`;

/** The glyph, drawn on a 512 grid: a white magnifier with a grey globe in the lens. `detail` adds latitude lines. */
const glyph = (detail = true) => `
  <g fill="none" stroke-linecap="round">
    <g clip-path="url(#lens)" stroke="${GREY}" stroke-width="${detail ? 12 : 20}">
      <line x1="116" y1="232" x2="348" y2="232"/>
      <ellipse cx="232" cy="232" rx="48" ry="104"/>
      ${detail ? '<path d="M140 176 Q232 202 324 176"/><path d="M140 288 Q232 262 324 288"/>' : ''}
    </g>
    <circle cx="232" cy="232" r="120" stroke="${WHITE}" stroke-width="${detail ? 34 : 46}"/>
    <line x1="320" y1="320" x2="398" y2="398" stroke="${WHITE}" stroke-width="${detail ? 48 : 60}"/>
  </g>`;

/** Rounded-square icon with transparent corners (browsers, Android "any"). */
const iconAny = (detail = true) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  ${defs}
  <rect width="512" height="512" rx="116" fill="${BLACK}"/>
  ${glyph(detail)}
</svg>`;

/** Full-bleed square with the glyph inside the safe zone (Android adaptive icons, iOS home screen). */
const iconFull = (scale) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  ${defs}
  <rect width="512" height="512" fill="${BLACK}"/>
  <g transform="translate(256 256) scale(${scale}) translate(-262 -262)">${glyph(true)}</g>
</svg>`;

const svgs = {
  'icon.svg': iconAny(true),
  'icon-small.svg': iconAny(false),
  'icon-maskable.svg': iconFull(0.72),
  'icon-apple.svg': iconFull(0.86),
};
for (const [name, svg] of Object.entries(svgs)) writeFileSync(join(here, name), `${svg}\n`);

const pngs = [
  ['icon.svg', 'icon-512.png', 512], ['icon.svg', 'icon-192.png', 192],
  ['icon-maskable.svg', 'maskable-512.png', 512], ['icon-maskable.svg', 'maskable-192.png', 192],
  ['icon-apple.svg', 'apple-touch-icon.png', 180],
  ['icon-small.svg', 'favicon-32.png', 32], ['icon-small.svg', 'favicon-16.png', 16],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [src, out, size] of pngs) {
  await page.setViewportSize({ width: size, height: size });
  const data = `data:image/svg+xml;base64,${Buffer.from(svgs[src]).toString('base64')}`;
  await page.setContent(`<html><body style="margin:0;background:transparent"><img src="${data}" width="${size}" height="${size}" style="display:block"></body></html>`);
  await page.waitForFunction(() => document.images[0].complete);
  await page.screenshot({ path: join(here, out), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  console.log(`icons/${out}`);
}
await browser.close();
