// La roue de la santé : on fait tourner la roue, elle s'arrête sur un exercice (ou un repos).
// En répétitions : « 10 × Squat », puis « C’est fait ». En temps : un décompte à déclencher.

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useSettings } from '../data/hooks';
import { audio } from '../audio/audio';
import { DurationField, Segmented, Stepper, TopBar } from '../ui/kit';
import { IconPause } from '../ui/icons';
import { ExerciseFigure, FigureFrame } from '../anim/Figure';
import type { ExerciseId } from '../anim/exercises';
import { EXERCISE_BY_ID } from '../anim/exercises';
import type { ExSetup } from '../games/ExerciseSetup';
import { ExerciseSetupFields, exercisePool, setupReady, useGameSetup } from '../games/ExerciseSetup';
import { GameStage } from '../ui/GameStage';
import { fmtClock } from '../lib/format';
import type { Segment } from '../games/wheel';
import { buildWheel, landingRotation, MAX_WHEEL_EXERCISES } from '../games/wheel';

interface WheelSetup extends ExSetup {
  /** Nombre d'exercices de la partie (les repos ne comptent pas). */
  count: number;
  unit: 'reps' | 'time';
  /** Durée d'un exercice, en mode temps (secondes). */
  workSec: number;
  /** Durée d'un repos (secondes). */
  restSec: number;
}

/** Couleurs des exercices sur la roue (une par exercice). */
const COLORS = ['#FFBE98', '#9BD3F5', '#B5D98A', '#FFC93C', '#B9A6FF', '#F5A8C8', '#3DD6C6', '#FF9F5A'];
const REST_COLOR = '#FFFFFF';
const SPIN_MS = 4800;

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface Game {
  segs: Segment<ExerciseId>[];
  colors: string[];
  rotation: number;
  spinning: boolean;
  /** Case tirée, en attente (exercice ou repos). */
  landed: number | null;
  done: number;
  /** Secondes d'effort faites (mode temps). */
  seconds: number;
}

function newGame(s: WheelSetup): Game {
  const segs = buildWheel(exercisePool(s));
  const distinct = [...new Set(segs.flatMap((x) => (x.kind === 'exercise' ? [x.exercise] : [])))];
  return {
    segs,
    colors: segs.map((x) => (x.kind === 'rest' ? REST_COLOR : COLORS[distinct.indexOf(x.exercise) % COLORS.length])),
    rotation: 0,
    spinning: false,
    landed: null,
    done: 0,
    seconds: 0,
  };
}

export function HealthWheel() {
  const [setup, update] = useGameSetup<WheelSetup>('pulse-roue-de-la-sante', { count: 10, unit: 'reps', workSec: 30, restSec: 20 });
  const [game, setGame] = useState<Game | null>(null);
  if (!game) return <SetupScreen setup={setup} update={update} onStart={() => setGame(newGame(setup))} />;
  return <Play setup={setup} game={game} setGame={setGame} onReplay={() => setGame(newGame(setup))} onSetup={() => setGame(null)} />;
}

function SetupScreen({ setup, update, onStart }: { setup: WheelSetup; update: (p: Partial<WheelSetup>) => void; onStart: () => void }) {
  return (
    <main className="screen no-nav">
      <TopBar title="La roue de la santé" />
      <p className="hint game-rules">
        Fais tourner la roue : elle s’arrête sur un exercice, ou parfois sur un repos. En répétitions, fais le nombre demandé ;
        en temps, lance le décompte quand tu es prêt. La partie se termine après le nombre d’exercices choisi.
      </p>

      <section className="section" aria-label="Partie">
        <div className="card" style={{ padding: 0 }}>
          <Stepper label="Nombre d’exercices" hint="Dans la partie (les repos ne comptent pas)" value={setup.count} min={1} max={50} onChange={(count) => update({ count })} />
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Travail</h2>
        <Segmented label="Travail" value={setup.unit} onChange={(unit) => update({ unit })} options={[{ value: 'reps', label: 'Répétitions' }, { value: 'time', label: 'Temps' }]} />
        <div className="card" style={{ padding: 0 }}>
          {setup.unit === 'reps' ? (
            <Stepper label="Répétitions" hint="Par exercice" value={setup.reps} min={1} max={100} onChange={(reps) => update({ reps })} />
          ) : (
            <DurationField label="Durée d’un exercice" hint="Avec décompte" value={setup.workSec} min={5} max={600} step={5} onChange={(workSec) => update({ workSec })} />
          )}
          <DurationField label="Durée d’un repos" hint="Case « Repos » de la roue" value={setup.restSec} min={5} max={300} step={5} onChange={(restSec) => update({ restSec })} />
        </div>
      </section>

      <ExerciseSetupFields setup={setup} update={update} slots="la roue (chacun plusieurs fois)" max={MAX_WHEEL_EXERCISES} hideReps />
      <button className="btn block" disabled={!setupReady(setup)} onClick={onStart}>Lancer la partie</button>
    </main>
  );
}

