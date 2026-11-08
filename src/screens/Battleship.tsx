// Bataille navale sportive contre l'ordinateur : chaque ligne de la grille est un exercice.
// Tir raté, ou touché par l'ordinateur : on fait l'exercice de la ligne.

import { useEffect, useMemo, useState } from 'react';
import { useSettings } from '../data/hooks';
import { TopBar, Segmented, Stepper } from '../ui/kit';
import { ExerciseFigure, FigureFrame } from '../anim/Figure';
import { EQUIPMENT_ICONS, GROUP_COLORS, POSITION_ICONS } from '../anim/ExercisePicker';
import type { Equipment, ExerciseId, Position } from '../anim/exercises';
import { EQUIPMENT_LABELS, EXERCISES, EXERCISE_BY_ID, POSITION_LABELS, equipmentOf, inPosition, isExerciseId } from '../anim/exercises';
import type { Board } from '../games/battleship';
import { aiShot, allSunk, assignRows, cellName, newBoard, rowOf, ROWS, shoot, SIZE, sunkShipAt } from '../games/battleship';

interface Setup {
  reps: number;
  mode: 'random' | 'chosen';
  position: Position;
  equipment: Equipment[];
  chosen: ExerciseId[];
}

const DEFAULT_SETUP: Setup = { reps: 10, mode: 'random', position: 'standing', equipment: ['none'], chosen: [] };
const SETUP_KEY = 'pulse-bataille-navale';

function loadSetup(): Setup {
  try {
    const s = JSON.parse(localStorage.getItem(SETUP_KEY) ?? 'null') as Partial<Setup> | null;
    if (!s) return DEFAULT_SETUP;
    return {
      ...DEFAULT_SETUP,
      ...s,
      equipment: (s.equipment ?? DEFAULT_SETUP.equipment).filter((e) => e in EQUIPMENT_LABELS),
      chosen: (s.chosen ?? []).filter((id) => isExerciseId(id)),
    };
  } catch {
    return DEFAULT_SETUP;
  }
}

function saveSetup(s: Setup) {
  try {
    localStorage.setItem(SETUP_KEY, JSON.stringify(s));
  } catch {
    /* stockage indisponible : réglages non retenus */
  }
}

/** Exercices disponibles avec la position et le matériel choisis. */
const available = (s: Setup) => EXERCISES.filter((x) => inPosition(x, s.position) && s.equipment.includes(equipmentOf(x)));

/** Couleur de chaque exercice dans la grille et la légende. */
const ROW_COLORS = ['#FFBE98', '#9BD3F5', '#B5D98A', '#FFC93C', '#B9A6FF', '#F5A8C8', '#3DD6C6', '#FF9F5A', '#8FA3FF', '#E6CBA8'];

interface Pending {
  exercise: ExerciseId;
  row: number;
  title: string;
  /** À qui le tour après l'exercice. */
  after: 'me' | 'ai';
}

interface Game {
  rows: ExerciseId[];
  reps: number;
  enemy: Board;
  mine: Board;
  turn: 'me' | 'ai';
  pending: Pending | null;
  message: string;
  done: number;
  over: 'won' | 'lost' | null;
}

function newGame(s: Setup): Game {
  const list = available(s).map((x) => x.id);
  const pool = s.mode === 'chosen' ? s.chosen.filter((id) => list.includes(id)) : list;
  return {
    rows: assignRows(pool),
    reps: s.reps,
    enemy: newBoard(),
    mine: newBoard(),
    turn: 'me',
    pending: null,
    message: 'À toi de tirer : touche une case de la grille ennemie.',
    done: 0,
    over: null,
  };
}

export function Battleship() {
  const [setup, setSetup] = useState<Setup>(loadSetup);
  const [game, setGame] = useState<Game | null>(null);
  const update = (patch: Partial<Setup>) => {
    const next = { ...setup, ...patch };
    setSetup(next);
    saveSetup(next);
  };
  if (!game) return <SetupScreen setup={setup} update={update} onStart={() => setGame(newGame(setup))} />;
  return <GameScreen game={game} setGame={setGame} onReplay={() => setGame(newGame(setup))} onSetup={() => setGame(null)} />;
}

