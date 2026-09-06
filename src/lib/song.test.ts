import { describe, expect, it } from "vitest";
import { emptyPattern, PRESETS } from "./pattern";
import {
  cloneSong,
  currentPattern,
  emptySong,
  isEmptyPattern,
  resolveFollow,
  SLOT_COUNT,
  type Song,
} from "./song";

/** Una cançó amb contingut a les ranures demanades. */
function ambContingut(...plenes: number[]): Song {
  const s = emptySong();
  for (let i = 0; i < SLOT_COUNT; i++) {
    s.slots[i].pattern = emptyPattern(`ranura ${i}`);
  }
  for (const i of plenes) s.slots[i].pattern.tracks[0].steps[0] = 1;
  return s;
}

describe("la cançó", () => {
  it("té vuit ranures i comença a la primera", () => {
    const s = emptySong();
    expect(s.slots).toHaveLength(SLOT_COUNT);
    expect(s.current).toBe(0);
  });

  it("porta un exemple a la primera ranura i la resta en blanc", () => {
    const s = emptySong();
    expect(isEmptyPattern(s.slots[0].pattern)).toBe(false);
    for (let i = 1; i < SLOT_COUNT; i++) {
      expect(isEmptyPattern(s.slots[i].pattern), `ranura ${i}`).toBe(true);
    }
  });

  it("es clona sense compartir res", () => {
    const a = emptySong();
    const abans = a.slots[0].pattern.tracks[0].steps[1];
    const b = cloneSong(a);
    b.slots[0].pattern.tracks[0].steps[1] = 2;
    b.slots[0].pattern.name = "canviat";
    b.slots[1].follow = { kind: "goto", every: 2, slot: 3 };
    expect(a.slots[0].pattern.tracks[0].steps[1]).toBe(abans);
    expect(a.slots[0].pattern.name).not.toBe("canviat");
    expect(a.slots[1].follow.kind).toBe("loop");
  });

  it("diu quin patró sona", () => {
    const s = emptySong();
    s.current = 3;
    expect(currentPattern(s)).toBe(s.slots[3].pattern);
  });

  it("sap quan una ranura és buida, notes incloses", () => {
    const p = emptyPattern();
    expect(isEmptyPattern(p)).toBe(true);
    const ambBaix = emptyPattern();
    ambBaix.tracks.find((t) => t.kind === "baix")!.bass![2] = {
      midi: 45,
      length: 1,
      accent: false,
    };
    expect(isEmptyPattern(ambBaix)).toBe(false);
    expect(isEmptyPattern(PRESETS[0])).toBe(false);
  });
});

describe("repeteix", () => {
  it("es queda on és", () => {
    const s = emptySong();
    expect(resolveFollow(s, 0)).toBe(0);
    expect(resolveFollow(s, 5)).toBe(5);
  });
});

describe("següent", () => {
  it("passa a la ranura del costat", () => {
    const s = ambContingut(0, 1);
    s.slots[0].follow = { kind: "next", every: 1 };
    expect(resolveFollow(s, 0)).toBe(1);
  });

  it("es salta les buides", () => {
    const s = ambContingut(0, 4);
    s.slots[0].follow = { kind: "next", every: 1 };
    expect(resolveFollow(s, 0)).toBe(4);
  });

  it("dona la volta al final", () => {
    const s = ambContingut(2, 7);
    s.slots[7].follow = { kind: "next", every: 1 };
    expect(resolveFollow(s, 7)).toBe(2);
  });

  it("es queda on és si no hi ha res més", () => {
    const s = ambContingut(3);
    s.slots[3].follow = { kind: "next", every: 1 };
    expect(resolveFollow(s, 3)).toBe(3);
  });
});

describe("salta a", () => {
  it("va on li diuen", () => {
    const s = emptySong();
    s.slots[0].follow = { kind: "goto", every: 4, slot: 6 };
    expect(resolveFollow(s, 0)).toBe(6);
  });

  it("hi va encara que la ranura sigui buida", () => {
    const s = ambContingut(0);
    s.slots[0].follow = { kind: "goto", every: 1, slot: 5 };
    expect(resolveFollow(s, 0)).toBe(5);
  });

  it("no se'n va fora del banc", () => {
    const s = emptySong();
    s.slots[0].follow = { kind: "goto", every: 1, slot: 99 };
    expect(resolveFollow(s, 0)).toBe(0);
    s.slots[0].follow = { kind: "goto", every: 1, slot: -3 };
    expect(resolveFollow(s, 0)).toBe(0);
  });
});

describe("a l'atzar", () => {
  it("tria d'entre les candidates", () => {
    const s = emptySong();
    s.slots[0].follow = { kind: "random", every: 1, candidates: [2, 4, 6] };
    expect(resolveFollow(s, 0, () => 0)).toBe(2);
    expect(resolveFollow(s, 0, () => 0.5)).toBe(4);
    expect(resolveFollow(s, 0, () => 0.99)).toBe(6);
  });

  it("no se'n va de la llista ni amb un atzar de valor 1", () => {
    const s = emptySong();
    s.slots[0].follow = { kind: "random", every: 1, candidates: [1, 3] };
    expect([1, 3]).toContain(resolveFollow(s, 0, () => 1));
  });

  it("descarta les candidates que no existeixen", () => {
    const s = emptySong();
    s.slots[0].follow = { kind: "random", every: 1, candidates: [99, 5, -2] };
    expect(resolveFollow(s, 0, () => 0.5)).toBe(5);
  });

  it("es queda on és si no n'hi ha cap", () => {
    const s = emptySong();
    s.slots[0].follow = { kind: "random", every: 1, candidates: [] };
    expect(resolveFollow(s, 0)).toBe(0);
  });

  it("reparteix entre totes les candidates", () => {
    const s = emptySong();
    s.slots[0].follow = { kind: "random", every: 1, candidates: [1, 2, 3] };
    const vistes = new Set<number>();
    for (let i = 0; i < 300; i++) vistes.add(resolveFollow(s, 0));
    expect([...vistes].sort()).toEqual([1, 2, 3]);
  });
});

describe("sigui quina sigui l'acció", () => {
  it("mai no dona una ranura que no existeixi", () => {
    const s = ambContingut(0, 2, 5);
    const accions = [
      { kind: "loop", every: 1 },
      { kind: "next", every: 1 },
      { kind: "goto", every: 1, slot: 200 },
      { kind: "random", every: 1, candidates: [0, 99] },
    ] as const;
    for (const a of accions) {
      for (let from = 0; from < SLOT_COUNT; from++) {
        s.slots[from].follow = { ...a } as Song["slots"][number]["follow"];
        const i = resolveFollow(s, from);
        expect(Number.isInteger(i), a.kind).toBe(true);
        expect(i, a.kind).toBeGreaterThanOrEqual(0);
        expect(i, a.kind).toBeLessThan(SLOT_COUNT);
      }
    }
  });
});
