// Variantes générées des exercices sans matériel : sur chaise, et avec haltères, kettlebell,
// élastique ou anneau de Pilates, debout et sur chaise.
//
// Chaque variante reprend le mouvement de l'exercice de base (ou des postures propres quand
// le matériel ou la chaise changent la prise) et reçoit un identifiant stable :
// « <base>-c » (chaise, sans matériel), « <base>-db » (haltères, debout), « <base>-db-c » (haltères, chaise)…
// Ces identifiants sont enregistrés dans les séances : ne pas les renommer.

import type { Anchor, BaseExerciseId, ChairUnder, Equipment, ExerciseAnim, ExerciseId, Frame, Grip } from './exercises';
import type { Pose } from './pose';

type Eq = 'db' | 'kb' | 'band' | 'ring';
export type VariantKey = 'c' | Eq | `${Eq}-c`;

const EQ: Record<Eq, Equipment> = { db: 'dumbbell', kb: 'kettlebell', band: 'band', ring: 'ring' };
const EQ_NAME: Record<Eq, string> = { db: 'haltères', kb: 'kettlebell', band: 'élastique', ring: 'anneau' };
const EQ_WORDS: Record<Eq, string[]> = { db: ['haltere'], kb: ['kettlebell', 'kb'], band: ['elastique'], ring: ['anneau'] };
const CHAIR_WORDS = ['assis', 'sur chaise', 'chaise'];

/** Réglages d'une variante ; `true` : la version par défaut. */
interface Over {
  frames?: Frame[];
  grip?: Grip;
  label?: string;
  /** Mots de reconnaissance supplémentaires (nom naturel d'une variante). */
  words?: string[];
  chairUnder?: ChairUnder;
  anchor?: Anchor;
  period?: number;
}
type Opt = Over | true;

interface Spec {
  base: BaseExerciseId;
  /** Nom court des variantes (« Curl biceps » → « Curl biceps assis (haltères) »). */
  short: string;
  /** Mots de reconnaissance, complétés par le matériel et « assis ». */
  words: string[];
  /** Version sur chaise sans matériel. */
  chair?: Opt;
  /** Versions avec matériel : debout (`s`, ou comme l'exercice de base) et sur chaise (`c`). */
  eq?: Partial<Record<Eq, { s?: Opt; c?: Opt }>>;
}

// ---------- Postures ----------

const SEAT = { thighN: 90, shinN: 0, thighF: 88, shinF: 0 };

/** Assis de profil : cuisses à l'horizontale, tibias verticaux, buste au plus penché à 45°. */
function seatSide(p: Pose): Pose {
  return { ...p, ...SEAT, torso: Math.min(p.torso, 45), lift: 0, heel: Math.min(0, p.heel ?? 0) };
}
/** Assis de face : cuisses vers nous (raccourcies), genoux un peu écartés, pieds au sol. */
function seatFront(p: Pose): Pose {
  const n = p.thighN + 16;
  const f = p.thighF + 16;
  return { ...p, thighN: n, shinN: n * 0.45, thighF: f, shinF: f * 0.45, legReach: 0.42, lift: 0, heel: 0 };
}
const seatFrames = (fr: Frame[], view: 'side' | 'front'): Frame[] =>
  fr.map(({ pose, w }) => ({ pose: view === 'side' ? seatSide(pose) : seatFront(pose), w }));
/** Angles des deux bras. */
type Arms = Pick<Pose, 'armN' | 'foreN' | 'armF' | 'foreF'>;

/** Bras qui tiennent une charge contre la poitrine (goblet), suivant l'inclinaison du buste. */
const chest = (torso: number) => ({ armN: 22 + torso, foreN: 160 + torso, armF: 20 + torso, foreF: 158 + torso });
/** Bras tendus vers le bas le long du corps (haltères tenus). */
const ARMS_DOWN = { armN: 4, foreN: 6, armF: 2, foreF: 4 };

const STAND: Pose = { torso: 0, thighN: 0, shinN: 0, thighF: -1, shinF: -1, armN: 8, foreN: 14, armF: -5, foreF: 3 };
const SEATED: Pose = { torso: 0, ...SEAT, armN: 8, foreN: 14, armF: 6, foreF: 12 };

/** Planche inclinée, mains sur l'assise : buste à 42°, corps gainé, bras verticaux. */
const INCLINE: Pose = { torso: 42, head: -6, thighN: -42, shinN: -42, thighF: -42, shinF: -42, armN: 0, foreN: 0, armF: 2, foreF: 2 };
/** Planche inclinée sur les avant-bras posés sur l'assise. */
const INCLINE_FORE: Pose = { torso: 58, head: -4, thighN: -58, shinN: -58, thighF: -58, shinF: -58, armN: 0, foreN: 90, armF: 2, foreF: 90 };

