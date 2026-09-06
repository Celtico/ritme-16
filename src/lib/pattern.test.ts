import { describe, expect, it } from "vitest";
import {
  clonePattern,
  DECAY_MAX,
  DECAY_MIN,
  defaultParams,
  defaultSound,
  emptyPattern,
  PRESETS,
  STEPS,
  VOICES,
} from "./pattern";

describe("model del patró", () => {
  it("dona setze cel·les a totes les veus de tots els presets", () => {
    for (const p of PRESETS) {
      for (const v of VOICES) {
        expect(p.steps[v.id], `${p.name} / ${v.id}`).toHaveLength(STEPS);
      }
    }
  });

  it("clona sense compartir cap array ni cap objecte", () => {
    const a = emptyPattern("a");
    const b = clonePattern(a);
    b.steps.bombo[0] = 2;
    b.mix.caixa.muted = true;
    expect(a.steps.bombo[0]).toBe(0);
    expect(a.mix.caixa.muted).toBe(false);
  });

  it("clona també els comandaments de so sense compartir-los", () => {
    const a = emptyPattern("a");
    const b = clonePattern(a);
    b.sound.aro.drive = 0.8;
    expect(a.sound.aro.drive).toBe(0);
  });
});

describe("comandaments de so per defecte", () => {
  it("dona els quatre comandaments a cada veu", () => {
    const sound = defaultSound();
    for (const v of VOICES) {
      expect(Object.keys(sound[v.id]).sort()).toEqual([
        "decay",
        "drive",
        "pitch",
        "tone",
      ]);
    }
  });

  it("deixa el to al centre i la saturació fora, que és el so de fàbrica", () => {
    for (const v of VOICES) {
      const p = defaultParams(v.id);
      expect(p.pitch, v.id).toBe(0);
      expect(p.tone, v.id).toBe(0.5);
      expect(p.drive, v.id).toBe(0);
    }
  });

  it("dona a cada veu la caiguda que tenia kit.ts, dins del marge", () => {
    const esperat: Record<string, number> = {
      bombo: 0.42,
      caixa: 0.17,
      palmada: 0.11,
      charles: 0.045,
      charlesObert: 0.38,
      aro: 0.035,
      timbal: 0.34,
      cencerro: 0.3,
    };
    for (const v of VOICES) {
      const { decay } = defaultParams(v.id);
      expect(decay, v.id).toBe(esperat[v.id]);
      expect(decay, v.id).toBeGreaterThanOrEqual(DECAY_MIN);
      expect(decay, v.id).toBeLessThanOrEqual(DECAY_MAX);
    }
  });

  it("dona objectes independents a cada crida", () => {
    const a = defaultSound();
    a.bombo.pitch = 5;
    expect(defaultSound().bombo.pitch).toBe(0);
  });

  it("posa sound a tots els presets", () => {
    for (const p of PRESETS) {
      for (const v of VOICES) {
        expect(p.sound[v.id], `${p.name} / ${v.id}`).toEqual(
          defaultParams(v.id),
        );
      }
    }
  });
});
