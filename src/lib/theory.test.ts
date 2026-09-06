import { describe, expect, it } from "vitest";
import {
  degreeRoman,
  degreeToChord,
  isInScale,
  type Key,
  midiToName,
  scaleNotes,
  scalePitchClasses,
  snapToScale,
} from "./theory";

const DO_MAJOR: Key = { root: 0, mode: "major" };
const LA_MENOR: Key = { root: 9, mode: "minor" };
const RE_DORIC: Key = { root: 2, mode: "dorian" };

/** Els intervals de l'acord, que és el que en determina la qualitat. */
const qualitat = (acord: number[]) =>
  acord.slice(1).map((n) => n - acord[0]);

const TRIADA_MAJOR = [4, 7];
const TRIADA_MENOR = [3, 7];
const TRIADA_DISMINUIDA = [3, 6];

describe("escales", () => {
  it("dona els intervals de cada mode", () => {
    expect(scaleNotes({ root: 0, mode: "major" })).toEqual([
      0, 2, 4, 5, 7, 9, 11,
    ]);
    expect(scaleNotes({ root: 0, mode: "minor" })).toEqual([
      0, 2, 3, 5, 7, 8, 10,
    ]);
    expect(scaleNotes({ root: 0, mode: "dorian" })).toEqual([
      0, 2, 3, 5, 7, 9, 10,
    ]);
    expect(scaleNotes({ root: 0, mode: "mixolydian" })).toEqual([
      0, 2, 4, 5, 7, 9, 10,
    ]);
    expect(scaleNotes({ root: 0, mode: "pentMin" })).toEqual([0, 3, 5, 7, 10]);
    expect(scaleNotes({ root: 0, mode: "pentMaj" })).toEqual([0, 2, 4, 7, 9]);
  });

  it("no deixa que ningú modifiqui l'escala de dins", () => {
    const a = scaleNotes(DO_MAJOR);
    a[0] = 99;
    expect(scaleNotes(DO_MAJOR)[0]).toBe(0);
  });

  it("transposa les classes d'altura amb la fonamental", () => {
    // La menor no té cap alteració: les tecles blanques
    expect(scalePitchClasses(LA_MENOR).sort((x, y) => x - y)).toEqual([
      0, 2, 4, 5, 7, 9, 11,
    ]);
    // Re dòric tampoc
    expect(scalePitchClasses(RE_DORIC).sort((x, y) => x - y)).toEqual([
      0, 2, 4, 5, 7, 9, 11,
    ]);
  });
});

