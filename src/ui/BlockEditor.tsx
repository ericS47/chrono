import { useEffect, useState } from 'react';
import type { Block, BlockParams, CustomStep, Exercise, RunSegment, StrengthExercise } from '../data/types';
import { DurationField, Stepper, Toggle } from './kit';
import { IconPlus, IconTrash } from './icons';
import { fmtClock } from '../lib/format';

/** Petite saisie m:ss pour les listes. */
function MiniDuration({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [text, setText] = useState(fmtClock(value));
  useEffect(() => {
    setText(fmtClock(value));
  }, [value]);
  const commit = () => {
    const parts = text.trim().split(':').map(Number);
    if (parts.some((p) => Number.isNaN(p))) return setText(fmtClock(value));
    onChange(Math.max(0, Math.round(parts.reduce((t, p) => t * 60 + p, 0))));
  };
  return <input type="text" aria-label={label} inputMode="numeric" value={text} onChange={(e) => setText(e.target.value)} onBlur={commit} />;
}

function ExerciseList({ list, onChange }: { list: Exercise[]; onChange: (l: Exercise[]) => void }) {
  const set = (i: number, patch: Partial<Exercise>) => onChange(list.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  return (
    <div className="sub-list">
      <span className="field-label">Exercices</span>
      {list.map((e, i) => (
        <div key={i} className="sub-row three">
          <input type="text" aria-label="Exercice" placeholder="Exercice" value={e.name} onChange={(ev) => set(i, { name: ev.target.value })} />
          <input type="text" aria-label="Répétitions" placeholder="Reps" value={e.reps ?? ''} onChange={(ev) => set(i, { reps: ev.target.value })} />
          <input type="text" aria-label="Charge" placeholder="Charge" value={e.load ?? ''} onChange={(ev) => set(i, { load: ev.target.value })} />
          <button type="button" className="mini-btn" aria-label="Supprimer l’exercice" onClick={() => onChange(list.filter((_, j) => j !== i))}><IconTrash size={16} /></button>
        </div>
      ))}
      <button type="button" className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => onChange([...list, { name: '' }])}>
        + Ajouter un exercice
      </button>
    </div>
  );
}

function StepList<T extends CustomStep | RunSegment>({ list, onChange, withPace, make }: { list: T[]; onChange: (l: T[]) => void; withPace?: boolean; make: () => T }) {
  const set = (i: number, patch: Partial<T>) => onChange(list.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const c = list.slice();
    [c[i], c[j]] = [c[j], c[i]];
    onChange(c);
  };
  return (
    <div className="sub-list">
      <span className="field-label">{withPace ? 'Segments' : 'Étapes'}</span>
      {list.map((st, i) => (
        <div key={i} className="lift">
          <div className="sub-row" style={{ gridTemplateColumns: '1fr 84px' }}>
            <input type="text" aria-label="Nom" placeholder="Nom" value={st.name} onChange={(e) => set(i, { name: e.target.value } as Partial<T>)} />
            <MiniDuration label="Durée" value={st.duration} onChange={(v) => set(i, { duration: v } as Partial<T>)} />
          </div>
          <div className="sub-row" style={{ gridTemplateColumns: withPace ? '1fr 1fr auto auto auto' : '1fr auto auto auto' }}>
            <select aria-label="Type" value={st.kind} onChange={(e) => set(i, { kind: e.target.value as 'work' | 'rest' } as Partial<T>)}>
              <option value="work">Effort</option>
              <option value="rest">Repos</option>
            </select>
            {withPace && (
              <input type="text" aria-label="Allure" placeholder="Allure" value={(st as RunSegment).pace ?? ''} onChange={(e) => set(i, { pace: e.target.value } as unknown as Partial<T>)} />
            )}
            <button type="button" className="mini-btn" aria-label="Monter" onClick={() => move(i, -1)}>↑</button>
            <button type="button" className="mini-btn" aria-label="Descendre" onClick={() => move(i, 1)}>↓</button>
            <button type="button" className="mini-btn" aria-label="Supprimer" onClick={() => onChange(list.filter((_, j) => j !== i))}><IconTrash size={16} /></button>
          </div>
        </div>
      ))}
      <button type="button" className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => onChange([...list, make()])}>
        <IconPlus size={14} /> Ajouter {withPace ? 'un segment' : 'une étape'}
      </button>
    </div>
  );
}

