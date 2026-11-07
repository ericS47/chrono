// Dessin d’un personnage en SVG (chaîne de caractères).
// Pas de React ici : le même code sert à l’écran (composant Figure) et à l’export des GIF.

import type { Character } from './characters';
import { HOLD_BAR_POINT, type ChairMode } from './exercises';
import { joints, SEG, type Pose, type Pt } from './rig';

export const VIEWBOX = { x: -100, y: -212, w: 230, h: 236 } as const;

const WOOD = '#C08455';
const WOOD_DARK = '#94613A';
const INK = '#23253B';

const n = (v: number) => Math.round(v * 10) / 10;

/** Assombrit une couleur #RRGGBB (f < 1) pour les membres du second plan. */
export function shade(hex: string, f: number): string {
  const v = parseInt(hex.slice(1), 16);
  const c = (s: number) => Math.round(Math.min(255, Math.max(0, ((v >> s) & 255) * f)));
  return `#${[16, 8, 0].map((s) => c(s).toString(16).padStart(2, '0')).join('')}`;
}

const mix = (p: Pt, q: Pt, t: number): Pt => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];

function line(p: Pt, q: Pt, w: number, color: string): string {
  return `<line x1="${n(p[0])}" y1="${n(p[1])}" x2="${n(q[0])}" y2="${n(q[1])}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
}

const circle = (c: Pt, r: number, fill: string, extra = '') => `<circle cx="${n(c[0])}" cy="${n(c[1])}" r="${r}" fill="${fill}" ${extra}/>`;

function chairSvg(mode: ChairMode): string {
  if (mode === 'sit') {
    return [
      // pieds, dossier, assise (de profil, dossier à gauche)
      `<rect x="-27" y="-40" width="5" height="40" rx="2.5" fill="${WOOD_DARK}"/>`,
      `<rect x="17" y="-36" width="5" height="36" rx="2.5" fill="${WOOD_DARK}"/>`,
      `<rect x="-27" y="-112" width="6" height="74" rx="3" fill="${WOOD}"/>`,
      `<rect x="-30" y="-42" width="56" height="8" rx="4" fill="${WOOD}"/>`,
    ].join('');
  }
  if (mode === 'hold') {
    const [bx, by] = HOLD_BAR_POINT;
    // Chaise vue de profil, dossier du côté de la personne qui s’y appuie.
    return [
      `<rect x="${bx + 52}" y="-40" width="5" height="40" rx="2.5" fill="${WOOD_DARK}"/>`,
      `<rect x="${bx - 2}" y="-40" width="5" height="40" rx="2.5" fill="${WOOD_DARK}"/>`,
      `<rect x="${bx - 3}" y="${by - 6}" width="7" height="${-by - 36}" rx="3.5" fill="${WOOD}"/>`,
      `<rect x="${bx - 3}" y="-46" width="62" height="8" rx="4" fill="${WOOD}"/>`,
    ].join('');
  }
  return '';
}

function hairBack(c: Character, h: Pt, r: number): string {
  if (c.hairStyle === 'long') {
    return `<ellipse cx="${n(h[0] - r * 0.55)}" cy="${n(h[1] + r * 0.9)}" rx="${n(r * 0.85)}" ry="${n(r * 1.6)}" fill="${c.hair}"/>`;
  }
  if (c.hairStyle === 'bun') return circle([h[0] - r * 0.75, h[1] - r * 1.05], 8.5, c.hair);
  return '';
}

function hairFront(c: Character, h: Pt, r: number): string {
  const R = r + 1.6;
  const [cx, cy] = h;
  // Calotte : du bas de la nuque, par-dessus la tête, jusqu’à la naissance des cheveux sur le front.
  const d =
    `M ${n(cx - R)} ${n(cy + r * 0.45)} A ${n(R)} ${n(R)} 0 0 1 ${n(cx + R * 0.9)} ${n(cy - R * 0.42)} ` +
    `Q ${n(cx + r * 0.3)} ${n(cy - r * 0.2)} ${n(cx - r * 0.35)} ${n(cy + r * 0.05)} ` +
    `Q ${n(cx - r * 0.6)} ${n(cy + r * 0.3)} ${n(cx - R)} ${n(cy + r * 0.45)} Z`;
  return `<path d="${d}" fill="${c.hair}"/>`;
}

function face(c: Character, h: Pt, r: number, turn: number): string {
  const [cx, cy] = h;
  const eyeY = cy - r * 0.05;
  const t = Math.max(-1, Math.min(1, turn));
  // Profil : l’œil est près du front. Vers le spectateur : il se centre, un second œil apparaît.
  const x1 = t >= 0 ? cx + r * (0.55 - 0.2 * t) : cx + r * (0.55 + 0.9 * -t);
  const x2 = cx + r * (0.55 - 0.9 * t);
  const parts: string[] = [];
  const o1 = t >= 0 ? 1 : Math.max(0, 1 + t * 3);
  if (o1 > 0.02) {
    parts.push(circle([x1, eyeY], 2.1, INK, `opacity="${n(o1)}"`));
    parts.push(
      `<path d="M ${n(x1 - 3.2)} ${n(eyeY - 4.6)} Q ${n(x1)} ${n(eyeY - 6.4)} ${n(x1 + 3.2)} ${n(eyeY - 4.4)}" stroke="${c.hair === '#C5C9D2' ? '#9CA1AD' : c.hair}" stroke-width="1.7" fill="none" stroke-linecap="round" opacity="${n(o1)}"/>`,
    );
    parts.push(`<ellipse cx="${n(x1 + (t >= 0 ? -1 : 0))}" cy="${n(eyeY + r * 0.42)}" rx="3.6" ry="2.4" fill="${c.cheeks}" opacity="${n(0.5 * o1)}"/>`);
    const mx = t >= 0 ? cx + r * (0.62 - 0.62 * t) : x1 + 1;
    parts.push(
      `<path d="M ${n(mx - 3)} ${n(cy + r * 0.45)} Q ${n(mx)} ${n(cy + r * 0.45 + 3.2)} ${n(mx + 3)} ${n(cy + r * 0.45)}" stroke="${INK}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="${n(o1)}"/>`,
    );
  }
  if (t > 0.18) {
    parts.push(circle([x2, eyeY], 2.1, INK, `opacity="${n(Math.min(1, t * 2))}"`));
    parts.push(
      `<path d="M ${n(x2 - 3.2)} ${n(eyeY - 4.4)} Q ${n(x2)} ${n(eyeY - 6.4)} ${n(x2 + 3.2)} ${n(eyeY - 4.6)}" stroke="${c.hair === '#C5C9D2' ? '#9CA1AD' : c.hair}" stroke-width="1.7" fill="none" stroke-linecap="round" opacity="${n(Math.min(1, t * 2))}"/>`,
    );
  }
  return parts.join('');
}