/** Good morning, charge contre la poitrine (debout, ou assis buste à 45°). */
const gmChest = (seated: boolean): Frame[] => seated
  ? [{ pose: { ...SEATED, ...chest(0) } }, { pose: { ...SEATED, torso: 45, head: -10, ...chest(45) } }]
  : [
    { pose: { torso: 0, thighN: 2, shinN: 0, thighF: 1, shinF: -1, ...chest(0) } },
    { pose: { torso: 75, head: -10, thighN: 14, shinN: -6, thighF: 13, shinF: -6, ...chest(75) } },
  ];

/** Obliques (rotation russe), une charge tenue à deux mains. */
const twistOne = (seated: boolean): Frame[] => {
  const base: Pose = seated
    ? { ...SEATED, torso: -18, armN: 74, foreN: 74, armF: 74, foreF: 74 }
    : { torso: -58, thighN: 145, shinN: 10, thighF: 143, shinF: 10, armN: 74, foreN: 74, armF: 74, foreF: 74 };
  return [
    { pose: { ...base, head: 18, twist: 1 }, w: 0.35 },
    { pose: { ...base, head: 18, twist: 1 } },
    { pose: { ...base, head: -4, twist: -1 }, w: 0.35 },
    { pose: { ...base, head: -4, twist: -1 } },
  ];
};

/** Poussée vers le haut, anneau serré entre les mains (de face) : de la poitrine au-dessus de la tête. */
const RING_UP = (legs: Partial<Pose>): Frame[] => [
  { pose: { torso: 0, thighN: 6, shinN: 5, thighF: 6, shinF: 5, ...legs, armN: 10, foreN: -150, armF: 10, foreF: -150 } },
  { pose: { torso: 0, thighN: 6, shinN: 5, thighF: 6, shinF: 5, ...legs, armN: 160, foreN: -145, armF: 160, foreF: -145 } },
];
const FRONT_SEAT_LEGS = { thighN: 22, shinN: 10, thighF: 22, shinF: 10, legReach: 0.42 };

/** Squat bulgare, charge contre la poitrine (kettlebell) ou bras le long du corps (haltères). */
const bulgarianWith = (arms: Arms): Frame[] => [
  { pose: { torso: 6, thighN: 10, shinN: 0, thighF: -40, shinF: -70, ...arms } },
  { pose: { torso: 14, head: -8, thighN: 80, shinN: -15, thighF: -15, shinF: -138, ...arms } },
];

/** Assis-debout avec une prise fixe des bras. */
const sitToStandWith = (arms: Arms): Frame[] => [
  { pose: { torso: 0, ...SEAT, ...arms }, w: 0.6 },
  { pose: { torso: 42, head: -15, thighN: 62, shinN: -12, thighF: 60, shinF: -12, ...arms }, w: 0.7 },
  { pose: { ...STAND, ...arms }, w: 0.5 },
  { pose: { ...STAND, ...arms }, w: 0.7 },
  { pose: { torso: 42, head: -15, thighN: 62, shinN: -12, thighF: 60, shinF: -12, ...arms }, w: 0.7 },
];

/** Squat (de profil) avec une prise fixe des bras. */
const squatWith = (arms: Arms): Frame[] => [
  { pose: { ...STAND, torso: 4, ...arms } },
  { pose: { torso: 34, head: -18, thighN: 95, shinN: -28, thighF: 92, shinF: -30, ...arms } },
];

/** Fente avec une prise fixe des bras. */
const lungeWith = (arms: Arms): Frame[] => [
  { pose: { torso: 0, thighN: 16, shinN: 0, thighF: -16, shinF: -20, ...arms } },
  { pose: { torso: 2, thighN: 86, shinN: 2, thighF: -28, shinF: -100, ...arms } },
];

/** Mollets assis : talons levés, genoux qui montent, hanche posée sur la chaise. */
const seatedCalf = (arms: Arms): Frame[] => [
  { pose: { ...SEATED, ...arms } },
  { pose: { ...SEATED, thighN: 98, shinN: 6, thighF: 96, shinF: 6, heel: 40, ...arms }, w: 0.6 },
  { pose: { ...SEATED, thighN: 98, shinN: 6, thighF: 96, shinF: 6, heel: 40, ...arms } },
];
/** Mains posées sur les genoux, assis. */
const HANDS_ON_KNEES = { armN: 42, foreN: 78, armF: 40, foreF: 76 };

// ---------- MI : postures des variantes avec matériel ----------
// (exportées aussi pour les exercices de base MI de exercises.ts : squat sumo, fente latérale, soulevé de terre)

