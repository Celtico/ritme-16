import { describe, expect, it } from "vitest";
import { clonePattern, emptyPattern, PRESETS, STEPS, VOICES } from "./pattern";

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
});
