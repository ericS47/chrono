// Mémo sportif, seul ou à plusieurs sur le même téléphone : des paires de cartes « exercice ».
// Paire trouvée : retirée, un point, pas d'exercice, on rejoue. Cartes différentes : les deux exercices, puis au suivant.

import { useEffect, useState } from 'react';
import { useSettings } from '../data/hooks';
import { TopBar } from '../ui/kit';
import { ExerciseFigure, FigureFrame } from '../anim/Figure';
import { GROUP_COLORS } from '../anim/ExercisePicker';
import type { ExerciseId } from '../anim/exercises';
import { EXERCISE_BY_ID } from '../anim/exercises';
import type { ExSetup } from '../games/ExerciseSetup';
import { ExerciseSetupFields, exercisePool, useGameSetup } from '../games/ExerciseSetup';
import { PLAYER_COLORS, PlayersEditor, playerNames } from '../games/Players';
import type { LevelId } from '../games/memo';
import { deal, isPair, LEVELS, levelOf, ranking } from '../games/memo';

interface MemoSetup extends ExSetup {
  players: string[];
  level: LevelId;
}

interface Game {
  names: string[];
  cards: ExerciseId[];
  cols: number;
  reps: number;
  /** Cartes retournées ce tour-ci (deux au plus). */
  flipped: number[];
  /** Cartes retirées (paires trouvées). */
  removed: number[];
  current: number;
  scores: number[];
  /** Exercices faits par joueur. */
  done: number[];
  /** Cartes différentes : les deux exercices à faire. */
  pending: [number, number] | null;
  message: string;
}

function newGame(s: MemoSetup): Game | null {
  const level = levelOf(s.level);
  const cards = deal(exercisePool(s), level.pairs);
  if (!cards) return null;
  const names = playerNames(s.players);
  return {
    names, cards, cols: level.cols, reps: s.reps,
    flipped: [], removed: [], current: 0,
    scores: names.map(() => 0), done: names.map(() => 0),
    pending: null,
    message: 'Retourne deux cartes.',
  };
}

export function Memo() {
  const [setup, update] = useGameSetup<MemoSetup>('pulse-memo', { players: ['Joueur 1'], level: 'facile' });
  const [game, setGame] = useState<Game | null>(null);
  if (!game) return <SetupScreen setup={setup} update={update} onStart={() => setGame(newGame(setup))} />;
  return <GameScreen game={game} setGame={setGame} onReplay={() => setGame(newGame(setup))} onSetup={() => setGame(null)} />;
}

function SetupScreen({ setup, update, onStart }: { setup: MemoSetup; update: (p: Partial<MemoSetup>) => void; onStart: () => void }) {
  const level = levelOf(setup.level);
  const pool = exercisePool(setup);
  const enough = pool.length >= level.pairs;
  return (
    <main className="screen no-nav">
      <TopBar title="Mémo" />
      <p className="hint game-rules">
        Retourne deux cartes à chaque tour. Une paire : elle est retirée, tu marques un point, pas d’exercice, et tu rejoues.
        Deux cartes différentes : tu fais les deux exercices, puis c’est au joueur suivant.
      </p>

      <PlayersEditor players={setup.players} onChange={(players) => update({ players })} />

      <section className="section">
        <h2 className="section-title">Difficulté</h2>
        <div className="memo-levels" role="radiogroup" aria-label="Difficulté">
          {LEVELS.map((l) => (
            <button key={l.id} type="button" role="radio" aria-checked={l.id === setup.level} className="ex-pos-btn memo-level" onClick={() => update({ level: l.id })}>
              <strong>{l.label}</strong>
              <span>{l.pairs} paires · {l.pairs * 2} cartes</span>
            </button>
          ))}
        </div>
      </section>

      <ExerciseSetupFields setup={setup} update={update} slots={`les ${level.pairs} paires`} max={level.pairs} />
      {!enough && pool.length > 0 && (
        <p className="hint memo-warn">Il faut au moins {level.pairs} exercices différents pour ce niveau ({pool.length} pour l’instant).</p>
      )}
      <button className="btn block" disabled={!enough} onClick={onStart}>Lancer la partie</button>
    </main>
  );
}

