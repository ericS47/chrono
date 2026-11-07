import { describe, expect, it } from 'vitest';
import { CHARACTERS } from './characters';
import { figureSvg } from './draw';
import { EXERCISES } from './exercises';
import { add, joints, SEG, solveArm, solveLeg, type Pt } from './rig';

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('rig', () => {
  it('la cinématique inverse atteint la cible quand elle est à portée', () => {
    const hip: Pt = [0, -80];
    const ankle: Pt = [30, -5];
    const leg = solveLeg(hip, ankle);
    const knee = add(hip, leg.thigh, SEG.thigh);
    expect(dist(add(knee, leg.shin, SEG.shin), ankle)).toBeLessThan(0.01);
    expect(knee[0]).toBeGreaterThan(0); // genou vers l’avant
  });

  it('une cible trop loin ne casse pas le membre (il se tend dans sa direction)', () => {
    const leg = solveLeg([0, -50], [200, -5]);
    expect(Number.isFinite(leg.thigh) && Number.isFinite(leg.shin)).toBe(true);
  });

  it('le coude part vers l’arrière et le bas', () => {
    const sh: Pt = [0, -150];
    const [upper, fore] = solveArm(sh, [20, -100]);
    const elbow = add(sh, upper, SEG.upper);
    expect(dist(add(elbow, fore, SEG.fore), [20, -100])).toBeLessThan(0.01);
    expect(elbow[0]).toBeLessThan(20);
  });
});

describe('exercices', () => {
  it.each(EXERCISES.map((e) => [e.id, e] as const))('%s : boucle continue, valeurs valides, longueurs conservées', (_id, ex) => {
    const a = ex.pose(0);
    const b = ex.pose(1 - 1e-9);
    const ja = joints(a);
    const jb = joints(b);
    for (const [p, q] of [[ja.legN.toe, jb.legN.toe], [ja.legF.toe, jb.legF.toe], [ja.armN.wrist, jb.armN.wrist], [ja.armF.wrist, jb.armF.wrist], [ja.headC, jb.headC]] as [Pt, Pt][]) {
      expect(dist(p, q)).toBeLessThan(0.01);
    }
    for (let i = 0; i < 40; i++) {
      const j = joints(ex.pose(i / 40));
      for (const p of [j.hip, j.shoulder, j.headC, j.armN.wrist, j.armF.wrist, j.legN.toe, j.legF.toe]) {
        expect(Number.isFinite(p[0]) && Number.isFinite(p[1])).toBe(true);
      }
      expect(dist(j.hip, j.legN.knee)).toBeCloseTo(SEG.thigh, 6);
      expect(dist(j.legN.knee, j.legN.ankle)).toBeCloseTo(SEG.shin, 6);
    }
  });

  it('personne ne passe sous le sol', () => {
    for (const ex of EXERCISES) {
      for (let i = 0; i < 40; i++) {
        const j = joints(ex.pose(i / 40));
        for (const p of [j.legN.ankle, j.legN.toe, j.legF.ankle, j.legF.toe, j.hip]) expect(p[1]).toBeLessThanOrEqual(0.5);
      }
    }
  });

  it('fentes : les pieds ne glissent pas', () => {
    for (const id of ['fente-grand-pas', 'fente-petit-pas']) {
      const ex = EXERCISES.find((e) => e.id === id)!;
      const top = joints(ex.pose(0));
      const bottom = joints(ex.pose(0.5));
      expect(dist(top.legN.ankle, bottom.legN.ankle)).toBeLessThan(0.5);
      expect(dist(top.legF.ankle, bottom.legF.ankle)).toBeLessThan(0.5);
    }
  });

  it('un grand pas écarte plus les pieds qu’un petit pas', () => {
    const spread = (id: string) => {
      const j = joints(EXERCISES.find((e) => e.id === id)!.pose(0.5));
      return j.legN.ankle[0] - j.legF.ankle[0];
    };
    expect(spread('fente-grand-pas')).toBeGreaterThan(spread('fente-petit-pas') + 20);
  });
});

describe('dessin', () => {
  it('produit un SVG valide pour chaque personnage et chaque exercice', () => {
    for (const c of CHARACTERS) {
      for (const ex of EXERCISES) {
        const svg = figureSvg(c, ex.pose(0.3), ex.chair, { title: ex.label });
        expect(svg.startsWith('<svg')).toBe(true);
        expect(svg.endsWith('</svg>')).toBe(true);
        expect(svg).not.toMatch(/NaN|undefined/);
      }
    }
  });
});
