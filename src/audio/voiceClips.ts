// Annonces vocales enregistrées (voix Piper « siwis », scripts/voix/generer.py) :
// elles se mélangent à la musique (Spotify…) et passent dans la piste en arrière-plan,
// contrairement à la voix de synthèse du téléphone qui coupe la musique.

import index from './voix-fr.json';

/** Clé d'annonce → [début, durée] en secondes dans public/voix-fr.mp3. */
export type ClipIndex = Record<string, number[]>;
export const VOICE_INDEX = index as ClipIndex;
export const VOICE_FILE = 'voix-fr.mp3';
/** Silence entre deux morceaux d'une même annonce (s). */
export const CLIP_GAP = 0.06;

/** Même normalisation que le script de génération. */
export function normKey(t: string): string {
  return t.replace(/’/g, "'").toLowerCase().replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');
}

const WORDS: Record<string, string> = { un: '1', deux: '2', trois: '3', quatre: '4', cinq: '5' };

/**
 * Découpe une annonce (« On change. Tour 3 sur 8 ») en morceaux enregistrés.
 * Les morceaux inconnus (commentaire libre…) sont laissés de côté : le bip suffit.
 */
export function clipKeys(text: string, idx: ClipIndex = VOICE_INDEX): string[] {
  const out: string[] = [];
  for (const part of text.split(/\.\s+|\.$/)) {
    const k = normKey(part);
    if (!k) continue;
    const w = WORDS[k] ?? k;
    if (idx[w]) {
      out.push(w);
      continue;
    }
    const m = /^(tour|série|minute) (\d+)(?: sur (\d+))?$/.exec(k);
    if (m && idx[m[1]] && idx[m[2]] && (!m[3] || (idx.sur && idx[m[3]]))) {
      out.push(m[1], m[2]);
      if (m[3]) out.push('sur', m[3]);
    }
  }
  return out;
}

/**
 * Met les annonces à la file, comme le faisait la voix du téléphone : une annonce qui
 * commencerait pendant la précédente attend sa fin (« Mi-temps », puis « 30 secondes »).
 */
export function queueSpeeches<T extends { at: number; keys: string[] }>(list: T[], idx: ClipIndex = VOICE_INDEX): T[] {
  let busyUntil = -Infinity;
  return [...list].sort((a, b) => a.at - b.at).map((v) => {
    const at = Math.max(v.at, busyUntil + 0.15);
    const offs = clipOffsets(v.keys, idx);
    const last = v.keys.length - 1;
    busyUntil = at + (last >= 0 ? offs[last] + (idx[v.keys[last]]?.[1] ?? 0) : 0);
    return { ...v, at };
  });
}

/** Instants de départ (s, depuis le début de l'annonce) de chaque morceau. */
export function clipOffsets(keys: string[], idx: ClipIndex = VOICE_INDEX): number[] {
  let t = 0;
  return keys.map((k) => {
    const at = t;
    t += (idx[k]?.[1] ?? 0) + CLIP_GAP;
    return at;
  });
}