function GameScreen({ game, setGame, onReplay, onSetup }: {
  game: Game;
  setGame: (g: Game | null) => void;
  onReplay: () => void;
  onSetup: () => void;
}) {
  const avatar = useSettings().anim.avatar;
  const solo = game.names.length === 1;
  const over = game.removed.length === game.cards.length;
  const name = game.names[game.current];

  // Deux cartes retournées : on laisse le temps de les voir, puis paire retirée ou exercices.
  useEffect(() => {
    if (game.flipped.length !== 2 || game.pending) return;
    const [a, b] = game.flipped;
    const pair = isPair(game.cards, a, b);
    const t = window.setTimeout(() => {
      if (pair) {
        const scores = game.scores.map((s, i) => (i === game.current ? s + 1 : s));
        const removed = [...game.removed, a, b];
        setGame({
          ...game, flipped: [], removed, scores,
          message: removed.length === game.cards.length ? 'Toutes les paires sont trouvées !' : `Paire trouvée : ${EXERCISE_BY_ID[game.cards[a]].label} ! ${solo ? 'Rejoue.' : `${name} rejoue.`}`,
        });
      } else {
        setGame({ ...game, pending: [a, b] });
      }
    }, pair ? 700 : 900);
    return () => window.clearTimeout(t);
  }, [game, setGame, name, solo]);

  const flip = (i: number) => {
    if (game.pending || game.flipped.length >= 2 || game.flipped.includes(i) || game.removed.includes(i)) return;
    setGame({ ...game, flipped: [...game.flipped, i] });
  };

  const exercisesDone = () => {
    const next = (game.current + 1) % game.names.length;
    setGame({
      ...game,
      flipped: [],
      pending: null,
      done: game.done.map((d, i) => (i === game.current ? d + 2 : d)),
      current: next,
      message: solo ? 'Retourne deux cartes.' : `Au tour de ${game.names[next]}.`,
    });
  };

  const ranks = ranking(game.scores);
  const best = Math.max(...game.scores);
  const winners = game.names.filter((_, i) => game.scores[i] === best);

  return (
    <main className="screen no-nav memo-screen">
      <TopBar title="Mémo" right={<span className="chip accent">{game.removed.length / 2} / {game.cards.length / 2} paires</span>} />

      <ul className="goose-scores" aria-label="Joueurs">
        {game.names.map((n, i) => (
          <li key={i} aria-current={i === game.current ? 'true' : undefined}>
            <span className="goose-token" style={{ background: PLAYER_COLORS[i] }} aria-hidden="true" />
            <span className="goose-score-name">{n}</span>
            <span className="hint">{game.done[i]} ex.</span>
            <strong className="memo-points" aria-label={`${game.scores[i]} point${game.scores[i] > 1 ? 's' : ''}`}>{game.scores[i]} pt{game.scores[i] > 1 ? 's' : ''}</strong>
          </li>
        ))}
      </ul>
      <p className="bn-status" role="status">{game.message}</p>

      <div className="memo-grid" style={{ gridTemplateColumns: `repeat(${game.cols}, minmax(0, 1fr))` }}>
        {game.cards.map((id, i) => {
          const removed = game.removed.includes(i);
          const up = game.flipped.includes(i);
          const ex = EXERCISE_BY_ID[id];
          return (
            <button
              key={i} type="button" className={`memo-card${up ? ' up' : ''}${removed ? ' removed' : ''}`}
              aria-label={removed ? 'Paire retirée' : up ? ex.label : `Carte ${i + 1}`}
              disabled={removed || up || !!game.pending || game.flipped.length >= 2}
              onClick={() => flip(i)}
            >
              {up && !removed ? (
                <span className="memo-face" style={{ background: GROUP_COLORS[ex.group] }}>
                  <span className="memo-face-fig"><FigureFrame exercise={id} avatar={avatar} sec={ex.period / 2} /></span>
                  <span className="memo-face-name">{ex.label}</span>
                </span>
              ) : !removed ? (
                <span className="memo-back" aria-hidden="true">?</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {game.pending && (
        <div className="sheet-backdrop">
          <div className="sheet goose-sheet" role="dialog" aria-modal="true" aria-label="Pas une paire">
            <h2>Pas une paire : 2 exercices{solo ? '' : ` pour ${name}`}</h2>
            {game.pending.map((c, k) => {
              const id = game.cards[c];
              return (
                <div key={k} className="goose-ex">
                  <div className="goose-ex-figure"><ExerciseFigure exercise={id} avatar={avatar} /></div>
                  <div className="goose-ex-text"><strong>{game.reps} × {EXERCISE_BY_ID[id].label}</strong></div>
                </div>
              );
            })}
            <button className="btn block" onClick={exercisesDone}>C’est fait</button>
          </div>
        </div>
      )}

      {over && (
        <div className="sheet-backdrop">
          <div className="sheet goose-sheet" role="dialog" aria-modal="true" aria-label="Partie terminée">
            <h2>{solo ? 'Bravo, tout est trouvé !' : winners.length > 1 ? `Égalité : ${winners.join(', ')}` : `${winners[0]} gagne !`}</h2>
            <ul className="goose-scores">
              {game.names
                .map((n, i) => ({ n, i }))
                .sort((x, y) => ranks[x.i] - ranks[y.i])
                .map(({ n, i }) => (
                  <li key={i}>
                    {!solo && <span className="memo-rank">{ranks[i]}</span>}
                    <span className="goose-token" style={{ background: PLAYER_COLORS[i] }} aria-hidden="true" />
                    <span className="goose-score-name">{n}</span>
                    <span className="hint">{game.done[i]} ex. · {game.done[i] * game.reps} rép.</span>
                    <strong className="memo-points">{game.scores[i]} pt{game.scores[i] > 1 ? 's' : ''}</strong>
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
