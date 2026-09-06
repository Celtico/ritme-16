import { describe, expect, it } from "vitest";
import { magnitudeDb, responseCurve } from "./filter";

const db = (t: Parameters<typeof magnitudeDb>[0], c: number, q: number, f: number) =>
  magnitudeDb(t, c, q, f);

describe("resposta del passa-baixos", () => {
  it("deixa passar sense tocar res molt per sota del tall", () => {
    expect(db("lowpass", 1000, 0.707, 50)).toBeCloseTo(0, 1);
  });

  it("cau 3 dB just a la freqüència de tall amb Q de Butterworth", () => {
    expect(db("lowpass", 1000, 0.707, 1000)).toBeCloseTo(-3, 0);
  });

  it("cau 12 dB per octava per damunt del tall", () => {
    // dues octaves amunt del tall: uns 24 dB avall, i quatre octaves, uns 48
    const duesOctaves = db("lowpass", 1000, 0.707, 4000);
    const quatreOctaves = db("lowpass", 1000, 0.707, 16000);
    expect(duesOctaves).toBeLessThan(-22);
    expect(duesOctaves).toBeGreaterThan(-27);
    expect(quatreOctaves - duesOctaves).toBeLessThan(-20);
  });

  it("fa una campana al tall quan la Q és alta", () => {
    expect(db("lowpass", 1000, 8, 1000)).toBeGreaterThan(15);
  });
});

describe("resposta del passa-alts", () => {
  it("és el mirall del passa-baixos: talla el greu i deixa passar l'agut", () => {
    expect(db("highpass", 1000, 0.707, 20000)).toBeCloseTo(0, 1);
    expect(db("highpass", 1000, 0.707, 1000)).toBeCloseTo(-3, 0);
    expect(db("highpass", 1000, 0.707, 250)).toBeLessThan(-22);
  });
});

describe("resposta del passa-banda", () => {
  it("dona guany zero al centre", () => {
    expect(db("bandpass", 1000, 1, 1000)).toBeCloseTo(0, 2);
  });

  it("cau als dos costats del centre", () => {
    expect(db("bandpass", 1000, 1, 200)).toBeLessThan(-10);
    expect(db("bandpass", 1000, 1, 5000)).toBeLessThan(-10);
  });

  it("s'estreny en pujar la Q", () => {
    const ample = db("bandpass", 1000, 0.5, 2000);
    const estret = db("bandpass", 1000, 8, 2000);
    expect(estret).toBeLessThan(ample);
  });
});

describe("corba per dibuixar", () => {
  it("dona el nombre de punts demanat, de greu a agut", () => {
    const c = responseCurve("lowpass", 1000, 0.707, 32);
    expect(c).toHaveLength(32);
    expect(c[0].freq).toBeCloseTo(20, 5);
    expect(c[31].freq).toBeCloseTo(20000, 5);
    for (let i = 1; i < c.length; i++) {
      expect(c[i].freq).toBeGreaterThan(c[i - 1].freq);
    }
  });

  it("reparteix els punts en escala logarítmica", () => {
    const c = responseCurve("lowpass", 1000, 0.707, 3);
    // el punt del mig ha de ser la mitjana geomètrica dels extrems
    expect(c[1].freq).toBeCloseTo(Math.sqrt(20 * 20000), 0);
  });

  it("no dona mai un valor que no sigui un nombre", () => {
    for (const t of ["lowpass", "highpass", "bandpass"] as const) {
      for (const q of [0.1, 0.707, 20]) {
        for (const { db: v } of responseCurve(t, 800, q, 48)) {
          expect(Number.isFinite(v), `${t} q=${q}`).toBe(true);
        }
      }
    }
  });
});
