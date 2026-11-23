// Builds rexx.space's app icons from one design: a magnifying glass whose lens holds a globe,
// on a sky-to-indigo gradient, with a small spark of discovery.
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

const defs = `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#38bdf8"/>
      <stop offset="0.55" stop-color="#2563eb"/>
      <stop offset="1" stop-color="#3730a3"/>
    </linearGradient>
    <radialGradient id="shine" cx="0.22" cy="0.15" r="0.75">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.32"/>
      <stop offset="0.6" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="lens"><circle cx="226" cy="226" r="100"/></clipPath>
  </defs>`;

/** The glyph, drawn on a 512 grid. `detail` adds the globe's latitude lines (dropped at tiny sizes). */
const glyph = (detail = true) => `
  <g fill="none" stroke="#ffffff" stroke-linecap="round">
    <g clip-path="url(#lens)" stroke-opacity="0.9" stroke-width="${detail ? 11 : 18}">
      <line x1="110" y1="226" x2="342" y2="226"/>
      <ellipse cx="226" cy="226" rx="48" ry="104"/>
      ${detail ? '<line x1="226" y1="110" x2="226" y2="342"/><path d="M134 170 Q226 196 318 170"/><path d="M134 282 Q226 256 318 282"/>' : ''}
    </g>
    <circle cx="226" cy="226" r="118" stroke-width="${detail ? 34 : 44}"/>
    <line x1="314" y1="314" x2="398" y2="398" stroke-width="${detail ? 48 : 58}"/>
  </g>
  <path d="M392 96 L402 126 L432 136 L402 146 L392 176 L382 146 L352 136 L382 126 Z" fill="#fde68a"/>`;

/** Rounded-square icon with transparent corners (browsers, Android "any"). */
const iconAny = (detail = true) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  ${defs}
  <rect width="512" height="512" rx="116" fill="url(#bg)"/>
  <rect width="512" height="512" rx="116" fill="url(#shine)"/>
  ${glyph(detail)}
</svg>`;

/** Full-bleed square with the glyph inside the safe zone (Android adaptive icons, iOS home screen). */
const iconFull = (scale) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  ${defs}
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect width="512" height="512" fill="url(#shine)"/>
  <g transform="translate(256 256) scale(${scale}) translate(-268 -250)">${glyph(true)}</g>
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
