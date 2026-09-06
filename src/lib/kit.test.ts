import { describe, expect, it } from "vitest";
import { createKit } from "./kit";
import { defaultParams, VOICE_KINDS } from "./voices";

type ToneModule = typeof import("tone");

/** Comptadors del que ha passat, per poder afirmar-hi coses. */
interface Registre {
  disparats: string[];
  eliminats: number;
  creats: number;
}

/**
 * Un Tone de mentida. createKit() rep el mòdul per paràmetre justament per
 * això: es pot provar el registre de pistes sense obrir cap AudioContext.
 */
function toneFals(reg: Registre) {
  const node = (extra: Record<string, unknown> = {}) => {
    reg.creats++;
    const n = {
      connect: () => n,
      toDestination: () => n,
      dispose: () => reg.eliminats++,
      ...extra,
    };
    return n;
  };
  const synth = (nom: string) =>
    node({
      envelope: { decay: 0, sustain: 0, release: 0 },
      resonance: 0,
      triggerAttackRelease: () => reg.disparats.push(nom),
      triggerRelease: () => reg.disparats.push(`${nom}:release`),
    });

  return {
    Compressor: class { constructor() { return node(); } },
    Volume: class { constructor() { return node({ volume: { value: 0 } }); } },
    Distortion: class {
      constructor() { return node({ distortion: 0, wet: { value: 0 } }); }
    },
    Filter: class {
      constructor() {
        return node({ frequency: { value: 0 }, Q: { value: 0 }, type: "lowpass" });
      }
    },
    FrequencyEnvelope: class {
      constructor() {
        return node({
          baseFrequency: 0,
          octaves: 0,
          attack: 0,
          decay: 0,
          sustain: 0,
          release: 0,
          triggerAttackRelease: () => {},
        });
      }
    },
    Envelope: class {
      constructor() {
        return node({
          attack: 0,
          decay: 0,
          sustain: 0,
          release: 0,
          triggerAttackRelease: () => {},
        });
      }
    },
    Scale: class { constructor() { return node({ min: 0, max: 0 }); } },
    Time: (v: unknown) => ({ toSeconds: () => 0.5, valueOf: () => v }),
    getTransport: () => ({ seconds: 0 }),
    LFO: class {
      constructor() {
        const n = node({
          frequency: { value: 0 },
          min: 0,
          max: 0,
          type: "sine",
          start: () => n,
        });
        Object.assign(n, { sync: () => n });
        return n;
      }
    },
    MembraneSynth: class { constructor() { return synth("membrana"); } },
    NoiseSynth: class { constructor() { return synth("soroll"); } },
    MetalSynth: class { constructor() { return synth("metall"); } },
    Frequency: (n: string) => ({
      transpose: () => ({ toFrequency: () => 65.4 }),
      toFrequency: () => 65.4,
      valueOf: () => n,
    }),
  } as unknown as ToneModule;
}

const nouRegistre = (): Registre => ({
  disparats: [],
  eliminats: 0,
  creats: 0,
});

describe("registre de pistes del kit", () => {
  it("sap fer una cadena de cada tipus de veu", () => {
    const reg = nouRegistre();
    const kit = createKit(toneFals(reg));
    for (const kind of VOICE_KINDS) {
      expect(() => kit.ensureTrack(kind, kind), kind).not.toThrow();
    }
    kit.dispose();
  });

  it("no torna a crear la cadena si la pista ja hi és amb el mateix tipus", () => {
    const reg = nouRegistre();
    const kit = createKit(toneFals(reg));
    kit.ensureTrack("a", "bombo");
    const creatsDespresDelPrimer = reg.creats;
    kit.ensureTrack("a", "bombo");
    expect(reg.creats).toBe(creatsDespresDelPrimer);
  });

  it("refà la cadena si la pista canvia de tipus", () => {
    const reg = nouRegistre();
    const kit = createKit(toneFals(reg));
    kit.ensureTrack("a", "bombo");
    reg.eliminats = 0;
    kit.ensureTrack("a", "cencerro");
    expect(reg.eliminats).toBeGreaterThan(0);
    kit.trigger("a", 0, 1);
    expect(reg.disparats).toEqual(["metall"]);
  });

  it("no peta en tocar una pista que no existeix", () => {
    const reg = nouRegistre();
    const kit = createKit(toneFals(reg));
    expect(() => kit.trigger("fantasma", 0, 1)).not.toThrow();
    expect(() => kit.setVolume("fantasma", -6)).not.toThrow();
    expect(() =>
      kit.setParams("fantasma", defaultParams("bombo")),
    ).not.toThrow();
    expect(() => kit.removeTrack("fantasma")).not.toThrow();
    expect(reg.disparats).toEqual([]);
  });

  it("deixa de sonar una pista eliminada", () => {
    const reg = nouRegistre();
    const kit = createKit(toneFals(reg));
    kit.ensureTrack("a", "bombo");
    kit.removeTrack("a");
    kit.trigger("a", 0, 1);
    expect(reg.disparats).toEqual([]);
  });

  it("dispara pistes diferents del mateix tipus per separat", () => {
    const reg = nouRegistre();
    const kit = createKit(toneFals(reg));
    kit.ensureTrack("bombo-1", "bombo");
    kit.ensureTrack("bombo-2", "bombo");
    kit.trigger("bombo-1", 0, 1);
    expect(reg.disparats).toHaveLength(1);
  });

  it("fa que el charles ofegui el charles obert i no cap altra veu", () => {
    const reg = nouRegistre();
    const kit = createKit(toneFals(reg));
    kit.ensureTrack("charles", "charles");
    kit.ensureTrack("obert", "charlesObert");
    kit.ensureTrack("aro", "aro");
    kit.trigger("charles", 0, 1);
    expect(reg.disparats).toEqual(["soroll:release", "soroll"]);
  });

  it("no ofega res quan el charles obert no hi és", () => {
    const reg = nouRegistre();
    const kit = createKit(toneFals(reg));
    kit.ensureTrack("charles", "charles");
    kit.trigger("charles", 0, 1);
    expect(reg.disparats).toEqual(["soroll"]);
  });
});
