import { useState } from 'react';
import { saveSettings } from '../data/db';
import { useSettings } from '../data/hooks';
import type { Avatar } from '../anim/avatar';
import {
  AGE_LABELS, BOTTOM_COLORS, BUILD_LABELS, HAIR_COLORS, HEIGHT_LABELS, SKIN_TONES, TOP_COLORS,
} from '../anim/avatar';
import type { ExerciseId } from '../anim/exercises';
import { EXERCISES, GROUP_LABELS, type ExerciseGroup } from '../anim/exercises';
import { ExerciseFigure } from '../anim/Figure';
import { Segmented, Toggle, TopBar } from '../ui/kit';

function Swatches({ label, colors, value, onChange }: {
  label: string; colors: { color: string; label: string }[]; value: string; onChange: (c: string) => void;
}) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="swatches" role="radiogroup" aria-label={label}>
        {colors.map((c) => (
          <button
            key={c.color} role="radio" aria-checked={c.color === value} aria-label={c.label} title={c.label}
            className="swatch" style={{ background: c.color }} onClick={() => onChange(c.color)}
          />
        ))}
      </div>
    </div>
  );
}

const opts = <T extends string>(labels: Record<T, string>) => (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));

/** Réglages › Animation des exercices : l'avatar qui montre les mouvements. */
export function AvatarScreen() {
  const s = useSettings();
  const av = s.anim.avatar;
  const [ex, setEx] = useState<ExerciseId>('squat');
  const set = (p: Partial<Avatar>) => void saveSettings({ ...s, anim: { ...s.anim, avatar: { ...av, ...p } } });

  return (
    <main className="screen no-nav">
      <TopBar title="Animation des exercices" />

      <div className="avatar-preview">
        <ExerciseFigure exercise={ex} avatar={av} />
      </div>
      {(Object.keys(GROUP_LABELS) as ExerciseGroup[]).map((g) => (
        <div key={g} className="ex-group">
          <span className="field-label">{GROUP_LABELS[g]}</span>
          <div className="chips" role="group" aria-label={`Exercice de l’aperçu : ${GROUP_LABELS[g]}`}>
            {EXERCISES.filter((e) => e.group === g).sort((a, b) => a.label.localeCompare(b.label, 'fr')).map((e) => (
              <button key={e.id} className="chip" aria-pressed={e.id === ex} onClick={() => setEx(e.id)}>{e.label}</button>
            ))}
          </div>
        </div>
      ))}

      <div className="form">
        <Toggle
          label="Afficher pendant la séance"
          hint="Pendant l’effort, l’avatar montre l’exercice à côté du chrono ; il disparaît au repos. L’exercice est reconnu d’après son nom, ou choisi dans le créateur."
          checked={s.anim.enabled}
          onChange={(v) => void saveSettings({ ...s, anim: { ...s.anim, enabled: v } })}
        />
      </div>

      <section className="section">
        <h2 className="section-title">Mon avatar</h2>
        <div className="form">
          <div className="field">
            <span className="field-label">Sexe</span>
            <Segmented label="Sexe" value={av.sex} onChange={(v) => set({ sex: v })} options={[{ value: 'f', label: 'Femme' }, { value: 'm', label: 'Homme' }]} />
          </div>
          <Swatches label="Carnation" colors={SKIN_TONES} value={SKIN_TONES[av.skin]?.color} onChange={(c) => set({ skin: SKIN_TONES.findIndex((x) => x.color === c) })} />
          <div className="field">
            <span className="field-label">Morphologie</span>
            <Segmented label="Morphologie" value={av.build} onChange={(v) => set({ build: v })} options={opts(BUILD_LABELS)} />
          </div>
          <div className="field">
            <span className="field-label">Âge</span>
            <Segmented label="Âge" value={av.age} onChange={(v) => set({ age: v })} options={opts(AGE_LABELS)} />
          </div>
          <div className="field">
            <span className="field-label">Taille</span>
            <Segmented label="Taille" value={av.height} onChange={(v) => set({ height: v })} options={opts(HEIGHT_LABELS)} />
          </div>
          <Swatches label="Cheveux" colors={HAIR_COLORS} value={av.hair} onChange={(c) => set({ hair: c })} />
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Tenue</h2>
        <div className="form">
          <Swatches label="Haut" colors={TOP_COLORS} value={av.top} onChange={(c) => set({ top: c })} />
          <Swatches label="Bas" colors={BOTTOM_COLORS} value={av.bottom} onChange={(c) => set({ bottom: c })} />
          <div className="field">
            <span className="field-label">Coupe</span>
            <Segmented label="Coupe du bas" value={av.bottomType} onChange={(v) => set({ bottomType: v })} options={[{ value: 'legging', label: 'Legging' }, { value: 'short', label: 'Short' }]} />
          </div>
        </div>
      </section>
    </main>
  );
}
