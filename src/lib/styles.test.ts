import { describe, expect, it } from "vitest";
import { critique, PASS_MARK } from "./critic";
import { generate } from "./generate";
import { isEmptyPattern } from "./song";
import { normalise } from "./storage";
import { STYLES, styleById, STYLE_IDS } from "./styles";
import { isMelodic } from "./pattern";

const LLAVORS = 200;

describe("el catàleg d'estils", () => {
  it("té els set demanats", () => {
    expect(STYLE_IDS.sort()).toEqual(
      ["breakbeat", "dub", "house", "percussio", "techno", "ternari", "triphop"].sort(),
    );
  });

  it("es troben pel seu identificador", () => {
    for (const s of STYLES) expect(styleById(s.id)).toBe(s);
    expect(styleById("inventat")).toBeUndefined();
  });

  it("declara rangs que tenen sentit", () => {
    for (const s of STYLES) {
      expect(s.bpm[0], s.id).toBeLessThan(s.bpm[1]);
      expect(s.swing[0], s.id).toBeLessThanOrEqual(s.swing[1]);
      expect(s.modes.length, s.id).toBeGreaterThan(0);
      expect(Object.keys(s.voices).length, s.id).toBeGreaterThanOrEqual(3);
      expect(s.slots[0], s.id).toBeGreaterThanOrEqual(3);
      expect(s.slots[1], s.id).toBeLessThanOrEqual(6);
    }
  });
});

describe.each(STYLES)("$name", (style) => {
  it(`dona ${LLAVORS} cançons vàlides`, () => {
    for (let seed = 1; seed <= LLAVORS; seed++) {
      const { song } = generate(style, seed);
      for (const slot of song.slots) {
        const p = normalise(slot.pattern);
        for (const t of p.tracks) {
          for (let i = 0; i < p.length; i++) {
            expect([0, 1, 2], `${style.id}/${seed}`).toContain(t.steps[i]);
          }
        }
      }
    }
  });

  it("totes passen el crític", () => {
    const fluixes: string[] = [];
    for (let seed = 1; seed <= LLAVORS; seed++) {
      const v = critique(generate(style, seed).song);
      if (v.score < PASS_MARK) fluixes.push(`${seed}: ${v.issues.join("; ")}`);
    }
    expect(fluixes.slice(0, 3).join(" | ")).toBe("");
  });

  it("es queda dins del rang de tempo, swing, mode i llargada", () => {
    for (let seed = 1; seed <= LLAVORS; seed++) {
      const p = generate(style, seed).song.slots[0].pattern;
      expect(p.bpm, `${style.id}/${seed}`).toBeGreaterThanOrEqual(style.bpm[0]);
      expect(p.bpm).toBeLessThanOrEqual(style.bpm[1]);
      expect(p.swing).toBeGreaterThanOrEqual(style.swing[0] - 0.005);
      expect(p.swing).toBeLessThanOrEqual(style.swing[1] + 0.005);
      expect(p.length).toBe(style.length);
      expect(style.modes).toContain(p.key.mode);
    }
  });

  it("no fa servir cap veu que l'estil no declari", () => {
    const permeses = Object.keys(style.voices);
    for (let seed = 1; seed <= 40; seed++) {
      for (const slot of generate(style, seed).song.slots) {
        if (isEmptyPattern(slot.pattern)) continue;
        for (const t of slot.pattern.tracks) {
          if (isMelodic(t.kind)) continue;
          if (t.steps.some((c) => c)) {
            expect(permeses, `${style.id}/${seed}`).toContain(t.kind);
          }
        }
      }
    }
  });

  it("posa melodia només si l'estil en té", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const p = generate(style, seed).song.slots[0].pattern;
      const notes = p.tracks.reduce(
        (n, t) =>
          n + (t.bass ?? []).filter(Boolean).length + (t.chords ?? []).filter(Boolean).length,
        0,
      );
      if (style.melodic) expect(notes, `${style.id}/${seed}`).toBeGreaterThan(0);
      else expect(notes, `${style.id}/${seed}`).toBe(0);
    }
  });

  it("és determinista", () => {
    expect(JSON.stringify(generate(style, 12).song)).toBe(
      JSON.stringify(generate(style, 12).song),
    );
  });
});

