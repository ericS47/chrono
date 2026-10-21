import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, deleteWorkout, saveWorkout } from '../data/db';
import { useSettings, useWorkout } from '../data/hooks';
import { copyWorkout, knownWods } from '../data/wods';
import { shareUrl } from '../data/share';
import { MODE_COLORS, type Block, type SessionLog, type Workout } from '../data/types';
import { blockSummary, estimateBlock, estimateWorkout } from '../engine/phases';
import { fmtClock, fmtDuration, fmtLongDate, fmtShort } from '../lib/format';
import { launchWorkout } from '../lib/launch';
import { go } from '../lib/router';
import { Chip, Empty, Sheet, TopBar } from '../ui/kit';
import { IconCalendar, IconCopy, IconEdit, IconPlay, IconShare, IconStar, IconStarFill, IconTrash } from '../ui/icons';

function blockLines(b: Block): string[] {
  const p = b.params;
  if (b.mode === 'strength') return (p.lifts ?? []).map((l) => `${l.name} : ${l.sets} × ${l.reps}${l.load ? ` · ${l.load}` : ''} · repos ${fmtShort(l.rest)}`);
  if (b.mode === 'custom') return (p.steps ?? []).map((s) => `${s.name || (s.kind === 'rest' ? 'Repos' : 'Effort')} · ${fmtShort(s.duration)}`);
  if (b.mode === 'run') return (p.segments ?? []).map((s) => `${s.name} · ${fmtShort(s.duration)}${s.pace ? ` · ${s.pace}` : ''}`);
  return b.exercises.filter((e) => e.name.trim()).map((e) => [e.reps, e.name].filter(Boolean).join(' ') + (e.load ? ` · ${e.load}` : ''));
}

function score(l: SessionLog, w: Workout): string {
  const parts: string[] = [];
  w.blocks.forEach((b, i) => {
    const r = l.results.find((x) => x.blockIndex === i);
    if (!r) return;
    if (b.mode === 'fortime' && r.timeSec) parts.push(fmtClock(r.timeSec));
    if (b.mode === 'amrap' && (r.rounds || r.reps)) parts.push(`${r.rounds ?? 0} tours${r.reps ? ` + ${r.reps}` : ''}`);
  });
  return parts.join(' · ') || fmtClock(l.durationSec);
}

function ShareSheet({ w, onClose }: { w: Workout; onClose: () => void }) {
  const url = useMemo(() => shareUrl(w, window.location.href), [w]);
  const [qr, setQr] = useState<string>('');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 560, errorCorrectionLevel: 'L' }).then(setQr).catch(() => setQr(''));
  }, [url]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <Sheet title="Partager la séance" onClose={onClose}>
      <p className="hint" style={{ margin: 0 }}>Scanne ce QR code ou envoie le lien : la séance s’ouvre dans Chrono sur l’autre téléphone, sans compte ni serveur.</p>
      {qr ? <div className="qr"><img src={qr} alt="QR code de la séance" /></div> : <p className="hint">Séance trop longue pour un QR code : utilise le lien.</p>}
      <div className="code-box">{url}</div>
      <div className="btn-row">
        <button className="btn" onClick={() => void copy()}>{copied ? 'Lien copié' : 'Copier le lien'}</button>
        {'share' in navigator && (
          <button className="btn secondary" onClick={() => void navigator.share({ title: w.name, text: `Séance « ${w.name} » pour Chrono`, url }).catch(() => undefined)}>Envoyer…</button>
        )}
      </div>
    </Sheet>
  );
}

