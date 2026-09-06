import { afterEach, describe, expect, it } from "vitest";
import { caiguda, creixement, MAX_INSTANCES, Scene } from "./Scene";
import type { VisualState } from "./Scene";

/**
 * L'escena es prova amb un canvas fals i un WebGL de mentida, sense jsdom:
 * three només és una dependència més i no calia afegir-ne cap altra. El mock
 * dona un número diferent a cada constant i el torna a traduir a nom quan
 * demanen getParameter, que és l'única cosa que three vol de debò per
 * construir-se.
 */
function falsGl() {
  const noms = new Map<number, string>();
  const ids = new Map<string, number>();
  let seguent = 1;

  const funcions: Record<string, (...args: unknown[]) => unknown> = {
    getParameter: (id) => {
      const nom = noms.get(id as number) ?? "";
      if (nom === "VERSION") return "WebGL 2.0";
      if (nom === "SCISSOR_BOX" || nom === "VIEWPORT") return [0, 0, 300, 150];
      if (nom === "MAX_VIEWPORT_DIMS") return [4096, 4096];
      if (nom.startsWith("MAX_")) return 4096;
      return 0;
    },
    getShaderPrecisionFormat: () => ({
      rangeMin: 127,
      rangeMax: 127,
      precision: 23,
    }),
    getExtension: () => null,
    getSupportedExtensions: () => [],
    getContextAttributes: () => ({}),
    getProgramParameter: () => true,
    getShaderParameter: () => true,
    getProgramInfoLog: () => "",
    getShaderInfoLog: () => "",
    isContextLost: () => false,
  };

  return new Proxy({} as Record<string, unknown>, {
    get(_t, prop) {
      if (typeof prop !== "string") return undefined;
      // Les constants de WebGL són en majúscules; tot el que no ho és, és
      // una funció, i la majoria a three no en miren el resultat.
      if (/^[A-Z][A-Z0-9_]*$/.test(prop)) {
        let id = ids.get(prop);
        if (id === undefined) {
          id = seguent++;
          ids.set(prop, id);
          noms.set(id, prop);
        }
        return id;
      }
      return funcions[prop] ?? (() => null);
    },
  });
}

function falsCanvas(): HTMLCanvasElement {
  const gl = falsGl();
  return {
    width: 300,
    height: 150,
    clientWidth: 300,
    clientHeight: 150,
    style: {},
    getContext: () => gl,
    addEventListener: () => {},
    removeEventListener: () => {},
    setAttribute: () => {},
  } as unknown as HTMLCanvasElement;
}

function entornDom() {
  const previ = {
    window: (globalThis as Record<string, unknown>).window,
    document: (globalThis as Record<string, unknown>).document,
    getComputedStyle: (globalThis as Record<string, unknown>).getComputedStyle,
  };
  const g = globalThis as Record<string, unknown>;
  g.window = { devicePixelRatio: 2 };
  g.document = { documentElement: {} };
  g.getComputedStyle = () => ({ getPropertyValue: () => "#c98a2b" });
  return () => {
    g.window = previ.window;
    g.document = previ.document;
    g.getComputedStyle = previ.getComputedStyle;
  };
}

let neteja: (() => void) | null = null;
afterEach(() => {
  neteja?.();
  neteja = null;
});

function pista(id: string, steps: number[]) {
  return { id, color: "oxblood", steps };
}

const BUIT: VisualState = {
  length: 16,
  tracks: [],
  stepFloat: 0,
  levels: {},
  playing: false,
};

describe("Scene", () => {
  it("es construeix i s'allibera amb un canvas fals", async () => {
    neteja = entornDom();
    const escena = new Scene(falsCanvas());
    await escena.init();
    expect(() => escena.dispose()).not.toThrow();
  });

  it("no peta amb un patró buit", async () => {
    neteja = entornDom();
    const escena = new Scene(falsCanvas());
    await escena.init();
    expect(() => escena.update(BUIT)).not.toThrow();
    expect(escena.instancies).toBe(0);
    expect(() => escena.update(null)).not.toThrow();
    escena.dispose();
  });

  it("dibuixa un bloc per pas i per pista, i mai més del que hi cap", async () => {
    neteja = entornDom();
    const escena = new Scene(falsCanvas());
    await escena.init();

    escena.update({
      ...BUIT,
      tracks: [pista("a", Array(16).fill(1)), pista("b", Array(16).fill(0))],
    });
    expect(escena.instancies).toBe(32);

    // Més pistes i més passos dels que caben: es queda al límit reservat.
    escena.update({
      ...BUIT,
      length: 32,
      tracks: Array.from({ length: 20 }, (_, i) =>
        pista(`p${i}`, Array(32).fill(1)),
      ),
    });
    expect(escena.instancies).toBe(MAX_INSTANCES);
    escena.dispose();
  });

  it("obrir i tancar deu vegades no deixa res a mig alliberar", async () => {
    neteja = entornDom();
    for (let i = 0; i < 10; i++) {
      const escena = new Scene(falsCanvas());
      await escena.init();
      escena.update({ ...BUIT, tracks: [pista("a", Array(16).fill(1))] });
      escena.dispose();
      expect(escena.instancies).toBe(0);
    }
  });
});

describe("el cop del vúmetre", () => {
  it("puja de cop i torna a zero en 120 ms", () => {
    const pujada = caiguda(0, 0.8, 0.016);
    expect(pujada).toBe(0.8);
    // 120 ms després de la pujada ja no queda res.
    expect(caiguda(pujada, 0, 0.12)).toBe(0);
    // A mig camí en queda la meitat.
    expect(caiguda(pujada, 0, 0.06)).toBeCloseTo(0.3, 5);
  });

  it("fa créixer el bloc que sona un 30% com a màxim", () => {
    expect(creixement(false, 1)).toBe(1);
    expect(creixement(true, 0)).toBe(1);
    expect(creixement(true, 1)).toBeCloseTo(1.3, 5);
    expect(creixement(true, 4)).toBeCloseTo(1.3, 5);
    expect(creixement(true, 0.5)).toBeCloseTo(1.15, 5);
  });
});
