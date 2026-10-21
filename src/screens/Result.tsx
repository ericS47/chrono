import { useMemo, useState } from 'react';
import * as S from '../engine/session';
import * as T from '../engine/timer';
import { blockSummary } from '../engine/phases';
import { db } from '../data/db';
import { useSettings, useWorkouts } from '../data/hooks';
import { setOccurrenceStatus } from '../data/actions';
import type { BlockResult, SessionLog, Workout } from '../data/types';
import { fmtClock, isoDate, uid } from '../lib/format';
import { go } from '../lib/router';
import { DurationField, Stepper, TopBar } from '../ui/kit';

function ResultFields({ workout, results, setResults }: { workout: Workout; results: BlockResult[]; setResults: (r: BlockResult[]) => void }) {
  const set = (i: number, patch: Partial<BlockResult>) => setResults(results.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <>
      {workout.blocks.map((b, i) => {
        const r = results[i] ?? { blockIndex: i };
        const head = <div className="field" key={`h${i}`}><span className="field-label">{blockSummary(b)}</span></div>;
        if (b.mode === 'fortime') {
          return [head, <DurationField key={`t${i}`} label="Temps réalisé" value={r.timeSec ?? 0} step={5} onChange={(v) => set(i, { timeSec: v })} />];
        }
        if (b.mode === 'amrap') {
          return [
            head,
            <Stepper key={`r${i}`} label="Tours complets" value={r.rounds ?? 0} max={999} onChange={(v) => set(i, { rounds: v })} />,
            <Stepper key={`p${i}`} label="Répétitions en plus" value={r.reps ?? 0} max={999} onChange={(v) => set(i, { reps: v })} />,
          ];
        }
        if (b.mode === 'strength' || b.exercises.some((e) => e.load)) {
          return [
            head,
            <div className="field" key={`l${i}`}>
              <label htmlFor={`loads${i}`}>Charges utilisées</label>
              <input id={`loads${i}`} type="text" placeholder="ex. squat 100 kg, DC 70 kg" value={r.loads ?? ''} onChange={(e) => set(i, { loads: e.target.value })} />
            </div>,
          ];
        }
        return null;
      })}
    </>
  );
}