/** Dessine un membre en deux parties : couleur du vêtement jusqu’à `cover`, puis la peau. */
function limb(p: Pt, q: Pt, w: number, skin: string, cloth: string, cover: number): string {
  if (cover <= 0) return line(p, q, w, skin);
  if (cover >= 1) return line(p, q, w, cloth);
  return line(p, q, w, skin) + line(p, mix(p, q, cover), w + 0.6, cloth);
}

export interface DrawOptions {
  /** Fond uni (utile pour les GIF, qui n’ont pas de vraie transparence) ; null = transparent. */
  background?: string | null;
  /** Texte alternatif lu par les lecteurs d’écran. */
  title?: string;
}

export function figureSvg(character: Character, pose: Pose, chair: ChairMode, opts: DrawOptions = {}): string {
  const c = character;
  const j = joints(pose);
  const far = (col: string) => shade(col, 0.84);

  const legCover = c.legs === 'long' ? [1, 0.94] : c.legs === 'capri' ? [1, 0.6] : [0.62, 0];
  const sleeve = c.sleeves === 'long' ? [1, 0.7] : c.sleeves === 'short' ? [0.62, 0] : [0, 0];

  const leg = (side: 'legN' | 'legF', skin: string, cloth: string, shoe: string) => {
    const L = j[side];
    return (
      limb(L.knee, L.ankle, 14, skin, cloth, legCover[1]) +
      limb(j.hip, L.knee, 17, skin, cloth, legCover[0]) +
      line(L.ankle, L.toe, 9, shoe)
    );
  };
  const arm = (side: 'armN' | 'armF', skin: string, cloth: string) => {
    const A = j[side];
    return limb(A.elbow, A.wrist, 10, skin, cloth, sleeve[1]) + limb(j.shoulder, A.elbow, 11, skin, cloth, sleeve[0]) + circle(A.wrist, 5.6, skin);
  };

  const r = SEG.head;
  const head =
    `<g transform="rotate(${n(pose.head)} ${n(j.headC[0])} ${n(j.headC[1])})">` +
    hairBack(c, j.headC, r) +
    circle(j.headC, r, c.skin) +
    circle([j.headC[0] - r * 0.18, j.headC[1] + r * 0.18], 3.2, shade(c.skin, 0.92)) +
    hairFront(c, j.headC, r) +
    face(c, j.headC, r, pose.turn) +
    `</g>`;

  const parts = [
    opts.background ? `<rect x="${VIEWBOX.x}" y="${VIEWBOX.y}" width="${VIEWBOX.w}" height="${VIEWBOX.h}" fill="${opts.background}"/>` : '',
    `<ellipse cx="${n((j.legN.ankle[0] + j.legF.ankle[0]) / 2 * 0.6)}" cy="1" rx="74" ry="7" fill="#8A93A6" opacity="0.22"/>`,
    chairSvg(chair),
    arm('armF', far(c.skin), far(c.top)),
    leg('legF', far(c.skin), far(c.bottom), far(c.shoes)),
    line(j.shoulder, j.headC, 10, c.skin),
    line(j.hip, j.shoulder, 31, c.top),
    circle(j.hip, 13.5, c.bottom),
    leg('legN', c.skin, c.bottom, c.shoes),
    head,
    arm('armN', c.skin, c.top),
  ];

  const title = opts.title ? `<title>${opts.title}</title>` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}" role="img"${opts.title ? '' : ' aria-hidden="true"'}>` +
    title +
    parts.join('') +
    `</svg>`
  );
}
