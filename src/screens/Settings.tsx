import { useEffect, useRef, useState } from 'react';
import { exportBackup, importBackup, pruneHistory, saveSettings } from '../data/db';
import { useSettings } from '../data/hooks';
import type { Settings, SoundEvent, SoundName, SoundSettings } from '../data/types';
import { audio, SOUND_LABELS } from '../audio/audio';
import { notificationPermission, requestNotifications, requestPersistentStorage, storageInfo } from '../lib/platform';
import { Segmented, Stepper, Toggle } from '../ui/kit';

const EVENT_LABELS: Record<SoundEvent, string> = {
  start: 'Départ',
  workEnd: 'Fin de l’effort',
  restEnd: 'Fin du repos',
  countdown: 'Décompte final',
  halfway: 'Mi-temps',
  finish: 'Fin de séance',
};

function Range({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const id = label.replace(/\W/g, '');
  return (
    <div className="row">
      <label className="row-text" htmlFor={id}>{label}</label>
      <input id={id} type="range" min={0} max={1} step={0.05} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-valuetext={`${Math.round(value * 100)} %`} />
    </div>
  );
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} Ko`;
  return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
}

export function SettingsScreen() {
  const s = useSettings();
  const [info, setInfo] = useState<Awaited<ReturnType<typeof storageInfo>>>(null);
  const [perm, setPerm] = useState('default');
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void storageInfo().then(setInfo);
    void notificationPermission().then(setPerm);
  }, []);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 3500);
    return () => clearTimeout(t);
  }, [msg]);

  const up = (p: Partial<Settings>) => void saveSettings({ ...s, ...p });
  const snd = (p: Partial<SoundSettings>) => up({ sound: { ...s.sound, ...p } });
  const ev = (e: SoundEvent, p: Partial<{ enabled: boolean; sound: SoundName }>) =>
    snd({ events: { ...s.sound.events, [e]: { ...s.sound.events[e], ...p } } });

  const doExport = async () => {
    const data = await exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `chrono-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setMsg('Sauvegarde exportée');
  };

  const doImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      const replace = window.confirm('Remplacer toutes les données actuelles par cette sauvegarde ?\n\nOK : remplacer · Annuler : fusionner');
      const r = await importBackup(data, replace);
      setMsg(`${r.workouts} séances et ${r.logs} entrées d’historique importées`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Import impossible');
    }
  };

  return (
    <main className="screen">
      <div className="page-head"><h1 className="page-title">Réglages</h1></div>

      <section className="section">
        <h2 className="section-title">Son</h2>
        <div className="form">
          <Toggle label="Mode silencieux" hint="Vibration seule" checked={s.sound.silent} onChange={(v) => snd({ silent: v })} />
          <Range label="Volume général" value={s.sound.master} onChange={(v) => snd({ master: v })} />
          <Range label="Volume des bips" value={s.sound.beepVolume} onChange={(v) => snd({ beepVolume: v })} />
          <Range label="Volume de la voix" value={s.sound.voiceVolume} onChange={(v) => snd({ voiceVolume: v })} />
          <Toggle label="Son en arrière-plan" hint="Les bips continuent quand vous changez d’app ou verrouillez l’écran. Met en pause la musique d’une autre app (Spotify…) : à couper si vous en écoutez." checked={s.sound.background} onChange={(v) => snd({ background: v })} />
          <Stepper label="Bips du décompte final" hint="Nombre de secondes bipées avant chaque fin de phase" value={s.sound.countdownBeeps} min={0} max={5} onChange={(v) => snd({ countdownBeeps: v })} />
        </div>
        <div className="form">
          {(Object.keys(EVENT_LABELS) as SoundEvent[]).map((e) => (
            <div key={e} className="field">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <label htmlFor={`ev-${e}`} style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 15 }}>{EVENT_LABELS[e]}</label>
                <input id={`ev-${e}`} type="checkbox" role="switch" className="switch" checked={s.sound.events[e].enabled} onChange={(x) => ev(e, { enabled: x.target.checked })} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select aria-label={`Son : ${EVENT_LABELS[e]}`} value={s.sound.events[e].sound} disabled={!s.sound.events[e].enabled} onChange={(x) => ev(e, { sound: x.target.value as SoundName })}>
                  {(Object.keys(SOUND_LABELS) as SoundName[]).map((n) => <option key={n} value={n}>{SOUND_LABELS[n]}</option>)}
                </select>
                <button className="btn small secondary" onClick={() => void audio.test(s.sound.events[e].sound, s.sound).then((ok) => { if (!ok) setMsg('Son bloqué par le navigateur : vérifie le volume média du téléphone'); })}>Tester</button>
              </div>
            </div>
          ))}
        </div>
        <div className="form">
          <Toggle label="Annonces vocales" hint="Voix française du téléphone" checked={s.sound.voice} onChange={(v) => snd({ voice: v })} />
          {s.sound.voice && (
            <>
              <Toggle label="Nom de la phase" hint="« Repos », « Burpees »…" checked={s.sound.announcePhase} onChange={(v) => snd({ announcePhase: v })} />
              <Toggle label="Numéro du tour" hint="« Tour 3 sur 8 »" checked={s.sound.announceRound} onChange={(v) => snd({ announceRound: v })} />
              <Toggle label="Temps restant" hint="« 30 secondes », « Plus qu’une minute »" checked={s.sound.announceRemaining} onChange={(v) => snd({ announceRemaining: v })} />
              <div className="row">
                <span className="row-text">Voix</span>
                <button className="btn small secondary" onClick={() => { if (!audio.testVoice('Tour 3 sur 8. Repos', s.sound)) setMsg('Synthèse vocale non disponible sur ce navigateur'); }}>Tester</button>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Séance</h2>
        <div className="form">
          <Stepper label="Préparation par défaut" hint="Modifiable pour chaque séance" value={s.prepSeconds} min={0} max={60} step={5} format={(v) => `${v} s`} onChange={(v) => up({ prepSeconds: v })} />
          <Toggle label="Vibration" hint="À chaque changement de phase" checked={s.vibration} onChange={(v) => up({ vibration: v })} />
          <Toggle label="Écran toujours allumé" hint="Tant que Chrono est ouvert : le téléphone ne se met pas en veille" checked={s.keepAwake} onChange={(v) => up({ keepAwake: v })} />
          <div className="field">
            <label htmlFor="savemode">À la fin d’une séance</label>
            <select id="savemode" value={s.saveMode} onChange={(e) => up({ saveMode: e.target.value as Settings['saveMode'] })}>
              <option value="ask">Toujours demander s’il faut l’enregistrer</option>
              <option value="always">Toujours enregistrer</option>
              <option value="never">Ne jamais enregistrer</option>
            </select>
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Apparence</h2>
        <Segmented label="Thème" value={s.theme} onChange={(v) => up({ theme: v })} options={[{ value: 'light', label: 'Clair' }, { value: 'dark', label: 'Sombre' }, { value: 'system', label: 'Système' }]} />
      </section>

      <section className="section">
        <h2 className="section-title">Rappels</h2>
        <div className="form">
          <div className="row">
            <span className="row-text">
              <span>Notifications</span>
              <span className="hint">
                {perm === 'granted' ? 'Autorisées' : perm === 'denied' ? 'Refusées : à réactiver dans les réglages du téléphone' : perm === 'unsupported' ? 'Non prises en charge ici' : 'Pas encore autorisées'}
                {' · rappel seulement si l’app est ouverte'}
              </span>
            </span>
            {perm === 'default' && <button className="btn small" onClick={() => void requestNotifications().then(() => notificationPermission().then(setPerm))}>Autoriser</button>}
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Données</h2>
        <div className="form">
          <div className="row">
            <span className="row-text">
              <span>Espace occupé</span>
              <span className="hint">{info ? `${fmtBytes(info.usage)}${info.persisted ? ' · stockage protégé' : ''}` : 'Inconnu'}</span>
            </span>
            {info && !info.persisted && (
              <button className="btn small secondary" onClick={() => void requestPersistentStorage().then(() => storageInfo().then(setInfo))}>Protéger</button>
            )}
          </div>
          <div className="field">
            <label htmlFor="hist">Supprimer automatiquement l’historique plus vieux que</label>
            <select id="hist" value={s.historyMonths} onChange={(e) => up({ historyMonths: Number(e.target.value) })}>
              <option value={0}>Jamais</option>
              {[3, 6, 12, 24, 36].map((m) => <option key={m} value={m}>{m} mois</option>)}
            </select>
            <span className="hint">Une séance enregistrée pèse environ 1 à 2 Ko.</span>
          </div>
          <div className="row">
            <span className="row-text">Nettoyer maintenant</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {[3, 12].map((m) => (
                <button key={m} className="btn small secondary" onClick={() => {
                  if (window.confirm(`Supprimer l’historique de plus de ${m} mois ?`)) void pruneHistory(m).then((n) => setMsg(`${n} séance${n > 1 ? 's' : ''} supprimée${n > 1 ? 's' : ''}`));
                }}>&gt; {m} mois</button>
              ))}
            </div>
          </div>
        </div>
        <div className="btn-row">
          <button className="btn secondary" onClick={() => void doExport()}>Exporter (JSON)</button>
          <button className="btn secondary" onClick={() => fileRef.current?.click()}>Importer</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void doImport(f); e.target.value = ''; }} />
        </div>
        <p className="hint" style={{ margin: 0 }}>Tout reste sur ce téléphone. Exporte une sauvegarde de temps en temps, et avant de changer de téléphone.</p>
      </section>

      <p className="hint" style={{ margin: 0, textAlign: 'center' }}>Chrono {__APP_VERSION__} · 100 % local, sans compte</p>
      {msg && <div className="toast" role="status">{msg}</div>}
    </main>
  );
}
