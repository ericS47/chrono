// Exporte les exercices animés en GIF : un fichier par personnage et par exercice.
//
//   npx tsx scripts/export-gifs.ts [dossier] [id-exercice ...]
//
// Prérequis (hors dépendances de l’app) : rsvg-convert (librsvg) et ImageMagick (convert).
// Les GIF n’ont pas de vraie transparence : le fond est uni (#DCE4F5, bleu pâle).

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CHARACTERS } from '../src/ui/figure/characters';
import { figureSvg } from '../src/ui/figure/draw';
import { EXERCISES } from '../src/ui/figure/exercises';

const FPS = 15;
const WIDTH = 360;
const BACKGROUND = '#DCE4F5';

const [out = 'gifs', ...only] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'chrono-gif-'));

try {
  for (const ex of EXERCISES.filter((e) => only.length === 0 || only.includes(e.id))) {
    const frames = Math.round(ex.duration * FPS);
    for (const c of CHARACTERS) {
      const pngs: string[] = [];
      for (let i = 0; i < frames; i++) {
        const svg = join(tmp, `${c.id}-${ex.id}-${i}.svg`);
        const png = svg.replace(/\.svg$/, '.png');
        writeFileSync(svg, figureSvg(c, ex.pose(i / frames), ex.chair, { background: BACKGROUND }));
        execFileSync('rsvg-convert', ['-w', String(WIDTH), svg, '-o', png]);
        pngs.push(png);
      }
      const file = join(out, `${ex.id}_${c.id}.gif`);
      execFileSync('convert', ['-delay', String(Math.round(100 / FPS)), '-loop', '0', '-dispose', 'background', ...pngs, '-layers', 'optimize', file]);
      console.log(file);
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
