import { describe, expect, it } from "vitest";
import { critique, distance, PASS_MARK } from "./critic";
import { generate, type StyleSpec } from "./generate";
import { normalise } from "./storage";
import { isEmptyPattern, SLOT_COUNT } from "./song";
import { mulberry32, pick, shuffle } from "./rng";

/** Un estil de mentida, per provar el motor sense dependre dels de debò. */
const PROVA: StyleSpec = {
  id: "prova",
  name: "Prova",
  bpm: [120, 128],
  swing: [0, 0.2],
  modes: ["minor", "dorian"],
  length: 16,
  melodic: true,
  slots: [3, 5],
  progressions: [[1, 6, 3, 7]],
  voices: {
    bombo: { density: [0.9, 0, 0.05, 0], accent: 0.4 },
    caixa: { density: [0, 0, 0.5, 0.05], accent: 0.2 },
    charles: { density: [0.3, 0.2, 0.6, 0.2], accent: 0.1 },
    palmada: { density: [0, 0, 0.2, 0], accent: 0.1, optional: true },
  },
  rules: [
    (p) => {
      // sempre bombo als quatre temps
      const b = p.tracks.find((t) => t.kind === "bombo");
      if (b) for (let i = 0; i < p.length; i += 4) b.steps[i] ||= 2;
    },
  ],
};

describe("l'atzar reproduïble", () => {
  it("dona sempre la mateixa seqüència per a la mateixa llavor", () => {
    const a = Array.from({ length: 20 }, mulberry32(7));
    const b = Array.from({ length: 20 }, mulberry32(7));
    expect(a).toEqual(b);
    expect(a).not.toEqual(Array.from({ length: 20 }, mulberry32(8)));
  });

  it("es queda entre 0 i 1", () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 2000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("pick i shuffle no se'n van de l'array", () => {
    const rng = mulberry32(11);
    const arr = [1, 2, 3, 4, 5];
    for (let i = 0; i < 200; i++) expect(arr).toContain(pick(rng, arr));
    expect([...shuffle(rng, arr)].sort()).toEqual(arr);
  });
});

describe("determinisme del generador", () => {
  it("la mateixa llavor dona exactament la mateixa cançó", () => {
    for (const seed of [1, 42, 999]) {
      const a = generate(PROVA, seed);
      const b = generate(PROVA, seed);
      expect(JSON.stringify(a.song), `llavor ${seed}`).toBe(
        JSON.stringify(b.song),
      );
      expect(a.seed).toBe(b.seed);
    }
  });

  it("llavors diferents donen cançons diferents", () => {
    const a = JSON.stringify(generate(PROVA, 1).song);
    const b = JSON.stringify(generate(PROVA, 2).song);
    expect(a).not.toBe(b);
  });
});

describe("el que surt del generador", () => {
  it("és sempre una cançó vàlida", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const { song } = generate(PROVA, seed);
      expect(song.slots, `llavor ${seed}`).toHaveLength(SLOT_COUNT);
      for (const slot of song.slots) {
        const p = normalise(slot.pattern);
        expect(p.tracks.length, `llavor ${seed}`).toBeGreaterThan(0);
        for (const t of p.tracks) {
          for (let i = 0; i < p.length; i++) {
            expect([0, 1, 2]).toContain(t.steps[i]);
          }
        }
      }
    }
  });

  it("respecta el rang de tempo, de swing i la llargada de l'estil", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const p = generate(PROVA, seed).song.slots[0].pattern;
      expect(p.bpm, `llavor ${seed}`).toBeGreaterThanOrEqual(120);
      expect(p.bpm).toBeLessThanOrEqual(128);
      expect(p.swing).toBeGreaterThanOrEqual(0);
      expect(p.swing).toBeLessThanOrEqual(0.2);
      expect(p.length).toBe(16);
      expect(PROVA.modes).toContain(p.key.mode);
    }
  });

  it("no deixa cap follow action apuntant a una ranura buida", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const { song } = generate(PROVA, seed);
      for (const slot of song.slots) {
        if (isEmptyPattern(slot.pattern)) continue;
        const f = slot.follow;
        if (f.kind === "goto") {
          expect(isEmptyPattern(song.slots[f.slot].pattern), `llavor ${seed}`).toBe(false);
        }
        if (f.kind === "random") {
          for (const c of f.candidates) {
            expect(isEmptyPattern(song.slots[c].pattern), `llavor ${seed}`).toBe(false);
          }
        }
      }
    }
  });

  it("posa entre tres i cinc ranures amb contingut", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const plenes = generate(PROVA, seed).song.slots.filter(
        (s) => !isEmptyPattern(s.pattern),
      ).length;
      expect(plenes, `llavor ${seed}`).toBeGreaterThanOrEqual(3);
      expect(plenes).toBeLessThanOrEqual(5);
    }
  });

  it("desa dues escenes a la base", () => {
    const p = generate(PROVA, 5).song.slots[0].pattern;
    expect(p.scenes.map((e) => e.name)).toEqual(["Intro", "Ple"]);
  });

  it("fa que les variacions siguin variacions i no una altra cançó", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const { song } = generate(PROVA, seed);
      const base = song.slots[0].pattern;
      const plenes = song.slots.filter((s) => !isEmptyPattern(s.pattern));
      for (const slot of plenes.slice(1)) {
        const d = distance(base, slot.pattern);
        expect(d, `llavor ${seed} / ${slot.pattern.name}`).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe("el crític", () => {
  it("aprova el que surt del generador", () => {
    let aprovades = 0;
    for (let seed = 1; seed <= 60; seed++) {
      if (critique(generate(PROVA, seed).song).score >= PASS_MARK) aprovades++;
    }
    // no cal que passin totes, però sí la immensa majoria
    expect(aprovades).toBeGreaterThanOrEqual(57);
  });

  it("suspèn una cançó buida", () => {
    const { song } = generate(PROVA, 1);
    for (const slot of song.slots) {
      for (const t of slot.pattern.tracks) {
        t.steps = t.steps.map(() => 0);
        if (t.bass) t.bass = t.bass.map(() => null);
        if (t.chords) t.chords = t.chords.map(() => null);
      }
    }
    const v = critique(song);
    expect(v.score).toBeLessThan(PASS_MARK);
    expect(v.issues.join(" ")).toContain("cap ranura amb contingut");
  });

  it("es queixa si dues veus del mateix registre van sempre juntes", () => {
    const { song } = generate(PROVA, 1);
    const p = song.slots[0].pattern;
    const charles = p.tracks.find((t) => t.kind === "charles")!;
    const obert = p.tracks.find((t) => t.kind === "charlesObert")!;
    charles.steps = charles.steps.map((_, i) => (i % 4 === 0 ? 1 : 0));
    obert.steps = obert.steps.map((_, i) => (i % 4 === 0 ? 1 : 0));
    expect(critique(song).issues.join(" ")).toContain("sempre juntes");
  });
});
