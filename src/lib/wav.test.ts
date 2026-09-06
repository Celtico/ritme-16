import { describe, expect, it } from "vitest";
import { encodeWav, toPcm16, wavFileName, type RenderedAudio } from "./wav";

function fals(canals: number, mostres: number, sampleRate = 48000): RenderedAudio {
  const dades = Array.from({ length: canals }, (_, c) =>
    Float32Array.from({ length: mostres }, (_, i) => (c === 0 ? 1 : -1) * (i / mostres)),
  );
  return {
    numberOfChannels: canals,
    sampleRate,
    length: mostres,
    getChannelData: (c) => dades[c],
  };
}

const text = (v: DataView, offset: number, mida: number) =>
  String.fromCharCode(
    ...Array.from({ length: mida }, (_, i) => v.getUint8(offset + i)),
  );

describe("mostres a 16 bits", () => {
  it("posa el silenci a zero", () => {
    expect(toPcm16(0)).toBe(0);
  });

  it("arriba als extrems sense passar-se'n", () => {
    expect(toPcm16(1)).toBe(32767);
    expect(toPcm16(-1)).toBe(-32768);
  });

  it("reté el que se surt de -1 a 1 en comptes de donar la volta", () => {
    expect(toPcm16(3)).toBe(32767);
    expect(toPcm16(-9)).toBe(-32768);
  });

  it("no dona mai un valor fora del que cap en 16 bits", () => {
    for (let i = -20; i <= 20; i++) {
      const v = toPcm16(i / 7);
      expect(v).toBeGreaterThanOrEqual(-32768);
      expect(v).toBeLessThanOrEqual(32767);
    }
  });
});

describe("capçal WAV", () => {
  const buffer = encodeWav(fals(2, 100, 44100));
  const v = new DataView(buffer);

  it("porta les marques que espera qualsevol reproductor", () => {
    expect(text(v, 0, 4)).toBe("RIFF");
    expect(text(v, 8, 4)).toBe("WAVE");
    expect(text(v, 12, 4)).toBe("fmt ");
    expect(text(v, 36, 4)).toBe("data");
  });

  it("diu que és PCM de 16 bits amb els canals i la freqüència bons", () => {
    expect(v.getUint16(20, true)).toBe(1);
    expect(v.getUint16(22, true)).toBe(2);
    expect(v.getUint32(24, true)).toBe(44100);
    expect(v.getUint16(34, true)).toBe(16);
  });

  it("calcula bé els bytes per segon i l'alineació de bloc", () => {
    // 44100 × 2 canals × 2 bytes
    expect(v.getUint32(28, true)).toBe(44100 * 4);
    expect(v.getUint16(32, true)).toBe(4);
  });

  it("declara les mides que realment té el fitxer", () => {
    const dades = 100 * 2 * 2;
    expect(v.getUint32(40, true)).toBe(dades);
    expect(v.getUint32(4, true)).toBe(36 + dades);
    expect(buffer.byteLength).toBe(44 + dades);
  });
});

describe("les mostres", () => {
  it("van entrellaçades, un canal darrere l'altre", () => {
    const buffer = encodeWav(fals(2, 4));
    const v = new DataView(buffer);
    // el canal 0 puja i el canal 1 baixa
    for (let i = 0; i < 4; i++) {
      const esq = v.getInt16(44 + i * 4, true);
      const dre = v.getInt16(44 + i * 4 + 2, true);
      expect(esq).toBeGreaterThanOrEqual(0);
      expect(dre).toBeLessThanOrEqual(0);
    }
  });

  it("va bé amb un sol canal", () => {
    const buffer = encodeWav(fals(1, 10));
    const v = new DataView(buffer);
    expect(v.getUint16(22, true)).toBe(1);
    expect(buffer.byteLength).toBe(44 + 10 * 2);
  });

  it("no peta amb un buffer buit", () => {
    const buffer = encodeWav(fals(2, 0));
    expect(buffer.byteLength).toBe(44);
    expect(new DataView(buffer).getUint32(40, true)).toBe(0);
  });
});

describe("nom del fitxer", () => {
  it("treu accents, espais i signes", () => {
    expect(wavFileName("Cambra lenta")).toBe("cambra-lenta.wav");
    expect(wavFileName("Quatre per terra")).toBe("quatre-per-terra.wav");
    expect(wavFileName("Ritme #1 (còpia)")).toBe("ritme-1-copia.wav");
  });

  it("no deixa mai un nom buit", () => {
    expect(wavFileName("")).toBe("ritme-16.wav");
    expect(wavFileName("···")).toBe("ritme-16.wav");
  });
});
