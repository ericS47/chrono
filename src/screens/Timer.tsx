import { useEffect, useState } from 'react';
import * as S from '../engine/session';
import * as T from '../engine/timer';
import type { Phase } from '../engine/phases';
import { blockTitle, estimateWorkout } from '../engine/phases';
import { fmtClock, fmtShort } from '../lib/format';
import { go } from '../lib/router';
import { useSettings } from '../data/hooks';
import { launchWorkout } from '../lib/launch';
import {
  IconArrowRight, IconClose, IconFlag, IconMinus, IconMute, IconPause, IconPlay, IconPlus, IconPrev, IconSound,
} from '../ui/icons';

const R = 138;
const CIRC = 2 * Math.PI * R;

function useNow(active: boolean): number {
  const [now, setNow] = useState(S.clock());
  useEffect(() => {
    if (!active) {
      setNow(S.clock());
      return;
    }
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      if (t - last > 90) {
        last = t;
        setNow(S.clock());
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    // Secours si requestAnimationFrame est suspendu (onglet caché) : rafraîchit au retour.
    const vis = () => setNow(S.clock());
    document.addEventListener('visibilitychange', vis);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [active]);
  return now;
}

function phaseWord(ph: Phase): string {
  if (ph.kind === 'prep') return 'PRÊT ?';
  if (ph.kind === 'rest') return 'REPOS';
  if (ph.action === 'setDone') return `SÉRIE ${ph.set ?? ''}`.trim();
  if (ph.mode === 'stopwatch') return 'CHRONO';
  if (ph.mode === 'fortime') return 'FOR TIME';
  if (ph.mode === 'amrap') return 'AMRAP';
  return 'EFFORT';
}

function bigNumber(ph: Phase, elapsedMs: number, remainingMs: number | null): { text: string; long: boolean } {
  if (ph.countUp || remainingMs === null) {
    const t = fmtClock(elapsedMs / 1000);
    return { text: t, long: t.length > 5 };
  }
  const sec = Math.ceil(remainingMs / 1000);
  if (sec < 60) return { text: String(sec).padStart(2, '0'), long: false };
  const t = fmtClock(sec);
  return { text: t, long: t.length > 5 };
}

function mainLabel(phases: Phase[], i: number): string {
  const ph = phases[i];
  const nextPh = phases[i + 1];
  if (ph.action === 'setDone') return 'Série terminée';
  if (ph.action === 'done') return 'Terminé';
  if (!nextPh) return 'Terminer';
  if (ph.kind === 'prep') return 'Go';
  if (ph.kind === 'rest') return 'Reprendre l’effort';
  if (nextPh.kind === 'rest') return 'Passer au repos';
  return 'Suivant';
}

export function TimerScreen() {
  const session = S.useSession();
  const settings = useSettings();
  const running = session?.run.status === 'running';
  const now = useNow(!!running);
  const [confirm, setConfirm] = useState(false);

  if (!session) {
    return (
      <main className="screen no-nav">
        <p className="empty">Aucune séance en cours.</p>
        <button className="btn" onClick={() => go('/', true)}>Retour à l’accueil</button>
      </main>
    );
  }

  const { run, phases, workout } = session;
  if (run.status === 'finished') {
    return (
      <div className="timer done">
        <div className="timer-body" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <span className="ring-phase">BRAVO</span>
          <span className="ring-time long">{fmtClock(T.activeTime(run) / 1000)}</span>
          <button className="btn" onClick={() => go('/resultat', true)}>Voir le résultat</button>
        </div>
      </div>
    );
  }

  const ph = phases[run.index];
  const idle = run.status === 'idle';
  const el = T.elapsed(run, now);
  const rem = T.remaining(run, now);
  const prog = ph.duration ? T.progress(run, now) : (el / 1000 % 60) / 60;
  const big = bigNumber(ph, el, rem);
  const blocks = workout.blocks.length;
  const totalLeft = T.totalRemaining(run, now) / 1000;
  const prepPhase = phases[0]?.kind === 'prep' ? phases[0].duration ?? 0 : 0;
  const cls = idle ? 'idle' : ph.kind;
  const nextPh = phases[run.index + 1];
  const sub = ph.kind === 'rest'
    ? ph.detail?.startsWith('Ensuite') ? ph.detail : nextPh ? `Ensuite : ${nextPh.label}` : 'Respire, c’est presque fini'
    : ph.kind === 'work' && !['AMRAP', 'For Time', 'Chrono', 'Effort', 'Minuteur'].includes(ph.label) ? ph.label : ph.detail ?? '';
  const sub2 = ph.kind === 'work' && sub === ph.label ? ph.detail : undefined;
  const rounds = run.roundCount[ph.blockIndex] ?? 0;
  const laps = run.laps[run.index] ?? [];

  const changePrep = (v: number) => {
    const w = { ...workout };
    launchWorkout(w, settings, { quick: session.quick, scheduledId: session.scheduledId, scheduledDate: session.scheduledDate, prepSeconds: v });
  };

  // Tour / série
  let roundLabel = 'Tour';
  let roundValue = '—';
  if (ph.rounds && ph.round) roundValue = `${ph.round} / ${ph.rounds}`;
  else if (ph.sets && ph.set) {
    roundLabel = 'Série';
    roundValue = `${ph.set} / ${ph.sets}`;
  }

  const upcoming = phases.slice(run.index, run.index + 3);
  const block = workout.blocks[ph.blockIndex];
  const showExercises = ph.roundCounter && block && block.exercises.some((e) => e.name.trim());

  return (
    <div className={`timer ${cls}`}>
      <div className="timer-top">
        <button className="icon-btn" aria-label="Arrêter" onClick={() => (idle ? (S.discard(), go('/', true)) : setConfirm(true))}>
          <IconClose size={18} />
        </button>
        <div className="center">
          <span>{blocks > 1 ? `Bloc ${ph.blockIndex + 1} / ${blocks}` : block && blockTitle(block) !== workout.name ? blockTitle(block) : 'Chrono'}</span>
          <b>{workout.name}</b>
        </div>
        <button className="icon-btn" aria-label={session.muted ? 'Réactiver le son' : 'Couper le son'} onClick={() => S.setMuted(!session.muted)}>
          {session.muted ? <IconMute size={18} /> : <IconSound size={18} />}
        </button>
      </div>

      <div className="timer-body">
        <div className="ring">
          <svg viewBox="0 0 300 300" aria-hidden="true">
            <circle cx="150" cy="150" r={R} fill="rgba(255,255,255,0.18)" stroke="rgba(20,24,58,0.15)" strokeWidth="12" />
            {!idle && (
              <circle
                cx="150" cy="150" r={R} fill="none" stroke="#14183A" strokeWidth="12" strokeLinecap="round"
                strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - prog)} transform="rotate(-90 150 150)"
              />
            )}
          </svg>
          <div className="ring-inner" aria-live="off">
            {idle ? (
              <>
                <span className="ring-phase">PRÊT ?</span>
                <span className="ring-time long num">{fmtClock(estimateWorkout(workout))}</span>
                <span className="ring-sub">durée estimée</span>
              </>
            ) : (
              <>
                <span className="ring-phase">{phaseWord(ph)}</span>
                <span className={`ring-time num ${big.long ? 'long' : ''}`} data-testid="timer-value">{big.text}</span>
                <span className="ring-sub">{sub}</span>
                {sub2 && <span className="ring-sub" style={{ fontWeight: 600 }}>{sub2}</span>}
              </>
            )}
          </div>
        </div>

        <div className="timer-side">
          {idle ? (
            <div className="glass">
              <div className="counter">
                <span style={{ fontWeight: 700 }}>Préparation<br /><b style={{ fontSize: 24 }}>{prepPhase} s</b></span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button aria-label="Préparation : moins" onClick={() => changePrep(Math.max(0, prepPhase - 5))}><IconMinus size={18} /></button>
                  <button aria-label="Préparation : plus" onClick={() => changePrep(Math.min(60, prepPhase + 5))}><IconPlus size={18} /></button>
                </div>
              </div>
            </div>
          ) : (
            <div className="timer-stats">
              {ph.roundCounter ? (
                <div className="glass">
                  <span>Tours faits</span>
                  <div className="counter">
                    <b data-testid="round-count">{rounds}</b>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button aria-label="Retirer un tour" onClick={() => S.addRound(-1)}><IconMinus size={18} /></button>
                      <button aria-label="Ajouter un tour" onClick={() => S.addRound(1)}><IconPlus size={18} /></button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass"><span>{roundLabel}</span><b>{roundValue}</b></div>
              )}
              <div className="glass">
                <span>{totalLeft > 0 ? 'Restant' : 'Écoulé'}</span>
                <b className="num">{fmtClock(totalLeft > 0 ? totalLeft : el / 1000)}</b>
              </div>
            </div>
          )}

          {ph.laps && !idle ? (
            <div className="glass laps">
              {laps.length ? laps.map((l, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tour {i + 1}</span><span className="num">{fmtClock((l - (laps[i - 1] ?? 0)) / 1000)} · {fmtClock(l / 1000)}</span>
                </div>
              )).reverse() : <span>Touchez « Tour » pour marquer un temps intermédiaire.</span>}
            </div>
          ) : showExercises ? (
            <div className="glass ex-list">
              {block.exercises.filter((e) => e.name.trim()).map((e, i) => (
                <span key={i}>{[e.reps, e.name].filter(Boolean).join(' ')}{e.load ? ` · ${e.load}` : ''}</span>
              ))}
            </div>
          ) : (
            <div className="glass upcoming">
              {upcoming.map((u, i) => (
                <div key={run.index + i}>
                  <span>{u.kind === 'prep' ? 'Préparation' : u.label}</span>
                  <span>{i === 0 && !idle ? 'maintenant' : u.duration ? fmtShort(u.duration) : u.round ? `tour ${u.round}` : u.set ? `série ${u.set}` : ''}</span>
                </div>
              ))}
            </div>
          )}

          <div className="timer-controls">
            {idle ? (
              <button className="main" onClick={() => S.begin()}>
                <IconPlay size={18} />Démarrer
              </button>
            ) : (
              <>
                <button className="glass-btn" aria-label="Revenir en arrière" onClick={() => S.back()}><IconPrev size={20} /></button>
                <button className="glass-btn" aria-label={running ? 'Pause' : 'Reprendre'} onClick={() => S.toggle()}>
                  {running ? <IconPause size={22} /> : <IconPlay size={22} />}
                </button>
                {ph.laps ? (
                  <>
                    <button className="tap-round" style={{ flex: 1 }} onClick={() => S.lap()} disabled={!running}>Tour</button>
                    <button className="main" onClick={() => S.skip()}><IconFlag size={18} />Terminé</button>
                  </>
                ) : (
                  <button className="main" onClick={() => S.skip()}>
                    {mainLabel(phases, run.index)}<IconArrowRight size={18} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {run.status === 'paused' && !confirm && (
        <span style={{ position: 'absolute', top: 'calc(74px + env(safe-area-inset-top))', left: 0, right: 0, textAlign: 'center', fontWeight: 800 }}>EN PAUSE</span>
      )}

      {confirm && (
        <div className="confirm" onClick={() => setConfirm(false)}>
          <div className="card" role="dialog" aria-label="Arrêter la séance" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>Arrêter la séance ?</h2>
            <button className="btn" onClick={() => { setConfirm(false); S.finishNow(); }}>Terminer maintenant</button>
            <button className="btn danger" onClick={() => { S.discard(); go('/', true); }}>Abandonner sans enregistrer</button>
            <button className="btn secondary" onClick={() => setConfirm(false)}>Continuer</button>
          </div>
        </div>
      )}
    </div>
  );
}
