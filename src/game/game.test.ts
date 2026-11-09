import { describe, expect, it } from 'vitest';
import {
  abandon, applyCard, BOARD, CARDIO_SQUARES, decide, DEFAULT_CARDIO, done, EXERCISE_SQUARES, GYM,
  newGame, ownedBy, randomExercises, ranking, roll, RULES, type GameConfig, type GameState,
} from './game';

const rng = () => 0.42;
const pool = [{ exId: 'squat', label: 'Squat' }, { exId: 'pushup', label: 'Pompe' }, { exId: 'lunge', label: 'Fente' }];
const config = (end: GameConfig['end'] = { kind: 'unlimited' }): GameConfig => ({ exercises: randomExercises(pool, rng), cardio: DEFAULT_CARDIO, end });
const start = (n = 2, end?: GameConfig['end']) => newGame(Array.from({ length: n }, (_, i) => `J${i + 1}`), config(end), rng);
/** Place le joueur en cours sur une case (sans effet). */
const at = (s: GameState, pos: number): GameState => ({ ...s, players: s.players.map((p, i) => (i === s.current ? { ...p, pos } : p)) });

describe('plateau', () => {
  it('40 cases : 22 exercices, 4 cartes cardio, salle de sport en 10', () => {
    expect(BOARD).toHaveLength(40);
    expect(EXERCISE_SQUARES).toHaveLength(22);
    expect(CARDIO_SQUARES).toHaveLength(4);
    expect(GYM).toBe(10);
  });
  it('attribution aléatoire : chaque case exercice a un exercice', () => {
    const ex = randomExercises(pool, rng);
    expect(EXERCISE_SQUARES.every((i) => ex[i]?.label)).toBe(true);
  });
});

describe('cases exercice', () => {
  it('case libre : passer = 15 rép., acheter = 30 rép.', () => {
    let s = roll(start(), 1); // case 1 : exercice
    expect(s.pending.kind).toBe('buy');
    const pass = decide(s, false);
    expect(pass.pending).toMatchObject({ kind: 'tasks', tasks: [{ reps: 15 }] });
    s = decide(s, true);
    expect(s.pending).toMatchObject({ kind: 'tasks', tasks: [{ reps: 30 }] });
    expect(s.owner[1]).toBe('p0');
    s = done(s);
    expect(s.players[0].reps).toBe(30);
    expect(s.current).toBe(1);
  });
  it('chez un autre : 20 rép. ; chez soi : rien', () => {
    let s = done(decide(roll(start(), 1), true)); // J1 achète la case 1
    s = roll(at(s, 0), 1); // J2 tombe en 1
    expect(s.pending).toMatchObject({ kind: 'tasks', tasks: [{ reps: RULES.rent }], who: ['p1'] });
    s = done(s);
    expect(s.players[1].reps).toBe(20);
    s = roll(at(s, 0), 1); // J1 retombe chez lui
    expect(s.pending.kind).toBe('roll');
    expect(s.current).toBe(1);
  });
});

describe('cartes cardio', () => {
  it('carte cardio : achat et loyer au prix indiqué, quel que soit le nombre détenu', () => {
    let s = at(start(), 0);
    s = { ...s, owner: { [CARDIO_SQUARES[1]]: 'p0' } };
    s = roll(s, 4); // case 4 : carte cardio libre
    expect(s.pending.kind).toBe('buy');
    s = decide(s, true);
    expect(s.pending).toMatchObject({ kind: 'tasks', tasks: [{ reps: 15 }, { reps: 10 }, { reps: 5 }] });
    s = done(s);
    s = roll(at(s, 0), 4); // J2 chez J1 (2 cartes)
    expect(s.pending).toMatchObject({ kind: 'tasks', tasks: [{ reps: 15 }, { reps: 10 }, { reps: 5 }] });
  });
});

describe('salle de sport', () => {
  it('trois 6 de suite y envoient ; un 6 fait rejouer', () => {
    let s = start();
    s = roll(s, 6); // case 6 : exercice libre
    s = done(decide(s, false));
    expect(s.current).toBe(0); // rejoue
    s = done(decide(roll(s, 6), false)); // case 12 : défi → on simule une case sans effet
    expect(s.players[0].sixes).toBeGreaterThan(0);
  });
  it('trois 6 de suite → salle de sport', () => {
    let s = start();
    s = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, sixes: 2 } : p)) };
    s = roll(s, 6);
    expect(s.players[0]).toMatchObject({ pos: GYM, inGym: true });
    expect(s.current).toBe(1);
  });
  it('en salle de sport, on fait aussi les exercices des autres ; on sort sur un 6 ou après 3 tours', () => {
    let s = start(3);
    s = { ...s, players: s.players.map((p, i) => (i === 2 ? { ...p, inGym: true, pos: GYM } : p)) };
    s = roll(s, 1); // J1 sur une case libre
    s = decide(s, false);
    expect(s.pending).toMatchObject({ kind: 'tasks', who: ['p0', 'p2'] });
    s = done(s);
    expect(s.players[2].reps).toBe(15);
    // J3 en salle : reste sur 2, 3… sort au 3e tour.
    s = { ...s, current: 2, pending: { kind: 'roll' } };
    s = roll(s, 2);
    expect(s.players[2].inGym).toBe(true);
    s = roll({ ...s, current: 2, pending: { kind: 'roll' } }, 3);
    expect(s.players[2].inGym).toBe(true);
    s = roll({ ...s, current: 2, pending: { kind: 'roll' } }, 1);
    expect(s.players[2].inGym).toBe(false);
  });
  it('case « Direction la salle de sport »', () => {
    const s = roll(at(start(), 26), 4);
    expect(s.players[0]).toMatchObject({ pos: GYM, inGym: true });
  });
});

