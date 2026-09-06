import { describe, expect, it } from "vitest";
import {
  canRoute,
  lfoValueAt,
  MOD_ROUTES,
  MOD_SOURCES,
  MOD_TARGETS,
  type LfoShape,
} from "./voices";

describe("valor de l'LFO", () => {
  it("comença a zero i puja, si és sinusoidal", () => {
    expect(lfoValueAt("sine", 1, 0)).toBeCloseTo(0, 6);
    expect(lfoValueAt("sine", 1, 0.25)).toBeCloseTo(1, 6);
    expect(lfoValueAt("sine", 1, 0.5)).toBeCloseTo(0, 6);
    expect(lfoValueAt("sine", 1, 0.75)).toBeCloseTo(-1, 6);
  });

  it("fa el pic al mig, si és triangular", () => {
    expect(lfoValueAt("triangle", 1, 0)).toBeCloseTo(-1, 6);
    expect(lfoValueAt("triangle", 1, 0.5)).toBeCloseTo(1, 6);
    expect(lfoValueAt("triangle", 1, 1)).toBeCloseTo(-1, 6);
  });

  it("només val 1 o -1, si és quadrada", () => {
    expect(lfoValueAt("square", 1, 0.1)).toBe(1);
    expect(lfoValueAt("square", 1, 0.49)).toBe(1);
    expect(lfoValueAt("square", 1, 0.51)).toBe(-1);
    expect(lfoValueAt("square", 1, 0.99)).toBe(-1);
  });

  it("puja recte i cau de cop, si és dent de serra", () => {
    expect(lfoValueAt("sawtooth", 1, 0)).toBeCloseTo(-1, 6);
    expect(lfoValueAt("sawtooth", 1, 0.5)).toBeCloseTo(0, 6);
    expect(lfoValueAt("sawtooth", 1, 0.999)).toBeCloseTo(1, 2);
  });

  it("es repeteix cada període", () => {
    for (const shape of ["sine", "triangle", "square", "sawtooth"] as LfoShape[]) {
      for (const t of [0.13, 0.4, 0.77]) {
        expect(lfoValueAt(shape, 2, t), shape).toBeCloseTo(
          lfoValueAt(shape, 2, t + 2),
          6,
        );
        expect(lfoValueAt(shape, 2, t), `${shape} enrere`).toBeCloseTo(
          lfoValueAt(shape, 2, t + 20),
          6,
        );
      }
    }
  });

  it("no se'n va mai de -1 a 1", () => {
    for (const shape of ["sine", "triangle", "square", "sawtooth"] as LfoShape[]) {
      for (let i = 0; i < 200; i++) {
        const v = lfoValueAt(shape, 0.37, i * 0.017);
        expect(v, shape).toBeGreaterThanOrEqual(-1);
        expect(v, shape).toBeLessThanOrEqual(1);
      }
    }
  });

  it("dona zero si el període no té sentit, en comptes de dividir per zero", () => {
    expect(lfoValueAt("sine", 0, 1)).toBe(0);
    expect(lfoValueAt("sine", -1, 1)).toBe(0);
  });

  it("va bé amb temps negatius", () => {
    expect(lfoValueAt("sawtooth", 1, -0.25)).toBeCloseTo(
      lfoValueAt("sawtooth", 1, 0.75),
      6,
    );
  });
});

describe("encaminaments possibles", () => {
  it("deixa les envolupants només al filtre", () => {
    expect(MOD_ROUTES.envAmp).toEqual(["cutoff"]);
    expect(MOD_ROUTES.envFilter).toEqual(["cutoff"]);
    expect(canRoute("envAmp", "pitch")).toBe(false);
    expect(canRoute("envFilter", "decay")).toBe(false);
  });

  it("deixa les fonts mostrejables anar a qualsevol paràmetre", () => {
    for (const font of ["lfo1", "lfo2", "velocity", "random"] as const) {
      for (const dest of MOD_TARGETS) {
        expect(canRoute(font, dest), `${font} -> ${dest}`).toBe(true);
      }
    }
  });

  it("declara un encaminament per a cada font, i cap destinació inventada", () => {
    for (const font of MOD_SOURCES) {
      expect(MOD_ROUTES[font], font).toBeDefined();
      expect(MOD_ROUTES[font].length, font).toBeGreaterThan(0);
      for (const dest of MOD_ROUTES[font]) {
        expect(MOD_TARGETS, `${font} -> ${dest}`).toContain(dest);
      }
    }
  });
});
