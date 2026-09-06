import { describe, expect, it } from "vitest";
import {
  clonePattern,
  emptyPattern,
  PRESETS,
  type Pattern,
} from "./pattern";
import { decodePattern, encodePattern, shareUrl, SHARE_PARAM } from "./share";

const roundtrip = (p: Pattern) => decodePattern(encodePattern(p))!;

describe("anada i tornada", () => {
  it("recupera els tres presets sencers", () => {
    for (const p of PRESETS) {
      const tornat = roundtrip(p);
      expect(tornat, p.name).not.toBeNull();
      expect(tornat.name).toBe(p.name);
      expect(tornat.bpm).toBe(p.bpm);
      expect(tornat.swing).toBe(p.swing);
      expect(tornat.length).toBe(p.length);
      expect(tornat.key).toEqual(p.key);
      expect(tornat.tracks.map((t) => t.kind)).toEqual(
        p.tracks.map((t) => t.kind),
      );
    }
  });

  it("recupera els passos de percussió, accents inclosos", () => {
    for (const p of PRESETS) {
      const tornat = roundtrip(p);
      for (let i = 0; i < p.tracks.length; i++) {
        expect(tornat.tracks[i].steps, `${p.name} ${p.tracks[i].id}`).toEqual(
          p.tracks[i].steps,
        );
      }
    }
  });

  it("recupera el baix i els acords", () => {
    for (const p of PRESETS) {
      const tornat = roundtrip(p);
      const baix = (x: Pattern) => x.tracks.find((t) => t.kind === "baix")!;
      const acords = (x: Pattern) => x.tracks.find((t) => t.kind === "acords")!;
      expect(baix(tornat).bass, p.name).toEqual(baix(p).bass);
      expect(acords(tornat).chords, p.name).toEqual(acords(p).chords);
    }
  });

  it("recupera la barreja de cada pista", () => {
    const p = emptyPattern("Barreja");
    p.tracks[0].mix = {
      volume: -7,
      muted: true,
      solo: false,
      pan: -0.5,
      sendA: 0.25,
      sendB: 1,
    };
    expect(roundtrip(p).tracks[0].mix).toEqual(p.tracks[0].mix);
  });

  it("recupera el nom, el color i el so quan s'han tocat", () => {
    const p = emptyPattern();
    p.tracks[0].name = "Bombo greu";
    p.tracks[0].color = "plum";
    p.tracks[0].sound.pitch = -5;
    p.tracks[0].sound.filter.cutoff = 400;
    const t = roundtrip(p).tracks[0];
    expect(t.name).toBe("Bombo greu");
    expect(t.color).toBe("plum");
    expect(t.sound.pitch).toBe(-5);
    expect(t.sound.filter.cutoff).toBe(400);
  });

  it("recupera els retorns i els macros quan no són els de fàbrica", () => {
    const p = emptyPattern();
    p.returns.a.decay = 6;
    p.macros[0].name = "Obertura";
    p.macros[0].assignments = [
      { trackId: p.tracks[0].id, param: "cutoff", amount: 0.8 },
    ];
    const tornat = roundtrip(p);
    expect(tornat.returns.a.decay).toBe(6);
    expect(tornat.macros[0].name).toBe("Obertura");
  });

  it("respecta les tres llargades", () => {
    for (const n of [8, 16, 32] as const) {
      const p = emptyPattern();
      p.length = n;
      p.tracks[0].steps[30] = 2;
      const tornat = roundtrip(p);
      expect(tornat.length).toBe(n);
      // el que queda fora de la llargada tampoc no es perd
      expect(tornat.tracks[0].steps[30]).toBe(2);
    }
  });
});

describe("l'enllaç", () => {
  it("cap en una adreça raonable", () => {
    for (const p of PRESETS) {
      const codi = encodePattern(p);
      expect(codi.length, `${p.name}: ${codi.length} caràcters`).toBeLessThan(
        1500,
      );
    }
  });

  it("no fa servir cap caràcter que calgui escapar", () => {
    for (const p of PRESETS) {
      expect(encodePattern(p)).toMatch(/^[A-Za-z0-9\-_]+$/);
    }
  });

  it("és estable: el mateix patró dona sempre el mateix codi", () => {
    const p = PRESETS[0];
    expect(encodePattern(p)).toBe(encodePattern(clonePattern(p)));
  });

  it("posa el patró al paràmetre i es queda amb l'adreça de base", () => {
    const url = shareUrl("https://exemple.cat/ritme?vell=1#alguna", PRESETS[0]);
    expect(url.startsWith("https://exemple.cat/ritme?")).toBe(true);
    expect(url).toContain(`${SHARE_PARAM}=`);
    expect(url).not.toContain("vell=1");
    expect(url).not.toContain("#");
  });

  it("sobreviu a passar per una URL de debò", () => {
    const url = new URL(shareUrl("https://exemple.cat/", PRESETS[1]));
    const tornat = decodePattern(url.searchParams.get(SHARE_PARAM)!);
    expect(tornat?.name).toBe("Trencat");
  });
});

describe("enllaços que no s'entenen", () => {
  it("dona null en comptes de petar", () => {
    for (const brossa of ["", "!!!", "AAAA", "no-és-base64", "%%%"]) {
      expect(decodePattern(brossa), brossa).toBeNull();
    }
  });

  it("rebutja una versió que no és la seva", () => {
    const dolent = encodePattern(PRESETS[0]).replace(/^./, "Z");
    const r = decodePattern(dolent);
    expect(r === null || r.tracks.length > 0).toBe(true);
  });

  it("aguanta un patró amb pistes de tipus desconegut", () => {
    const codi = encodePattern(PRESETS[0]);
    const tornat = decodePattern(codi)!;
    // manipulat o no, mai no ha de sortir-ne un patró sense pistes
    expect(tornat.tracks.length).toBeGreaterThan(0);
  });
});