/** De face : mains jointes devant la poitrine (ou une charge tenue contre la poitrine). */
export const MI_HANDS_CHEST: Arms = { armN: 22, foreN: -112, armF: 22, foreF: -112 };
/** De face : anneau serré entre les mains devant la poitrine. */
const MI_RING_CHEST_FRONT: Arms = { armN: 48, foreN: -98, armF: 48, foreF: -98 };
/** De face : bras tendus vers le bas, les deux mains jointes entre les jambes (une charge tenue à deux mains). */
const MI_HANG_FRONT: Arms = { armN: -15, foreN: -14, armF: -15, foreF: -14 };
/** De profil : anneau serré entre les mains devant la poitrine. */
const MI_RING_CHEST_SIDE: Arms = { armN: 6, foreN: 131, armF: 4, foreF: 129 };
/** De profil : mains sur les hanches. */
const MI_HANDS_ON_HIPS: Arms = { armN: -28, foreN: 62, armF: -30, foreF: 60 };

/** Squat sumo de face : pieds larges, genoux qui s'ouvrent au-dessus des pointes de pied. */
export function sumoFrames(arms: Arms): Frame[] {
  return [
    { pose: { torso: 0, thighN: 25, shinN: 24, thighF: 25, shinF: 24, ...arms } },
    { pose: { torso: 0, thighN: 72, shinN: 5, thighF: 72, shinF: 5, legReach: 0.8, ...arms }, w: 0.8 },
  ];
}
/** Squat sumo sur chaise (de face) : assis pieds larges, debout, puis on se rassoit. */
function miSumoChair(arms: Arms): Frame[] {
  const seated: Pose = { torso: 0, thighN: 50, shinN: 22, thighF: 50, shinF: 22, legReach: 0.45, ...arms };
  const up: Pose = { torso: 0, thighN: 24, shinN: 23, thighF: 24, shinF: 23, ...arms };
  return [{ pose: seated, w: 0.5 }, { pose: seated, w: 0.9 }, { pose: up, w: 0.6 }, { pose: up, w: 0.9 }];
}
/** Fente latérale alternée depuis l'écart (de face) : à droite, retour, à gauche. Pieds fixes. */
export function sideLungeFrames(arms: Arms): Frame[] {
  const wide: Pose = { torso: 0, thighN: 37.7, shinN: 37.7, thighF: 37.7, shinF: 37.7, ...arms };
  const right: Pose = { torso: 0, thighN: 70, shinN: 5, legReach: 0.85, thighF: 50.5, shinF: 50.5, ...arms };
  const left: Pose = { torso: 0, thighF: 70, shinF: 5, legReach: 0.85, thighN: 50.5, shinN: 50.5, ...arms };
  return [
    { pose: wide, w: 0.7 }, { pose: right, w: 0.5 }, { pose: right, w: 0.7 },
    { pose: wide, w: 0.7 }, { pose: left, w: 0.5 }, { pose: left, w: 0.7 },
  ];
}
/** Soulevé de terre jambes tendues (de profil) : charnière de hanche, genoux à peine fléchis, bras pendants. */
export function deadliftFrames(arms: Arms): Frame[] {
  return [
    { pose: { torso: 0, thighN: 0, shinN: 0, thighF: -1, shinF: -1, ...arms }, w: 0.8 },
    { pose: { torso: 76, head: -16, thighN: 28, shinN: 18, thighF: 27, shinF: 18, ...arms } },
  ];
}
/** Pont fessier, une charge posée sur le bassin et tenue à deux mains (coudes au sol pour l'haltère). */
const miBridgeLoaded = (kb: boolean): Frame[] => {
  const down = kb ? { armN: 116, foreN: 127, armF: 114, foreF: 125 } : { armN: 80, foreN: 136, armF: 78, foreF: 134 };
  const up = kb ? { armN: 140, foreN: 151, armF: 138, foreF: 149 } : { armN: 104, foreN: 160, armF: 102, foreF: 158 };
  return [
    { pose: { torso: -88, head: 6, thighN: 130, shinN: 25, thighF: 128, shinF: 25, ...down } },
    { pose: { torso: -112, head: 14, thighN: 100, shinN: -5, thighF: 98, shinF: -5, ...up }, w: 0.5 },
    { pose: { torso: -112, head: 14, thighN: 100, shinN: -5, thighF: 98, shinF: -5, ...up } },
  ];
};
/** Montée de genou assis, un haltère posé sur chaque cuisse près du genou (la main suit la cuisse). */
const MI_DB_THIGH_FLAT = { arm: 8, fore: 80 };
const MI_DB_THIGH_UP = { arm: -17, fore: 111 };
const miMarchDb = (): Frame[] => {
  const flatN = { armN: MI_DB_THIGH_FLAT.arm, foreN: MI_DB_THIGH_FLAT.fore };
  const flatF = { armF: MI_DB_THIGH_FLAT.arm - 1, foreF: MI_DB_THIGH_FLAT.fore - 1 };
  return [
    { pose: { ...SEATED, ...flatN, ...flatF } },
    { pose: { ...SEATED, thighN: 125, shinN: 20, armN: MI_DB_THIGH_UP.arm, foreN: MI_DB_THIGH_UP.fore, ...flatF } },
    { pose: { ...SEATED, ...flatN, ...flatF } },
    { pose: { ...SEATED, thighF: 123, shinF: 20, ...flatN, armF: MI_DB_THIGH_UP.arm - 1, foreF: MI_DB_THIGH_UP.fore - 1 } },
  ];
};
/** Mollets assis à l'élastique : jambe tendue, élastique sous l'avant du pied tenu à deux mains ; pointe tendue puis relâchée. */
const MI_CALF_BAND_SEATED: Frame[] = (() => {
  const base: Pose = { ...SEATED, thighN: 76, shinN: 52, armN: 30, foreN: 75, armF: 28, foreF: 73 };
  return [
    { pose: { ...base, heel: 0 } },
    { pose: { ...base, heel: 45 }, w: 0.6 },
    { pose: { ...base, heel: 45 } },
  ];
})();

