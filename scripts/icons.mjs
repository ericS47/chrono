// Génère les icônes PNG de l'app à partir du logo Pulse (scripts/logo-pulse.webp), via Chromium/Playwright.
// Icônes « normales » : recadrées sur le cadre arrondi du logo (le téléphone arrondit lui-même les coins).
// Icône « maskable » : logo entier, sa marge sombre sert de zone de sécurité.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const logo = `data:image/webp;base64,${readFileSync(new URL('./logo-pulse.webp', import.meta.url)).toString('base64')}`;
// Cadre arrondi du logo dans l'image d'origine (1254 × 1254).
const FRAME = { x: 79, y: 75, size: 1095 };
const out = [
  ['icon-192.png', 192, FRAME],
  ['icon-512.png', 512, FRAME],
  ['apple-touch-icon.png', 180, FRAME],
  ['favicon.png', 64, FRAME],
  ['icon-maskable-512.png', 512, { x: 0, y: 0, size: 1254 }],
];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage();
await page.setContent('<html><body style="margin:0"></body></html>');
for (const [name, size, c] of out) {
  const b64 = await page.evaluate(async ({ logo, size, c }) => {
    const img = new Image();
    img.src = logo;
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#000814';
    ctx.fillRect(0, 0, size, size);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, c.x, c.y, c.size, c.size, 0, 0, size, size);
    return cv.toDataURL('image/png').split(',')[1];
  }, { logo, size, c });
  const { writeFileSync } = await import('node:fs');
  writeFileSync(new URL(`../public/${name}`, import.meta.url), Buffer.from(b64, 'base64'));
}
await browser.close();
