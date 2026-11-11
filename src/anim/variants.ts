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

// ---------- Postures MS ----------

/** Assis au bord de la chaise, buste penché sur les cuisses (rowing, kickback assis). */
const SEATED_BENT: Pose = { torso: 55, head: -14, ...SEAT, armN: 0, foreN: 0, armF: -2, foreF: -2 };
/** Rowing buste penché assis : bras qui pendent le long des mollets, puis coudes tirés vers l'arrière. */
const seatedRow: Frame[] = [
  { pose: { ...SEATED_BENT, armN: -6, foreN: 20, armF: -8, foreF: 18 } },
  { pose: { ...SEATED_BENT, armN: -58, foreN: 10, armF: -56, foreF: 8 } },
];
/** Kickback triceps assis, buste penché : haut du bras le long du buste, avant-bras qui se tend vers l'arrière. */
const seatedKick: Frame[] = [
  { pose: { ...SEATED_BENT, armN: -66, foreN: 8, armF: -64, foreF: 6 } },
  { pose: { ...SEATED_BENT, armN: -68, foreN: -70, armF: -66, foreF: -68 }, w: 0.5 },
  { pose: { ...SEATED_BENT, armN: -68, foreN: -70, armF: -66, foreF: -68 } },
];

// ---------- Cardio : aides de posture ----------

/** Charge poussée au-dessus de la tête, bras tendus (de profil). */
const ARMS_OVER: Arms = { armN: 172, foreN: 176, armF: 170, foreF: 174 };
/** Anneau serré entre les paumes devant la poitrine (de profil), suivant l'inclinaison du buste. */
const ringChest = (torso: number): Arms => ({ armN: 40 + torso, foreN: 120 + torso, armF: 38 + torso, foreF: 118 + torso });

/** Thruster debout : charge à la poitrine, squat, puis poussée au-dessus de la tête en remontant. */
const thrusterWith = (rack: (torso: number) => Arms, over: Arms = ARMS_OVER): Frame[] => [
  { pose: { ...STAND, torso: 2, ...rack(2) } },
  { pose: { torso: 34, head: -18, thighN: 95, shinN: -28, thighF: 92, shinF: -30, ...rack(34) }, w: 0.7 },
  { pose: { ...STAND, ...over }, w: 0.4 },
  { pose: { ...STAND, ...over }, w: 0.8 },
];
/** Thruster depuis la chaise : on se lève en poussant la charge au-dessus de la tête, on la ramène, on se rassoit. */
const thrusterSeated = (rack: (torso: number) => Arms, over: Arms = ARMS_OVER): Frame[] => [
  { pose: { torso: 0, ...SEAT, ...rack(0) }, w: 0.5 },
  { pose: { torso: 42, head: -15, thighN: 62, shinN: -12, thighF: 60, shinF: -12, ...rack(42) }, w: 0.6 },
  { pose: { ...STAND, ...over }, w: 0.4 },
  { pose: { ...STAND, ...over }, w: 0.6 },
  { pose: { ...STAND, ...rack(0) }, w: 0.5 },
  { pose: { torso: 42, head: -15, thighN: 62, shinN: -12, thighF: 60, shinF: -12, ...rack(42) }, w: 0.7 },
];

/** Squat sauté avec une prise fixe des bras (en bas, en l'air). */
const jumpSquatWith = (low: Arms, high: Arms): Frame[] => [
  { pose: { torso: 38, head: -22, thighN: 95, shinN: -28, thighF: 92, shinF: -30, ...low }, w: 0.55 },
  { pose: { torso: 0, thighN: 2, shinN: 2, thighF: 0, shinF: 0, ...high, lift: 12, heel: 30 } },
];

/** Burpee les mains sur les haltères : on se relève et on saute haltères le long du corps. */
const BURPEE_LOW_C: Pose = { torso: 60, head: -30, thighN: 100, shinN: -35, thighF: 98, shinF: -35, armN: 35, foreN: 35, armF: 33, foreF: 33 };
const HIGH_PLANK_C: Pose = { torso: 68, head: -6, thighN: -68, shinN: -68, thighF: -68, shinF: -68, armN: 0, foreN: 0, armF: 3, foreF: 3 };
const BURPEE_HOLD: Frame[] = [
  { pose: { ...STAND, ...ARMS_DOWN }, anchor: 'feet' },
  { pose: BURPEE_LOW_C, anchor: 'feet', w: 0.7 },
  { pose: HIGH_PLANK_C, anchor: 'hands', w: 0.7 },
  { pose: BURPEE_LOW_C, anchor: 'hands' },
  { pose: { torso: 0, thighN: 2, shinN: 4, thighF: 0, shinF: 3, ...ARMS_DOWN, lift: 10 }, anchor: 'feet', w: 0.8 },
];