// ---------- Les variantes ----------

const SPECS: Spec[] = [
  // ----- MI -----
  {
    base: 'squat', short: 'Squat', words: ['squat'],
    eq: {
      db: { s: { frames: squatWith(ARMS_DOWN) } },
      band: { s: { frames: squatWith({ armN: 60, foreN: 70, armF: 58, foreF: 68 }), grip: 'knees' } },
      ring: { s: { frames: squatWith({ armN: 80, foreN: 85, armF: 78, foreF: 83 }), grip: 'knees' } },
    },
  },
  {
    base: 'lunge', short: 'Fente', words: ['fente', 'lunge'],
    eq: {
      db: { s: { frames: lungeWith(ARMS_DOWN) } },
      kb: { s: { frames: lungeWith(chest(0)) } },
      // Élastique sous le pied avant, une extrémité dans chaque main.
      band: { s: { frames: lungeWith(ARMS_DOWN), grip: 'foot' } },
      // Anneau serré entre les mains devant la poitrine.
      ring: { s: { frames: lungeWith(MI_RING_CHEST_SIDE), grip: 'hands' } },
    },
  },
  {
    base: 'calfraise', short: 'Mollets', words: ['mollet', 'calf raise', 'montee sur pointe'],
    chair: { frames: seatedCalf(HANDS_ON_KNEES), anchor: 'hip' },
    eq: {
      db: { s: { frames: [
        { pose: { ...STAND, ...ARMS_DOWN } },
        { pose: { ...STAND, ...ARMS_DOWN, heel: 45 }, w: 0.6 },
        { pose: { ...STAND, ...ARMS_DOWN, heel: 45 } },
      ] }, c: { frames: seatedCalf(HANDS_ON_KNEES), anchor: 'hip' } },
      kb: {
        s: { frames: [
          { pose: { ...STAND, ...chest(0) } },
          { pose: { ...STAND, ...chest(0), heel: 45 }, w: 0.6 },
          { pose: { ...STAND, ...chest(0), heel: 45 } },
        ] },
        c: { frames: seatedCalf(HANDS_ON_KNEES), anchor: 'hip', grip: 'one' },
      },
      band: { c: { frames: MI_CALF_BAND_SEATED, anchor: 'hip', grip: 'foot' } },
      // Anneau serré entre les chevilles (debout) ou entre les genoux (assis).
      ring: {
        s: { grip: 'ankles', frames: [
          { pose: { ...STAND, ...MI_HANDS_ON_HIPS } },
          { pose: { ...STAND, ...MI_HANDS_ON_HIPS, heel: 45 }, w: 0.6 },
          { pose: { ...STAND, ...MI_HANDS_ON_HIPS, heel: 45 } },
        ] },
        c: { frames: seatedCalf({ armN: 20, foreN: 60, armF: 18, foreF: 58 }), anchor: 'hip', grip: 'knees' },
      },
    },
  },
  {
    base: 'bridge', short: 'Pont fessier', words: ['pont fessier', 'glute bridge', 'hip thrust'],
    eq: {
      band: { s: { grip: 'knees' } },
      db: { s: { frames: miBridgeLoaded(false), grip: 'one' } },
      kb: { s: { frames: miBridgeLoaded(true), grip: 'one' } },
    },
  },
  {
    base: 'legraise', short: 'Relevés de jambes', words: ['releve de jambe', 'leg raise'],
    eq: { ring: { s: { grip: 'ankles' } } },
  },
  {
    base: 'sittostand', short: 'Assis-debout', words: ['assis debout', 'sit to stand'],
    eq: {
      db: { c: { frames: sitToStandWith(ARMS_DOWN), anchor: 'feet', label: 'Assis-debout (haltères)' } },
      kb: { c: { frames: sitToStandWith({ armN: 22, foreN: 160, armF: 20, foreF: 158 }), anchor: 'feet', label: 'Assis-debout (kettlebell)' } },
      band: { c: { grip: 'knees', anchor: 'feet', label: 'Assis-debout (élastique)' } },
      ring: { c: { grip: 'knees', anchor: 'feet', label: 'Assis-debout (anneau)' } },
    },
  },
  {
    base: 'kneeext', short: 'Extension de genou', words: ['extension de genou', 'extension de jambe assis'],
    eq: { band: { c: { grip: 'ankles', label: 'Extension de genou (élastique)' } } },
  },
  {
    base: 'seatedmarch', short: 'Montée de genou', words: ['montee de genou assis', 'marche assis'],
    eq: {
      band: { c: { grip: 'knees', label: 'Montée de genou assis (élastique)' } },
      db: { c: { frames: miMarchDb(), words: ['montee de genou assis haltere', 'montee de genou haltere assis', 'montee de genou assis avec haltere'] } },
    },
  },
  {
    base: 'bulgarian', short: 'Squat bulgare', words: ['squat bulgare', 'fente bulgare', 'squat sur une jambe', 'split squat'],
    eq: {
      db: { s: { frames: bulgarianWith(ARMS_DOWN) } },
      kb: { s: { frames: bulgarianWith(chest(10)) } },
    },
  },
  {
    base: 'toeraise', short: 'Relevé de la pointe des pieds', words: ['releve de la pointe', 'releve de pointe', 'pointe des pied'],
    chair: { frames: [
      { pose: { ...SEATED, ...HANDS_ON_KNEES } },
      { pose: { ...SEATED, ...HANDS_ON_KNEES, heel: -28 }, w: 0.6 },
      { pose: { ...SEATED, ...HANDS_ON_KNEES, heel: -28 } },
    ] },
  },
  {
    base: 'legabduction', short: 'Abduction de la jambe', words: ['abduction de la jambe', 'abduction de jambe', 'abduction de hanche', 'abduction'],
    chair: true,
    eq: {
      band: { s: { grip: 'knees' }, c: { grip: 'knees' } },
      ring: {
        s: { grip: 'knees', frames: [
          { pose: { torso: 0, thighN: 4, shinN: 3, thighF: 3, shinF: 2, armN: 35, foreN: -60, armF: 35, foreF: -60 } },
          { pose: { torso: 0, thighN: 16, shinN: 14, thighF: 3, shinF: 2, armN: 35, foreN: -60, armF: 35, foreF: -60 }, w: 0.6 },
          { pose: { torso: 0, thighN: 16, shinN: 14, thighF: 3, shinF: 2, armN: 35, foreN: -60, armF: 35, foreF: -60 } },
        ] },
        c: { grip: 'knees' },
      },
    },
  },
  {
    base: 'legadduction', short: 'Adduction de la jambe', words: ['adduction de la jambe', 'adduction de jambe', 'adduction de hanche', 'adduction'],
    chair: true,
    eq: { ring: { s: { grip: 'knees' }, c: { grip: 'knees' } } },
  },
  {
    base: 'kickback', short: 'Extension de la jambe vers l’arrière', words: ['extension de la jambe vers l arriere', 'extension de jambe arriere', 'kickback', 'kick back'],
    // Debout derrière la chaise, mains sur le dossier.
    chair: {
      label: 'Extension de la jambe vers l’arrière, appui chaise', chairUnder: 'rest', anchor: 'hip',
      frames: [
        { pose: { torso: 18, head: -8, thighN: 0, shinN: 0, thighF: -1, shinF: -1, armN: 50, foreN: 70, armF: 48, foreF: 68 } },
        { pose: { torso: 18, head: -8, thighN: -48, shinN: -55, thighF: -1, shinF: -1, armN: 50, foreN: 70, armF: 48, foreF: 68 }, w: 0.6 },
        { pose: { torso: 18, head: -8, thighN: -48, shinN: -55, thighF: -1, shinF: -1, armN: 50, foreN: 70, armF: 48, foreF: 68 } },
      ],
    },
    eq: { band: { s: { grip: 'ankles' }, c: { grip: 'ankles' } } },
  },
  // MI : squat sumo, fente latérale, soulevé de terre jambes tendues (haltères dans l'exercice de base).
  {
    base: 'sumosquat', short: 'Squat sumo', words: ['squat sumo', 'sumo squat', 'squat plie'],
    chair: { label: 'Squat sumo sur chaise', frames: miSumoChair(MI_HANDS_CHEST), anchor: 'hip' },
    eq: {
      // Un haltère ou une kettlebell tenu à deux mains entre les jambes.
      db: {
        s: { frames: sumoFrames(MI_HANG_FRONT), grip: 'one' },
        c: { frames: miSumoChair(MI_HANG_FRONT), grip: 'one', label: 'Squat sumo sur chaise (haltères)', words: ['squat sumo sur chaise haltere', 'squat sumo sur chaise avec haltere'] },
      },
      kb: {
        s: { frames: sumoFrames(MI_HANG_FRONT), grip: 'one' },
        c: { frames: miSumoChair(MI_HANG_FRONT), grip: 'one', label: 'Squat sumo sur chaise (kettlebell)', words: ['squat sumo sur chaise kettlebell', 'squat sumo sur chaise avec kettlebell'] },
      },
      // Mini-bande au-dessus des genoux : on pousse les genoux vers l'extérieur.
      band: { s: { frames: sumoFrames(MI_HANDS_CHEST), grip: 'knees' } },
      // Anneau serré entre les mains devant la poitrine (plié du Pilates).
      ring: {
        s: { frames: sumoFrames(MI_RING_CHEST_FRONT) },
        c: { frames: miSumoChair(MI_RING_CHEST_FRONT), label: 'Squat sumo sur chaise (anneau)', words: ['squat sumo sur chaise anneau', 'squat sumo sur chaise avec anneau'] },
      },
    },
  },
  {
    base: 'sidelunge', short: 'Fente latérale', words: ['fente laterale', 'side lunge', 'lateral lunge'],
    eq: {
      // Charge tenue contre la poitrine (goblet).
      db: { s: { grip: 'one' } },
      kb: { s: { grip: 'one' } },
      ring: { s: { frames: sideLungeFrames(MI_RING_CHEST_FRONT) } },
    },
  },
  {
    base: 'deadlift', short: 'Soulevé de terre jambes tendues', words: ['souleve de terre', 'souleve de terre jambes tendue', 'deadlift'],
    eq: {
      kb: { s: { grip: 'one' } },
      // Debout sur l'élastique, une extrémité dans chaque main.
      band: { s: true },
    },
  },

  // ----- MS -----
  {
    base: 'pressup', short: 'Développé épaules', words: ['developpe epaule', 'poussee des epaules vers le haut', 'shoulder press'],
    chair: { label: 'Poussée des épaules vers le haut assis' },
    eq: {
      kb: { s: true, c: true },
      band: { s: true, c: true },
      ring: { s: { frames: RING_UP({}) }, c: { frames: RING_UP(FRONT_SEAT_LEGS) } },
    },
  },
  {
    base: 'pressforward', short: 'Poussée vers l’avant', words: ['poussee des epaules vers l avant', 'poussee vers l avant', 'developpe couche debout'],
    chair: { label: 'Poussée des épaules vers l’avant assis' },
    eq: {
      db: { s: true, c: true },
      kb: { s: true, c: true },
      ring: { s: { grip: 'hands' }, c: { grip: 'hands' } },
    },
  },
  {
    base: 'curlbw', short: 'Curl biceps', words: ['curl biceps', 'curl', 'biceps'],
    chair: { label: 'Biceps assis (flexion des coudes)' },
    eq: { kb: { s: true, c: true }, band: { c: true } },
  },
  {
    base: 'tricepsbw', short: 'Extension triceps', words: ['triceps', 'extension triceps', 'extension au dessus de la tete'],
    chair: true,
    eq: { db: { s: { grip: 'one' }, c: { grip: 'one' } }, kb: { s: true, c: true }, band: { s: true, c: true } },
  },
  {
    base: 'shrug', short: 'Haussement des épaules', words: ['haussement des epaule', 'haussement d epaule', 'shrug'],
    chair: true,
    eq: { db: { s: true, c: true }, kb: { s: true, c: true }, band: { s: true, c: true } },
  },
  {
    base: 'uprightrow', short: 'Tirage menton', words: ['tirage menton', 'tirage au menton', 'upright row'],
    chair: true,
    eq: { db: { s: true, c: true }, kb: { s: true, c: true }, band: { s: true, c: true } },
  },
  {
    base: 'lateralbw', short: 'Élévations latérales', words: ['elevation laterale', 'lateral raise'],
    chair: true,
    eq: { db: { s: true, c: true }, kb: { s: true, c: true }, band: { c: true } },
  },
  {
    base: 'frontbw', short: 'Élévation frontale', words: ['elevation frontale', 'front raise'],
    chair: true,
    eq: {
      db: { s: true, c: true },
      kb: { s: true },
      band: { s: true, c: true },
      ring: { s: { grip: 'hands' }, c: { grip: 'hands' } },
    },
  },
  {
    base: 'pecfly', short: 'Pectoraux', words: ['pectoraux', 'pectoral', 'butterfly', 'ecarte pectoraux'],
    chair: true,
    eq: { db: { s: true, c: true }, ring: { s: { grip: 'hands' }, c: { grip: 'hands' } } },
  },
  {
    base: 'arnold', short: 'Développé Arnold', words: ['developpe arnold', 'arnold press', 'arnold'],
    chair: true,
    eq: { db: { c: true }, kb: { s: true, c: true }, band: { s: true, c: true } },
  },
  {
    base: 'pushup', short: 'Pompe', words: ['pompe', 'push up'],
    chair: {
      label: 'Pompe inclinée sur chaise', chairUnder: 'incline', anchor: 'hands',
      frames: [
        { pose: INCLINE },
        { pose: { torso: 56, head: -6, thighN: -56, shinN: -56, thighF: -56, shinF: -56, armN: -74, foreN: 12.5, armF: -72, foreF: 14 } },
      ],
    },
  },

  // ----- Tronc -----
  {
    base: 'plank', short: 'Gainage', words: ['gainage', 'planche', 'plank'],
    chair: {
      label: 'Gainage incliné sur chaise', chairUnder: 'incline', anchor: 'hands',
      frames: [{ pose: INCLINE_FORE }, { pose: { ...INCLINE_FORE, head: -9 } }],
    },
  },
  {
    base: 'climber', short: 'Mountain climber', words: ['mountain climber', 'climber', 'grimpeur'],
    chair: {
      label: 'Mountain climber sur chaise', chairUnder: 'incline', anchor: 'hands', period: 1.1,
      frames: [
        { pose: { ...INCLINE, thighN: 50, shinN: -70 } },
        { pose: { ...INCLINE, thighF: 50, shinF: -70 } },
      ],
    },
  },
  {
    base: 'shouldertap', short: 'Shoulder tap', words: ['shoulder tap', 'tap epaule', 'touche epaule'],
    chair: {
      label: 'Shoulder tap sur chaise', chairUnder: 'incline', anchor: 'feet',
      frames: [
        { pose: INCLINE },
        { pose: { ...INCLINE, armN: 40, foreN: -160 } },
        { pose: INCLINE },
        { pose: { ...INCLINE, armF: 40, foreF: -160 } },
      ],
    },
  },
  {
    base: 'situpfull', short: 'Sit-up', words: ['sit up', 'situp'],
    // Assis : buste un peu en arrière, un genou vers la poitrine, puis l'autre (un pied toujours au sol).
    chair: {
      label: 'Genou poitrine assis',
      frames: [
        { pose: { ...SEATED, armN: 80, foreN: 85, armF: 78, foreF: 83 } },
        { pose: { ...SEATED, torso: -22, head: 14, thighN: 140, shinN: 40, armN: 80, foreN: 85, armF: 78, foreF: 83 } },
        { pose: { ...SEATED, armN: 80, foreN: 85, armF: 78, foreF: 83 } },
        { pose: { ...SEATED, torso: -22, head: 14, thighF: 138, shinF: 40, armN: 80, foreN: 85, armF: 78, foreF: 83 } },
      ],
    },
    eq: { db: { s: { grip: 'one' } }, kb: { s: { grip: 'one' } }, ring: { s: { grip: 'hands' } } },
  },
  {
    base: 'obliques', short: 'Obliques', words: ['oblique', 'rotation russe', 'russian twist'],
    chair: {
      frames: [
        { pose: { ...SEATED, torso: -18, head: 18, twist: 1, armN: 66, foreN: 66, armF: 80, foreF: 80 }, w: 0.35 },
        { pose: { ...SEATED, torso: -18, head: 18, twist: 1, armN: 66, foreN: 66, armF: 80, foreF: 80 } },
        { pose: { ...SEATED, torso: -18, head: -4, twist: -1, armN: 80, foreN: 80, armF: 66, foreF: 66 }, w: 0.35 },
        { pose: { ...SEATED, torso: -18, head: -4, twist: -1, armN: 80, foreN: 80, armF: 66, foreF: 66 } },
      ],
    },
    eq: {
      db: { s: { frames: twistOne(false), grip: 'one' }, c: { frames: twistOne(true), grip: 'one' } },
      kb: { s: { frames: twistOne(false), grip: 'one' }, c: { frames: twistOne(true), grip: 'one' } },
      ring: { s: { frames: twistOne(false), grip: 'hands' }, c: { frames: twistOne(true), grip: 'hands' } },
    },
  },
  {
    base: 'woodchop', short: 'Bûcheron', words: ['bucheron', 'wood chop', 'woodchop'],
    chair: true,
    eq: {
      db: { s: { grip: 'one' }, c: { grip: 'one' } },
      kb: { s: { grip: 'one' }, c: { grip: 'one' } },
      band: { s: true, c: true },
      ring: { s: { grip: 'hands' }, c: { grip: 'hands' } },
    },
  },
  {
    base: 'goodmorning', short: 'Good morning', words: ['good morning', 'goodmorning'],
    chair: true,
    eq: {
      db: { s: { frames: gmChest(false), grip: 'one' }, c: { frames: gmChest(true), grip: 'one' } },
      kb: { s: { frames: gmChest(false), grip: 'one' }, c: { frames: gmChest(true), grip: 'one' } },
      band: { s: true, c: true },
    },
  },
  {
    base: 'supermanfront', short: 'Superman frontal', words: ['superman frontal', 'superman debout', 'superman incline'],
    chair: true,
    eq: { db: { s: true, c: true } },
  },
  {
    base: 'supermanside', short: 'Superman latéral', words: ['superman lateral', 'oiseau', 'reverse fly'],
    chair: true,
    eq: { db: { s: true, c: true }, band: { s: true, c: true } },
  },

  // ----- Cardio -----
  {
    base: 'jumpingjack', short: 'Jumping jack', words: ['jumping jack', 'jumpingjack'],
    chair: {
      frames: [
        { pose: { torso: 0, ...FRONT_SEAT_LEGS, armN: 8, foreN: 10, armF: 8, foreF: 10 } },
        { pose: { torso: 0, ...FRONT_SEAT_LEGS, thighN: 40, shinN: 30, thighF: 40, shinF: 30, armN: 165, foreN: 172, armF: 165, foreF: 172 } },
      ],
    },
  },
];

