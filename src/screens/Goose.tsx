// Jeu de l'oie sportif, de 1 à 6 joueurs sur le même téléphone (seul : contre l'ordinateur) :
// chaque case est un exercice.

import { useEffect, useMemo, useState } from 'react';
import { useSettings } from '../data/hooks';
import { TopBar } from '../ui/kit';
import { PLAYER_COLORS, PlayersEditor, playerNames } from '../games/Players';
import { ExerciseFigure, FigureFrame } from '../anim/Figure';
import { GROUP_COLORS } from '../anim/ExercisePicker';
import type { ExerciseId } from '../anim/exercises';
import { EXERCISE_BY_ID } from '../anim/exercises';
import type { ExSetup } from '../games/ExerciseSetup';
import { ExerciseSetupFields, exercisePool, setupReady, useGameSetup } from '../games/ExerciseSetup';
import { assignRows } from '../games/battleship';
import type { Player, Turn } from '../games/goose';
import { GameStage } from '../ui/GameStage';
import { ELEVATORS, LAST, playTurn, rollDie, SPECIAL_LABELS, specialOf } from '../games/goose';

interface GooseSetup extends ExSetup {
  players: string[];
}


interface Game {
  players: Player[];
  /** Exercice de chaque case (indice 0 = case 1). */
  cases: ExerciseId[];
  reps: number;
  current: number;
  /** Tour qui vient d'être joué, en attente des exercices. */
  pending: { turn: Turn; player: number } | null;
  /** Exercices faits par joueur. */
  done: number[];
  winner: number | null;
}

function newGame(s: GooseSetup): Game {
  const names = playerNames(s.players);
  const players: Player[] = names.map((name) => ({ name, pos: 0, skip: 0 }));
  // Seul : on joue contre l'ordinateur.
  if (players.length === 1) players.push({ name: 'L’ordinateur', bot: true, pos: 0, skip: 0 });
  return {
    players,
    cases: assignRows(exercisePool(s), Math.random, LAST),
    reps: s.reps,
    current: 0,
    pending: null,
    done: players.map(() => 0),
    winner: null,
  };
}

export function Goose() {
  const [setup, update] = useGameSetup<GooseSetup>('pulse-jeu-de-l-oie', { players: ['Joueur 1'] });
  const [game, setGame] = useState<Game | null>(null);
  if (!game) return <SetupScreen setup={setup} update={update} onStart={() => setGame(newGame(setup))} />;
  return <GameScreen game={game} setGame={setGame} onReplay={() => setGame(newGame(setup))} onSetup={() => setGame(null)} />;
}

function SetupScreen({ setup, update, onStart }: { setup: GooseSetup; update: (p: Partial<GooseSetup>) => void; onStart: () => void }) {
  return (
    <main className="screen no-nav">
      <TopBar title="Jeu de l’oie" />
      <p className="hint game-rules">
        Règles du jeu de l’oie, 63 cases, un seul dé, avec des ascenseurs qui montent ou descendent. Chaque case porte un exercice : tu fais celui de la case où tu t’arrêtes.
        Une oie, un ascenseur, le pont, le labyrinthe ou la tête de mort te font avancer ou reculer : tu fais alors les deux exercices.
        Seul, tu joues contre l’ordinateur.
      </p>

      <PlayersEditor players={setup.players} onChange={(players) => update({ players })} />

      <ExerciseSetupFields setup={setup} update={update} slots="les 63 cases" max={LAST} />
      <button className="btn block" disabled={!setupReady(setup)} onClick={onStart}>Lancer la partie</button>
    </main>
  );
}

