import { useMemo } from 'react';
import { decodeWorkout } from '../data/share';
import { saveWorkout } from '../data/db';
import { useSettings } from '../data/hooks';
import { blockSummary, estimateWorkout } from '../engine/phases';
import { fmtDuration } from '../lib/format';
import { launchWorkout } from '../lib/launch';
import { go } from '../lib/router';
import { Empty, TopBar } from '../ui/kit';

export function ImportShared({ code }: { code?: string }) {
  const settings = useSettings();
  const w = useMemo(() => {
    try {
      return code ? decodeWorkout(code) : null;
    } catch {
      return null;
    }
  }, [code]);

  if (!w) {
    return (
      <main className="screen no-nav">
        <TopBar title="Séance partagée" onBack={() => go('/', true)} />
        <Empty>Ce lien de séance est invalide ou incomplet.</Empty>
      </main>
    );
  }

  return (
    <main className="screen no-nav">
      <TopBar title="Séance partagée" onBack={() => go('/', true)} />
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <b style={{ fontSize: 22 }}>{w.name}</b>
        {w.description && <span>{w.description}</span>}
        <span className="hint">{fmtDuration(estimateWorkout(w))} · {w.blocks.map(blockSummary).join(' · ')}</span>
      </div>
      <button className="btn" onClick={() => void saveWorkout(w).then(() => go(`/seance/${w.id}`, true))}>Ajouter à mes séances</button>
      <button className="btn secondary" onClick={() => launchWorkout(w, settings, { quick: true })}>Lancer sans l’ajouter</button>
    </main>
  );
}
