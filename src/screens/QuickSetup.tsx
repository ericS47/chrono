import { useState } from 'react';
import { ALL_MODES, MODE_COLORS, MODE_LABELS, type Block, type Mode, type Workout } from '../data/types';
import { defaultBlock } from '../data/defaults';
import { useSettings } from '../data/hooks';
import { saveWorkout } from '../data/db';
import { estimateWorkout } from '../engine/phases';
import { fmtClock, uid } from '../lib/format';
import { launchWorkout } from '../lib/launch';
import { go } from '../lib/router';
import { BlockFields } from '../ui/BlockEditor';
import { Stepper, TopBar } from '../ui/kit';
import { IconPlay } from '../ui/icons';

const KEY = 'chrono.quick.';

function loadBlock(mode: Mode): Block {
  try {
    const raw = localStorage.getItem(KEY + mode);
    if (raw) return { ...defaultBlock(mode), ...JSON.parse(raw), id: uid(), mode };
  } catch {
    /* stockage indisponible */
  }
  return defaultBlock(mode);
}

export function QuickSetup({ mode: raw }: { mode?: string }) {
  const mode = (ALL_MODES.includes(raw as Mode) ? raw : 'amrap') as Mode;
  const settings = useSettings();
  const [block, setBlock] = useState<Block>(() => loadBlock(mode));
  const [prep, setPrep] = useState<number | null>(null);
  const prepSeconds = prep ?? settings.prepSeconds;

  const workout = (): Workout => ({
    id: 'rapide', name: MODE_LABELS[mode], tags: [], favorite: false, blocks: [block], prepSeconds, createdAt: Date.now(), updatedAt: Date.now(),
  });

  const start = () => {
    try {
      localStorage.setItem(KEY + mode, JSON.stringify({ params: block.params, exercises: block.exercises }));
    } catch {
      /* ignoré */
    }
    launchWorkout(workout(), settings, { quick: true, prepSeconds });
  };

  const saveAs = async () => {
    const name = window.prompt('Nom de la séance', MODE_LABELS[mode]);
    if (!name) return;
    const w = { ...workout(), id: uid(), name, blocks: [{ ...block, id: uid() }] };
    await saveWorkout(w);
    go(`/seance/${w.id}`, true);
  };

  return (
    <main className="screen no-nav">
      <TopBar title={MODE_LABELS[mode]} right={<span className="dot" style={{ width: 16, height: 16, borderRadius: 8, background: MODE_COLORS[mode] }} />} />
      <div className="form">
        <BlockFields block={block} onChange={setBlock} />
        <Stepper label="Préparation" hint="Décompte avant le départ" value={prepSeconds} min={0} max={60} step={5} format={(v) => `${v} s`} onChange={setPrep} />
      </div>
      <p className="hint" style={{ margin: 0 }}>Durée estimée : {fmtClock(estimateWorkout({ blocks: [block] }))}</p>
      <button className="btn block" onClick={start}><IconPlay size={16} />Démarrer</button>
      <button className="btn secondary block" onClick={() => void saveAs()}>Enregistrer comme séance</button>
    </main>
  );
}