function SetupScreen({ setup, update, onStart }: { setup: Setup; update: (p: Partial<Setup>) => void; onStart: () => void }) {
  const avatar = useSettings().anim.avatar;
  const list = available(setup);
  const chosen = setup.chosen.filter((id) => list.some((x) => x.id === id));
  const ready = setup.mode === 'random' ? list.length > 0 : chosen.length > 0;
  const toggleEquip = (e: Equipment) => {
    const has = setup.equipment.includes(e);
    if (has && setup.equipment.length === 1) return;
    update({ equipment: has ? setup.equipment.filter((x) => x !== e) : [...setup.equipment, e] });
  };
  const toggleEx = (id: ExerciseId) =>
    update({ chosen: setup.chosen.includes(id) ? setup.chosen.filter((x) => x !== id) : [...setup.chosen, id] });

  return (
    <main className="screen no-nav">
      <TopBar title="Bataille navale" />
      <p className="hint bn-rules">
        Coule la flotte de l’ordinateur. Chaque ligne de la grille est un exercice : à chaque tir raté, ou quand l’ordinateur te touche, tu fais l’exercice de la ligne.
      </p>

      <section className="section" aria-label="Répétitions">
        <div className="card" style={{ padding: 0 }}>
          <Stepper label="Répétitions" hint="Par exercice à faire" value={setup.reps} min={1} max={100} onChange={(reps) => update({ reps })} />
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Position</h2>
        <div className="ex-pos" role="radiogroup" aria-label="Position" style={{ border: 'none', padding: 0 }}>
          {(Object.keys(POSITION_LABELS) as Position[]).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={k === setup.position} className="ex-pos-btn" onClick={() => update({ position: k })}>
              {POSITION_ICONS[k]}
              <span>{POSITION_LABELS[k]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Matériel</h2>
        <div className="ex-equip" role="group" aria-label="Matériel">
          {(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map((k) => (
            <button key={k} type="button" role="checkbox" aria-checked={setup.equipment.includes(k)} aria-label={EQUIPMENT_LABELS[k]} title={EQUIPMENT_LABELS[k]} className="ex-equip-btn" onClick={() => toggleEquip(k)}>
              {EQUIPMENT_ICONS[k]}
              <span>{EQUIPMENT_LABELS[k]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Exercices</h2>
        <Segmented
          label="Exercices"
          value={setup.mode}
          onChange={(mode) => update({ mode })}
          options={[{ value: 'random', label: 'Aléatoires' }, { value: 'chosen', label: 'Choisis' }]}
        />
        {!list.length && <p className="hint">Pas d’exercice {setup.position === 'chair' ? 'sur chaise' : 'debout'} avec ce matériel.</p>}
        {setup.mode === 'random' && list.length > 0 && (
          <p className="hint">{Math.min(list.length, SIZE)} exercices tirés au hasard parmi {list.length}, répartis au hasard sur les 10 lignes.</p>
        )}
        {setup.mode === 'chosen' && list.length > 0 && (
          <>
            <p className="hint">
              {chosen.length ? `${chosen.length} choisi${chosen.length > 1 ? 's' : ''}` : 'Choisis au moins un exercice'} : ils seront répartis au hasard sur les 10 lignes.
            </p>
            <div className="ex-picker-grid" role="listbox" aria-multiselectable="true" aria-label="Exercices choisis">
              {list.map((x) => (
                <button key={x.id} type="button" role="option" aria-selected={chosen.includes(x.id)} className="ex-opt" onClick={() => toggleEx(x.id)}>
                  <span className="ex-opt-thumb" aria-hidden="true" style={{ background: GROUP_COLORS[x.group] }}>
                    <FigureFrame exercise={x.id} avatar={avatar} sec={x.period / 2} />
                  </span>
                  <span className="ex-opt-name">{x.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <button className="btn block" disabled={!ready} onClick={onStart}>Lancer la partie</button>
    </main>
  );
}

function GameScreen({ game, setGame, onReplay, onSetup }: {
  game: Game;
  setGame: (g: Game | ((g: Game | null) => Game | null)) => void;
  onReplay: () => void;
  onSetup: () => void;
}) {
  const avatar = useSettings().anim.avatar;
  const colors = useMemo(() => {
    const distinct = [...new Set(game.rows)];
    return game.rows.map((id) => ROW_COLORS[distinct.indexOf(id) % ROW_COLORS.length]);
  }, [game.rows]);

  // Tour de l'ordinateur : il tire après un court instant.
  useEffect(() => {
    if (game.turn !== 'ai' || game.pending || game.over) return;
    const t = window.setTimeout(() => {
      setGame((g) => {
        if (!g || g.turn !== 'ai' || g.pending || g.over) return g;
        const cell = aiShot(g.mine);
        const { board, result } = shoot(g.mine, cell);
        const where = cellName(cell);
        if (result === 'miss') return { ...g, mine: board, turn: 'me', message: `L’ordinateur a raté en ${where}. À toi de tirer.` };
        const title = result === 'sunk' ? `Coulé en ${where} !` : `Touché en ${where} !`;
        return {
          ...g,
          mine: board,
          message: `L’ordinateur t’a ${result === 'sunk' ? 'coulé un bateau' : 'touché'} en ${where}.`,
          pending: { exercise: g.rows[rowOf(cell)], row: rowOf(cell), title, after: 'me' },
        };
      });
    }, 900);
    return () => window.clearTimeout(t);
  }, [game.turn, game.pending, game.over, setGame]);

  const fire = (cell: number) => {
    if (game.turn !== 'me' || game.pending || game.over || game.enemy.shots.includes(cell)) return;
    const { board, result } = shoot(game.enemy, cell);
    const where = cellName(cell);
    if (allSunk(board)) {
      setGame({ ...game, enemy: board, over: 'won', message: 'Toute la flotte ennemie est coulée !' });
      return;
    }
    if (result === 'miss') {
      setGame({ ...game, enemy: board, message: `Raté en ${where}.`, pending: { exercise: game.rows[rowOf(cell)], row: rowOf(cell), title: `Raté en ${where}`, after: 'ai' } });
      return;
    }
    setGame({ ...game, enemy: board, turn: 'ai', message: result === 'sunk' ? `Coulé en ${where} ! L’ordinateur tire…` : `Touché en ${where} ! L’ordinateur tire…` });
  };

  const exerciseDone = () => {
    if (!game.pending) return;
    const lost = allSunk(game.mine);
    setGame({
      ...game,
      pending: null,
      done: game.done + 1,
      turn: game.pending.after,
      over: lost ? 'lost' : null,
      message: lost ? 'L’ordinateur a coulé toute ta flotte.' : game.pending.after === 'ai' ? 'L’ordinateur tire…' : game.message,
    });
  };

  const distinct = [...new Set(game.rows)];

  return (
    <main className="screen no-nav bn-screen">
      <TopBar title="Bataille navale" right={<span className="chip accent" aria-label="Exercices faits">{game.done} ex.</span>} />
      <p className="bn-status" role="status">{game.message}</p>

      <section className="section" aria-label="Grille ennemie">
        <h2 className="section-title">Flotte ennemie</h2>
        <Grid board={game.enemy} colors={colors} onShoot={game.turn === 'me' && !game.pending && !game.over ? fire : undefined} reveal={!!game.over} />
      </section>

      <section className="section" aria-label="Exercices des lignes">
        <h2 className="section-title">{game.reps} répétitions par exercice</h2>
        <ul className="bn-legend">
          {distinct.map((id) => (
            <li key={id}>
              <span className="bn-legend-dot" style={{ background: colors[game.rows.indexOf(id)] }} />
              <span className="bn-legend-rows">{game.rows.map((r, i) => (r === id ? ROWS[i] : '')).join(' ')}</span>
              <span>{EXERCISE_BY_ID[id].label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-label="Ma flotte">
        <h2 className="section-title">Ma flotte</h2>
        <Grid board={game.mine} colors={colors} reveal small />
      </section>

      {game.pending && (
        <div className="sheet-backdrop">
          <div className="sheet bn-sheet" role="dialog" aria-modal="true" aria-label={game.pending.title}>
            <h2>{game.pending.title}</h2>
            <p className="bn-ex-line"><span className="hint">Ligne {ROWS[game.pending.row]}</span>{game.reps} × {EXERCISE_BY_ID[game.pending.exercise].label}</p>
            <div className="bn-ex-figure"><ExerciseFigure exercise={game.pending.exercise} avatar={avatar} /></div>
            <button className="btn block" onClick={exerciseDone}>C’est fait</button>
          </div>
        </div>
      )}

      {game.over && (
        <div className="sheet-backdrop">
          <div className="sheet bn-sheet" role="dialog" aria-modal="true" aria-label={game.over === 'won' ? 'Gagné' : 'Perdu'}>
            <h2>{game.over === 'won' ? 'Gagné !' : 'Perdu…'}</h2>
            <p>{game.done} exercice{game.done > 1 ? 's' : ''} fait{game.done > 1 ? 's' : ''}, soit {game.done * game.reps} répétitions.</p>
            <div className="btn-row">
              <button className="btn secondary" onClick={onSetup}>Réglages</button>
              <button className="btn" onClick={onReplay}>Rejouer</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Grid({ board, colors, onShoot, reveal, small }: { board: Board; colors: string[]; onShoot?: (cell: number) => void; reveal?: boolean; small?: boolean }) {
  const shots = new Set(board.shots);
  const shipAt = (cell: number) => board.ships.some((s) => s.includes(cell));
  return (
    <div className={`bn-grid${small ? ' small' : ''}`} role="grid">
      <span />
      {Array.from({ length: SIZE }, (_, c) => <span key={c} className="bn-head">{c + 1}</span>)}
      {Array.from({ length: SIZE }, (_, r) => (
        <div key={r} role="row" className="bn-row">
          <span className="bn-head bn-rowhead" style={{ background: colors[r] }}>{ROWS[r]}</span>
          {Array.from({ length: SIZE }, (_, c) => {
            const cell = r * SIZE + c;
            const shot = shots.has(cell);
            const ship = shipAt(cell);
            const sunk = shot && !!sunkShipAt(board, cell);
            const state = shot ? (ship ? (sunk ? 'sunk' : 'hit') : 'miss') : reveal && ship ? 'ship' : 'empty';
            const label = `${ROWS[r]}${c + 1}${state === 'miss' ? ', raté' : state === 'hit' ? ', touché' : state === 'sunk' ? ', coulé' : ''}`;
            return (
              <button
                key={c} type="button" role="gridcell" className={`bn-cell ${state}`} aria-label={label}
                disabled={!onShoot || shot} onClick={() => onShoot?.(cell)}
              >
                {state === 'miss' && <span className="bn-dot" />}
                {(state === 'hit' || state === 'sunk') && '✕'}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
