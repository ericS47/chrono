// Jeu de plateau sportif « Pulse Party » : moteur pur (aucun accès au DOM), testé par Vitest.
//
// Principe : on fait le tour d'un plateau de 40 cases avec un dé. Les cases « exercice »
// s'achètent en répétitions ; les autres joueurs qui y tombent font des répétitions.
// Rien ne se paie en argent : tout se paie en répétitions, faites pour de vrai.

export type SquareKind = 'start' | 'exercise' | 'cardio' | 'defi' | 'culture' | 'gym' | 'rest' | 'togym';

export interface Square {
  kind: SquareKind;
  /** Groupe de couleur (cases exercice). */
  group?: number;
  /** Numéro de la carte cardio (0 à 3). */
  cardio?: number;
}

/** Plateau original de 40 cases : 4 coins, 22 exercices en 8 groupes, 4 cartes cardio, défis et culture. */
export const BOARD: Square[] = (() => {
  const E = (group: number): Square => ({ kind: 'exercise', group });
  const C = (cardio: number): Square => ({ kind: 'cardio', cardio });
  const D: Square = { kind: 'defi' };
  const Q: Square = { kind: 'culture' };
  return [
    { kind: 'start' }, E(0), Q, E(0), C(0), D, E(1), E(1), Q, E(1),
    { kind: 'gym' }, E(2), D, E(2), E(2), C(1), E(3), Q, E(3), E(3),
    { kind: 'rest' }, E(4), E(4), D, E(4), C(2), E(5), Q, E(5), E(5),
    { kind: 'togym' }, E(6), D, E(6), E(6), C(3), Q, E(7), D, E(7),
  ];
})();
export const GYM = BOARD.findIndex((s) => s.kind === 'gym');
export const EXERCISE_SQUARES = BOARD.map((s, i) => (s.kind === 'exercise' ? i : -1)).filter((i) => i >= 0);
export const CARDIO_SQUARES = BOARD.map((s, i) => (s.kind === 'cardio' ? i : -1)).filter((i) => i >= 0);
export const GROUP_COLORS = ['#B9A6FF', '#9BD3F5', '#F5A8C8', '#FF9F5A', '#E5484D', '#FFC93C', '#7FD1A8', '#4F5BD5'];
export const PLAYER_COLORS = ['#4F5BD5', '#E5484D', '#2E7A5E', '#FF9F5A', '#B05BD5', '#14183A'];

// ---------- Règles (en répétitions) ----------
export const RULES = {
  /** Case exercice libre : on fait l'exercice… */
  pass: 15,
  /** …ou on l'achète. */
  buy: 30,
  /** Loyer : un autre joueur tombe chez le propriétaire. */
  rent: 20,
  /** Bonus des cartes cardio selon le nombre détenu (1 à 4). */
  cardioBonus: [0, 0, 0.2, 0.5, 1],
  /** Une carte cardio s'achète en faisant deux fois son contenu. */
  cardioBuyFactor: 2,
  /** Tours maximum en salle de sport. */
  gymTurns: 3,
  /** Défi / culture : répétitions données. */
  gift: 10,
};

export interface Task {
  /** Identifiant d'exercice animé (si connu), pour l'animation. */
  exId?: string;
  label: string;
  reps: number;
}

/** Carte cardio : une suite d'exercices (modifiable). */
export const DEFAULT_CARDIO: Task[] = [
  { exId: 'tapping', label: 'Tipping', reps: 15 },
  { exId: 'jumpingjack', label: 'Jumping jack', reps: 10 },
  { exId: 'burpee', label: 'Burpee', reps: 5 },
];

export interface Player {
  id: string;
  name: string;
  color: string;
  pos: number;
  /** Répétitions faites (toutes confondues). */
  reps: number;
  inGym: boolean;
  gymTurns: number;
  /** Six de suite (trois : salle de sport). */
  sixes: number;
  out: boolean;
}

export type EndMode = { kind: 'unlimited' } | { kind: 'turns'; turns: number };

export interface GameConfig {
  /** Exercice de chaque case exercice (index de case → exercice). */
  exercises: Record<number, { exId?: string; label: string }>;
  cardio: Task[];
  end: EndMode;
}

/** Ce qui attend une décision ou une confirmation. */
export type Pending =
  | { kind: 'roll' }
  | { kind: 'buy'; square: number; cost: Task[]; pass: Task[] }
  | { kind: 'tasks'; title: string; tasks: Task[]; who: string[] }
  | { kind: 'card'; deck: 'defi' | 'culture'; card: Card }
  | { kind: 'over' };

export interface Card {
  id: string;
  text: string;
  /** Culture : réponse affichée après coup. */
  answer?: string;
  effect:
    | { kind: 'move'; to: number }
    | { kind: 'step'; by: number }
    | { kind: 'gym' }
    | { kind: 'reps'; task: Task }
    | { kind: 'gift'; reps: number }
    | { kind: 'question'; reps: number };
}

