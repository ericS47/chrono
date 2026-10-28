// Sons synthétisés (Web Audio) programmés à l'avance sur l'horloge audio,
// et annonces vocales en français (synthèse vocale du téléphone).

import type { SoundName, SoundSettings } from '../data/types';
import type { Cue } from '../engine/cues';
import { buildTrack, encodeWav8 } from './wav';

type Ctx = AudioContext;

interface Tone {
  freq: number;
  freqEnd?: number;
  start: number;
  dur: number;
  type: OscillatorType;
  gain: number;
  decay?: boolean;
}

const SOUNDS: Record<SoundName, Tone[]> = {
  bip: [{ freq: 880, start: 0, dur: 0.14, type: 'sine', gain: 1 }],
  aigu: [{ freq: 1320, start: 0, dur: 0.32, type: 'sine', gain: 1 }],
  double: [
    { freq: 990, start: 0, dur: 0.11, type: 'sine', gain: 1 },
    { freq: 990, start: 0.17, dur: 0.11, type: 'sine', gain: 1 },
  ],
  gong: [
    { freq: 196, start: 0, dur: 1.8, type: 'sine', gain: 1, decay: true },
    { freq: 294, start: 0, dur: 1.4, type: 'sine', gain: 0.6, decay: true },
    { freq: 392, start: 0, dur: 1.0, type: 'triangle', gain: 0.3, decay: true },
    // Harmonique aiguë : les graves passent mal dans le haut-parleur d'un téléphone.
    { freq: 784, start: 0, dur: 0.9, type: 'triangle', gain: 0.35, decay: true },
  ],
  cloche: [
    { freq: 1568, start: 0, dur: 0.9, type: 'triangle', gain: 0.8, decay: true },
    { freq: 2349, start: 0, dur: 0.6, type: 'sine', gain: 0.35, decay: true },
  ],
  sifflet: [{ freq: 1800, freqEnd: 2600, start: 0, dur: 0.35, type: 'square', gain: 0.35 }],
};

export const SOUND_LABELS: Record<SoundName, string> = {
  bip: 'Bip court',
  aigu: 'Bip long aigu',
  double: 'Double bip',
  gong: 'Gong',
  cloche: 'Clochette',
  sifflet: 'Sifflet',
};

/** Piste de séance : fréquence basse (bips seulement) et durée bornée pour garder un fichier léger. */
const TRACK_RATE = 11025;
const TRACK_MAX_S = 30 * 60;
/** Les bips des premières secondes partent en direct pendant que la piste se prépare. */
const TRACK_LEAD_S = 2;

interface Beep {
  at: number;
  sound: SoundName;
  volume: number;
}

class AudioEngine {
  private ctx: Ctx | null = null;
  /** Entrée de la chaîne de sortie : amplification puis limiteur, pour des bips plus forts sans saturer. */
  private out: AudioNode | null = null;
  private scheduled: { nodes: AudioScheduledSourceNode[]; timers: number[] } = { nodes: [], timers: [] };
  /**
   * Lecteur de la piste de séance. Un fichier audio continue de jouer quand l'app
   * passe en arrière-plan ou que l'écran se verrouille, contrairement aux bips en direct.
   */
  private player: HTMLAudioElement | null = null;
  private playerReady = false;
  private trackUrl: string | null = null;
  private trackGen = 0;
  private onTrackEnd: (() => void) | null = null;
  /** Réglage « Son en arrière-plan ». */
  private background = true;
  private voice: SpeechSynthesisVoice | null = null;

  /** Vrai si le son peut sortir maintenant (contexte audio actif). */
  isRunning(): boolean {
    return this.ctx?.state === 'running';
  }

  /** À appeler depuis un geste utilisateur (tap) pour débloquer l'audio. */
  unlock(): void {
    this.context();
    if (this.background) this.unlockPlayer();
  }

  /** Vrai si la piste de séance est en train de jouer. */
  trackPlaying(): boolean {
    return !!this.player && !this.player.paused && !!this.trackUrl;
  }

  /** Appelé quand la piste se termine avant la séance (durée bornée). */
  setTrackEndHandler(fn: (() => void) | null): void {
    this.onTrackEnd = fn;
  }

