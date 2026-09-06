import { describe, expect, it } from "vitest";
import { defaultParams, emptyPattern, VOICES, type Pattern } from "./pattern";
import { normalise } from "./storage";

/** Un patró de la versió anterior: sense `sound` i amb veus que hi falten. */
function patroAntic(): Pattern {
  const p = emptyPattern("Antic");
  const solt = p as unknown as Record<string, unknown>;
  delete solt.sound;
  delete (p.steps as Record<string, unknown>).cencerro;
  delete (p.mix as Record<string, unknown>).aro;
  return p;
}

describe("normalise", () => {
  it("omple sound amb els valors de fàbrica quan el patró no en porta", () => {
    const p = normalise(patroAntic());
    for (const v of VOICES) {
      expect(p.sound[v.id], v.id).toEqual(defaultParams(v.id));
    }
  });

  it("completa les veus que falten sense perdre les que hi són", () => {
    const antic = patroAntic();
    antic.steps.bombo[3] = 2;
    const p = normalise(antic);
    expect(p.steps.cencerro).toHaveLength(16);
    expect(p.mix.aro).toEqual({ volume: 0, muted: false, solo: false });
    expect(p.steps.bombo[3]).toBe(2);
  });

  it("respecta el sound desat i només hi completa el que falti", () => {
    const p = emptyPattern("Amb so");
    p.sound.bombo.pitch = -5;
    delete (p.sound.bombo as unknown as Record<string, unknown>).drive;
    const out = normalise(p);
    expect(out.sound.bombo.pitch).toBe(-5);
    expect(out.sound.bombo.drive).toBe(0);
  });

  it("no comparteix estructures amb el patró d'entrada", () => {
    const antic = patroAntic();
    const p = normalise(antic);
    p.steps.bombo[0] = 2;
    expect(antic.steps.bombo[0]).toBe(0);
  });
});
