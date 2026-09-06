import { describe, expect, it } from "vitest";
import {
  defaultMix,
  defaultParams,
  defaultReturns,
  emptyPattern,
  KINDS,
  lane,
  VOICE_KINDS,
} from "./pattern";
import { normalise } from "./storage";

/** Un patró tal com el desava la versió anterior: registres per tipus de veu. */
function patroAntic() {
  return {
    name: "Antic",
    bpm: 118,
    swing: 0.2,
    steps: {
      bombo: lane("X...x...X...x..."),
      caixa: lane("....X.......X..."),
    },
    mix: {
      bombo: { volume: -3, muted: false, solo: true },
      caixa: { volume: 0, muted: true, solo: false },
    },
  };
}

describe("migració del model antic", () => {
  it("converteix els registres per veu en una llista de pistes", () => {
    const p = normalise(patroAntic());
    expect(p.tracks.map((t) => t.kind)).toEqual(VOICE_KINDS);
    expect(p.name).toBe("Antic");
    expect(p.bpm).toBe(118);
    expect(p.swing).toBe(0.2);
  });

  it("dona ids estables, derivats del tipus de veu que els indexava", () => {
    const p = normalise(patroAntic());
    expect(p.tracks.map((t) => t.id)).toEqual(VOICE_KINDS);
    // dues migracions del mateix patró donen exactament el mateix
    expect(normalise(patroAntic())).toEqual(p);
  });

  it("conserva els passos i la barreja que hi havia", () => {
    const p = normalise(patroAntic());
    const bombo = p.tracks.find((t) => t.id === "bombo")!;
    expect(bombo.steps).toEqual(lane("X...x...X...x..."));
    expect(bombo.mix).toEqual({
      volume: -3,
      muted: false,
      solo: true,
      pan: 0,
      sendA: 0,
      sendB: 0,
    });
    expect(p.tracks.find((t) => t.id === "caixa")!.mix.muted).toBe(true);
  });

  it("completa amb pistes buides les veus que no hi eren", () => {
    const p = normalise(patroAntic());
    const aro = p.tracks.find((t) => t.id === "aro")!;
    expect(aro.steps).toHaveLength(16);
    expect(aro.steps.every((c) => c === 0)).toBe(true);
    expect(aro.mix).toEqual(defaultMix());
  });

  it("posa els comandaments de fàbrica als patrons anteriors al kit editable", () => {
    const p = normalise(patroAntic());
    for (const t of p.tracks) {
      expect(t.sound, t.id).toEqual(defaultParams(t.kind));
    }
  });

  it("respecta el sound desat i només hi completa el que falti", () => {
    const antic = { ...patroAntic(), sound: { bombo: { pitch: -5 } } };
    const p = normalise(antic);
    const bombo = p.tracks.find((t) => t.id === "bombo")!;
    expect(bombo.sound.pitch).toBe(-5);
    expect(bombo.sound.drive).toBe(0);
    expect(bombo.sound.decay).toBe(KINDS.bombo.decay);
  });
});

describe("enviaments, panoràmic i retorns", () => {
  it("posa pan i sends a zero als patrons que no en portaven", () => {
    const p = normalise(patroAntic());
    for (const t of p.tracks) {
      expect(t.mix.pan, t.id).toBe(0);
      expect(t.mix.sendA, t.id).toBe(0);
      expect(t.mix.sendB, t.id).toBe(0);
    }
  });

  it("dona els retorns de fàbrica als patrons que no en tenien", () => {
    expect(normalise(patroAntic()).returns).toEqual(defaultReturns());
  });

  it("conserva els retorns desats", () => {
    const p = emptyPattern("Amb retorns");
    p.returns.a.decay = 5;
    p.returns.b.time = "4n";
    p.returns.b.muted = true;
    const out = normalise(p);
    expect(out.returns.a.decay).toBe(5);
    expect(out.returns.b.time).toBe("4n");
    expect(out.returns.b.muted).toBe(true);
  });

  it("reté els valors dins dels seus marges", () => {
    const brut = {
      ...emptyPattern(),
      returns: {
        a: { decay: 999, wet: 5, muted: false },
        b: { time: "brossa", feedback: 3, wet: -2, muted: false },
      },
    };
    const r = normalise(brut).returns;
    expect(r.a.decay).toBe(8);
    expect(r.a.wet).toBe(1);
    // un realimentat per damunt de 0,9 no s'apagaria mai
    expect(r.b.feedback).toBe(0.9);
    expect(r.b.wet).toBe(0);
    expect(r.b.time).toBe("8n");
  });

  it("reté el panoràmic i els enviaments", () => {
    const p = emptyPattern();
    const brut = {
      ...p,
      tracks: [{ ...p.tracks[0], mix: { volume: 0, pan: -9, sendA: 4, sendB: -1 } }],
    };
    const mix = normalise(brut).tracks[0].mix;
    expect(mix.pan).toBe(-1);
    expect(mix.sendA).toBe(1);
    expect(mix.sendB).toBe(0);
  });
});

describe("normalise del model nou", () => {
  it("deixa passar un patró correcte sense tocar-lo", () => {
    const p = emptyPattern("Bo");
    p.tracks[0].steps[0] = 2;
    expect(normalise(p)).toEqual(p);
  });

  it("descarta pistes amb un tipus que no coneix", () => {
    const p = emptyPattern("Amb brossa");
    const brut = {
      ...p,
      tracks: [...p.tracks, { id: "x", kind: "teremin", steps: [], mix: {} }],
    };
    expect(normalise(brut).tracks).toHaveLength(10);
  });

  it("desfà els ids repetits, que farien compartir cadena de síntesi", () => {
    const p = emptyPattern();
    const brut = { ...p, tracks: [p.tracks[0], { ...p.tracks[0] }] };
    const ids = normalise(brut).tracks.map((t) => t.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("arregla les files amb un nombre de cel·les que no toca", () => {
    const p = emptyPattern();
    const brut = {
      ...p,
      tracks: [{ ...p.tracks[0], steps: [1, 2, 9, null, 1] }],
    };
    const steps = normalise(brut).tracks[0].steps;
    expect(steps).toHaveLength(16);
    expect(steps.slice(0, 5)).toEqual([1, 2, 0, 0, 1]);
  });

  it("no es queda mai sense pistes", () => {
    expect(normalise({ bpm: 100, tracks: [] }).tracks).toHaveLength(10);
    expect(normalise(null).tracks).toHaveLength(10);
    expect(normalise("brossa").tracks).toHaveLength(10);
  });

  it("no comparteix estructures amb el patró d'entrada", () => {
    const antic = patroAntic();
    const p = normalise(antic);
    p.tracks[0].steps[1] = 2;
    expect(antic.steps.bombo[1]).toBe(0);
  });
});
