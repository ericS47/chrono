// Partage d'une séance par lien ou QR code : la séance est encodée dans
// l'URL elle-même, aucun serveur n'est nécessaire.

import type { Block, Workout } from './types';
import { ALL_MODES } from './types';
import { uid } from '../lib/format';

interface Shared {
  v: 1;
  n: string;
  d?: string;
  t?: string[];
  p?: number | null;
  b: Omit<Block, 'id'>[];
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function encodeWorkout(w: Workout): string {
  const data: Shared = {
    v: 1,
    n: w.name,
    d: w.description || undefined,
    t: w.tags.length ? w.tags : undefined,
    p: w.prepSeconds ?? undefined,
    b: w.blocks.map(({ id: _id, ...rest }) => rest),
  };
  return toBase64Url(new TextEncoder().encode(JSON.stringify(data)));
}

/** Décode une séance partagée ; lève une erreur si le contenu est invalide. */
export function decodeWorkout(code: string): Workout {
  const data = JSON.parse(new TextDecoder().decode(fromBase64Url(code))) as Shared;
  if (data.v !== 1 || typeof data.n !== 'string' || !Array.isArray(data.b)) throw new Error('Lien de séance invalide');
  const blocks: Block[] = data.b.map((b) => {
    if (!ALL_MODES.includes(b.mode)) throw new Error('Mode inconnu');
    return {
      id: uid(),
      mode: b.mode,
      name: typeof b.name === 'string' ? b.name : undefined,
      params: typeof b.params === 'object' && b.params ? b.params : {},
      exercises: Array.isArray(b.exercises) ? b.exercises.filter((e) => e && typeof e.name === 'string') : [],
      restAfter: Number(b.restAfter) || 0,
    };
  });
  const now = Date.now();
  return {
    id: uid(),
    name: data.n.slice(0, 120),
    description: data.d,
    tags: Array.isArray(data.t) ? data.t.filter((t) => typeof t === 'string') : [],
    favorite: false,
    blocks,
    prepSeconds: typeof data.p === 'number' ? data.p : null,
    createdAt: now,
    updatedAt: now,
  };
}

export function shareUrl(w: Workout, base: string): string {
  return `${base.split('#')[0]}#/partage/${encodeWorkout(w)}`;
}
