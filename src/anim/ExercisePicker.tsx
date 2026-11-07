// Choix de l'exercice animé : une liste qui s'ouvre sous le champ, en deux colonnes,
// rangée par catégorie (MI, MS, tronc, abdo), avec une miniature de chaque exercice.

import { useId, useState } from 'react';
import type { Avatar } from './avatar';
import type { ExerciseGroup, ExerciseId } from './exercises';
import { EXERCISES, EXERCISE_BY_ID, GROUP_LABELS } from './exercises';
import { FigureFrame } from './Figure';

export function ExercisePicker({ value, onChange, avatar, label = 'Exercice animé' }: {
  value: ExerciseId | null;
  onChange: (v: ExerciseId | null) => void;
  avatar: Avatar;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const pick = (v: ExerciseId | null) => {
    onChange(v);
    setOpen(false);
  };
  return (
    <div className="ex-picker">
      <button
        type="button" className="ex-picker-btn" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <span>{value ? EXERCISE_BY_ID[value].label : 'D’après le commentaire'}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : undefined }}>
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="ex-picker-list" id={id} role="listbox" aria-label={label}>
          <button type="button" role="option" aria-selected={!value} className="ex-opt wide" onClick={() => pick(null)}>
            D’après le commentaire
          </button>
          {(Object.keys(GROUP_LABELS) as ExerciseGroup[]).map((g) => (
            <div key={g} className="ex-picker-group">
              <span className="ex-picker-head">{GROUP_LABELS[g]}</span>
              <div className="ex-picker-grid">
                {EXERCISES.filter((x) => x.group === g).sort((a, b) => a.label.localeCompare(b.label, 'fr')).map((x) => (
                  <button key={x.id} type="button" role="option" aria-selected={x.id === value} className="ex-opt" onClick={() => pick(x.id)}>
                    <span className="ex-opt-thumb" aria-hidden="true">
                      <FigureFrame exercise={x.id} avatar={avatar} sec={x.period / 2} />
                    </span>
                    <span className="ex-opt-name">{x.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
