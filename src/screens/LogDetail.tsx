import { useState } from 'react';
import { db } from '../data/db';
import { useLog } from '../data/hooks';
import { blockSummary } from '../engine/phases';
import { fmtClock, fmtLongDate } from '../lib/format';
import { go } from '../lib/router';
import { Chip, Empty, TopBar } from '../ui/kit';
import { IconTrash } from '../ui/icons';

export function LogDetail({ id }: { id?: string }) {
  const log = useLog(id);
  const [note, setNote] = useState<string | null>(null);
  if (log === undefined) return null;
  if (log === null) {
    return (
      <main className="screen no-nav">
        <TopBar title="Séance" onBack={() => go('/seances?tab=historique', true)} />
        <Empty>Cette séance n’est plus dans l’historique.</Empty>
      </main>
    );
  }
  const d = new Date(log.startedAt);
  const w = log.snapshot;
  const remove = async () => {
    if (!window.confirm('Supprimer cette séance de l’historique ?')) return;
    await db.logs.delete(log.id);
    go('/seances?tab=historique', true);
  };

  return (
    <main className="screen no-nav">
      <TopBar title={log.workoutName} onBack={() => go('/seances?tab=historique', true)} />
      <div className="chips">
        <Chip tone="accent">{fmtLongDate(d)} · {d.toTimeString().slice(0, 5)}</Chip>
        {log.manual && <Chip>Saisie manuelle</Chip>}
      </div>
      <div className="stats">
        <div className="stat"><b>{fmtClock(log.durationSec)}</b><span>durée</span></div>
        {log.rpe && <div className="stat"><b>{log.rpe} / 10</b><span>ressenti</span></div>}
      </div>
      {w && (
        <section className="section">
          <h2 className="section-title">Résultats</h2>
          <div className="list">
            {w.blocks.map((b, i) => {
              const r = log.results.find((x) => x.blockIndex === i);
              const val = [
                r?.timeSec ? fmtClock(r.timeSec) : '',
                r?.rounds !== undefined && b.mode === 'amrap' ? `${r.rounds} tours${r.reps ? ` + ${r.reps} reps` : ''}` : '',
                r?.loads ?? '',
              ].filter(Boolean).join(' · ');
              return (
                <div key={b.id} className="item">
                  <div className="item-main">
                    <span className="item-title">{blockSummary(b)}</span>
                    {val && <span className="item-sub">{val}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
      <div className="form">
        <div className="field">
          <label htmlFor="lnote">Note</label>
          <textarea id="lnote" value={note ?? log.note ?? ''} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== null && void db.logs.put({ ...log, note: note.trim() || undefined })} />
        </div>
      </div>
      {log.workoutId && <button className="btn secondary" onClick={() => go(`/seance/${log.workoutId}`)}>Voir la séance et comparer</button>}
      <button className="btn danger" onClick={() => void remove()}><IconTrash size={16} />Supprimer de l’historique</button>
    </main>
  );
}
