// Bataille navale sportive contre l'ordinateur : chaque ligne de la grille est un exercice.
// Tir raté, ou touché par l'ordinateur : on fait l'exercice de la ligne.

import { useEffect, useMemo, useState } from 'react';
import { useSettings } from '../data/hooks';
import { TopBar } from '../ui/kit';
import { ExerciseFigure } from '../anim/Figure';
import type { ExerciseId } from '../anim/exercises';
import { EXERCISE_BY_ID } from '../anim/exercises';
import type { ExSetup } from '../games/ExerciseSetup';
import { ExerciseSetupFields, exercisePool, setupReady, useGameSetup } from '../games/ExerciseSetup';
import type { Board } from '../games/battleship';
import { aiShot, allSunk, assignRows, cellName, newBoard, rowOf, ROWS, shoot, SIZE, sunkShipAt } from '../games/battleship';

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

function newGame(s: ExSetup): Game {
  return {
    rows: assignRows(exercisePool(s)),
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
  const [setup, update] = useGameSetup('pulse-bataille-navale');
  const [game, setGame] = useState<Game | null>(null);
  if (!game) return <SetupScreen setup={setup} update={update} onStart={() => setGame(newGame(setup))} />;
  return <GameScreen game={game} setGame={setGame} onReplay={() => setGame(newGame(setup))} onSetup={() => setGame(null)} />;
}

function SetupScreen({ setup, update, onStart }: { setup: ExSetup; update: (p: Partial<ExSetup>) => void; onStart: () => void }) {
  return (
    <main className="screen no-nav">
      <TopBar title="Bataille navale" />
      <p className="hint game-rules">
        Coule la flotte de l’ordinateur. Chaque ligne de la grille est un exercice : à chaque tir raté, ou quand l’ordinateur te touche, tu fais l’exercice de la ligne.
      </p>
      <ExerciseSetupFields setup={setup} update={update} slots="les 10 lignes" max={SIZE} />
      <button className="btn block" disabled={!setupReady(setup)} onClick={onStart}>Lancer la partie</button>
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