/** Jumping jack de face, anneau tenu au-dessus de la tête et serré à chaque écart des jambes. */
const jackRingOver = (seated: boolean): Frame[] => {
  const closed = seated ? FRONT_SEAT_LEGS : { thighN: 3, shinN: 2, thighF: 3, shinF: 2 };
  const open = seated
    ? { ...FRONT_SEAT_LEGS, thighN: 40, shinN: 30, thighF: 40, shinF: 30 }
    : { thighN: 20, shinN: 18, thighF: 20, shinF: 18 };
  const mid = seated ? { ...FRONT_SEAT_LEGS, thighN: 31, shinN: 20, thighF: 31, shinF: 20 } : { thighN: 11, shinN: 10, thighF: 11, shinF: 10 };
  return [
    { pose: { torso: 0, ...closed, armN: 158, foreN: -148, armF: 158, foreF: -148 } },
    { pose: { torso: 0, ...mid, armN: 160, foreN: -144, armF: 160, foreF: -144, lift: seated ? 0 : 6 } },
    { pose: { torso: 0, ...open, armN: 162, foreN: -140, armF: 162, foreF: -140 } },
    { pose: { torso: 0, ...mid, armN: 160, foreN: -144, armF: 160, foreF: -144, lift: seated ? 0 : 6 } },
  ];
};

/** Montées de genoux avec une mini-bande autour des pieds : genou un peu moins haut. */
const KNEES_BAND: Frame[] = [
  { pose: { torso: -2, thighN: 78, shinN: 0, thighF: 2, shinF: 2, armN: -35, foreN: 30, armF: 45, foreF: 120, lift: 2 } },
  { pose: { torso: -2, thighN: 2, shinN: 2, thighF: 78, shinF: 0, armN: 45, foreN: 120, armF: -35, foreF: 30, lift: 2 } },
];

/** Montées de genoux : le genou vient toucher l'anneau tenu à deux mains devant les hanches. */
const KNEES_TO_RING: Frame[] = [
  { pose: { torso: -2, thighN: 95, shinN: 5, thighF: 2, shinF: 2, armN: 30, foreN: 80, armF: 28, foreF: 78, lift: 2 } },
  { pose: { torso: -2, thighN: 2, shinN: 2, thighF: 95, shinF: 5, armN: 30, foreN: 80, armF: 28, foreF: 78, lift: 2 } },
];

