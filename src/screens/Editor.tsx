import { useEffect, useState } from 'react';
import { db, saveWorkout } from '../data/db';
import { useSettings } from '../data/hooks';
import { defaultBlock, newWorkout, SUGGESTED_TAGS } from '../data/defaults';
import { ALL_MODES, MODE_COLORS, MODE_DESC, MODE_LABELS, type Block, type Mode, type Workout } from '../data/types';
import { blockSummary, estimateWorkout } from '../engine/phases';
import { fmtClock, uid } from '../lib/format';
import { back, go } from '../lib/router';
import { BlockFields } from '../ui/BlockEditor';
import { Sheet, Stepper, Toggle, TopBar } from '../ui/kit';
import { IconCopy, IconDown, IconPlus, IconTrash, IconUp } from '../ui/icons';

function ModePicker({ onPick, onClose }: { onPick: (m: Mode) => void; onClose: () => void }) {
  return (
    <Sheet title="Ajouter un bloc" onClose={onClose}>
      <div className="mode-grid">
        {ALL_MODES.map((m) => (
          <button key={m} className="tile" style={{ background: MODE_COLORS[m] }} onClick={() => onPick(m)}>
            <small>{MODE_DESC[m]}</small>
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

export function Editor({ id }: { id?: string }) {
  const settings = useSettings();
  const [w, setW] = useState<Workout | null>(id === 'nouvelle' || !id ? newWorkout() : null);
  const [open, setOpen] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [tagText, setTagText] = useState('');

  useEffect(() => {
    if (!id || id === 'nouvelle') return;
    void db.workouts.get(id).then((x) => setW(x ?? newWorkout()));
  }, [id]);

  useEffect(() => {
    if (w && open === null && w.blocks.length === 1 && id === 'nouvelle') setOpen(w.blocks[0].id);
  }, [w, open, id]);

  if (!w) return null;

  const patch = (p: Partial<Workout>) => setW({ ...w, ...p });
  const setBlock = (i: number, b: Block) => patch({ blocks: w.blocks.map((x, j) => (j === i ? b : x)) });
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= w.blocks.length) return;
    const list = w.blocks.slice();
    [list[i], list[j]] = [list[j], list[i]];
    patch({ blocks: list });
  };
  const addTag = (t: string) => {
    const v = t.trim();
    if (v && !w.tags.includes(v)) patch({ tags: [...w.tags, v] });
    setTagText('');
  };

  const save = async () => {
    const final = { ...w, name: w.name.trim() || 'Séance sans nom' };
    await saveWorkout(final);
    go(`/seance/${final.id}`, true);
  };

  const customSound = !!w.sound;

  return (
    <main className="screen no-nav">
      <TopBar title={id === 'nouvelle' ? 'Nouvelle séance' : 'Modifier'} onBack={() => back('/seances')} right={<button className="btn small" onClick={() => void save()}>Enregistrer</button>} />

      <div className="form">
        <div className="field">
          <label htmlFor="wname">Nom</label>
          <input id="wname" type="text" value={w.name} onChange={(e) => patch({ name: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="wdesc">Description</label>
          <textarea id="wdesc" value={w.description ?? ''} placeholder="Objectif, consignes…" onChange={(e) => patch({ description: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="wtag">Étiquettes</label>
          <div className="chips">
            {w.tags.map((t) => (
              <button key={t} className="chip" aria-pressed="true" aria-label={`Retirer ${t}`} onClick={() => patch({ tags: w.tags.filter((x) => x !== t) })}>{t} ×</button>
            ))}
            {SUGGESTED_TAGS.filter((t) => !w.tags.includes(t)).map((t) => (
              <button key={t} className="chip" onClick={() => addTag(t)}>+ {t}</button>
            ))}
          </div>
          <input id="wtag" type="text" placeholder="Autre étiquette, puis Entrée" value={tagText} onChange={(e) => setTagText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag(tagText)} onBlur={() => tagText && addTag(tagText)} />
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Blocs</h2>
          <span className="hint">Durée estimée {fmtClock(estimateWorkout(w))}</span>
        </div>
        {w.blocks.map((b, i) => (
          <div key={b.id} className="block-card">
            <div className="block-head">
              <span className="dot" style={{ background: MODE_COLORS[b.mode] }} />
              <button className="link-btn" style={{ flex: 1, textAlign: 'left', color: 'var(--ink)', padding: 0 }} aria-expanded={open === b.id} onClick={() => setOpen(open === b.id ? null : b.id)}>
                {i + 1}. {blockSummary(b)}
              </button>
              <div className="block-tools">
                <button className="icon-btn" aria-label="Monter le bloc" disabled={i === 0} onClick={() => move(i, -1)}><IconUp size={16} /></button>
                <button className="icon-btn" aria-label="Descendre le bloc" disabled={i === w.blocks.length - 1} onClick={() => move(i, 1)}><IconDown size={16} /></button>
                <button className="icon-btn" aria-label="Dupliquer le bloc" onClick={() => patch({ blocks: [...w.blocks.slice(0, i + 1), { ...structuredClone(b), id: uid() }, ...w.blocks.slice(i + 1)] })}><IconCopy size={16} /></button>
                <button className="icon-btn" aria-label="Supprimer le bloc" onClick={() => patch({ blocks: w.blocks.filter((_, j) => j !== i) })}><IconTrash size={16} /></button>
              </div>
            </div>
            {open === b.id && (
              <div className="block-body">
                <div className="field">
                  <label htmlFor={`bm${b.id}`}>Mode</label>
                  <select id={`bm${b.id}`} value={b.mode} onChange={(e) => setBlock(i, { ...defaultBlock(e.target.value as Mode), id: b.id, name: b.name, exercises: b.exercises, restAfter: b.restAfter })}>
                    {ALL_MODES.map((m) => <option key={m} value={m}>{MODE_LABELS[m]}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={`bn${b.id}`}>Nom du bloc (optionnel)</label>
                  <input id={`bn${b.id}`} type="text" placeholder="ex. Échauffement" value={b.name ?? ''} onChange={(e) => setBlock(i, { ...b, name: e.target.value })} />
                </div>
                <BlockFields block={b} onChange={(nb) => setBlock(i, nb)} showRestAfter={i < w.blocks.length - 1} />
              </div>
            )}
          </div>
        ))}
        <button className="btn secondary" onClick={() => setPicking(true)}><IconPlus size={18} />Ajouter un bloc</button>
      </section>

      <section className="section">
        <h2 className="section-title">Réglages de cette séance</h2>
        <div className="form">
          <Toggle label="Préparation personnalisée" hint={`Sinon : réglage par défaut (${settings.prepSeconds} s)`} checked={w.prepSeconds != null} onChange={(v) => patch({ prepSeconds: v ? settings.prepSeconds : null })} />
          {w.prepSeconds != null && (
            <Stepper label="Préparation" value={w.prepSeconds} min={0} max={60} step={5} format={(v) => `${v} s`} onChange={(v) => patch({ prepSeconds: v })} />
          )}
          <Toggle label="Son personnalisé" hint="ex. voix plus forte pour une séance au parc" checked={customSound} onChange={(v) => patch({ sound: v ? { master: settings.sound.master, voiceVolume: settings.sound.voiceVolume, voice: settings.sound.voice } : undefined })} />
          {customSound && (
            <>
              <div className="row">
                <label className="row-text" htmlFor="wsm">Volume général</label>
                <input id="wsm" type="range" min={0} max={1} step={0.05} value={w.sound?.master ?? settings.sound.master} onChange={(e) => patch({ sound: { ...w.sound, master: Number(e.target.value) } })} />
              </div>
              <div className="row">
                <label className="row-text" htmlFor="wsv">Volume de la voix</label>
                <input id="wsv" type="range" min={0} max={1} step={0.05} value={w.sound?.voiceVolume ?? settings.sound.voiceVolume} onChange={(e) => patch({ sound: { ...w.sound, voiceVolume: Number(e.target.value) } })} />
              </div>
              <Toggle label="Annonces vocales" checked={w.sound?.voice ?? settings.sound.voice} onChange={(v) => patch({ sound: { ...w.sound, voice: v } })} />
            </>
          )}
        </div>
      </section>

      <button className="btn block" onClick={() => void save()}>Enregistrer la séance</button>

      {picking && (
        <ModePicker
          onClose={() => setPicking(false)}
          onPick={(m) => {
            const b = defaultBlock(m);
            patch({ blocks: [...w.blocks, b] });
            setOpen(b.id);
            setPicking(false);
          }}
        />
      )}
    </main>
  );
}