describe("acords per grau", () => {
  it("dona les set triades de Do major amb la qualitat correcta", () => {
    const esperat = [
      TRIADA_MAJOR, // I  Do
      TRIADA_MENOR, // ii Re
      TRIADA_MENOR, // iii Mi
      TRIADA_MAJOR, // IV Fa
      TRIADA_MAJOR, // V  Sol
      TRIADA_MENOR, // vi La
      TRIADA_DISMINUIDA, // vii° Si
    ];
    for (let g = 1; g <= 7; g++) {
      expect(qualitat(degreeToChord(DO_MAJOR, g, "triad")), `grau ${g}`).toEqual(
        esperat[g - 1],
      );
    }
  });

  it("dona les set triades de La menor amb la qualitat correcta", () => {
    const esperat = [
      TRIADA_MENOR, // i   La
      TRIADA_DISMINUIDA, // ii° Si
      TRIADA_MAJOR, // III Do
      TRIADA_MENOR, // iv  Re
      TRIADA_MENOR, // v   Mi
      TRIADA_MAJOR, // VI  Fa
      TRIADA_MAJOR, // VII Sol
    ];
    for (let g = 1; g <= 7; g++) {
      expect(qualitat(degreeToChord(LA_MENOR, g, "triad")), `grau ${g}`).toEqual(
        esperat[g - 1],
      );
    }
  });

  it("posa les notes justes al i i al VI de La menor", () => {
    // La-Do-Mi
    expect(degreeToChord(LA_MENOR, 1, "triad")).toEqual([9, 12, 16]);
    // Fa-La-Do, per damunt de la fonamental
    expect(degreeToChord(LA_MENOR, 6, "triad")).toEqual([17, 21, 24]);
  });

  it("fa que el V de major sigui de dominant i el I de major sigui major sèptima", () => {
    expect(qualitat(degreeToChord(DO_MAJOR, 5, "seventh"))).toEqual([4, 7, 10]);
    expect(qualitat(degreeToChord(DO_MAJOR, 1, "seventh"))).toEqual([4, 7, 11]);
  });

  it("dona el IV major que caracteritza el dòric", () => {
    expect(qualitat(degreeToChord(RE_DORIC, 4, "triad"))).toEqual(TRIADA_MAJOR);
    expect(qualitat(degreeToChord(RE_DORIC, 1, "triad"))).toEqual(TRIADA_MENOR);
  });

  it("dona tres notes a la triada i quatre a la sèptima", () => {
    expect(degreeToChord(LA_MENOR, 3, "triad")).toHaveLength(3);
    expect(degreeToChord(LA_MENOR, 3, "seventh")).toHaveLength(4);
  });

  it("puja d'octava en donar la volta a l'escala", () => {
    const i = degreeToChord(DO_MAJOR, 1, "triad");
    // el grau 8 és el mateix acord una octava amunt
    expect(degreeToChord(DO_MAJOR, 8, "triad")).toEqual(i.map((n) => n + 12));
  });

  it("no peta amb pentatòniques, tot i que només tinguin cinc graus", () => {
    const pent: Key = { root: 9, mode: "pentMin" };
    for (let g = 1; g <= 7; g++) {
      const acord = degreeToChord(pent, g, "seventh");
      expect(acord, `grau ${g}`).toHaveLength(4);
      // sempre ascendent
      for (let i = 1; i < acord.length; i++) {
        expect(acord[i]).toBeGreaterThan(acord[i - 1]);
      }
    }
  });

  it("manté les notes ordenades de greu a agut a tots els graus", () => {
    for (const key of [DO_MAJOR, LA_MENOR, RE_DORIC]) {
      for (let g = 1; g <= 7; g++) {
        for (const kind of ["triad", "seventh"] as const) {
          const acord = degreeToChord(key, g, kind);
          const ordenat = [...acord].sort((a, b) => a - b);
          expect(acord, `${key.mode} ${g} ${kind}`).toEqual(ordenat);
        }
      }
    }
  });
});

describe("numeració romana", () => {
  it("posa majúscules als majors i minúscules als menors", () => {
    expect([1, 2, 3, 4, 5, 6, 7].map((g) => degreeRoman(DO_MAJOR, g))).toEqual([
      "I",
      "ii",
      "iii",
      "IV",
      "V",
      "vi",
      "vii°",
    ]);
    expect([1, 2, 3, 4, 5, 6, 7].map((g) => degreeRoman(LA_MENOR, g))).toEqual([
      "i",
      "ii°",
      "III",
      "iv",
      "v",
      "VI",
      "VII",
    ]);
  });
});

describe("ajust a l'escala", () => {
  it("deixa on és una nota que ja hi pertany", () => {
    for (const midi of [57, 59, 60, 62, 64, 65, 67]) {
      expect(snapToScale(LA_MENOR, midi), String(midi)).toBe(midi);
    }
  });

  it("baixa la nota de fora d'escala fins a la de sota", () => {
    // Do# no és a La menor; el més proper per sota és Do
    expect(snapToScale(LA_MENOR, 61)).toBe(60);
    expect(snapToScale(LA_MENOR, 66)).toBe(65);
  });

  it("no es queda mai fora de l'escala, sigui quina sigui la nota", () => {
    for (const mode of ["major", "minor", "dorian", "pentMin"] as const) {
      for (let root = 0; root < 12; root++) {
        const key: Key = { root, mode };
        for (let midi = 36; midi < 84; midi++) {
          const ajustat = snapToScale(key, midi);
          expect(isInScale(key, ajustat), `${root} ${mode} ${midi}`).toBe(true);
          expect(Math.abs(ajustat - midi)).toBeLessThanOrEqual(3);
        }
      }
    }
  });
});

describe("noms de nota", () => {
  it("fa servir notació llatina i el Do central al MIDI 60", () => {
    expect(midiToName(60)).toBe("Do4");
    expect(midiToName(57)).toBe("La3");
    expect(midiToName(61)).toBe("Do#4");
    expect(midiToName(45)).toBe("La2");
    expect(midiToName(72)).toBe("Do5");
  });

  it("no fa servir mai lletres angleses", () => {
    for (let midi = 21; midi <= 108; midi++) {
      expect(midiToName(midi)).toMatch(/^(Do|Re|Mi|Fa|Sol|La|Si)#?-?\d+$/);
    }
  });
});