export interface GameState {
  config: GameConfig;
  players: Player[];
  current: number;
  /** Tour de table (commence à 1). */
  round: number;
  owner: Record<number, string>;
  pending: Pending;
  lastRoll: number | null;
  log: string[];
  /** Pioches mélangées (indices dans les paquets). */
  decks: { defi: number[]; culture: number[] };
}

// ---------- Cartes (provisoires, à retravailler) ----------

export const DEFI_CARDS: Card[] = [
  { id: 'd-gym', text: 'Direction la salle de sport !', effect: { kind: 'gym' } },
  { id: 'd-start', text: 'Retour au Départ.', effect: { kind: 'move', to: 0 } },
  { id: 'd-fwd3', text: 'Sprint : avance de 3 cases.', effect: { kind: 'step', by: 3 } },
  { id: 'd-back2', text: 'Échauffement oublié : recule de 2 cases.', effect: { kind: 'step', by: -2 } },
  { id: 'd-squat', text: 'Défi : 10 squats !', effect: { kind: 'reps', task: { exId: 'squat', label: 'Squat', reps: 10 } } },
  { id: 'd-plank', text: 'Défi : 15 montées de genoux !', effect: { kind: 'reps', task: { exId: 'highknees', label: 'Montées de genoux', reps: 15 } } },
  { id: 'd-gift', text: 'Don d’exercice : offre 10 répétitions de ton exercice préféré à un autre joueur.', effect: { kind: 'gift', reps: 10 } },
  { id: 'd-rest', text: 'Récupération : file à la case Récup.', effect: { kind: 'move', to: 20 } },
];

export const CULTURE_CARDS: Card[] = [
  { id: 'c-150', text: 'Combien de minutes d’activité physique d’intensité modérée sont recommandées par semaine pour un adulte ?', answer: 'Au moins 150 minutes (OMS).', effect: { kind: 'question', reps: 10 } },
  { id: 'c-60', text: 'Combien de temps d’activité physique par jour est recommandé pour les enfants et les adolescents ?', answer: '60 minutes par jour en moyenne (OMS).', effect: { kind: 'question', reps: 10 } },
  { id: 'c-muscle', text: 'Combien de fois par semaine conseille-t-on des exercices de renforcement musculaire aux adultes ?', answer: 'Au moins 2 jours par semaine (OMS).', effect: { kind: 'question', reps: 10 } },
  { id: 'c-sit', text: 'Rester assis longtemps : toutes les combien faut-il idéalement se lever et bouger ?', answer: 'Toutes les 30 minutes à 1 heure environ.', effect: { kind: 'question', reps: 10 } },
  { id: 'c-heart', text: 'Quel muscle travaille sans jamais s’arrêter ?', answer: 'Le cœur.', effect: { kind: 'question', reps: 10 } },
];

// ---------- Outils ----------

/** Tirage pseudo-aléatoire injectable (tests). */
export type Rng = () => number;

export function shuffle<T>(list: T[], rng: Rng): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Attribution aléatoire des exercices aux 22 cases (sans doublon tant que possible). */
export function randomExercises(pool: { exId?: string; label: string }[], rng: Rng): GameConfig['exercises'] {
  const out: GameConfig['exercises'] = {};
  let bag: typeof pool = [];
  for (const sq of EXERCISE_SQUARES) {
    if (!bag.length) bag = shuffle(pool, rng);
    out[sq] = bag.pop()!;
  }
  return out;
}

/** Répétitions × coefficient, arrondies à l'entier supérieur. */
export const roundUp = (reps: number, factor: number): number => Math.ceil(reps * factor - 1e-9);

/** Contenu d'une carte cardio à faire par un visiteur, selon le nombre de cartes du propriétaire. */
export function cardioRent(cardio: Task[], owned: number): Task[] {
  const k = 1 + (RULES.cardioBonus[Math.min(4, Math.max(0, owned))] ?? 0);
  return cardio.map((t) => ({ ...t, reps: roundUp(t.reps, k) }));
}

const squareTask = (s: GameState, sq: number, reps: number): Task => {
  const e = s.config.exercises[sq] ?? { label: 'Exercice' };
  return { exId: e.exId, label: e.label, reps };
};

export const playerById = (s: GameState, id: string) => s.players.find((p) => p.id === id)!;
const active = (s: GameState) => s.players.filter((p) => !p.out);
const say = (s: GameState, msg: string): GameState => ({ ...s, log: [msg, ...s.log].slice(0, 40) });
const patchPlayer = (s: GameState, id: string, p: Partial<Player>): GameState => ({
  ...s, players: s.players.map((x) => (x.id === id ? { ...x, ...p } : x)),
});