  /** iPhone n'autorise la lecture qu'après un premier « play » pendant un tap. */
  private unlockPlayer(): void {
    if (typeof Audio === 'undefined' || typeof OfflineAudioContext === 'undefined') return;
    if (!this.player) {
      const p = new Audio();
      p.preload = 'auto';
      p.setAttribute('playsinline', '');
      p.addEventListener('ended', () => {
        if (this.trackUrl) this.onTrackEnd?.();
      });
      this.player = p;
    }
    if (this.playerReady || this.trackUrl) return;
    const p = this.player;
    const url = URL.createObjectURL(new Blob([encodeWav8(new Float32Array(TRACK_RATE / 10), TRACK_RATE)], { type: 'audio/wav' }));
    p.src = url;
    p.play()
      .then(() => {
        this.playerReady = true;
        if (!this.trackUrl) p.pause();
      })
      .catch(() => undefined)
      .finally(() => URL.revokeObjectURL(url));
  }

  /**
   * Crée (ou recrée) le contexte audio de façon synchrone : sur iPhone, il doit être
   * créé et relancé pendant le geste (tap) lui-même, sans attendre avant.
   */
  private context(): Ctx | null {
    if (typeof window === 'undefined') return null;
    this.pickVoice();
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    // iPhone : en catégorie « lecture », le son passe malgré le bouton silencieux et
    // continue en arrière-plan, mais met en pause la musique des autres apps.
    // Sinon (« auto »), il se mélange à la musique.
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session) {
      try {
        session.type = this.background ? 'playback' : 'auto';
      } catch {
        /* non pris en charge */
      }
    }
    if (this.ctx && (this.ctx.state as string) === 'closed') this.ctx = null;
    if (!this.ctx) {
      this.ctx = new AC({ latencyHint: 'interactive' });
      this.out = this.outputChain(this.ctx);
    }
    if (this.ctx.state !== 'running') void this.ctx.resume().catch(() => undefined);
    return this.ctx;
  }

  private outputChain(ctx: BaseAudioContext): AudioNode {
    const boost = ctx.createGain();
    boost.gain.value = 2.2;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 4;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.12;
    boost.connect(limiter).connect(ctx.destination);
    return boost;
  }

  private async running(ctx: Ctx): Promise<boolean> {
    if (ctx.state === 'running') return true;
    await Promise.race([ctx.resume().catch(() => undefined), new Promise((r) => setTimeout(r, 800))]);
    return (ctx.state as string) === 'running';
  }

  private voicesHooked = false;

  private pickVoice(): void {
    if (this.voice || typeof speechSynthesis === 'undefined') return;
    if (!this.voicesHooked) {
      // Sur Android, la liste des voix arrive après coup.
      this.voicesHooked = true;
      speechSynthesis.addEventListener?.('voiceschanged', () => {
        this.voice = null;
        this.pickVoice();
      });
    }
    const voices = speechSynthesis.getVoices();
    this.voice = voices.find((v) => v.lang === 'fr-FR' && v.localService) ?? voices.find((v) => v.lang.startsWith('fr')) ?? null;
  }

  private play(
    name: SoundName, when: number, volume: number,
    ctx: BaseAudioContext | null = this.ctx, dest: AudioNode | null = this.out,
  ): AudioScheduledSourceNode[] {
    if (!ctx || volume <= 0) return [];
    const nodes: AudioScheduledSourceNode[] = [];
    for (const t of SOUNDS[name]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = when + t.start;
      const peak = Math.max(0.0001, volume * t.gain);
      osc.type = t.type;
      osc.frequency.setValueAtTime(t.freq, t0);
      if (t.freqEnd) osc.frequency.linearRampToValueAtTime(t.freqEnd, t0 + t.dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
      if (t.decay) g.gain.exponentialRampToValueAtTime(0.0001, t0 + t.dur);
      else {
        g.gain.setValueAtTime(peak, t0 + t.dur - 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + t.dur);
      }
      osc.connect(g).connect(dest ?? ctx.destination);
      osc.start(t0);
      osc.stop(t0 + t.dur + 0.05);
      nodes.push(osc);
    }
    return nodes;
  }

  /** Joue un son tout de suite (bouton « Tester »), même en mode silencieux. */
  async test(name: SoundName, s: SoundSettings): Promise<boolean> {
    this.background = s.background;
    const ctx = this.context();
    if (!ctx) return false;
    // Volume réglé à zéro : on joue quand même doucement pour que le test serve à quelque chose.
    const vol = s.master * s.beepVolume > 0 ? s.master * s.beepVolume : 0.3;
    // Programmé tout de suite : le son part dès que le contexte audio tourne.
    this.play(name, ctx.currentTime + 0.03, vol);
    return this.running(ctx);
  }

  /** Fait dire une phrase d'essai (bouton « Tester » de la voix). */
  testVoice(text: string, s: SoundSettings): boolean {
    if (typeof speechSynthesis === 'undefined') return false;
    this.context();
    speechSynthesis.cancel();
    this.voice = null;
    this.pickVoice();
    const vol = s.master * s.voiceVolume > 0 ? s.master * s.voiceVolume : 0.5;
    this.say(text, { ...s, silent: false, voice: true, master: 1, voiceVolume: Math.min(1, vol) });
    return true;
  }

  say(text: string, s: SoundSettings): void {
    if (typeof speechSynthesis === 'undefined' || !s.voice || s.silent) return;
    this.pickVoice();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    if (this.voice) u.voice = this.voice;
    u.volume = Math.min(1, s.master * s.voiceVolume);
    u.rate = 1.05;
    speechSynthesis.speak(u);
  }

  /** Programme une liste de signaux ; annule la programmation précédente. */
  schedule(cues: Cue[], s: SoundSettings): void {
    this.cancel();
    this.background = s.background;
    this.unlock();
    const ctx = this.ctx;
    const t0 = performance.now();
    const beeps: Beep[] = [];
    for (const c of cues) {
      if (c.event && !s.silent) {
        const ev = s.events[c.event];
        if (ev.enabled) beeps.push({ at: Math.max(0, c.at), sound: ev.sound, volume: s.master * s.beepVolume });
      }
      if (c.say) {
        const text = c.say;
        this.scheduled.timers.push(window.setTimeout(() => this.say(text, s), Math.max(0, c.at) * 1000));
      }
    }
    const withTrack = s.background && !!this.player && beeps.some((b) => b.at >= TRACK_LEAD_S);
    for (const b of beeps) {
      if (withTrack && b.at >= TRACK_LEAD_S) continue;
      if (ctx) this.scheduled.nodes.push(...this.play(b.sound, ctx.currentTime + b.at, b.volume));
    }
    if (withTrack) void this.startTrack(beeps.filter((b) => b.at >= TRACK_LEAD_S), t0, ++this.trackGen);
  }

  private soundCache = new Map<SoundName, Float32Array>();

  /** Chaque son, fabriqué une seule fois et normalisé (crête à 1). */
  private async soundSamples(name: SoundName): Promise<Float32Array> {
    const hit = this.soundCache.get(name);
    if (hit) return hit;
    const dur = Math.max(...SOUNDS[name].map((t) => t.start + t.dur)) + 0.06;
    const off = new OfflineAudioContext(1, Math.ceil(dur * TRACK_RATE), TRACK_RATE);
    this.play(name, 0, 1, off, off.destination);
    const data = (await off.startRendering()).getChannelData(0);
    let peak = 0;
    for (const x of data) peak = Math.max(peak, Math.abs(x));
    if (peak > 0) for (let i = 0; i < data.length; i++) data[i] /= peak;
    this.soundCache.set(name, data);
    return data;
  }

  /** Fabrique la piste des bips à venir puis la lance, calée sur l'instant t0 de la programmation. */
  private async startTrack(beeps: Beep[], t0: number, gen: number): Promise<void> {
    const kept = beeps.filter((b) => b.at < TRACK_MAX_S);
    if (!kept.length || !this.player) return;
    const length = Math.min(TRACK_MAX_S, Math.max(...kept.map((b) => b.at)) + 3);
    try {
      const sounds = await Promise.all(kept.map(async (b) => ({ at: b.at, volume: b.volume, samples: await this.soundSamples(b.sound) })));
      if (gen !== this.trackGen) return;
      const url = URL.createObjectURL(new Blob([buildTrack(length, TRACK_RATE, sounds)], { type: 'audio/wav' }));
      this.trackUrl = url;
      const p = this.player;
      p.src = url;
      await new Promise<void>((res, rej) => {
        p.addEventListener('loadedmetadata', () => res(), { once: true });
        p.addEventListener('error', () => rej(new Error('piste illisible')), { once: true });
      });
      if (gen !== this.trackGen) return;
      p.currentTime = (performance.now() - t0) / 1000;
      await p.play();
    } catch {
      // Piste impossible : on retombe sur les bips en direct.
      if (gen !== this.trackGen || !this.ctx) return;
      const late = (performance.now() - t0) / 1000;
      for (const b of kept) {
        if (b.at >= late) this.scheduled.nodes.push(...this.play(b.sound, this.ctx.currentTime + b.at - late, b.volume));
      }
    }
  }

  cancel(): void {
    for (const n of this.scheduled.nodes) {
      try {
        n.stop();
        n.disconnect();
      } catch {
        /* déjà arrêté */
      }
    }
    this.scheduled.timers.forEach((t) => clearTimeout(t));
    this.scheduled = { nodes: [], timers: [] };
    this.trackGen++;
    if (this.trackUrl) {
      this.player?.pause();
      URL.revokeObjectURL(this.trackUrl);
      this.trackUrl = null;
    }
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }
}

export const audio = new AudioEngine();
