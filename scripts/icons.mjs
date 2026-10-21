// Génère les icônes PNG de l'app à partir de public/icon.svg (via Chromium/Playwright).
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('../public/icon.svg', import.meta.url), 'utf8');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage();
const out = [
  ['icon-192.png', 192, 0, true],
  ['icon-512.png', 512, 0, true],
  ['apple-touch-icon.png', 180, 0, false],
  ['icon-maskable-512.png', 512, 0.12, false],
];
for (const [name, size, pad, round] of out) {
  const inner = Math.round(size * (1 - pad * 2));
  const body = round ? svg : svg.replace('rx="112"', 'rx="0"');
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:#4F5BD5;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">
    <div style="width:${inner}px;height:${inner}px">${body.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body></html>`);
  await page.screenshot({ path: `public/${name}`, omitBackground: round });
}
await browser.close();