/** Cases détenues par un joueur. */
export const ownedBy = (s: GameState, id: string): number[] =>
  Object.entries(s.owner).filter(([, o]) => o === id).map(([k]) => Number(k));

// ---------- Partie ----------

export function newGame(names: string[], config: GameConfig, rng: Rng): GameState {
  const players: Player[] = names.map((name, i) => ({
    id: `p${i}`, name: name.trim() || `Joueur ${i + 1}`, color: PLAYER_COLORS[i % PLAYER_COLORS.length],
    pos: 0, reps: 0, inGym: false, gymTurns: 0, sixes: 0, out: false,
  }));
  return {
    config, players, current: 0, round: 1, owner: {}, pending: { kind: 'roll' }, lastRoll: null,
    log: ['La partie commence !'],
    decks: {
      defi: shuffle(DEFI_CARDS.map((_, i) => i), rng),
      culture: shuffle(CULTURE_CARDS.map((_, i) => i), rng),
    },
  };
}

/** Joueurs qui font une tâche : celui qui la doit, plus ceux en salle de sport (ils font tout). */
function withGym(s: GameState, payer: string): string[] {
  const gym = active(s).filter((p) => p.inGym && p.id !== payer).map((p) => p.id);
  return [payer, ...gym];
}

function sendToGym(s: GameState, id: string): GameState {
  const p = playerById(s, id);
  return say(patchPlayer(s, id, { pos: GYM, inGym: true, gymTurns: 0, sixes: 0 }), `${p.name} file à la salle de sport.`);
}

/** Lancer le dé (valeur 1 à 6) pour le joueur en cours. */
export function roll(s: GameState, die: number): GameState {
  if (s.pending.kind !== 'roll') return s;
  const p = s.players[s.current];
  let st: GameState = { ...s, lastRoll: die };
  if (p.inGym) {
    // En salle de sport : on en sort sur un 6, ou au bout de 3 tours.
    const turns = p.gymTurns + 1;
    if (die !== 6 && turns < RULES.gymTurns) {
      st = say(patchPlayer(st, p.id, { gymTurns: turns }), `${p.name} reste à la salle de sport (${die}).`);
      return endTurn(st);
    }
    st = say(patchPlayer(st, p.id, { inGym: false, gymTurns: 0 }), `${p.name} sort de la salle de sport.`);
  } else {
    const sixes = die === 6 ? p.sixes + 1 : 0;
    if (sixes >= 3) return endTurn(sendToGym(st, p.id));
    st = patchPlayer(st, p.id, { sixes });
  }
  return moveBy(st, p.id, die);
}

function moveBy(s: GameState, id: string, by: number): GameState {
  const p = playerById(s, id);
  const pos = (((p.pos + by) % BOARD.length) + BOARD.length) % BOARD.length;
  return land(say(patchPlayer(s, id, { pos }), `${p.name} avance de ${by} case${Math.abs(by) > 1 ? 's' : ''}.`), id);
}

/** Effet de la case où le joueur vient d'arriver. */
function land(s: GameState, id: string): GameState {
  const p = playerById(s, id);
  const sq = BOARD[p.pos];
  switch (sq.kind) {
    case 'exercise': {
      const owner = s.owner[p.pos];
      if (!owner) {
        return { ...s, pending: { kind: 'buy', square: p.pos, cost: [squareTask(s, p.pos, RULES.buy)], pass: [squareTask(s, p.pos, RULES.pass)] } };
      }
      if (owner === id) return endTurn(say(s, `${p.name} est chez soi : rien à faire.`));
      return { ...s, pending: { kind: 'tasks', title: `Chez ${playerById(s, owner).name}`, tasks: [squareTask(s, p.pos, RULES.rent)], who: withGym(s, id) } };
    }
    case 'cardio': {
      const owner = s.owner[p.pos];
      if (!owner) {
        return {
          ...s,
          pending: {
            kind: 'buy', square: p.pos,
            cost: s.config.cardio.map((t) => ({ ...t, reps: t.reps * RULES.cardioBuyFactor })),
            pass: s.config.cardio,
          },
        };
      }
      if (owner === id) return endTurn(say(s, `${p.name} a cette carte cardio : rien à faire.`));
      const n = ownedBy(s, owner).filter((k) => BOARD[k].kind === 'cardio').length;
      return { ...s, pending: { kind: 'tasks', title: `Carte cardio de ${playerById(s, owner).name}`, tasks: cardioRent(s.config.cardio, n), who: withGym(s, id) } };
    }
    case 'defi':
    case 'culture':
      return draw(s, sq.kind);
    case 'togym':
      return endTurn(sendToGym(s, id));
    default:
      return endTurn(s);
  }
}

