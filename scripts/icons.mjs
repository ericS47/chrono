// Génère les icônes PNG de l'app à partir de public/icon.svg (via Chromium/Playwright).
import { chromium } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

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

// ---------- Icônes et écran de démarrage Android (Capacitor) ----------
const res = new URL('../android/app/src/main/res/', import.meta.url).pathname;
if (existsSync(res)) {
  const glyph = svg.replace(/<rect width="512" height="512" rx="112" fill="#4F5BD5"\/>/, '');
  const b2 = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const pg = await b2.newPage();
  const shot = async (path, size, html) => {
    await pg.setViewportSize({ width: size[0], height: size[1] });
    await pg.setContent(`<html><body style="margin:0;width:${size[0]}px;height:${size[1]}px;overflow:hidden">${html}</body></html>`);
    await pg.screenshot({ path, omitBackground: true });
  };
  const sized = (s, px) => s.replace('<svg ', `<svg width="${px}" height="${px}" `);
  const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, k] of Object.entries(dens)) {
    const dir = `${res}mipmap-${d}/`;
    const L = Math.round(48 * k);
    const F = Math.round(108 * k);
    await shot(dir + 'ic_launcher.png', [L, L], sized(svg, L));
    await shot(dir + 'ic_launcher_round.png', [L, L], `<div style="width:${L}px;height:${L}px;border-radius:50%;overflow:hidden;background:#4F5BD5;display:flex;align-items:center;justify-content:center">${sized(glyph, Math.round(L * 0.8))}</div>`);
    await shot(dir + 'ic_launcher_foreground.png', [F, F], `<div style="width:${F}px;height:${F}px;display:flex;align-items:center;justify-content:center">${sized(glyph, Math.round(F * 0.62))}</div>`);
  }
  // Écrans de démarrage : on garde les dimensions d'origine.
  const files = execSync(`find ${res} -name splash.png`).toString().trim().split('\n');
  for (const f of files) {
    const [w, h] = execSync(`python3 -c "import struct;d=open('${f}','rb').read(24);print(*struct.unpack('>II',d[16:24]))"`).toString().trim().split(' ').map(Number);
    const ic = Math.round(Math.min(w, h) * 0.28);
    await shot(f, [w, h], `<div style="width:${w}px;height:${h}px;background:#F7F6F3;display:flex;align-items:center;justify-content:center">${sized(svg, ic)}</div>`);
  }
  await b2.close();
}
