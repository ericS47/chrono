// Fichiers WAV 8 bits mono pour la piste de séance : surtout du silence et des bips,
// 8 bits suffisent et divisent la taille par deux.

function header(out: Uint8Array, length: number, rate: number): void {
  const v = new DataView(out.buffer);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + length, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate, true); // octets par seconde
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true);
  str(36, 'data');
  v.setUint32(40, length, true);
}

const to8 = (x: number) => Math.round(Math.max(-1, Math.min(1, x)) * 127) + 128;
const from8 = (b: number) => (b - 128) / 127;

export function encodeWav8(samples: Float32Array, rate: number): Uint8Array {
  const out = new Uint8Array(44 + samples.length);
  header(out, samples.length, rate);
  for (let i = 0; i < samples.length; i++) out[44 + i] = to8(samples[i]);
  return out;
}

export interface TrackSound {
  /** Instant (s) dans la piste. */
  at: number;
  samples: Float32Array;
  volume: number;
}

/** Saturation douce : le son monte au maximum sans écrêtage brutal. */
const SOFT = Math.tanh(1.6);
const soft = (x: number) => Math.tanh(1.6 * x) / SOFT;

/**
 * Construit la piste : silence, et chaque son copié à son instant.
 * Calcul proportionnel aux sons seulement, pas à la durée de la piste.
 */
export function buildTrack(seconds: number, rate: number, sounds: TrackSound[]): Uint8Array {
  const length = Math.ceil(seconds * rate);
  const out = new Uint8Array(44 + length);
  header(out, length, rate);
  out.fill(128, 44);
  for (const s of sounds) {
    const start = Math.round(s.at * rate);
    const end = Math.min(length, start + s.samples.length);
    for (let i = Math.max(0, start); i < end; i++) {
      out[44 + i] = to8(soft(from8(out[44 + i]) + s.samples[i - start] * s.volume));
    }
  }
  return out;
}
