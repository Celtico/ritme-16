import { describe, expect, it } from "vitest";
import {
  addTrack,
  duplicateTrack,
  emptyPattern,
  MAX_TRACKS,
  moveTrack,
  removeTrack,
  TRACK_COLORS,
  uniqueTrackId,
  VOICE_KINDS,
  type Pattern,
} from "./pattern";

const ids = (p: Pattern) => p.tracks.map((t) => t.id);
const unics = (p: Pattern) => new Set(ids(p)).size === p.tracks.length;

describe("afegir pistes", () => {
  it("la posa al final, del tipus demanat", () => {
    const base = emptyPattern();
    const p = addTrack(base, "caixa");
    expect(p.tracks).toHaveLength(base.tracks.length + 1);
    const nova = p.tracks[p.tracks.length - 1];
    expect(nova.kind).toBe("caixa");
    expect(nova.name).toBe("Caixa");
  });

  it("dona un id nou quan el tipus ja hi és", () => {
    const p = addTrack(emptyPattern(), "bombo");
    expect(p.tracks[p.tracks.length - 1].id).not.toBe("bombo");
    expect(unics(p)).toBe(true);
  });

  it("manté els ids únics afegint-ne moltes del mateix tipus", () => {
    let p = emptyPattern();
    for (let i = 0; i < 8; i++) p = addTrack(p, "bombo");
    expect(p.tracks).toHaveLength(MAX_TRACKS);
    expect(unics(p)).toBe(true);
  });

  it("no passa mai del límit", () => {
    let p = emptyPattern();
    for (let i = 0; i < 40; i++) p = addTrack(p, "aro");
    expect(p.tracks).toHaveLength(MAX_TRACKS);
  });

  it("no toca el patró original", () => {
    const p = emptyPattern();
    const abans = p.tracks.length;
    addTrack(p, "caixa");
    expect(p.tracks).toHaveLength(abans);
  });
});

describe("duplicar pistes", () => {
  it("copia els passos i el so, amb un id nou i just a sota", () => {
    const original = emptyPattern();
    original.tracks[0].steps[3] = 2;
    original.tracks[0].sound.pitch = -5;
    const p = duplicateTrack(original, "bombo");
    const copia = p.tracks[1];
    expect(copia.id).not.toBe("bombo");
    expect(copia.name).toBe("Bombo (còpia)");
    expect(copia.steps[3]).toBe(2);
    expect(copia.sound.pitch).toBe(-5);
    expect(unics(p)).toBe(true);
  });

  it("no comparteix estructures amb l'original", () => {
    const original = emptyPattern();
    const p = duplicateTrack(original, "bombo");
    p.tracks[1].steps[0] = 2;
    expect(p.tracks[0].steps[0]).toBe(0);
  });

  it("no fa res amb una pista que no existeix, ni passa del límit", () => {
    const p = emptyPattern();
    expect(duplicateTrack(p, "fantasma")).toBe(p);
    let ple = emptyPattern();
    for (let i = 0; i < 8; i++) ple = addTrack(ple, "aro");
    expect(duplicateTrack(ple, "bombo").tracks).toHaveLength(MAX_TRACKS);
  });
});

describe("eliminar pistes", () => {
  it("la treu i deixa la resta en ordre", () => {
    const base = emptyPattern();
    const p = removeTrack(base, "palmada");
    expect(p.tracks).toHaveLength(base.tracks.length - 1);
    expect(ids(p)).toEqual(ids(base).filter((id) => id !== "palmada"));
  });

  it("neteja les assignacions de macro que hi apuntaven", () => {
    const original = emptyPattern();
    original.macros[0].assignments = [
      { trackId: "bombo", param: "cutoff", amount: 1 },
      { trackId: "caixa", param: "decay", amount: 1 },
    ];
    const p = removeTrack(original, "bombo");
    expect(p.macros[0].assignments).toEqual([
      { trackId: "caixa", param: "decay", amount: 1 },
    ]);
  });

  it("no deixa mai el patró sense cap pista", () => {
    let p = emptyPattern();
    for (const id of [...ids(p)]) p = removeTrack(p, id);
    expect(p.tracks).toHaveLength(1);
  });

  it("no fa res amb una pista que no existeix", () => {
    const p = emptyPattern();
    expect(removeTrack(p, "fantasma")).toBe(p);
  });
});

describe("moure pistes", () => {
  it("intercanvia amb la del costat", () => {
    const p = moveTrack(emptyPattern(), "caixa", -1);
    expect(ids(p).slice(0, 3)).toEqual(["caixa", "bombo", "palmada"]);
    const q = moveTrack(emptyPattern(), "caixa", 1);
    expect(ids(q).slice(0, 3)).toEqual(["bombo", "palmada", "caixa"]);
  });

  it("no es mou als extrems", () => {
    const p = emptyPattern();
    expect(moveTrack(p, ids(p)[0], -1)).toBe(p);
    expect(moveTrack(p, ids(p)[p.tracks.length - 1], 1)).toBe(p);
  });

  it("no perd ni duplica cap pista", () => {
    let p = emptyPattern();
    const abans = [...ids(p)].sort();
    for (const [id, d] of [["aro", -1], ["bombo", 1], ["cencerro", -1]] as const) {
      p = moveTrack(p, id, d);
    }
    expect([...ids(p)].sort()).toEqual(abans);
    expect(unics(p)).toBe(true);
  });
});

describe("ids i colors", () => {
  it("no repeteix mai un id que ja hi és", () => {
    const p = emptyPattern();
    expect(uniqueTrackId(p, "nou")).toBe("nou");
    expect(uniqueTrackId(p, "bombo")).toBe("bombo-2");
  });

  it("dona vuit colors, tots diferents", () => {
    expect(TRACK_COLORS).toHaveLength(8);
    expect(new Set(TRACK_COLORS).size).toBe(8);
  });

  it("cada tipus de veu tria un color de la paleta", () => {
    const p = emptyPattern();
    for (const t of p.tracks) {
      expect(TRACK_COLORS as readonly string[], t.kind).toContain(t.color);
    }
    expect(VOICE_KINDS.length).toBe(10);
  });
});