export function WorkoutDetail({ id }: { id?: string }) {
  const stored = useWorkout(id);
  const wod = useMemo(() => (id?.startsWith('wod-') ? knownWods().find((w) => w.id === id) : undefined), [id]);
  const w = wod ?? stored;
  const settings = useSettings();
  const [sharing, setSharing] = useState(false);
  const logs = useLiveQuery(() => (id ? db.logs.where('workoutId').equals(id).reverse().sortBy('startedAt') : []), [id]);

  if (w === undefined) return null;
  if (w === null) {
    return (
      <main className="screen no-nav">
        <TopBar title="Séance" />
        <Empty>Cette séance n’existe plus.</Empty>
      </main>
    );
  }

  const isWod = !!wod;
  const duplicate = async () => {
    const c = copyWorkout(w, isWod ? w.name : `${w.name} (copie)`);
    await saveWorkout(c);
    go(`/seance/${c.id}`, true);
  };
  const remove = async () => {
    if (!window.confirm(`Supprimer « ${w.name} » ? L’historique est conservé.`)) return;
    await deleteWorkout(w.id);
    go('/seances', true);
  };

  return (
    <main className="screen no-nav">
      <TopBar
        title={w.name}
        right={!isWod && (
          <button className="icon-btn" aria-label={w.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} aria-pressed={w.favorite} onClick={() => void saveWorkout({ ...w, favorite: !w.favorite })}>
            {w.favorite ? <IconStarFill size={20} style={{ color: 'var(--accent)' }} /> : <IconStar size={20} />}
          </button>
        )}
      />
      {w.description && <p style={{ margin: 0 }}>{w.description}</p>}
      <div className="chips">
        <Chip tone="accent">{fmtDuration(estimateWorkout(w))}</Chip>
        <Chip>Préparation {w.prepSeconds ?? settings.prepSeconds} s</Chip>
        {w.tags.map((t) => <Chip key={t}>{t}</Chip>)}
      </div>

      <button className="btn block" onClick={() => launchWorkout(w, settings)}><IconPlay size={16} />Démarrer</button>

      <section className="section">
        <h2 className="section-title">Blocs</h2>
        <div className="list">
          {w.blocks.map((b, i) => (
            <div key={b.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="dot" style={{ background: MODE_COLORS[b.mode], width: 12, height: 12, borderRadius: 6 }} />
                <b style={{ flex: 1 }}>{i + 1}. {blockSummary(b)}</b>
                <span className="hint num">{fmtClock(estimateBlock(b))}</span>
              </div>
              {blockLines(b).map((line, j) => <span key={j} style={{ fontSize: 14 }}>{line}</span>)}
              {b.restAfter > 0 && i < w.blocks.length - 1 && <span className="hint">Puis repos {fmtShort(b.restAfter)}</span>}
            </div>
          ))}
        </div>
      </section>

      <div className="btn-row">
        {isWod ? (
          <button className="btn secondary" onClick={() => void duplicate()}><IconCopy size={18} />Copier dans mes séances</button>
        ) : (
          <>
            <button className="btn secondary" onClick={() => go(`/editer/${w.id}`)}><IconEdit size={18} />Modifier</button>
            <button className="btn secondary" onClick={() => go(`/planifier?workout=${w.id}`)}><IconCalendar size={18} />Planifier</button>
          </>
        )}
      </div>
      <div className="btn-row">
        <button className="btn secondary small" onClick={() => setSharing(true)}><IconShare size={16} />Partager</button>
        {!isWod && <button className="btn secondary small" onClick={() => void duplicate()}><IconCopy size={16} />Dupliquer</button>}
        {!isWod && <button className="btn danger small" onClick={() => void remove()}><IconTrash size={16} />Supprimer</button>}
      </div>

      {!isWod && logs && logs.length > 0 && (
        <section className="section">
          <h2 className="section-title">Mes résultats ({logs.length})</h2>
          <div className="list">
            {logs.map((l) => (
              <a key={l.id} className="item" href={`#/historique/${l.id}`}>
                <div className="item-main">
                  <span className="item-title">{fmtLongDate(new Date(l.startedAt))}</span>
                  <span className="item-sub">{l.rpe ? `RPE ${l.rpe}` : 'Sans RPE'}{l.note ? ` · ${l.note}` : ''}</span>
                </div>
                <span className="item-end">{score(l, l.snapshot ?? w)}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {sharing && <ShareSheet w={w} onClose={() => setSharing(false)} />}
    </main>
  );
}
