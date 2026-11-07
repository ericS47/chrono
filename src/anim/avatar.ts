// Avatar des animations d'exercice : apparence réglable par l'utilisateur.
// Tout est dessiné par l'app (SVG), rien n'est téléchargé.

export type AvatarSex = 'f' | 'm';
export type AvatarBuild = 'mince' | 'moyenne' | 'forte' | 'musclee';
export type AvatarAge = 'jeune' | 'adulte' | 'senior';
export type AvatarHeight = 'petite' | 'moyenne' | 'grande';
export type AvatarBottom = 'short' | 'legging';

export interface Avatar {
  sex: AvatarSex;
  /** Index dans SKIN_TONES. */
  skin: number;
  hair: string;
  build: AvatarBuild;
  age: AvatarAge;
  height: AvatarHeight;
  top: string;
  bottom: string;
  bottomType: AvatarBottom;
}

export interface AnimSettings {
  /** Afficher l'animation de l'exercice pendant l'effort (activé par défaut). */
  enabled: boolean;
  avatar: Avatar;
}

export const SKIN_TONES: { color: string; label: string }[] = [
  { color: '#F6D9C6', label: 'Très claire' },
  { color: '#EEC3A3', label: 'Claire' },
  { color: '#DDA680', label: 'Médium claire' },
  { color: '#C2875F', label: 'Médium' },
  { color: '#9E6845', label: 'Mate' },
  { color: '#7A4B31', label: 'Foncée' },
  { color: '#4F3123', label: 'Très foncée' },
];

export const HAIR_COLORS: { color: string; label: string }[] = [
  { color: '#1E1A18', label: 'Noirs' },
  { color: '#4A2E1E', label: 'Bruns' },
  { color: '#7B5235', label: 'Châtains' },
  { color: '#D8B26A', label: 'Blonds' },
  { color: '#B5532C', label: 'Roux' },
  { color: '#9A9A9A', label: 'Gris' },
  { color: '#E6E3DD', label: 'Blancs' },
];

export const TOP_COLORS: { color: string; label: string }[] = [
  { color: '#4F5BD5', label: 'Bleu lavande' },
  { color: '#2E7A5E', label: 'Sauge' },
  { color: '#14183A', label: 'Marine' },
  { color: '#FFFFFF', label: 'Blanc' },
  { color: '#F5A8C8', label: 'Rose' },
  { color: '#FFC93C', label: 'Jaune' },
  { color: '#3DD6C6', label: 'Turquoise' },
];

export const BOTTOM_COLORS: { color: string; label: string }[] = [
  { color: '#14183A', label: 'Marine' },
  { color: '#3A3F4B', label: 'Anthracite' },
  { color: '#6B6F76', label: 'Gris' },
  { color: '#4F5BD5', label: 'Bleu lavande' },
  { color: '#2E7A5E', label: 'Sauge' },
];

export const BUILD_LABELS: Record<AvatarBuild, string> = { mince: 'Mince', moyenne: 'Moyenne', forte: 'Forte', musclee: 'Musclée' };
export const AGE_LABELS: Record<AvatarAge, string> = { jeune: 'Jeune', adulte: 'Adulte', senior: 'Senior' };
export const HEIGHT_LABELS: Record<AvatarHeight, string> = { petite: 'Petite', moyenne: 'Moyenne', grande: 'Grande' };

export const DEFAULT_AVATAR: Avatar = {
  sex: 'f',
  skin: 2,
  hair: '#4A2E1E',
  build: 'moyenne',
  age: 'adulte',
  height: 'moyenne',
  top: '#4F5BD5',
  bottom: '#14183A',
  bottomType: 'legging',
};

export const DEFAULT_ANIM: AnimSettings = { enabled: true, avatar: DEFAULT_AVATAR };

export function normalizeAnim(a: Partial<AnimSettings> | undefined): AnimSettings {
  const avatar = { ...DEFAULT_AVATAR, ...(a?.avatar ?? {}) };
  if (!(avatar.skin >= 0 && avatar.skin < SKIN_TONES.length)) avatar.skin = DEFAULT_AVATAR.skin;
  return { enabled: a?.enabled ?? true, avatar };
}

/** Mélange deux couleurs #RRGGBB (t = 0 : a, t = 1 : b). */
export function mix(a: string, b: string, t: number): string {
  const p = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
