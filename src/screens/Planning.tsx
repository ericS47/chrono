import { useMemo, useState } from 'react';
import { useLogs, useSchedules, useSettings, useWorkouts } from '../data/hooks';
import { occurrencesBetween, occurrenceTime, type Occurrence } from '../data/schedule';
import { postpone, setOccurrenceStatus } from '../data/actions';
import { blockSummary } from '../engine/phases';
import { addDays, cap, dayName, dayShort, fmtDuration, isoDate, monthName, parseIsoDate, startOfWeek } from '../lib/format';
import { launchWorkout } from '../lib/launch';
import { go } from '../lib/router';
import { Chip, Empty, Segmented } from '../ui/kit';
import { IconBack, IconNext, IconPlus } from '../ui/icons';

export function Planning() {
  const schedules = useSchedules();
  const workouts = useWorkouts();
  const logs = useLogs();
  const settings = useSettings();
  const todayIso = isoDate(new Date());
  const [sel, setSel] = useState(todayIso);
  const [view, setView] = useState<'semaine' | 'mois'>('semaine');
  const selDate = parseIsoDate(sel);

  const byId = useMemo(() => new Map((workouts ?? []).map((w) => [w.id, w])), [workouts]);
  const weekStart = startOfWeek(selDate);
  const monthStart = new Date(selDate.getFullYear(), selDate.getMonth(), 1);
  const gridStart = view === 'semaine' ? weekStart : startOfWeek(monthStart);
  const gridDays = view === 'semaine' ? 7 : 42;
  const occ = useMemo(
    () => occurrencesBetween(schedules ?? [], isoDate(gridStart), isoDate(addDays(gridStart, gridDays - 1))).filter((o) => byId.has(o.sched.workoutId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schedules, byId, isoDate(gridStart), gridDays],
  );
  const logDays = useMemo(() => new Set((logs ?? []).map((l) => isoDate(new Date(l.startedAt)))), [logs]);
  const dayOcc = occ.filter((o) => o.date === sel);
  const dayLogs = (logs ?? []).filter((l) => isoDate(new Date(l.startedAt)) === sel && !l.scheduledId);

  // Stats de la semaine affichée
  const wk = occurrencesBetween(schedules ?? [], isoDate(weekStart), isoDate(addDays(weekStart, 6))).filter((o) => byId.has(o.sched.workoutId));
  const wkLogs = (logs ?? []).filter((l) => l.startedAt >= weekStart.getTime() && l.startedAt < addDays(weekStart, 7).getTime());
  const nextPlanned = dayOcc.find((o) => o.status === 'planned' && occurrenceTime(o.date, o.time).getTime() > Date.now() - 3 * 3600_000);

  const shift = (n: number) => {
    if (view === 'semaine') setSel(isoDate(addDays(selDate, n * 7)));
    else setSel(isoDate(new Date(selDate.getFullYear(), selDate.getMonth() + n, 1)));
  };

  const slot = (o: Occurrence) => {
    const w = byId.get(o.sched.workoutId)!;
    const isNext = o === nextPlanned;
    const reminder = o.sched.reminderMinutes !== null
      ? new Date(occurrenceTime(o.date, o.time).getTime() - o.sched.reminderMinutes * 60_000).toTimeString().slice(0, 5)
      : null;
    return (
      <div key={o.sched.id + o.date} className={`slot ${isNext ? 'next' : ''}`}>
        <div className="slot-time">{o.time}</div>
        <div className="card">
          <div className="slot-head">
            <a href={`#/seance/${w.id}`} style={{ fontWeight: 700, fontSize: 15, color: 'inherit', textDecoration: 'none' }}>{w.name}</a>
            {o.status === 'done' ? <Chip tone="success">Terminée</Chip> : o.status === 'skipped' ? <Chip tone="muted">Sautée</Chip> : reminder ? <span className="hint">Rappel {reminder}</span> : <Chip>Prévue</Chip>}
          </div>
          <div className="chips">{w.blocks.slice(0, 4).map((b) => <span key={b.id} className="chip">{blockSummary(b)}</span>)}</div>
          {o.sched.weekdays.length > 0 && <span className="hint">Tous les {o.sched.weekdays.map((d) => dayName(new Date(2026, 1, 1 + d))).join(', ')}</span>}
          <div className="btn-row">
            {o.status === 'planned' ? (
              <>
                <button className="btn small" onClick={() => launchWorkout(w, settings, { scheduledId: o.sched.id, scheduledDate: o.date })}>Lancer</button>
                <button className="btn small secondary" onClick={() => void postpone(o.sched, o.date)}>Décaler</button>
                <button className="btn small secondary" onClick={() => void setOccurrenceStatus(o.sched.id, o.date, 'skipped')}>Sauter</button>
              </>
            ) : (
              <button className="btn small secondary" onClick={() => void setOccurrenceStatus(o.sched.id, o.date, null)}>Remettre en prévue</button>
            )}
            <button className="btn small ghost" onClick={() => go(`/planifier?edit=${o.sched.id}`)}>Modifier</button>
          </div>
        </div>
      </div>
    );
  };

  const dayCell = (d: Date, compact: boolean) => {
    const iso = isoDate(d);
    const has = occ.some((o) => o.date === iso) || logDays.has(iso);
    const cls = ['day', iso === sel ? 'sel' : '', iso === todayIso ? 'today' : '', !compact && d.getMonth() !== selDate.getMonth() ? 'out' : ''].join(' ');
    return (
      <button key={iso} className={cls} aria-pressed={iso === sel} aria-label={`${dayName(d)} ${d.getDate()} ${monthName(d.getMonth())}`} onClick={() => setSel(iso)}>
        {compact && <span>{dayShort(d.getDay())}</span>}
        <b>{d.getDate()}</b>
        <i className={has ? 'on' : ''} />
      </button>
    );
  };

  return (
    <main className="screen">
      <div className="page-head" style={{ alignItems: 'center' }}>
        <h1 className="page-title">{cap(monthName(selDate.getMonth()))}{selDate.getFullYear() !== new Date().getFullYear() ? ` ${selDate.getFullYear()}` : ''}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="icon-btn" aria-label={view === 'semaine' ? 'Semaine précédente' : 'Mois précédent'} onClick={() => shift(-1)}><IconBack size={18} /></button>
          <button className="icon-btn" aria-label={view === 'semaine' ? 'Semaine suivante' : 'Mois suivant'} onClick={() => shift(1)}><IconNext size={18} /></button>
        </div>
      </div>

      <Segmented label="Vue" value={view} onChange={setView} options={[{ value: 'semaine', label: 'Semaine' }, { value: 'mois', label: 'Mois' }]} />

      {view === 'semaine' ? (
        <div className="week">{Array.from({ length: 7 }, (_, i) => dayCell(addDays(weekStart, i), true))}</div>
      ) : (
        <div className="month">
          {[1, 2, 3, 4, 5, 6, 0].map((wd) => <span key={wd} className="wd">{dayShort(wd)}</span>)}
          {Array.from({ length: 42 }, (_, i) => dayCell(addDays(gridStart, i), false))}
        </div>
      )}
      {sel !== todayIso && <button className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setSel(todayIso)}>Revenir à aujourd’hui</button>}

      <section className="section">
        <h2 className="section-title">
          {cap(dayName(selDate))} {selDate.getDate()} · {dayOcc.length} séance{dayOcc.length > 1 ? 's' : ''}
        </h2>
        {dayOcc.length ? dayOcc.map(slot) : <Empty>Rien de prévu ce jour-là.</Empty>}
        {dayLogs.map((l) => (
          <a key={l.id} className="item" href={`#/historique/${l.id}`}>
            <div className="item-main">
              <span className="item-title">{l.workoutName}</span>
              <span className="item-sub">Faite à {new Date(l.startedAt).toTimeString().slice(0, 5)}</span>
            </div>
            <Chip tone="success">Faite</Chip>
          </a>
        ))}
      </section>

      <section className="section">
        <h2 className="section-title">Cette semaine</h2>
        <div className="stats">
          <div className="stat"><b>{wk.filter((o) => o.status === 'done').length} / {wk.length}</b><span>séances prévues faites</span></div>
          <div className="stat"><b>{fmtDuration(wkLogs.reduce((t, l) => t + l.durationSec, 0))}</b><span>d’effort</span></div>
        </div>
      </section>

      <button className="fab" onClick={() => go(`/planifier?date=${sel}`)}><IconPlus size={18} />Planifier</button>
    </main>
  );
}
