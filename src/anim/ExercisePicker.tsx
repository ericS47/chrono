// Choix de l'exercice animé : une liste qui s'ouvre sous le champ, filtrée en deux temps
// (position : debout ou chaise, puis matériel : sans matériel, kettlebell, élastique, haltères), en deux colonnes, rangée par catégorie
// avec un bandeau de couleur, et une miniature de chaque exercice.

import { useId, useState, type ReactNode } from 'react';
import type { Avatar } from './avatar';
import type { Equipment, ExerciseGroup, ExerciseId, Position } from './exercises';
import { EQUIPMENT_LABELS, EXERCISES, EXERCISE_BY_ID, GROUP_LABELS, POSITION_LABELS, equipmentOf, inGroup, positionOf } from './exercises';
import { FigureFrame } from './Figure';

/** Couleur du bandeau de chaque catégorie. */
export const GROUP_COLORS: Record<ExerciseGroup, string> = {
  mi: '#B5D98A', ms: '#9BD3F5', tronc: '#FFC93C', cardio: '#FF9F5A',
};

const ICON = { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
const EQUIPMENT_ICONS: Record<Equipment, ReactNode> = {
  // Rond barré : séance sans matériel.
  none: <svg {...ICON}><circle cx="12" cy="12" r="8" /><path d="M6.3 17.7 17.7 6.3" /></svg>,
  // Kettlebell : grosse boule pleine, anse large au-dessus.
  kettlebell: <svg {...ICON}><path d="M7.6 11.2C6.6 6.6 8.8 3.6 12 3.6s5.4 3 4.4 7.6" strokeWidth={2.3} /><circle cx="12" cy="15" r="6" fill="currentColor" stroke="none" /></svg>,
  // Élastique : tube souple entre deux poignées.
  band: <svg {...ICON}><rect x="1.8" y="7.5" width="4.4" height="7" rx="1.6" fill="currentColor" stroke="none" /><rect x="17.8" y="7.5" width="4.4" height="7" rx="1.6" fill="currentColor" stroke="none" /><path d="M6.2 11c3.2 6 8.4 6 11.6 0" strokeWidth={2.2} /></svg>,
  // Anneau de Pilates : cercle avec ses deux poignées.
  ring: <svg {...ICON}><circle cx="12" cy="12" r="7.2" strokeWidth={2.2} /><rect x="2.4" y="9.6" width="3.6" height="4.8" rx="1.2" fill="currentColor" stroke="none" /><rect x="18" y="9.6" width="3.6" height="4.8" rx="1.2" fill="currentColor" stroke="none" /></svg>,
  // Haltère : barre et deux disques.
  dumbbell: <svg {...ICON}><path d="M7 12h10" strokeWidth={2.4} /><rect x="3.2" y="7.5" width="3.8" height="9" rx="1.3" fill="currentColor" stroke="none" /><rect x="17" y="7.5" width="3.8" height="9" rx="1.3" fill="currentColor" stroke="none" /></svg>,
};

const POSITION_ICONS: Record<Position, ReactNode> = {
  // Debout : silhouette.
  standing: <svg {...ICON}><circle cx="12" cy="4.6" r="2.1" fill="currentColor" stroke="none" /><path d="M12 7.6v7.2M12 14.8l-3 6M12 14.8l3 6M7.5 10.6h9" strokeWidth={2.2} /></svg>,
  // Chaise de profil.
  chair: <svg {...ICON}><path d="M7 3.5v17M7 13h10.5M17.5 13v7.5M7 13" strokeWidth={2.2} /><path d="M6.2 12.8h12" strokeWidth={2.6} /></svg>,
};

export function ExercisePicker({ value, onChange, avatar, label = 'Exercice animé' }: {
  value: ExerciseId | null;
  onChange: (v: ExerciseId | null) => void;
  avatar: Avatar;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  // Embranchement : position (debout par défaut), puis matériel (sans matériel par défaut).
  // À l'ouverture, ceux de l'exercice déjà choisi.
  const [pos, setPos] = useState<Position>(value ? positionOf(EXERCISE_BY_ID[value]) : 'standing');
  const [equip, setEquip] = useState<Equipment>(value ? equipmentOf(EXERCISE_BY_ID[value]) : 'none');
  const id = useId();
  const pick = (v: ExerciseId | null) => {
    onChange(v);
    setOpen(false);
  };
  const list = EXERCISES.filter((x) => positionOf(x) === pos && equipmentOf(x) === equip);
  return (
    <div className="ex-picker">
      <button
        type="button" className="ex-picker-btn" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <span>{value ? EXERCISE_BY_ID[value].label : 'Exercices'}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : undefined }}>
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="ex-picker-list" id={id}>
          <div className="ex-pos" role="radiogroup" aria-label="Position">
            {(Object.keys(POSITION_LABELS) as Position[]).map((k) => (
              <button
                key={k} type="button" role="radio" aria-checked={k === pos} aria-label={POSITION_LABELS[k]}
                className="ex-pos-btn" onClick={() => setPos(k)}
              >
                {POSITION_ICONS[k]}
                <span>{POSITION_LABELS[k]}</span>
              </button>
            ))}
          </div>
          <div className="ex-equip" role="radiogroup" aria-label="Matériel">
            {(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map((k) => (
              <button
                key={k} type="button" role="radio" aria-checked={k === equip} aria-label={EQUIPMENT_LABELS[k]} title={EQUIPMENT_LABELS[k]}
                className="ex-equip-btn" onClick={() => setEquip(k)}
              >
                {EQUIPMENT_ICONS[k]}
                <span>{EQUIPMENT_LABELS[k]}</span>
              </button>
            ))}
          </div>
          <div role="listbox" aria-label={label} className="ex-picker-options">
            <button type="button" role="option" aria-selected={!value} className="ex-opt wide" onClick={() => pick(null)}>
              Aucun exercice
            </button>
            {!list.length && <p className="hint ex-empty">Pas encore d’exercice {pos === 'chair' ? 'sur chaise' : 'debout'} avec ce matériel.</p>}
            {(Object.keys(GROUP_LABELS) as ExerciseGroup[]).map((g) => {
              const items = list.filter((x) => inGroup(x, g)).sort((a, b) => a.label.localeCompare(b.label, 'fr'));
              if (!items.length) return null;
              return (
                <div key={g} className="ex-picker-group">
                  <span className="ex-picker-head" style={{ background: GROUP_COLORS[g] }}>{GROUP_LABELS[g]}</span>
                  <div className="ex-picker-grid">
                    {items.map((x) => (
                      <button key={x.id} type="button" role="option" aria-selected={x.id === value} className="ex-opt" onClick={() => pick(x.id)}>
                        <span className="ex-opt-thumb" aria-hidden="true">
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
        </div>
      )}
    </div>
  );
}