function LiftList({ list, onChange }: { list: StrengthExercise[]; onChange: (l: StrengthExercise[]) => void }) {
  const set = (i: number, patch: Partial<StrengthExercise>) => onChange(list.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  return (
    <div className="sub-list">
      <span className="field-label">Exercices</span>
      {list.map((l, i) => (
        <div key={i} className="lift">
          <div className="sub-row">
            <input type="text" aria-label="Exercice" placeholder="Exercice" value={l.name} onChange={(e) => set(i, { name: e.target.value })} />
            <button type="button" className="mini-btn" aria-label="Supprimer l’exercice" onClick={() => onChange(list.filter((_, j) => j !== i))}><IconTrash size={16} /></button>
          </div>
          <div className="sub-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
            <label className="hint">Séries<input type="number" min={1} max={20} value={l.sets} onChange={(e) => set(i, { sets: Math.max(1, Number(e.target.value) || 1) })} /></label>
            <label className="hint">Reps<input type="text" value={l.reps} onChange={(e) => set(i, { reps: e.target.value })} /></label>
            <label className="hint">Charge<input type="text" value={l.load ?? ''} placeholder="kg" onChange={(e) => set(i, { load: e.target.value })} /></label>
            <label className="hint">Repos<MiniDuration label="Repos" value={l.rest} onChange={(v) => set(i, { rest: v })} /></label>
          </div>
        </div>
      ))}
      <button type="button" className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => onChange([...list, { name: '', sets: 3, reps: '10', load: '', rest: 90 }])}>
        + Ajouter un exercice
      </button>
    </div>
  );
}

/** Réglages d'un bloc selon son mode. */
export function BlockFields({ block, onChange, showRestAfter }: { block: Block; onChange: (b: Block) => void; showRestAfter?: boolean }) {
  const p = block.params;
  const setP = (patch: Partial<BlockParams>) => onChange({ ...block, params: { ...p, ...patch } });
  const fields: JSX.Element[] = [];

  switch (block.mode) {
    case 'amrap':
      fields.push(<DurationField key="d" label="Durée" value={p.duration ?? 720} step={30} min={30} onChange={(v) => setP({ duration: v })} />);
      break;
    case 'fortime':
      fields.push(<DurationField key="d" label="Time cap" hint="0:00 = sans limite" value={p.duration ?? 0} step={60} onChange={(v) => setP({ duration: v })} />);
      break;
    case 'countdown':
      fields.push(<DurationField key="d" label="Durée" value={p.duration ?? 300} step={30} min={5} onChange={(v) => setP({ duration: v })} />);
      break;
    case 'emom':
      fields.push(
        <DurationField key="i" label="Intervalle" hint="1:00 = EMOM, 2:00 = E2MOM" value={p.interval ?? 60} step={15} min={10} onChange={(v) => setP({ interval: v })} />,
        <Stepper key="r" label="Tours" value={p.rounds ?? 10} min={1} max={99} onChange={(v) => setP({ rounds: v })} />,
        <Toggle key="rot" label="Un exercice différent à chaque tour" checked={p.rotate !== false} onChange={(v) => setP({ rotate: v })} />,
      );
      break;
    case 'tabata':
    case 'interval':
      fields.push(
        <DurationField key="w" label="Travail" value={p.work ?? 20} step={5} min={5} onChange={(v) => setP({ work: v })} />,
        <DurationField key="re" label="Repos" value={p.rest ?? 10} step={5} onChange={(v) => setP({ rest: v })} />,
        <Stepper key="r" label="Tours" value={p.rounds ?? 8} min={1} max={99} onChange={(v) => setP({ rounds: v })} />,
        <Stepper key="s" label="Séries" value={p.sets ?? 1} min={1} max={20} onChange={(v) => setP({ sets: v })} />,
      );
      if ((p.sets ?? 1) > 1) fields.push(<DurationField key="sr" label="Repos entre séries" value={p.setRest ?? 60} step={15} onChange={(v) => setP({ setRest: v })} />);
      fields.push(<Toggle key="rot" label="Un exercice différent à chaque tour" checked={p.rotate !== false} onChange={(v) => setP({ rotate: v })} />);
      break;
    case 'custom':
      fields.push(
        <StepList<CustomStep> key="st" list={p.steps ?? []} onChange={(l) => setP({ steps: l })} make={() => ({ name: '', duration: 30, kind: 'work' })} />,
        <Stepper key="rep" label="Répétitions" value={p.repeats ?? 1} min={1} max={50} onChange={(v) => setP({ repeats: v })} />,
      );
      break;
    case 'strength':
      fields.push(<LiftList key="l" list={p.lifts ?? []} onChange={(l) => setP({ lifts: l })} />);
      break;
    case 'run':
      fields.push(
        <StepList<RunSegment> key="sg" withPace list={p.segments ?? []} onChange={(l) => setP({ segments: l })} make={() => ({ name: '', duration: 60, kind: 'work', pace: '' })} />,
        <Stepper key="rep" label="Répétitions" value={p.repeats ?? 1} min={1} max={50} onChange={(v) => setP({ repeats: v })} />,
      );
      break;
    case 'stopwatch':
      fields.push(<div key="n" className="row"><span className="hint">Chronomètre libre, avec tours intermédiaires.</span></div>);
      break;
  }

  if (!['custom', 'strength', 'run'].includes(block.mode)) {
    fields.push(<ExerciseList key="ex" list={block.exercises} onChange={(l) => onChange({ ...block, exercises: l })} />);
  }
  if (showRestAfter) {
    fields.push(<DurationField key="ra" label="Repos après le bloc" value={block.restAfter} step={15} onChange={(v) => onChange({ ...block, restAfter: v })} />);
  }
  return <>{fields}</>;
}