describe('cartes', () => {
  it('culture : bonne réponse = rien ; mauvaise = 10 répétitions', () => {
    let s = roll(start(), 2); // case 2 : culture
    expect(s.pending.kind).toBe('card');
    expect(applyCard(s, { correct: true }).pending.kind).toBe('roll');
    s = applyCard(s, { correct: false });
    expect(s.pending).toMatchObject({ kind: 'tasks', tasks: [{ reps: 10 }] });
  });
  it('don d’exercice : l’autre joueur fait les répétitions', () => {
    let s = start();
    s = { ...s, pending: { kind: 'card', deck: 'defi', card: { id: 'x', text: '', effect: { kind: 'gift', reps: 10 } } } };
    s = applyCard(s, { target: 'p1', task: { exId: 'pushup', label: 'Pompe', reps: 0 } });
    expect(s.pending).toMatchObject({ kind: 'tasks', who: ['p1'], tasks: [{ label: 'Pompe', reps: 10 }] });
  });
});

describe('fin de partie', () => {
  it('nombre de tours : la partie s’arrête après le dernier tour', () => {
    let s = start(2, { kind: 'turns', turns: 1 });
    s = done(decide(roll(s, 1), false));
    s = done(decide(roll(s, 1), false));
    expect(s.pending.kind).toBe('over');
  });
  it('abandon : ses cases se libèrent ; le dernier en lice gagne', () => {
    let s = done(decide(roll(start(), 1), true));
    s = abandon(s, 'p0');
    expect(ownedBy(s, 'p0')).toEqual([]);
    expect(s.pending.kind).toBe('over');
    expect(ranking(s)[0].player.id).toBe('p1');
  });
  it('classement : le plus de cases', () => {
    let s = start();
    s = { ...s, owner: { 1: 'p1', 3: 'p1', 6: 'p0' } };
    expect(ranking(s).map((r) => r.player.id)).toEqual(['p1', 'p0']);
  });
});

describe('tours de plateau', () => {
  it('passer par le Départ compte un tour (pas la salle de sport)', () => {
    let s = roll(at(start(), 38), 3); // 38 → 1 : passe le Départ
    expect(s.players[0]).toMatchObject({ pos: 1, laps: 1 });
    expect(s.pending.kind).toBe('buy');
    const toGym = BOARD.findIndex((q) => q.kind === 'togym');
    s = roll(at(start(), toGym - 2), 2); // direction salle de sport : on y va sans passer le Départ
    expect(s.players[0].laps ?? 0).toBe(0);
  });

  it('carte « Retour au Départ » : un tour de plus', () => {
    const s0 = at(start(), 12);
    const s = applyCard({ ...s0, pending: { kind: 'card', deck: 'defi', card: { id: 'x', text: '', effect: { kind: 'move', to: 0 } } } });
    expect(s.players[0]).toMatchObject({ pos: 0, laps: 1 });
  });

  it('course en 2 tours : le premier qui les termine gagne, la partie s’arrête', () => {
    let s = start(3, { kind: 'laps', laps: 2 });
    s = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, pos: 37, laps: 1 } : i === 1 ? { ...p, laps: 1 } : p)) };
    s = { ...s, owner: { 1: 'p1', 3: 'p1' } };
    s = roll(s, 5); // 37 → 2 : 2e tour
    expect(s.pending.kind).toBe('over');
    expect(s.winner).toBe('p0');
    const r = ranking(s).map((x) => x.player.id);
    expect(r[0]).toBe('p0'); // le vainqueur d'abord, même avec moins de cases
    expect(r[1]).toBe('p1'); // puis le plus de tours
  });

  it('partie illimitée : les tours sont comptés mais ne terminent pas la partie', () => {
    let s = start();
    s = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, pos: 38, laps: 9 } : p)) };
    s = roll(s, 3);
    expect(s.players[0].laps).toBe(10);
    expect(s.pending.kind).not.toBe('over');
  });
});