function GameScreen({ game, setGame, onReplay, onSetup }: {
  game: Game;
  setGame: (g: Game) => void;
  onReplay: () => void;
  onSetup: () => void;
}) {
  const avatar = useSettings().anim.avatar;
  const cols = useBoardCols();
  const me = game.players[game.current];
  const solo = game.players.filter((p) => !p.bot).length === 1;
  const botTurn = !!me.bot;

  const roll = () => {
    if (game.pending || game.winner !== null) return;
    const { players, turn } = playTurn(game.players, game.current, rollDie());
    setGame({ ...game, players, pending: { turn, player: game.current } });
  };

  // Tour de l'ordinateur : il lance le dé tout seul.
  useEffect(() => {
    if (!botTurn || game.pending || game.winner !== null) return;
    const t = window.setTimeout(roll, 900);
    return () => window.clearTimeout(t);
  });

  const next = () => {
    if (!game.pending) return;
    const { turn, player } = game.pending;
    const done = game.done.map((d, i) => (i === player && !game.players[i].bot ? d + turn.path.length : d));
    if (turn.won) {
      setGame({ ...game, pending: null, done, winner: player });
      return;
    }
    setGame({ ...game, pending: null, done, current: (game.current + 1) % game.players.length });
  };

  return (
    <main className="screen no-nav goose-screen game-play">
      <TopBar title="Jeu de l’oie" />

      <GameStage ratio={cols / (LAST / cols)} extra={34} board={<Board game={game} cols={cols} />}>
      <div className="goose-turn card">
        <span className="goose-token big" style={{ background: PLAYER_COLORS[game.current] }} aria-hidden="true" />
        <div className="goose-turn-text">
          <strong>{botTurn ? 'L’ordinateur joue…' : solo ? 'À toi de jouer' : `Au tour de ${me.name}`}</strong>
          <span className="hint">
            {me.pos === 0 ? 'Au départ' : `Case ${me.pos}`}
            {me.skip > 0 ? ` · passe encore ${me.skip} tour${me.skip > 1 ? 's' : ''}` : ''}
          </span>
        </div>
        <button className="btn" onClick={roll} disabled={botTurn || !!game.pending || game.winner !== null}>
          {me.skip > 0 ? 'Passer' : 'Lancer le dé'}
        </button>
      </div>

      <ul className="goose-scores" aria-label="Joueurs">
        {game.players.map((p, i) => (
          <li key={i} aria-current={i === game.current ? 'true' : undefined}>
            <span className="goose-token" style={{ background: PLAYER_COLORS[i] }} aria-hidden="true" />
            <span className="goose-score-name">{p.name}</span>
            <span className="hint">{p.pos ? `case ${p.pos}` : 'départ'}{p.bot ? '' : ` · ${game.done[i]} ex.`}</span>
          </li>
        ))}
      </ul>
      </GameStage>

      {game.pending && (
        <div className="sheet-backdrop">
          <div className="sheet goose-sheet" role="dialog" aria-modal="true" aria-label={game.players[game.pending.player].bot ? 'Tour de l’ordinateur' : `Tour de ${game.players[game.pending.player].name}`}>
            {game.pending.turn.die && (
              <div className="goose-dice" aria-label={`Dé : ${game.pending.turn.die}`}>
                <Die n={game.pending.turn.die} />
              </div>
            )}
            <ul className="goose-events">
              {game.pending.turn.events.length === 0 && game.pending.turn.die && (
                <li>
                  {game.players[game.pending.player].bot ? 'L’ordinateur avance' : solo ? 'Tu avances' : `${game.players[game.pending.player].name} avance`} en case {game.pending.turn.path.at(-1)}.
                </li>
              )}
              {game.pending.turn.events.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
            {game.pending.turn.path.length > 0 && !game.players[game.pending.player].bot && (
              <>
                <h2>{game.pending.turn.path.length > 1 ? `${game.pending.turn.path.length} exercices à faire` : 'Exercice à faire'}</h2>
                <div className="ex-list">
                {game.pending.turn.path.map((n, k) => {
                  const id = game.cases[n - 1];
                  const sp = specialOf(n);
                  return (
                    <div key={k} className="goose-ex">
                      <div className="goose-ex-figure"><ExerciseFigure exercise={id} avatar={avatar} /></div>
                      <div className="goose-ex-text">
                        <span className="hint">Case {n}{sp ? ` · ${SPECIAL_LABELS[sp]}` : ''}</span>
                        <strong>{game.reps} × {EXERCISE_BY_ID[id].label}</strong>
                      </div>
                    </div>
                  );
                })}
                </div>
              </>
            )}
            <button className="btn block" onClick={next}>{game.pending.turn.path.length && !game.players[game.pending.player].bot ? 'C’est fait' : 'Continuer'}</button>
          </div>
        </div>
      )}

      {game.winner !== null && (
        <div className="sheet-backdrop">
          <div className="sheet goose-sheet" role="dialog" aria-modal="true" aria-label="Partie terminée">
            <h2>{game.players[game.winner].bot ? 'L’ordinateur gagne !' : solo ? 'Gagné !' : `${game.players[game.winner].name} gagne !`}</h2>
            <ul className="goose-scores">
              {game.players.map((p, i) => (
                <li key={i}>
                  <span className="goose-token" style={{ background: PLAYER_COLORS[i] }} aria-hidden="true" />
                  <span className="goose-score-name">{p.name}</span>
                  <span className="hint">{p.bot ? `case ${p.pos}` : `${game.done[i]} exercices · ${game.done[i] * game.reps} rép.`}</span>
                </li>
              ))}
            </ul>
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

/** Paysage : plateau en largeur (9 × 7) pour qu'il soit plus grand ; portrait : 7 × 9. */
function useBoardCols(): number {
  const query = '(orientation: landscape)';
  const [land, setLand] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const fn = () => setLand(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return land ? 9 : 7;
}

/** Plateau : 63 cases en serpentin, départ au-dessus. */
function Board({ game, cols: COLS }: { game: Game; cols: number }) {
  const avatar = useSettings().anim.avatar;
  const order = useMemo(() => {
    const rows: number[][] = [];
    for (let r = 0; r < LAST / COLS; r++) {
      const row = Array.from({ length: COLS }, (_, c) => r * COLS + c + 1);
      rows.push(r % 2 ? row.reverse() : row);
    }
    return rows.flat();
  }, [COLS]);
  const tokens = (n: number) =>
    game.players.map((p, i) => (p.pos === n ? i : -1)).filter((i) => i >= 0).map((i) => (
      <span key={i} className="goose-token" style={{ background: PLAYER_COLORS[i] }} title={game.players[i].name} />
    ));
  return (
    <section className="section" aria-label="Plateau">
      <div className="goose-start">
        <span>Départ</span>
        <span className="goose-tokens">{tokens(0)}</span>
      </div>
      <div className="goose-board" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
        {order.map((n) => {
          const id = game.cases[n - 1];
          const sp = specialOf(n);
          const label = `Case ${n}${sp ? `, ${SPECIAL_LABELS[sp]}${ELEVATORS[n] ? ` vers ${ELEVATORS[n]}` : ''}` : ''} : ${EXERCISE_BY_ID[id].label}`;
          return (
            <div key={n} className={`goose-case${sp ? ` sp-${sp}` : ''}`} aria-label={label} title={label} style={{ background: sp ? undefined : GROUP_COLORS[EXERCISE_BY_ID[id].group] }}>
              <span className="goose-num">{n}</span>
              <span className="goose-thumb" aria-hidden="true"><FigureFrame exercise={id} avatar={avatar} sec={EXERCISE_BY_ID[id].period / 2} /></span>
              {sp && <span className="goose-sp">{sp === 'up' ? `↑ ${ELEVATORS[n]}` : sp === 'down' ? `↓ ${ELEVATORS[n]}` : SPECIAL_LABELS[sp]}</span>}
              <span className="goose-tokens">{tokens(n)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const PIPS: Record<number, [number, number][]> = {
  1: [[12, 12]],
  2: [[7, 7], [17, 17]],
  3: [[7, 7], [12, 12], [17, 17]],
  4: [[7, 7], [17, 7], [7, 17], [17, 17]],
  5: [[7, 7], [17, 7], [12, 12], [7, 17], [17, 17]],
  6: [[7, 6], [17, 6], [7, 12], [17, 12], [7, 18], [17, 18]],
};

function Die({ n }: { n: number }) {
  return (
    <svg className="goose-die" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="5" fill="var(--card)" stroke="var(--ink)" strokeWidth="1.5" />
      {PIPS[n].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.1" fill="var(--ink)" />)}
    </svg>
  );
}
