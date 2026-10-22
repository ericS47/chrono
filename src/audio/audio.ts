// Sons synthétisés (Web Audio) programmés à l'avance sur l'horloge audio,
// et annonces vocales en français (synthèse vocale du téléphone).

import type { SoundName, SoundSettings } from '../data/types';
import type { Cue } from '../engine/cues';

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

class AudioEngine {
  private ctx: Ctx | null = null;
  private scheduled: { nodes: AudioScheduledSourceNode[]; timers: number[] } = { nodes: [], timers: [] };
  private voice: SpeechSynthesisVoice | null = null;

  /** À appeler depuis un geste utilisateur (tap) pour débloquer l'audio. */
  unlock(): void {
    this.context();
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
    // iOS : le son Web Audio est coupé par le bouton silencieux, sauf en catégorie « lecture ».
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session) {
      try {
        session.type = 'playback';
      } catch {
        /* non pris en charge */
      }
    }
    if (this.ctx && (this.ctx.state as string) === 'closed') this.ctx = null;
    if (!this.ctx) this.ctx = new AC({ latencyHint: 'interactive' });
    if (this.ctx.state !== 'running') void this.ctx.resume().catch(() => undefined);
    return this.ctx;
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

  private play(name: SoundName, when: number, volume: number): AudioScheduledSourceNode[] {
    const ctx = this.ctx;
    if (!ctx || volume <= 0) return [];
    const nodes: AudioScheduledSourceNode[] = [];
    for (const t of SOUNDS[name]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = when + t.start;
      const peak = Math.max(0.0001, volume * t.gain * 0.6);
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
      osc.connect(g).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + t.dur + 0.05);
      nodes.push(osc);
    }
    return nodes;
  }

  /** Joue un son tout de suite (bouton « Tester »), même en mode silencieux. */
  async test(name: SoundName, s: SoundSettings): Promise<boolean> {
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
    this.unlock();
    const ctx = this.ctx;
    for (const c of cues) {
      if (c.event && ctx) {
        const ev = s.events[c.event];
        if (ev.enabled && !s.silent) this.scheduled.nodes.push(...this.play(ev.sound, ctx.currentTime + Math.max(0, c.at), s.master * s.beepVolume));
      }
      if (c.say) {
        const text = c.say;
        this.scheduled.timers.push(window.setTimeout(() => this.say(text, s), Math.max(0, c.at) * 1000));
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
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }
}

export const audio = new AudioEngine();