function Play({ setup, game, setGame, onReplay, onSetup }: {
  setup: WheelSetup;
  game: Game;
  setGame: (g: Game) => void;
  onReplay: () => void;
  onSetup: () => void;
}) {
  const settings = useSettings();
  const avatar = settings.anim.avatar;
  const n = game.segs.length;
  const over = game.done >= setup.count;
  const seg = game.landed !== null ? game.segs[game.landed] : null;

  const spin = () => {
    if (game.spinning || game.landed !== null || over) return;
    audio.unlock();
    const k = Math.floor(Math.random() * n);
    const quick = reducedMotion();
    const rotation = landingRotation(game.rotation, k, n, quick ? 1 : 5 + Math.floor(Math.random() * 2), Math.random() * 2 - 1);
    setGame({ ...game, rotation, spinning: true });
    window.setTimeout(() => {
      if (!settings.sound.silent) void audio.test('cloche', settings.sound);
      setGame({ ...game, rotation, spinning: false, landed: k });
    }, quick ? 800 : SPIN_MS);
  };

  const finish = (counted: boolean) => {
    const isEx = seg?.kind === 'exercise';
    setGame({
      ...game,
      landed: null,
      done: game.done + (isEx && counted ? 1 : 0),
      seconds: game.seconds + (isEx && counted && setup.unit === 'time' ? setup.workSec : 0),
    });
  };

  const totalText = setup.unit === 'reps' ? `${game.done * setup.reps} répétitions` : `${fmtClock(game.seconds)} d’effort`;

  return (
    <main className="screen no-nav game-play">
      <TopBar title="La roue de la santé" right={<span className="chip accent">{Math.min(game.done, setup.count)} / {setup.count}</span>} />
      <GameStage ratio={1} board={<Wheel game={game} avatar={avatar} onSpin={spin} disabled={game.spinning || game.landed !== null || over} />}>
        <p className="bn-status" role="status">
          {over ? 'Partie terminée !' : game.spinning ? 'La roue tourne…' : `Touche la roue pour la faire tourner : exercice ${game.done + 1} sur ${setup.count}.`}
        </p>
        <span className="hint">{setup.unit === 'reps' ? `${setup.reps} répétitions par exercice` : `${fmtClock(setup.workSec)} par exercice`} · repos {fmtClock(setup.restSec)} · {totalText}</span>
      </GameStage>

      {seg && (
        <div className="sheet-backdrop">
          <div className="sheet goose-sheet wheel-sheet" role="dialog" aria-modal="true" aria-label={seg.kind === 'rest' ? 'Repos' : EXERCISE_BY_ID[seg.exercise].label}>
            {seg.kind === 'rest' ? (
              <>
                <h2>Repos !</h2>
                <Countdown key={game.done + '-rest'} total={setup.restSec} rest onDone={() => finish(false)} />
              </>
            ) : (
              <>
                <span className="hint">Exercice {game.done + 1} sur {setup.count}</span>
                <h2>{setup.unit === 'reps' ? `${setup.reps} × ${EXERCISE_BY_ID[seg.exercise].label}` : `${fmtClock(setup.workSec)} · ${EXERCISE_BY_ID[seg.exercise].label}`}</h2>
                <div className="wheel-ex-figure"><ExerciseFigure exercise={seg.exercise} avatar={avatar} /></div>
                {setup.unit === 'reps' ? (
                  <button className="btn block" onClick={() => finish(true)}>C’est fait</button>
                ) : (
                  <Countdown key={game.done + '-work'} total={setup.workSec} onDone={() => finish(true)} />
                )}
              </>
            )}
          </div>
        </div>
      )}

      {over && (
        <div className="sheet-backdrop">
          <div className="sheet goose-sheet" role="dialog" aria-modal="true" aria-label="Partie terminée">
            <h2>Bravo !</h2>
            <p>{setup.count} exercice{setup.count > 1 ? 's' : ''} faits, soit {totalText}.</p>
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

/** La roue : cases en dégradé conique, miniatures des exercices, aiguille en haut, bouton au centre. */
function Wheel({ game, avatar, onSpin, disabled }: { game: Game; avatar: ReturnType<typeof useSettings>['anim']['avatar']; onSpin: () => void; disabled: boolean }) {
  const n = game.segs.length;
  const seg = 360 / n;
  const background = useMemo(
    () => `conic-gradient(${game.colors.map((c, i) => `${c} ${i * seg}deg ${(i + 1) * seg - 0.6}deg, rgba(20, 24, 58, 0.35) ${(i + 1) * seg - 0.6}deg ${(i + 1) * seg}deg`).join(', ')})`,
    [game.colors, seg],
  );
  const quick = reducedMotion();
  const style: CSSProperties = {
    background,
    transform: `rotate(${game.rotation}deg)`,
    transition: game.spinning ? `transform ${quick ? 800 : SPIN_MS}ms cubic-bezier(0.12, 0.6, 0.08, 1)` : 'none',
  };
  return (
    <div className="wheel-wrap">
      <span className="wheel-pointer" aria-hidden="true" />
      <div className="wheel" style={style} aria-hidden="true" onClick={disabled ? undefined : onSpin}>
        {game.segs.map((s, i) => (
          <span key={i} className="wheel-item" style={{ transform: `translate(-50%, -50%) rotate(${(i + 0.5) * seg}deg) translateY(-36cqmin)` }}>
            {s.kind === 'rest' ? (
              <span className="wheel-rest"><IconPause size={14} /><b>Repos</b></span>
            ) : (
              <FigureFrame exercise={s.exercise} avatar={avatar} sec={EXERCISE_BY_ID[s.exercise].period / 2} />
            )}
          </span>
        ))}
      </div>
      <button type="button" className="wheel-hub" onClick={onSpin} disabled={disabled} aria-label="Faire tourner la roue">
        Tourner
      </button>
    </div>
  );
}

/**
 * Décompte déclenché à la main : anneau qui se vide, bips sur les dernières secondes, son de fin.
 * Le temps est calculé depuis l'heure de départ (jamais en comptant des tops).
 */
function Countdown({ total, rest, onDone }: { total: number; rest?: boolean; onDone: () => void }) {
  const { sound } = useSettings();
  const [startAt, setStartAt] = useState<number | null>(null);
  /** Temps déjà écoulé avant la dernière pause (ms). */
  const [before, setBefore] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const lastBeep = useRef<number | null>(null);
  const running = startAt !== null;
  const elapsed = before + (running ? now - startAt : 0);
  const left = Math.max(0, total - elapsed / 1000);
  const shown = Math.ceil(left);
  const ended = elapsed > 0 && left <= 0;

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(t);
  }, [running]);

  // Bips du décompte final, puis son de fin.
  useEffect(() => {
    if (!running || sound.silent || lastBeep.current === shown) return;
    lastBeep.current = shown;
    if (shown === 0) {
      const end = rest ? sound.events.restEnd : sound.events.workEnd;
      if (end.enabled) void audio.test(end.sound, sound);
    } else if (shown <= sound.countdownBeeps && sound.events.countdown.enabled) {
      void audio.test(sound.events.countdown.sound, sound);
    }
  }, [running, shown, sound, rest]);

  useEffect(() => {
    if (ended && running) {
      setBefore(total * 1000);
      setStartAt(null);
    }
  }, [ended, running, total]);

  const start = () => {
    audio.unlock();
    setNow(Date.now());
    setStartAt(Date.now());
  };
  const pause = () => {
    setBefore(elapsed);
    setStartAt(null);
  };

  const r = 52;
  const len = 2 * Math.PI * r;
  return (
    <div className="wheel-count">
      <div className={`wheel-ring${rest ? ' rest' : ''}`} role="timer" aria-label={`${shown} secondes restantes`}>
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r={r} className="wheel-ring-bg" />
          <circle cx="60" cy="60" r={r} className="wheel-ring-fg" strokeDasharray={len} strokeDashoffset={len * (1 - left / total)} />
        </svg>
        <span className="wheel-ring-num">{ended ? 'Fini !' : fmtClock(shown)}</span>
      </div>
      {ended ? (
        <button className="btn block" onClick={onDone}>Continuer</button>
      ) : (
        <div className="btn-row">
          <button className="btn secondary" onClick={onDone}>Passer</button>
          {running ? (
            <button className="btn" onClick={pause}>Pause</button>
          ) : (
            <button className="btn" onClick={start}>{elapsed > 0 ? 'Reprendre' : 'Démarrer le décompte'}</button>
          )}
        </div>
      )}
    </div>
  );
}
