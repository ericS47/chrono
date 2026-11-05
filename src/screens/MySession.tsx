import { useLogs, useWorkouts } from '../data/hooks';
import { fmtClock, fmtLongDate } from '../lib/format';
import { go } from '../lib/router';
import { Empty, TopBar } from '../ui/kit';
import { WorkoutItem } from './Library';

/** Nombre de favoris montrés sur l'écran « Ma séance ». */
const MAX_FAVORITES = 2;

/** Écran épuré ouvert depuis la tuile « Ma séance » : 2 favoris et la dernière séance faite. */
export function MySession() {
  const workouts = useWorkouts();
  const logs = useLogs();
  const favorites = (workouts ?? [])
    .filter((w) => w.favorite)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_FAVORITES);
  const last = logs?.[0];
  const lastWorkout = last?.workoutId ? workouts?.find((w) => w.id === last.workoutId) : undefined;

  return (
    <main className="screen no-nav">
      <TopBar title="Ma séance" />

      <section className="section">
        <h2 className="section-title">Favoris</h2>
        {favorites.length ? (
          <div className="list">{favorites.map((w) => <WorkoutItem key={w.id} w={w} star />)}</div>
        ) : (
          workouts && <Empty>Pas encore de favori. Touchez ★ sur une séance pour la retrouver ici.</Empty>
        )}
      </section>

      {last && (
        <section className="section">
          <h2 className="section-title">Dernière séance</h2>
          {lastWorkout ? (
            <div className="list"><WorkoutItem w={lastWorkout} /></div>
          ) : (
            <a className="item" href={`#/historique/${last.id}`}>
              <div className="item-main">
                <span className="item-title">{last.workoutName}</span>
                <span className="item-sub">{fmtLongDate(new Date(last.startedAt))}</span>
              </div>
              <span className="item-end">{fmtClock(last.durationSec)}</span>
            </a>
          )}
        </section>
      )}

      <button className="btn secondary block" onClick={() => go('/seances')}>Toutes mes séances</button>
    </main>
  );
}
