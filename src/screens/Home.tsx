import { useMemo } from 'react';
import { useLogs, useSchedules, useSettings, useWorkouts } from '../data/hooks';
import { occurrencesBetween } from '../data/schedule';
import { ALL_MODES, MODE_COLORS, MODE_DESC, MODE_LABELS } from '../data/types';
import { blockSummary, estimateWorkout } from '../engine/phases';
import { addDays, fmtClock, fmtDuration, fmtLongDate, isoDate, parseIsoDate } from '../lib/format';
import { launchWorkout } from '../lib/launch';
import { go } from '../lib/router';
import { postpone } from '../data/actions';
import { IconHistory, IconPlay } from '../ui/icons';
import { useSession } from '../engine/session';

/** Couleur de la tuile « WOD connus » (même famille que les couleurs des modes). */
const WOD_COLOR = '#E6CBA8';

function greeting(d: Date): string {
  const h = d.getHours();
  if (h < 5) return 'Encore debout ?';
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Prêt à bouger';
  return 'Bonsoir';
}

export function Home() {
  const today = new Date();
  const todayIso = isoDate(today);
  const schedules = useSchedules();
  const workouts = useWorkouts();
  const logs = useLogs();
  const settings = useSettings();
  const session = useSession();

  const byId = useMemo(() => new Map((workouts ?? []).map((w) => [w.id, w])), [workouts]);
  const occ = useMemo(
    () => occurrencesBetween(schedules ?? [], todayIso, isoDate(addDays(today, 14))).filter((o) => byId.has(o.sched.workoutId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schedules, byId, todayIso],
  );
  const todays = occ.filter((o) => o.date === todayIso && o.status === 'planned');
  const next = todays[0] ?? null;
  const later = !next ? occ.find((o) => o.status === 'planned' && o.date > todayIso) : undefined;
  const last = logs?.[0];
  const running = session && session.run.status !== 'finished';

  return (
    <main className="screen">
      <div className="page-head">
        <h1 className="page-title">{greeting(today)}</h1>
        <a className="icon-btn" href="#/seances?tab=historique" aria-label="Historique">
          <IconHistory size={20} />
        </a>
      </div>

      {running && (
        <div className="banner">
          <span>Une séance est en cours : <b>{session.workout.name}</b></span>
          <button className="btn small" onClick={() => go('/chrono')}>Reprendre</button>
        </div>
      )}

      {next ? (() => {
        const w = byId.get(next.sched.workoutId)!;
        const others = todays.length - 1;
        return (
          <section className="today-card" aria-label="Séance du jour">
            <div className="meta">
              <span>Séance du jour · {next.time}{others > 0 ? ` · +${others}` : ''}</span>
              <span className="pill">{fmtDuration(estimateWorkout(w))}</span>
            </div>
            <div className="title">{w.name}</div>
            <div className="pills">
              {w.blocks.slice(0, 4).map((b) => <span key={b.id} className="pill">{blockSummary(b)}</span>)}
            </div>
            <button className="btn" onClick={() => launchWorkout(w, settings, { scheduledId: next.sched.id, scheduledDate: next.date })}>
              <IconPlay size={16} />Démarrer
            </button>
            <button className="btn small lite" onClick={() => void postpone(next.sched, next.date)}>Décaler à demain</button>
          </section>
        );
      })() : (
        <section className="today-card empty-day" aria-label="Séance du jour">
          <div className="meta"><span>Aujourd’hui</span></div>
          <div className="title">Rien de prévu</div>
          {later && (
            <span className="hint">
              Prochaine : {byId.get(later.sched.workoutId)?.name}, {fmtLongDate(parseIsoDate(later.date)).toLowerCase()} à {later.time}
            </span>
          )}
          <button className="btn" onClick={() => go('/planifier')}>Planifier une séance</button>
        </section>
      )}

      <section className="section">
        <h2 className="section-title">Chrono rapide</h2>
        <div className="tiles">
          {ALL_MODES.map((m) => (
            <button key={m} className="tile" style={{ background: MODE_COLORS[m] }} onClick={() => go(`/rapide/${m}`)}>
              <small>{MODE_DESC[m]}</small>
              {MODE_LABELS[m]}
            </button>
          ))}
          <button className="tile" style={{ background: WOD_COLOR }} onClick={() => go('/seances?tab=wod')}>
            <small>Cindy, Fran, Murph…</small>
            WOD connus
          </button>
        </div>
      </section>

      {last && (
        <section className="section">
          <h2 className="section-title">Dernière séance</h2>
          <a className="item" href={`#/historique/${last.id}`}>
            <div className="item-main">
              <span className="item-title">{last.workoutName}</span>
              <span className="item-sub">{fmtLongDate(new Date(last.startedAt))}{last.rpe ? ` · RPE ${last.rpe}` : ''}</span>
            </div>
            <span className="item-end">{fmtClock(last.durationSec)}</span>
          </a>
        </section>
      )}
    </main>
  );
}
