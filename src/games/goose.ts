// Jeu de l'oie sportif : règles classiques, 63 cases, deux dés, de 1 à 6 joueurs.
// Chaque case porte un exercice ; chaque case où l'on s'arrête (y compris celles
// où une oie, le pont, le labyrinthe ou la tête de mort nous envoient) donne son exercice.

export const LAST = 63;
/** Oies : on rejoue la même distance. */
export const GEESE = [5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59];
export const BRIDGE = 6; // → 12
export const HOTEL = 19; // passe 2 tours
export const WELL = 31; // attend d'être délivré (3 tours au plus)
export const MAZE = 42; // → 30
export const PRISON = 52; // attend d'être délivré (3 tours au plus)
export const DEATH = 58; // → départ

export type Special = 'goose' | 'bridge' | 'hotel' | 'well' | 'maze' | 'prison' | 'death' | 'end';

export const SPECIAL_LABELS: Record<Special, string> = {
  goose: 'Oie', bridge: 'Pont', hotel: 'Hôtel', well: 'Puits', maze: 'Labyrinthe', prison: 'Prison', death: 'Tête de mort', end: 'Arrivée',
};

export function specialOf(n: number): Special | null {
  if (n === LAST) return 'end';
  if (GEESE.includes(n)) return 'goose';
  if (n === BRIDGE) return 'bridge';
  if (n === HOTEL) return 'hotel';
  if (n === WELL) return 'well';
  if (n === MAZE) return 'maze';
  if (n === PRISON) return 'prison';
  if (n === DEATH) return 'death';
  return null;
}

/** Tours d'attente : hôtel 2 ; puits et prison 3 au plus (délivré plus tôt si un joueur arrive). */
const WAIT: Partial<Record<Special, number>> = { hotel: 2, well: 3, prison: 3 };

export interface Player {
  name: string;
  pos: number;
  /** Tours restant à passer. */
  skip: number;
}

export interface Turn {
  /** Dés lancés (rien si le joueur passe son tour). */
  dice: [number, number] | null;
  /** Cases où le joueur s'arrête, dans l'ordre : chacune donne son exercice. */
  path: number[];
  /** Ce qui s'est passé, en phrases courtes. */
  events: string[];
  /** Joueur renvoyé à la place du joueur actif (case occupée). */
  bumped?: { index: number; to: number };
  won: boolean;
}

/**
 * Joue le tour du joueur `i` avec les dés donnés. Renvoie les nouveaux joueurs et le récit du tour.
 * Le joueur qui doit passer son tour ne lance pas : ses dés sont ignorés.
 */
export function playTurn(players: Player[], i: number, dice: [number, number]): { players: Player[]; turn: Turn } {
  const ps = players.map((p) => ({ ...p }));
  const me = ps[i];
  const events: string[] = [];
  if (me.skip > 0) {
    me.skip--;
    events.push(me.skip ? `${me.name} passe son tour (encore ${me.skip}).` : `${me.name} passe son tour, et rejouera au prochain.`);
    return { players: ps, turn: { dice: null, path: [], events, won: false } };
  }

  const [a, b] = dice;
  const sum = a + b;
  const from = me.pos;
  const path: number[] = [];
  let pos: number;
  let dir = 1;

  if (from === 0 && ((a === 6 && b === 3) || (a === 3 && b === 6))) {
    pos = 26;
    events.push('6 et 3 au premier lancer : direction la case 26.');
  } else if (from === 0 && ((a === 5 && b === 4) || (a === 4 && b === 5))) {
    pos = 53;
    events.push('5 et 4 au premier lancer : direction la case 53.');
  } else {
    pos = from + sum;
    if (pos > LAST) {
      pos = LAST - (pos - LAST);
      dir = -1;
      events.push(`Il faut tomber pile sur ${LAST} : on recule jusqu’à la case ${pos}.`);
    }
  }

  // Effets des cases, enchaînés (une oie peut mener à une autre oie…).
  for (let guard = 0; guard < 20; guard++) {
    path.push(pos);
    const sp = specialOf(pos);
    if (sp === 'goose') {
      let next = pos + dir * sum;
      if (next > LAST) {
        next = LAST - (next - LAST);
        dir = -1;
      }
      events.push(`Oie en ${pos} : on ${dir > 0 ? 'avance' : 'recule'} encore de ${sum}, case ${next}.`);
      pos = next;
      continue;
    }
    if (sp === 'bridge') { events.push('Le pont : on file à la case 12.'); pos = 12; continue; }
    if (sp === 'maze') { events.push('Le labyrinthe : retour à la case 30.'); pos = 30; continue; }
    if (sp === 'death') { events.push('La tête de mort : retour au départ !'); pos = 0; break; }
    break;
  }
  me.pos = pos;

  const sp = specialOf(pos);
  if (sp && WAIT[sp]) {
    me.skip = WAIT[sp]!;
    events.push(sp === 'hotel' ? 'L’hôtel : on passe 2 tours.' : `${SPECIAL_LABELS[sp]} : on attend qu’un joueur vienne nous délivrer (3 tours au plus).`);
  }

  // Case occupée : l'autre joueur prend notre place de départ (et sort du puits ou de la prison).
  let bumped: Turn['bumped'];
  if (pos > 0 && pos < LAST) {
    const j = ps.findIndex((p, k) => k !== i && p.pos === pos);
    if (j >= 0) {
      const freed = specialOf(pos) === 'well' || specialOf(pos) === 'prison';
      ps[j].pos = from;
      if (freed) ps[j].skip = 0;
      bumped = { index: j, to: from };
      events.push(`${ps[j].name} ${freed ? `sort ${specialOf(pos) === 'well' ? 'du puits' : 'de prison'} et ` : ''}retourne en case ${from}.`);
    }
  }

  const won = pos === LAST;
  if (won) events.push(`${me.name} arrive sur la case ${LAST} : gagné !`);
  return { players: ps, turn: { dice, path: path.filter((n) => n > 0), events, bumped, won } };
}

export const rollDie = (rng: () => number = Math.random) => 1 + Math.min(5, Math.floor(rng() * 6));