function draw(s: GameState, deck: 'defi' | 'culture'): GameState {
  const cards = deck === 'defi' ? DEFI_CARDS : CULTURE_CARDS;
  let pile = s.decks[deck];
  if (!pile.length) pile = cards.map((_, i) => i);
  const [top, ...rest] = pile;
  return { ...s, decks: { ...s.decks, [deck]: [...rest, top] }, pending: { kind: 'card', deck, card: cards[top] } };
}

/** Case libre : acheter (30 rép.) ou seulement faire l'exercice (15 rép.). */
export function decide(s: GameState, buy: boolean): GameState {
  if (s.pending.kind !== 'buy') return s;
  const p = s.players[s.current];
  const { square, cost, pass } = s.pending;
  let st = s;
  if (buy) st = say({ ...st, owner: { ...st.owner, [square]: p.id } }, `${p.name} achète la case.`);
  return { ...st, pending: { kind: 'tasks', title: buy ? 'Achat' : 'Passage', tasks: buy ? cost : pass, who: withGym(st, p.id) } };
}

/** Les répétitions demandées ont été faites. */
export function done(s: GameState): GameState {
  if (s.pending.kind !== 'tasks') return s;
  const total = s.pending.tasks.reduce((t, x) => t + x.reps, 0);
  let st = s;
  for (const id of s.pending.who) st = patchPlayer(st, id, { reps: playerById(st, id).reps + total });
  return endTurn(st);
}

/** Effet d'une carte. Culture : `correct` dit si le joueur a bien répondu. Don : `target` reçoit. */
export function applyCard(s: GameState, opts: { correct?: boolean; target?: string; task?: Task } = {}): GameState {
  if (s.pending.kind !== 'card') return s;
  const p = s.players[s.current];
  const e = s.pending.card.effect;
  const st = { ...s, pending: { kind: 'roll' } as Pending };
  switch (e.kind) {
    case 'gym': return endTurn(sendToGym(st, p.id));
    case 'move': {
      const moved = say(patchPlayer(st, p.id, { pos: e.to }), `${p.name} va case ${e.to}.`);
      return e.to === 0 ? endTurn(moved) : land(moved, p.id);
    }
    case 'step': return moveBy(st, p.id, e.by);
    case 'reps': return { ...st, pending: { kind: 'tasks', title: 'Défi', tasks: [e.task], who: withGym(st, p.id) } };
    case 'gift': {
      const target = opts.target && opts.target !== p.id ? opts.target : null;
      if (!target) return endTurn(st);
      const task = { ...(opts.task ?? { label: 'Squat', exId: 'squat', reps: e.reps }), reps: e.reps };
      return { ...st, pending: { kind: 'tasks', title: `Cadeau de ${p.name}`, tasks: [task], who: withGym(st, target) } };
    }
    case 'question': {
      if (opts.correct) return endTurn(say(st, `${p.name} a la bonne réponse !`));
      return { ...st, pending: { kind: 'tasks', title: 'Mauvaise réponse', tasks: [{ exId: 'squat', label: 'Squat', reps: e.reps }], who: withGym(st, p.id) } };
    }
  }
}

/** Un joueur abandonne. */
export function abandon(s: GameState, id: string): GameState {
  let st = patchPlayer(s, id, { out: true });
  // Ses cases redeviennent libres.
  st = { ...st, owner: Object.fromEntries(Object.entries(st.owner).filter(([, o]) => o !== id)) };
  st = say(st, `${playerById(st, id).name} abandonne.`);
  if (active(st).length <= 1) return { ...st, pending: { kind: 'over' } };
  if (st.players[st.current].id === id) return endTurn({ ...st, pending: { kind: 'roll' } });
  return st;
}

/** Fin du tour : joueur suivant (un 6 fait rejouer, sauf en salle de sport). */
function endTurn(s: GameState): GameState {
  if (active(s).length <= 1) return { ...s, pending: { kind: 'over' } };
  const p = s.players[s.current];
  const again = s.lastRoll === 6 && !p.inGym && !p.out && p.sixes > 0;
  if (again) return { ...s, pending: { kind: 'roll' } };
  let next = s.current;
  let round = s.round;
  do {
    next = (next + 1) % s.players.length;
    if (next === 0) round += 1;
  } while (s.players[next].out);
  const st = { ...s, current: next, round, pending: { kind: 'roll' } as Pending, lastRoll: null };
  if (s.config.end.kind === 'turns' && round > s.config.end.turns) return { ...st, round: s.config.end.turns, pending: { kind: 'over' } };
  return st;
}

/** Classement : le plus de cases détenues ; à égalité, le moins de répétitions faites. */
export function ranking(s: GameState): { player: Player; squares: number }[] {
  return s.players
    .map((player) => ({ player, squares: player.out ? -1 : ownedBy(s, player.id).length }))
    .sort((a, b) => b.squares - a.squares || a.player.reps - b.player.reps);
}
