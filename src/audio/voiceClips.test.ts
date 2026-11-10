import { describe, expect, it } from 'vitest';
import { clipKeys, clipOffsets, normKey, queueSpeeches, VOICE_INDEX } from './voiceClips';

describe('annonces enregistrées', () => {
  it('toutes les phrases fixes de la séance sont enregistrées', () => {
    for (const t of ['Préparation', 'Go', 'Repos', 'Récupération', 'On change', 'Mi-temps', 'Plus qu’une minute', '30 secondes', '10 secondes', 'Séance terminée', 'trois', 'deux', 'un']) {
      expect(clipKeys(t), t).toHaveLength(1);
    }
  });

  it('compose « Tour 3 sur 8 », « Série 2 sur 4 » et « Minute 5 »', () => {
    expect(clipKeys('Tour 3 sur 8')).toEqual(['tour', '3', 'sur', '8']);
    expect(clipKeys('Série 2 sur 4')).toEqual(['série', '2', 'sur', '4']);
    expect(clipKeys('Minute 5. Tour 5 sur 10')).toEqual(['minute', '5', 'tour', '5', 'sur', '10']);
  });

  it('noms d’exercices connus, matériel entre parenthèses ignoré ; commentaire libre laissé de côté', () => {
    expect(clipKeys('On change. Squat')).toEqual(['on change', 'squat']);
    expect(clipKeys('Curl biceps (haltères)')).toEqual(['curl biceps']);
    expect(clipKeys('On change. 15 burpees lents')).toEqual(['on change']);
    expect(normKey('Plus qu’une minute.')).toBe("plus qu'une minute");
  });

  it('deux annonces au même instant passent l’une après l’autre', () => {
    const q = queueSpeeches([{ at: 40, keys: ['30 secondes'] }, { at: 40, keys: ['mi-temps'] }, { at: 70, keys: ['repos'] }]);
    expect(q[0].at).toBe(40);
    expect(q[1].at).toBeCloseTo(40 + VOICE_INDEX['30 secondes'][1] + 0.15);
    expect(q[2].at).toBe(70);
  });

  it('les morceaux s’enchaînent', () => {
    const o = clipOffsets(['tour', '3']);
    expect(o[0]).toBe(0);
    expect(o[1]).toBeCloseTo(VOICE_INDEX.tour[1] + 0.06);
  });
});
