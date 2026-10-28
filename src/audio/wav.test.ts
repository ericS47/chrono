import { describe, expect, it } from 'vitest';
import { buildTrack, encodeWav8 } from './wav';

describe('encodeWav8', () => {
  it('écrit un en-tête WAV PCM 8 bits mono valide', () => {
    const w = encodeWav8(new Float32Array([0, 1, -1, 0.5]), 11025);
    const v = new DataView(w.buffer);
    expect(String.fromCharCode(...w.slice(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...w.slice(8, 12))).toBe('WAVE');
    expect(v.getUint32(24, true)).toBe(11025);
    expect(v.getUint16(34, true)).toBe(8);
    expect(v.getUint32(40, true)).toBe(4);
    expect(w.length).toBe(48);
  });

  it('centre le silence sur 128 et borne les valeurs', () => {
    const w = encodeWav8(new Float32Array([0, 1, -1, 2]), 8000);
    expect([...w.slice(44)]).toEqual([128, 255, 1, 255]);
  });
});

describe('buildTrack', () => {
  it('place chaque son à son instant, le reste en silence', () => {
    const w = buildTrack(1, 10, [{ at: 0.5, samples: new Float32Array([1, -1]), volume: 1 }]);
    expect(new DataView(w.buffer).getUint32(40, true)).toBe(10);
    const data = [...w.slice(44)];
    expect(data.slice(0, 5)).toEqual([128, 128, 128, 128, 128]);
    expect(data[5]).toBe(255);
    expect(data[6]).toBe(1);
    expect(data.slice(7)).toEqual([128, 128, 128]);
  });

  it('coupe un son qui dépasse la fin de la piste', () => {
    const w = buildTrack(0.2, 10, [{ at: 0.1, samples: new Float32Array([0.5, 0.5, 0.5]), volume: 0.5 }]);
    expect(w.length).toBe(46);
    expect(w[45]).toBeGreaterThan(128);
  });
});
