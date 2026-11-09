// Réglages d'exercices communs aux jeux : répétitions, position, matériel,
// exercices aléatoires ou choisis. Retenus d'une partie à l'autre (sur cet appareil).

import { useState } from 'react';
import { useSettings } from '../data/hooks';
import { Segmented, Stepper } from '../ui/kit';
import { FigureFrame } from '../anim/Figure';
import { EQUIPMENT_ICONS, GROUP_COLORS, POSITION_ICONS } from '../anim/ExercisePicker';
import type { Equipment, ExerciseGroup, ExerciseId, Position } from '../anim/exercises';
import { EQUIPMENT_LABELS, EXERCISES, GROUP_LABELS, POSITION_LABELS, equipmentOf, inGroup, inPosition, isExerciseId } from '../anim/exercises';

export interface ExSetup {
  reps: number;
  mode: 'random' | 'chosen';
  position: Position;
  equipment: Equipment[];
  chosen: ExerciseId[];
}

const DEFAULT_SETUP: ExSetup = { reps: 10, mode: 'random', position: 'standing', equipment: ['none'], chosen: [] };

function load<T extends ExSetup>(key: string, defaults: T): T {
  try {
    const s = JSON.parse(localStorage.getItem(key) ?? 'null') as Partial<T> | null;
    if (!s) return defaults;
    return {
      ...defaults,
      ...s,
      equipment: (s.equipment ?? defaults.equipment).filter((e) => e in EQUIPMENT_LABELS),
      chosen: (s.chosen ?? []).filter((id) => isExerciseId(id)),
    };
  } catch {
    return defaults;
  }
}

/** Réglages d'un jeu, retenus sous la clé donnée. */
export function useGameSetup<T extends ExSetup = ExSetup>(key: string, extra?: Omit<T, keyof ExSetup>) {
  const [setup, setSetup] = useState<T>(() => load(key, { ...DEFAULT_SETUP, ...extra } as T));
  const update = (patch: Partial<T>) => {
    const next = { ...setup, ...patch };
    setSetup(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* stockage indisponible : réglages non retenus */
    }
  };
  return [setup, update] as const;
}

/** Exercices disponibles avec la position et le matériel choisis. */
export const available = (s: ExSetup) => EXERCISES.filter((x) => inPosition(x, s.position) && s.equipment.includes(equipmentOf(x)));

/** Exercices de la partie : tous les disponibles (aléatoire) ou ceux choisis. */
export function exercisePool(s: ExSetup): ExerciseId[] {
  const list = available(s).map((x) => x.id);
  return s.mode === 'chosen' ? s.chosen.filter((id) => list.includes(id)) : list;
}

export const setupReady = (s: ExSetup) => exercisePool(s).length > 0;

/** Champs des réglages. `slots` : où les exercices sont répartis (« les 10 lignes »), `max` : combien au plus. */
export function ExerciseSetupFields({ setup, update, slots, max, hideReps }: {
  setup: ExSetup;
  update: (p: Partial<ExSetup>) => void;
  slots: string;
  max: number;
  /** Le jeu règle lui-même les répétitions (ou travaille en temps). */
  hideReps?: boolean;
}) {
  const avatar = useSettings().anim.avatar;
  const list = available(setup);
  const chosen = setup.chosen.filter((id) => list.some((x) => x.id === id));
  const toggleEquip = (e: Equipment) => {
    const has = setup.equipment.includes(e);
    if (has && setup.equipment.length === 1) return;
    update({ equipment: has ? setup.equipment.filter((x) => x !== e) : [...setup.equipment, e] });
  };
  const toggleGroup = (ids: ExerciseId[], on: boolean) =>
    update({ chosen: on ? [...new Set([...setup.chosen, ...ids])] : setup.chosen.filter((x) => !ids.includes(x)) });
  const toggleEx = (id: ExerciseId) =>
    update({ chosen: setup.chosen.includes(id) ? setup.chosen.filter((x) => x !== id) : [...setup.chosen, id] });

  return (
    <>
      {!hideReps && (
        <section className="section" aria-label="Répétitions">
          <div className="card" style={{ padding: 0 }}>
            <Stepper label="Répétitions" hint="Par exercice à faire" value={setup.reps} min={1} max={100} onChange={(reps) => update({ reps })} />
          </div>
        </section>
      )}

      <section className="section">
        <h2 className="section-title">Position</h2>
        <div className="ex-pos" role="radiogroup" aria-label="Position" style={{ border: 'none', padding: 0 }}>
          {(Object.keys(POSITION_LABELS) as Position[]).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={k === setup.position} className="ex-pos-btn" onClick={() => update({ position: k })}>
              {POSITION_ICONS[k]}
              <span>{POSITION_LABELS[k]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Matériel</h2>
        <div className="ex-equip" role="group" aria-label="Matériel">
          {(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map((k) => (
            <button key={k} type="button" role="checkbox" aria-checked={setup.equipment.includes(k)} aria-label={EQUIPMENT_LABELS[k]} title={EQUIPMENT_LABELS[k]} className="ex-equip-btn" onClick={() => toggleEquip(k)}>
              {EQUIPMENT_ICONS[k]}
              <span>{EQUIPMENT_LABELS[k]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Exercices</h2>
        <Segmented
          label="Exercices"
          value={setup.mode}
          onChange={(mode) => update({ mode })}
          options={[{ value: 'random', label: 'Aléatoires' }, { value: 'chosen', label: 'Choisis' }]}
        />
        {!list.length && <p className="hint">Pas d’exercice {setup.position === 'chair' ? 'sur chaise' : 'debout'} avec ce matériel.</p>}
        {setup.mode === 'random' && list.length > 0 && (
          <p className="hint">{Math.min(list.length, max)} exercices tirés au hasard parmi {list.length}, répartis au hasard sur {slots}.</p>
        )}
        {setup.mode === 'chosen' && list.length > 0 && (
          <>
            <p className="hint">
              {chosen.length ? `${chosen.length} choisi${chosen.length > 1 ? 's' : ''}` : 'Choisis au moins un exercice'} : ils seront répartis au hasard sur {slots}.
            </p>
            <div className="ex-picker-options" role="listbox" aria-multiselectable="true" aria-label="Exercices choisis">
              {(Object.keys(GROUP_LABELS) as ExerciseGroup[]).map((g) => {
                const items = list.filter((x) => inGroup(x, g)).sort((a, b) => a.label.localeCompare(b.label, 'fr'));
                if (!items.length) return null;
                const all = items.every((x) => chosen.includes(x.id));
                return (
                  <div key={g} className="ex-picker-group" role="group" aria-label={GROUP_LABELS[g]}>
                    <div className="ex-picker-head game-group-head" style={{ background: GROUP_COLORS[g] }}>
                      <span>{GROUP_LABELS[g]}</span>
                      <button type="button" className="link-btn" onClick={() => toggleGroup(items.map((x) => x.id), !all)}>
                        {all ? 'Aucun' : 'Tous'}
                      </button>
                    </div>
                    <div className="ex-picker-grid">
                      {items.map((x) => (
                        <button key={x.id} type="button" role="option" aria-selected={chosen.includes(x.id)} className="ex-opt" onClick={() => toggleEx(x.id)}>
                          <span className="ex-opt-thumb" aria-hidden="true" style={{ background: GROUP_COLORS[x.group] }}>
                            <FigureFrame exercise={x.id} avatar={avatar} sec={x.period / 2} />
                          </span>
                          <span className="ex-opt-name">{x.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </>
  );
}