// ---------- Construction ----------

const words = (base: string[], extra: string[][]): string[] =>
  base.flatMap((w) => extra.map((parts) => [w, ...parts].join(' ')));

/** Construit les variantes à partir des exercices de base (ordre stable : celui de la table). */
export function variantsOf(base: ExerciseAnim[]): ExerciseAnim[] {
  const byId = new Map(base.map((e) => [e.id, e]));
  const out: ExerciseAnim[] = [];
  for (const s of SPECS) {
    const b = byId.get(s.base);
    if (!b) throw new Error(`Exercice de base inconnu : ${s.base}`);
    const baseSeated = !!b.chairUnder;
    const chairOver: Over = s.chair && s.chair !== true ? s.chair : {};
    /** Version sur chaise par défaut : postures assises, chaise sous la hanche. */
    const seated = (o: Over): Pick<ExerciseAnim, 'frames' | 'chairUnder' | 'anchor' | 'period'> => ({
      frames: o.frames ?? chairOver.frames ?? (baseSeated ? b.frames : seatFrames(b.frames, b.view)),
      chairUnder: o.chairUnder ?? chairOver.chairUnder ?? b.chairUnder ?? 'hip',
      anchor: o.anchor ?? chairOver.anchor ?? (baseSeated ? b.anchor : 'hip'),
      period: o.period ?? chairOver.period ?? b.period,
    });
    const chairLabel = chairOver.label ?? (baseSeated ? b.label : `${s.short} assis`);
    // Avec matériel sur chaise : le nom court (« Développé épaules assis »), sauf appui particulier (pompe inclinée…).
    const eqChairLabel = baseSeated || chairOver.chairUnder ? chairLabel : `${s.short} assis`;
    if (s.chair) {
      out.push({
        ...b, id: `${s.base}-c` as ExerciseId, label: chairLabel, ...seated(chairOver),
        positions: undefined, grip: chairOver.grip,
        words: words(s.words, CHAIR_WORDS.map((c) => [c])),
      });
    }
    for (const [k, v] of Object.entries(s.eq ?? {}) as [Eq, { s?: Opt; c?: Opt }][]) {
      const eqWords = EQ_WORDS[k].flatMap((e) => [[e], ['avec', e], ['aux', e]]);
      if (v.s) {
        const o: Over = v.s === true ? {} : v.s;
        out.push({
          ...b, id: `${s.base}-${k}` as ExerciseId, equipment: EQ[k],
          label: o.label ?? `${s.short} (${EQ_NAME[k]})`,
          frames: o.frames ?? b.frames, anchor: o.anchor ?? b.anchor, period: o.period ?? b.period,
          chairUnder: o.chairUnder ?? b.chairUnder, grip: o.grip,
          words: words(s.words, eqWords),
        });
      }
      if (v.c) {
        const o: Over = v.c === true ? {} : v.c;
        out.push({
          ...b, id: `${s.base}-${k}-c` as ExerciseId, equipment: EQ[k],
          label: o.label ?? `${eqChairLabel} (${EQ_NAME[k]})`,
          ...seated(o), positions: undefined, grip: o.grip ?? chairOver.grip,
          words: [...words(s.words, EQ_WORDS[k].flatMap((e) => [[e, 'assis'], ['assis', e], ['assis', 'avec', e], [e, 'sur', 'chaise']])), ...(o.words ?? [])],
        });
      }
    }
  }
  return out;
}
