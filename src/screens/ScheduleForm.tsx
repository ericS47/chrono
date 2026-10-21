import { useEffect, useState } from 'react';
import { db } from '../data/db';
import { useWorkouts } from '../data/hooks';
import type { ScheduledSession } from '../data/types';
import { dayShort, isoDate, uid } from '../lib/format';
import { back, go, useQuery } from '../lib/router';
import { isNativeApp, notificationPermission, requestNotifications } from '../lib/platform';
import { TopBar } from '../ui/kit';

const REMINDERS = [null, 0, 5, 10, 15, 30, 60, 120];

export function ScheduleForm() {
  const q = useQuery();
  const workouts = useWorkouts();
  const editId = q.get('edit');
  const [s, setS] = useState<ScheduledSession | null>(null);
  const [perm, setPerm] = useState<string>('default');

  useEffect(() => {
    void notificationPermission().then(setPerm);
  }, []);

  useEffect(() => {
    if (editId) {
      void db.schedules.get(editId).then((x) => x && setS(x));
      return;
    }
    const d = q.get('date') ?? isoDate(new Date());
    setS({ id: uid(), workoutId: q.get('workout') ?? '', date: d, time: '18:30', weekdays: [], reminderMinutes: 15, status: {}, createdAt: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  useEffect(() => {
    if (s && !s.workoutId && workouts?.length) setS({ ...s, workoutId: workouts[0].id });
  }, [s, workouts]);

  if (!s || !workouts) return null;

  if (!workouts.length) {
    return (
      <main className="screen no-nav">
        <TopBar title="Planifier" />
        <p className="empty">Crée d’abord une séance (ou copie un WOD connu) pour pouvoir la planifier.</p>
        <button className="btn" onClick={() => go('/seances?tab=wod', true)}>Voir les WOD connus</button>
        <button className="btn secondary" onClick={() => go('/editer/nouvelle', true)}>Créer une séance</button>
      </main>
    );
  }

  const toggleDay = (d: number) => setS({ ...s, weekdays: s.weekdays.includes(d) ? s.weekdays.filter((x) => x !== d) : [...s.weekdays, d].sort() });

  const save = async () => {
    await db.schedules.put({ ...s, until: s.weekdays.length ? s.until || undefined : undefined });
    go('/planning', true);
  };

  const remove = async () => {
    if (!window.confirm('Supprimer cette planification (toutes les occurrences) ?')) return;
    await db.schedules.delete(s.id);
    go('/planning', true);
  };

  return (
    <main className="screen no-nav">
      <TopBar title={editId ? 'Modifier la planification' : 'Planifier une séance'} onBack={() => back('/planning')} />
      <div className="form">
        <div className="field">
          <label htmlFor="sw">Séance</label>
          <select id="sw" value={s.workoutId} onChange={(e) => setS({ ...s, workoutId: e.target.value })}>
            {workouts.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div className="field" style={{ flexDirection: 'row', gap: 10 }}>
          <label style={{ flex: 1 }} className="field-label">{s.weekdays.length ? 'À partir du' : 'Date'}<input type="date" value={s.date} onChange={(e) => setS({ ...s, date: e.target.value })} /></label>
          <label style={{ flex: 1 }} className="field-label">Heure<input type="time" value={s.time} onChange={(e) => setS({ ...s, time: e.target.value })} /></label>
        </div>
        <div className="field">
          <span className="field-label">Répéter chaque semaine le…</span>
          <div className="chips">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <button key={d} className="chip" aria-pressed={s.weekdays.includes(d)} onClick={() => toggleDay(d)}>{dayShort(d)}</button>
            ))}
          </div>
          <span className="hint">{s.weekdays.length ? 'Séance récurrente.' : 'Aucun jour choisi : séance unique.'}</span>
        </div>
        {s.weekdays.length > 0 && (
          <div className="field">
            <label htmlFor="su">Jusqu’au (optionnel)</label>
            <input id="su" type="date" value={s.until ?? ''} onChange={(e) => setS({ ...s, until: e.target.value })} />
          </div>
        )}
        <div className="field">
          <label htmlFor="sr">Rappel</label>
          <select id="sr" value={s.reminderMinutes ?? 'none'} onChange={(e) => setS({ ...s, reminderMinutes: e.target.value === 'none' ? null : Number(e.target.value) })}>
            {REMINDERS.map((m) => <option key={String(m)} value={m ?? 'none'}>{m === null ? 'Pas de rappel' : m === 0 ? 'À l’heure de la séance' : `${m} min avant`}</option>)}
          </select>
          {s.reminderMinutes !== null && perm !== 'granted' && (
            <button className="btn small secondary" style={{ alignSelf: 'flex-start' }} onClick={() => void requestNotifications().then(() => notificationPermission().then(setPerm))}>
              Autoriser les notifications
            </button>
          )}
          {s.reminderMinutes !== null && !isNativeApp() && (
            <span className="hint">Dans la version web, le rappel ne s’affiche que si Chrono est ouvert. L’app Android (Capacitor) envoie de vraies notifications, même fermée.</span>
          )}
        </div>
      </div>
      <button className="btn block" onClick={() => void save()}>Enregistrer</button>
      {editId && <button className="btn danger block" onClick={() => void remove()}>Supprimer la planification</button>}
    </main>
  );
}
