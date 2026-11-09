// Mémo sportif, à plusieurs sur le même téléphone ou seul contre l'ordinateur : des paires de cartes « exercice ».
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
import { GameStage } from '../ui/GameStage';
import { BOT_MEMORY, botFirst, botSecond, deal, isPair, LEVELS, levelOf, ranking } from '../games/memo';

interface MemoSetup extends ExSetup {
  players: string[];
  level: LevelId;
}

interface Game {
  names: string[];
  /** Joueur tenu par l'ordinateur (seul contre lui), sinon -1. */
  bot: number;
  /** Cartes dont l'ordinateur se souvient. */
  seen: number[];
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
  const bot = names.length === 1 ? 1 : -1;
  if (bot >= 0) names.push('L’ordinateur');
  return {
    names, bot, seen: [], cards, cols: level.cols, reps: s.reps,
    flipped: [], removed: [], current: 0,
    scores: names.map(() => 0), done: names.map(() => 0),
    pending: null,
    message: bot >= 0 ? 'À toi : retourne deux cartes.' : `Au tour de ${names[0]}.`,
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
        Deux cartes différentes : tu fais les deux exercices, puis c’est au joueur suivant. Seul, tu joues contre l’ordinateur (il a de la mémoire, mais pas toujours…).
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
  const vsBot = game.bot >= 0;
  const botTurn = game.current === game.bot;
  const over = game.removed.length === game.cards.length;
  const name = game.names[game.current];
  /** L'ordinateur retient (ou non) une carte qu'il voit. */
  const remember = (seen: number[], i: number) => (!seen.includes(i) && Math.random() < BOT_MEMORY ? [...seen, i] : seen);
  const turnText = (i: number) => (i === game.bot ? 'L’ordinateur joue…' : vsBot ? 'À toi : retourne deux cartes.' : `Au tour de ${game.names[i]}.`);

  // Deux cartes retournées : on laisse le temps de les voir, puis paire retirée ou exercices.
  useEffect(() => {
    if (game.flipped.length !== 2 || game.pending) return;
    const [a, b] = game.flipped;
    const pair = isPair(game.cards, a, b);
    const t = window.setTimeout(() => {
      if (pair) {
        const scores = game.scores.map((s, i) => (i === game.current ? s + 1 : s));
        const removed = [...game.removed, a, b];
        const who = botTurn ? 'L’ordinateur rejoue.' : vsBot ? 'Rejoue.' : `${name} rejoue.`;
        setGame({
          ...game, flipped: [], removed, scores, seen: game.seen.filter((x) => x !== a && x !== b),
          message: removed.length === game.cards.length ? 'Toutes les paires sont trouvées !' : `Paire trouvée : ${EXERCISE_BY_ID[game.cards[a]].label} ! ${who}`,
        });
      } else if (botTurn) {
        // L'ordinateur s'est trompé : pas d'exercice pour toi, les cartes se retournent.
        const next = (game.current + 1) % game.names.length;
        setGame({ ...game, flipped: [], current: next, message: `L’ordinateur s’est trompé. ${turnText(next)}` });
      } else {
        setGame({ ...game, pending: [a, b] });
      }
    }, pair ? 700 : botTurn ? 1400 : 900);
    return () => window.clearTimeout(t);
  });

  // Tour de l'ordinateur : il retourne ses deux cartes, une à une.
  useEffect(() => {
    if (!botTurn || over || game.pending || game.flipped.length >= 2) return;
    const t = window.setTimeout(() => {
      const i = game.flipped.length === 0
        ? botFirst(game.cards, game.removed, game.seen)
        : botSecond(game.cards, game.removed, game.seen, game.flipped[0]);
      setGame({ ...game, flipped: [...game.flipped, i], seen: remember(game.seen, i) });
    }, 800);
    return () => window.clearTimeout(t);
  });

  const flip = (i: number) => {
    if (botTurn || game.pending || game.flipped.length >= 2 || game.flipped.includes(i) || game.removed.includes(i)) return;
    setGame({ ...game, flipped: [...game.flipped, i], seen: vsBot ? remember(game.seen, i) : game.seen });
  };

  const exercisesDone = () => {
    const next = (game.current + 1) % game.names.length;
    setGame({
      ...game,
      flipped: [],
      pending: null,
      done: game.done.map((d, i) => (i === game.current ? d + 2 : d)),
      current: next,
      message: turnText(next),
    });
  };

  const ranks = ranking(game.scores);
  const best = Math.max(...game.scores);
  const winners = game.names.filter((_, i) => game.scores[i] === best);

  return (
    <main className="screen no-nav memo-screen game-play">
      <TopBar title="Mémo" right={<span className="chip accent">{game.removed.length / 2} / {game.cards.length / 2} paires</span>} />

      {/* Cartes 3:4 : le plateau garde la proportion colonnes × lignes. */}
      <GameStage ratio={(game.cols * 3) / (Math.ceil(game.cards.length / game.cols) * 4)} board={(
      <div className="memo-grid" style={{ gridTemplateColumns: `repeat(${game.cols}, minmax(0, 1fr))` }}>
        {game.cards.map((id, i) => {
          const removed = game.removed.includes(i);
          const up = game.flipped.includes(i);
          const ex = EXERCISE_BY_ID[id];
          return (
            <button
              key={i} type="button" className={`memo-card${up ? ' up' : ''}${removed ? ' removed' : ''}`}
              aria-label={removed ? 'Paire retirée' : up ? ex.label : `Carte ${i + 1}`}
              disabled={removed || up || botTurn || !!game.pending || game.flipped.length >= 2}
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
      )}>

      <ul className="goose-scores" aria-label="Joueurs">
        {game.names.map((n, i) => (
          <li key={i} aria-current={i === game.current ? 'true' : undefined}>
            <span className="goose-token" style={{ background: PLAYER_COLORS[i] }} aria-hidden="true" />
            <span className="goose-score-name">{n}</span>
            {i !== game.bot && <span className="hint">{game.done[i]} ex.</span>}
            <strong className="memo-points" aria-label={`${game.scores[i]} point${game.scores[i] > 1 ? 's' : ''}`}>{game.scores[i]} pt{game.scores[i] > 1 ? 's' : ''}</strong>
          </li>
        ))}
      </ul>
      <p className="bn-status" role="status">{game.message}</p>
      </GameStage>

      {game.pending && (
        <div className="sheet-backdrop">
          <div className="sheet goose-sheet" role="dialog" aria-modal="true" aria-label="Pas une paire">
            <h2>Pas une paire : 2 exercices{vsBot ? '' : ` pour ${name}`}</h2>
            <div className="ex-list">
            {game.pending.map((c, k) => {
              const id = game.cards[c];
              return (
                <div key={k} className="goose-ex">
                  <div className="goose-ex-figure"><ExerciseFigure exercise={id} avatar={avatar} /></div>
                  <div className="goose-ex-text"><strong>{game.reps} × {EXERCISE_BY_ID[id].label}</strong></div>
                </div>
              );
            })}
            </div>
            <button className="btn block" onClick={exercisesDone}>C’est fait</button>
          </div>
        </div>
      )}

      {over && (
        <div className="sheet-backdrop">
          <div className="sheet goose-sheet" role="dialog" aria-modal="true" aria-label="Partie terminée">
            <h2>
              {winners.length > 1 ? (vsBot ? 'Égalité !' : `Égalité : ${winners.join(', ')}`)
                : vsBot ? (winners[0] === game.names[game.bot] ? 'L’ordinateur gagne !' : 'Tu gagnes !')
                : `${winners[0]} gagne !`}
            </h2>
            <ul className="goose-scores">
              {game.names
                .map((n, i) => ({ n, i }))
                .sort((x, y) => ranks[x.i] - ranks[y.i])
                .map(({ n, i }) => (
                  <li key={i}>
                    <span className="memo-rank">{ranks[i]}</span>
                    <span className="goose-token" style={{ background: PLAYER_COLORS[i] }} aria-hidden="true" />
                    <span className="goose-score-name">{n}</span>
                    {i !== game.bot && <span className="hint">{game.done[i]} ex. · {game.done[i] * game.reps} rép.</span>}
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