export function ResultScreen({ manual = false }: { manual?: boolean }) {
  const session = S.useSession();
  const settings = useSettings();
  const workouts = useWorkouts();
  const finished = session?.run.status === 'finished' ? session : null;

  const initial = useMemo<BlockResult[]>(() => {
    if (!finished) return [];
    return finished.workout.blocks.map((b, i) => {
      const r: BlockResult = { blockIndex: i };
      if (b.mode === 'fortime') r.timeSec = Math.round(T.blockWorkTime(finished.run, i) / 1000);
      if (b.mode === 'amrap') r.rounds = finished.run.roundCount[i] ?? 0;
      if (b.mode === 'strength') r.loads = (b.params.lifts ?? []).filter((l) => l.load).map((l) => `${l.name} ${l.load}`).join(', ') || undefined;
      return r;
    });
  }, [finished]);

  const [results, setResults] = useState<BlockResult[]>(initial);
  const [rpe, setRpe] = useState<number | undefined>();
  const [note, setNote] = useState('');
  const [wantSave, setWantSave] = useState<boolean | null>(null);
  // Saisie manuelle
  const [workoutId, setWorkoutId] = useState('');
  const [freeName, setFreeName] = useState('');
  const [date, setDate] = useState(isoDate(new Date()));
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [duration, setDuration] = useState(30 * 60);

  const manualWorkout = workouts?.find((w) => w.id === workoutId);

  if (!manual && !finished) {
    return (
      <main className="screen no-nav">
        <p className="empty">Pas de séance terminée à enregistrer.</p>
        <button className="btn" onClick={() => go('/', true)}>Accueil</button>
      </main>
    );
  }

  const durationSec = finished ? Math.round(T.activeTime(finished.run) / 1000) : duration;
  const mode = manual ? 'always' : settings.saveMode;
  const showForm = mode === 'always' || wantSave === true;

  const close = () => {
    S.discard();
    go('/', true);
  };

  const save = async () => {
    let log: SessionLog;
    if (finished) {
      const wall = Date.now() - (S.clock() - (finished.run.startedAt ?? S.clock()));
      log = {
        id: uid(),
        workoutId: finished.quick ? null : finished.workout.id,
        workoutName: finished.workout.name,
        snapshot: structuredClone(finished.workout),
        startedAt: Math.round(wall),
        endedAt: Date.now(),
        durationSec,
        results,
        rpe,
        note: note.trim() || undefined,
        manual: false,
        scheduledId: finished.scheduledId,
        scheduledDate: finished.scheduledDate,
      };
    } else {
      const start = new Date(`${date}T${time || '12:00'}`);
      log = {
        id: uid(),
        workoutId: manualWorkout?.id ?? null,
        workoutName: manualWorkout?.name ?? (freeName.trim() || 'Séance libre'),
        snapshot: manualWorkout ? structuredClone(manualWorkout) : null,
        startedAt: start.getTime(),
        endedAt: start.getTime() + duration * 1000,
        durationSec: duration,
        results,
        rpe,
        note: note.trim() || undefined,
        manual: true,
      };
    }
    await db.logs.put(log);
    if (log.scheduledId && log.scheduledDate) await setOccurrenceStatus(log.scheduledId, log.scheduledDate, 'done');
    S.discard();
    go(`/historique/${log.id}`, true);
  };

  const skipSave = async () => {
    // La séance planifiée est quand même marquée comme faite.
    if (finished?.scheduledId && finished.scheduledDate) await setOccurrenceStatus(finished.scheduledId, finished.scheduledDate, 'done');
    close();
  };

  const formWorkout = finished?.workout ?? manualWorkout;

  return (
    <main className="screen no-nav">
      {manual ? <TopBar title="Saisir une séance" /> : (
        <div className="page-head">
          <div>
            <span className="eyebrow">Séance terminée</span>
            <h1 className="page-title">{finished!.workout.name}</h1>
          </div>
        </div>
      )}

      {finished && (
        <div className="stats">
          <div className="stat"><b>{fmtClock(durationSec)}</b><span>temps actif</span></div>
          {finished.workout.blocks.map((b, i) =>
            b.mode === 'amrap' ? <div className="stat" key={i}><b>{finished.run.roundCount[i] ?? 0}</b><span>tours ({blockSummary(b)})</span></div> : null,
          )}
        </div>
      )}

      {!showForm && mode === 'ask' && (
        <section className="section">
          <h2 className="section-title">Enregistrer cette séance dans l’historique ?</h2>
          <div className="btn-row">
            <button className="btn" onClick={() => setWantSave(true)}>Enregistrer</button>
            <button className="btn secondary" onClick={() => void skipSave()}>Ne pas enregistrer</button>
          </div>
        </section>
      )}

      {!showForm && mode === 'never' && (
        <div className="btn-row">
          <button className="btn" onClick={() => void skipSave()}>Terminer</button>
          <button className="btn secondary" onClick={() => setWantSave(true)}>Enregistrer quand même</button>
        </div>
      )}

      {showForm && (
        <>
          {manual && (
            <div className="form">
              <div className="field">
                <label htmlFor="mw">Séance</label>
                <select id="mw" value={workoutId} onChange={(e) => { setWorkoutId(e.target.value); setResults([]); }}>
                  <option value="">Séance libre (hors bibliothèque)</option>
                  {(workouts ?? []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              {!manualWorkout && (
                <div className="field">
                  <label htmlFor="mn">Nom</label>
                  <input id="mn" type="text" placeholder="ex. Footing 8 km" value={freeName} onChange={(e) => setFreeName(e.target.value)} />
                </div>
              )}
              <div className="field" style={{ flexDirection: 'row', gap: 10 }}>
                <label style={{ flex: 1 }}>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
                <label style={{ flex: 1 }}>Heure<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
              </div>
              <DurationField label="Durée" value={duration} step={60} onChange={setDuration} />
            </div>
          )}

          {formWorkout && formWorkout.blocks.some((b) => b.mode === 'fortime' || b.mode === 'amrap' || b.mode === 'strength' || b.exercises.some((e) => e.load)) && (
            <div className="form">
              <ResultFields workout={formWorkout} results={formWorkout.blocks.map((_, i) => results[i] ?? { blockIndex: i })} setResults={setResults} />
            </div>
          )}

          <div className="form">
            <div className="field">
              <span className="field-label">Ressenti (RPE 1 à 10)</span>
            </div>
            <div className="rpe" role="group" aria-label="Ressenti">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button key={n} aria-pressed={rpe === n} onClick={() => setRpe(rpe === n ? undefined : n)}>{n}</button>
              ))}
            </div>
            <div className="field">
              <label htmlFor="note">Note</label>
              <textarea id="note" placeholder="Sensations, adaptations…" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>

          <button className="btn block" onClick={() => void save()}>Enregistrer</button>
          {!manual && <button className="btn ghost block" onClick={() => void skipSave()}>Ne pas enregistrer</button>}
        </>
      )}
    </main>
  );
}