describe("les regles de gènere se senten al resultat", () => {
  const passos = (id: string, seed: number, kind: string) => {
    const p = generate(styleById(id)!, seed).song.slots[0].pattern;
    const t = p.tracks.find((x) => x.kind === kind)!;
    return { p, steps: t.steps };
  };

  it("house: bombo als quatre temps, sempre", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const { p, steps } = passos("house", seed, "bombo");
      for (let i = 0; i < p.length; i += 4) expect(steps[i], `llavor ${seed}`).toBeGreaterThan(0);
    }
  });

  it("breakbeat: mai bombo al tercer temps", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const { p, steps } = passos("breakbeat", seed, "bombo");
      for (let c = 0; c * 16 < p.length; c++) {
        expect(steps[c * 16 + 8], `llavor ${seed}`).toBe(0);
      }
    }
  });

  it("dub: charles obert a tots els contratemps", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const { p, steps } = passos("dub", seed, "charlesObert");
      for (let i = 2; i < p.length; i += 4) expect(steps[i], `llavor ${seed}`).toBeGreaterThan(0);
    }
  });

  it("dub: l'enviament al retard és alt", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const p = generate(styleById("dub")!, seed).song.slots[0].pattern;
      const caixa = p.tracks.find((t) => t.kind === "caixa")!;
      expect(caixa.mix.sendB, `llavor ${seed}`).toBeGreaterThan(0.4);
    }
  });

  it("ternari: el bombo fa tresillo 3+3+2", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const { p, steps } = passos("ternari", seed, "bombo");
      for (let g = 0; g < p.length; g += 8) {
        expect(steps[g], `llavor ${seed}`).toBeGreaterThan(0);
        expect(steps[g + 3], `llavor ${seed}`).toBeGreaterThan(0);
        expect(steps[g + 6], `llavor ${seed}`).toBeGreaterThan(0);
      }
    }
  });

  it("house: la palmada i el charles obert no coincideixen mai", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const p = generate(styleById("house")!, seed).song.slots[0].pattern;
      const palmada = p.tracks.find((t) => t.kind === "palmada")!;
      const obert = p.tracks.find((t) => t.kind === "charlesObert")!;
      for (let i = 0; i < p.length; i++) {
        expect(
          palmada.steps[i] && obert.steps[i],
          `llavor ${seed}, pas ${i}`,
        ).toBeFalsy();
      }
    }
  });

  it("breakbeat: cada caixa fantasma va enganxada a una de forta", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const p = generate(styleById("breakbeat")!, seed).song.slots[0].pattern;
      const c = p.tracks.find((t) => t.kind === "caixa")!;
      const forts = new Set<number>();
      for (let b = 0; b * 16 < p.length; b++) forts.add(b * 16 + 4).add(b * 16 + 12);
      // cap cop de caixa fora d'un de fort o del seu fantasma
      const permesos = new Set<number>();
      for (const i of forts) permesos.add(i).add(i + 1).add(i + 2);
      for (let i = 0; i < p.length; i++) {
        if (c.steps[i]) {
          expect(permesos.has(i), `llavor ${seed}, pas ${i} escampat`).toBe(true);
        }
      }
      // i almenys un fantasma
      let fantasmes = 0;
      for (const i of forts) if (c.steps[i + 1] || c.steps[i + 2]) fantasmes++;
      expect(fantasmes, `llavor ${seed}`).toBeGreaterThan(0);
    }
  });

  it("techno: decay curt i saturació alta al bombo", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const p = generate(styleById("techno")!, seed).song.slots[0].pattern;
      const b = p.tracks.find((t) => t.kind === "bombo")!;
      expect(b.sound.decay, `llavor ${seed}`).toBeLessThan(0.3);
      expect(b.sound.drive).toBeGreaterThan(0.2);
    }
  });

  it("trip-hop: decay llarg i tall baix al bombo", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const p = generate(styleById("triphop")!, seed).song.slots[0].pattern;
      const b = p.tracks.find((t) => t.kind === "bombo")!;
      expect(b.sound.decay, `llavor ${seed}`).toBeGreaterThan(0.45);
      expect(b.sound.filter.cutoff).toBeLessThan(6500);
    }
  });
});
