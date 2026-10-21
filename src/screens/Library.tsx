import { useMemo, useState } from 'react';
import { useLogs, useWorkouts } from '../data/hooks';
import { saveWorkout } from '../data/db';
import { knownWods } from '../data/wods';
import { activeWeekStreak } from '../data/schedule';
import { blockSummary, estimateWorkout } from '../engine/phases';
import { cap, fmtClock, fmtDuration, monthName, startOfWeek } from '../lib/format';
import { go, useQuery } from '../lib/router';
import { Empty, Segmented } from '../ui/kit';
import { IconPlus, IconSearch, IconStar, IconStarFill } from '../ui/icons';
import type { SessionLog, Workout } from '../data/types';

type Tab = 'mes' | 'historique' | 'wod';

function WorkoutItem({ w, star }: { w: Workout; star?: boolean }) {
  return (
    <div className="item" style={{ padding: 0, overflow: 'hidden' }}>
      <a href={`#/seance/${w.id}`} className="item" style={{ border: 'none', borderRadius: 0, flex: 1, minWidth: 0 }}>
        <div className="item-main">
          <span className="item-title">{w.name}</span>
          <span className="item-sub">{w.blocks.map(blockSummary).join(' · ')}{w.tags.length ? ` · ${w.tags.join(', ')}` : ''}</span>
        </div>
        <span className="item-end">{fmtClock(estimateWorkout(w))}</span>
      </a>
      {star && (
        <button className="mini-btn" style={{ marginRight: 10, color: w.favorite ? 'var(--accent)' : undefined }} aria-label={w.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} aria-pressed={w.favorite} onClick={() => void saveWorkout({ ...w, favorite: !w.favorite })}>
          {w.favorite ? <IconStarFill size={18} /> : <IconStar size={18} />}
        </button>
      )}
    </div>
  );
}

function Mine() {
  const workouts = useWorkouts();
  const [q, setQ] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [favOnly, setFavOnly] = useState(false);
  const tags = useMemo(() => [...new Set((workouts ?? []).flatMap((w) => w.tags))].sort(), [workouts]);
  const list = (workouts ?? [])
    .filter((w) => (!favOnly || w.favorite) && (!tag || w.tags.includes(tag)) && (!q || `${w.name} ${w.description ?? ''} ${w.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt - a.updatedAt);

  return (
    <>
      <div className="search">
        <IconSearch size={18} />
        <input type="search" placeholder="Rechercher une séance" aria-label="Rechercher" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="chips">
        <button className="chip" aria-pressed={favOnly} onClick={() => setFavOnly(!favOnly)}>★ Favoris</button>
        {tags.map((t) => <button key={t} className="chip" aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)}>{t}</button>)}
      </div>
      {workouts && !workouts.length ? (
        <Empty>Pas encore de séance. Crée la tienne ou pars d’un WOD connu.</Empty>
      ) : list.length ? (
        <div className="list">{list.map((w) => <WorkoutItem key={w.id} w={w} star />)}</div>
      ) : (
        workouts && <Empty>Aucune séance ne correspond.</Empty>
      )}
      <button className="fab" onClick={() => go('/editer/nouvelle')}><IconPlus size={18} />Nouvelle séance</button>
    </>
  );
}

export function historyStats(logs: SessionLog[], now = new Date()) {
  const weekStart = startOfWeek(now).getTime();
  const thisWeek = logs.filter((l) => l.startedAt >= weekStart);
  const first = logs.length ? Math.min(...logs.map((l) => l.startedAt)) : now.getTime();
  const weeks = Math.max(1, Math.ceil((now.getTime() - startOfWeek(new Date(first)).getTime()) / (7 * 86400_000)));
  return {
    weekCount: thisWeek.length,
    weekTime: thisWeek.reduce((t, l) => t + l.durationSec, 0),
    total: logs.length,
    totalTime: logs.reduce((t, l) => t + l.durationSec, 0),
    perWeek: logs.length / weeks,
    streak: activeWeekStreak(logs.map((l) => new Date(l.startedAt)), now),
  };
}

function History() {
  const logs = useLogs();
  if (!logs) return null;
  const st = historyStats(logs);
  const groups = new Map<string, SessionLog[]>();
  for (const l of logs) {
    const d = new Date(l.startedAt);
    const k = `${cap(monthName(d.getMonth()))} ${d.getFullYear()}`;
    groups.set(k, [...(groups.get(k) ?? []), l]);
  }
  return (
    <>
      <div className="stats">
        <div className="stat"><b>{st.weekCount}</b><span>cette semaine</span></div>
        <div className="stat"><b>{fmtDuration(st.weekTime)}</b><span>d’effort cette semaine</span></div>
        <div className="stat"><b>{st.streak}</b><span>semaine{st.streak > 1 ? 's' : ''} active{st.streak > 1 ? 's' : ''} de suite</span></div>
        <div className="stat"><b>{st.perWeek.toFixed(1).replace('.', ',')}</b><span>séances / semaine</span></div>
        <div className="stat"><b>{fmtDuration(st.totalTime)}</b><span>au total ({st.total})</span></div>
      </div>
      <button className="btn secondary" onClick={() => go('/saisie')}><IconPlus size={16} />Saisir une séance faite sans l’app</button>
      {!logs.length && <Empty>Les séances enregistrées apparaîtront ici.</Empty>}
      {[...groups].map(([k, list]) => (
        <section key={k} className="section">
          <h2 className="section-title">{k}</h2>
          <div className="list">
            {list.map((l) => {
              const d = new Date(l.startedAt);
              return (
                <a key={l.id} className="item" href={`#/historique/${l.id}`}>
                  <div className="item-main">
                    <span className="item-title">{l.workoutName}</span>
                    <span className="item-sub">
                      {d.getDate()} {monthName(d.getMonth())} · {d.toTimeString().slice(0, 5)}{l.rpe ? ` · RPE ${l.rpe}` : ''}{l.manual ? ' · saisie' : ''}
                    </span>
                  </div>
                  <span className="item-end">{fmtClock(l.durationSec)}</span>
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}

function Wods() {
  const list = useMemo(() => knownWods(), []);
  return (
    <>
      <p className="hint" style={{ margin: 0 }}>Des séances célèbres, prêtes à lancer ou à copier dans tes séances pour les adapter.</p>
      <div className="list">{list.map((w) => <WorkoutItem key={w.id} w={w} />)}</div>
    </>
  );
}

export function Library() {
  const q = useQuery();
  const tab = (['mes', 'historique', 'wod'].includes(q.get('tab') ?? '') ? q.get('tab') : 'mes') as Tab;
  return (
    <main className="screen">
      <div className="page-head"><h1 className="page-title">Séances</h1></div>
      <Segmented<Tab>
        label="Sections"
        value={tab}
        onChange={(t) => go(`/seances?tab=${t}`, true)}
        options={[{ value: 'mes', label: 'Mes séances' }, { value: 'historique', label: 'Historique' }, { value: 'wod', label: 'WOD connus' }]}
      />
      {tab === 'mes' && <Mine />}
      {tab === 'historique' && <History />}
      {tab === 'wod' && <Wods />}
    </main>
  );
}