/** Tipping assis : pieds qui frappent le sol à toute vitesse, sur l'avant du pied, bras qui accompagnent. */
const SEATED_TAP: Frame[] = [
  { pose: { ...SEATED, torso: 8, thighN: 100, shinN: 8, heel: 30, armN: 25, foreN: 105, armF: -15, foreF: 75 } },
  { pose: { ...SEATED, torso: 8, thighF: 98, shinF: 8, heel: 30, armN: -15, foreN: 75, armF: 25, foreF: 105 } },
];
/** Corde à sauter assis : talons qui rebondissent, mains qui font tourner la corde au niveau des hanches. */
const SEATED_ROPE: Frame[] = [
  { pose: { ...SEATED, armN: 10, foreN: 108, armF: 8, foreF: 106 } },
  { pose: { ...SEATED, thighN: 96, shinN: 5, thighF: 94, shinF: 5, heel: 35, armN: 8, foreN: 86, armF: 6, foreF: 84 } },
];

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
      kb: { c: { frames: seatedCalf(HANDS_ON_KNEES), anchor: 'hip', grip: 'one' } },
    },
  },
  {
    base: 'bridge', short: 'Pont fessier', words: ['pont fessier', 'glute bridge', 'hip thrust'],
    eq: { band: { s: { grip: 'knees' } } },
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
    eq: { band: { c: { grip: 'knees', label: 'Montée de genou assis (élastique)' } } },
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
      // Élastique passé dans le dos, poussé devant soi (développé couché debout).
      band: { s: { grip: 'back' }, c: { grip: 'back' } },
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
    base: 'pushup', short: 'Pompe', words: ['pompe', 'push up', 'pompe sur'],
    chair: {
      label: 'Pompe inclinée sur chaise', chairUnder: 'incline', anchor: 'hands',
      frames: [
        { pose: INCLINE },
        { pose: { torso: 56, head: -6, thighN: -56, shinN: -56, thighF: -56, shinF: -56, armN: -74, foreN: 12.5, armF: -72, foreF: 14 } },
      ],
    },
    eq: {
      // Mains sur les haltères (poignets droits, plus d'amplitude).
      db: { s: true },
      // Élastique tendu dans le dos, une extrémité sous chaque main.
      band: { s: { grip: 'back' }, c: { grip: 'back' } },
    },
  },
  {
    base: 'dbrow', short: 'Rowing buste penché', words: ['rowing buste penche', 'rowing penche'],
    eq: {
      db: { c: { frames: seatedRow } },
      kb: { s: true, c: { frames: seatedRow } },
      // Élastique sous les pieds.
      band: { s: true, c: { frames: seatedRow } },
      // Anneau serré entre les paumes pendant le tirage.
      ring: { s: { grip: 'hands' }, c: { frames: seatedRow, grip: 'hands' } },
    },
  },
  {
    base: 'dbkickback', short: 'Kickback triceps', words: ['kickback triceps', 'kick back triceps'],
    eq: {
      db: { c: { frames: seatedKick } },
      // Élastique sous les pieds.
      band: { s: true, c: { frames: seatedKick } },
    },
  },
  {
    base: 'dbhammer', short: 'Curl marteau', words: ['curl marteau', 'hammer curl'],
    eq: { db: { c: { grip: 'hammer' } }, kb: { s: true, c: true } },
  },
  {
    base: 'dbpullover', short: 'Pull-over', words: ['pull over', 'pullover'],
    eq: { kb: { s: { grip: 'one' } } },
  },
  {
    base: 'dbfloorpress', short: 'Développé couché au sol', words: ['developpe couche au sol', 'floor press'],
    eq: { kb: { s: true } },
  },
  {
    base: 'ringpress', short: 'Compression anneau', words: ['compression anneau', 'presse anneau'],
    chair: { label: 'Compression anneau assis (bras)' },
  },
  {
    base: 'ringoverhead', short: 'Compression anneau au-dessus de la tête', words: ['compression anneau au dessus de la tete', 'anneau au dessus de la tete'],
    chair: { label: 'Compression anneau au-dessus de la tête assis' },
  },
  {
    base: 'ringside', short: 'Compression anneau contre la hanche', words: ['compression anneau contre la hanche', 'anneau contre la hanche', 'anneau sous le bras'],
    chair: { label: 'Compression anneau contre la hanche assis', grip: 'side' },
  },
  {
    base: 'ringopen', short: 'Écartement de l’anneau', words: ['ecartement de l anneau', 'ecartement anneau', 'ouverture anneau'],
    chair: { label: 'Écartement de l’anneau assis', grip: 'inside' },
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
    eq: {
      // Haltères légers : un par main, debout et assis (postures du jumping jack assis).
      db: { s: true, c: true },
      // Mini-bande aux chevilles debout, au-dessus des genoux assis.
      band: { s: { grip: 'ankles' }, c: { grip: 'knees' } },
      // Anneau tenu au-dessus de la tête, serré à chaque écart.
      ring: { s: { frames: jackRingOver(false) }, c: { frames: jackRingOver(true) } },
    },
  },
  {
    base: 'shadowbox', short: 'Boxe dans le vide', words: ['boxe dans le vide', 'shadow boxing', 'boxe'],
    chair: true,
    eq: { db: { s: true, c: true } },
  },
  {
    base: 'jumprope', short: 'Corde à sauter imaginaire', words: ['corde a sauter', 'saut a la corde', 'jump rope'],
    chair: { frames: SEATED_ROPE },
  },
  {
    base: 'tapping', short: 'Tipping', words: ['tipping', 'tapping', 'fast feet', 'pietinement'],
    chair: { frames: SEATED_TAP },
  },
  {
    base: 'thruster', short: 'Thruster', words: ['thruster', 'squat developpe', 'squat poussee'],
    eq: {
      db: { c: { frames: thrusterSeated(chest), anchor: 'feet', label: 'Thruster assis-debout (haltères)' } },
      kb: {
        s: { frames: thrusterWith(chest), grip: 'one' },
        c: { frames: thrusterSeated(chest), anchor: 'feet', grip: 'one', label: 'Thruster assis-debout (kettlebell)' },
      },
      // Élastique sous les pieds, une poignée dans chaque main.
      band: {
        s: { frames: thrusterWith(chest) },
        c: { frames: thrusterSeated(chest), anchor: 'feet', label: 'Thruster assis-debout (élastique)' },
      },
      ring: {
        s: { frames: thrusterWith(ringChest), grip: 'hands' },
        c: { frames: thrusterSeated(ringChest), anchor: 'feet', grip: 'hands', label: 'Thruster assis-debout (anneau)' },
      },
    },
  },
  {
    base: 'jumpsquat', short: 'Squat sauté', words: ['squat saute', 'jump squat', 'squat jump'],
    eq: {
      db: { s: { frames: jumpSquatWith(ARMS_DOWN, ARMS_DOWN) } },
      kb: { s: { frames: jumpSquatWith(chest(38), chest(0)), grip: 'one' } },
      band: { s: { grip: 'knees' } },
      ring: { s: { frames: jumpSquatWith(ringChest(38), ringChest(0)), grip: 'hands' } },
    },
  },
  {
    base: 'highknees', short: 'Montées de genoux', words: ['montee de genoux', 'montee de genou', 'high knee'],
    eq: {
      band: { s: { frames: KNEES_BAND, grip: 'ankles' } },
      ring: { s: { frames: KNEES_TO_RING, grip: 'hands' } },
    },
  },
  {
    base: 'shufflealt', short: 'Pas chassé', words: ['pas chasse alterne', 'pas chasse', 'shuffle'],
    eq: { band: { s: { grip: 'knees', label: 'Pas chassé alterné (élastique)' } } },
  },
  {
    base: 'burpee', short: 'Burpee', words: ['burpee'],
    eq: { db: { s: { frames: BURPEE_HOLD } } },
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
          words: words(s.words, EQ_WORDS[k].flatMap((e) => [[e, 'assis'], ['assis', e], ['assis', 'avec', e], [e, 'sur', 'chaise']])),
        });
      }
    }
  }
  return out;
}
