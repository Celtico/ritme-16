/**
 * Codificació WAV de 16 bits. Cap dependència i cap API del navegador: rep
 * qualsevol cosa amb la forma d'un AudioBuffer, i per això es pot provar
 * sense obrir cap AudioContext.
 */

export interface RenderedAudio {
  numberOfChannels: number;
  sampleRate: number;
  /** Mostres per canal. */
  length: number;
  getChannelData(channel: number): Float32Array;
}

const BITS = 16;
const HEADER_BYTES = 44;

/** Converteix una mostra de -1..1 a un enter de 16 bits amb signe. */
export function toPcm16(sample: number): number {
  // el mínim i el màxim no són simètrics: -32768 i 32767
  const retallat = Math.max(-1, Math.min(1, sample));
  return Math.round(retallat < 0 ? retallat * 0x8000 : retallat * 0x7fff);
}

export function encodeWav(audio: RenderedAudio): ArrayBuffer {
  const canals = Math.max(1, audio.numberOfChannels);
  const mostres = audio.length;
  const bytesPerMostra = BITS / 8;
  const dades = mostres * canals * bytesPerMostra;
  const buffer = new ArrayBuffer(HEADER_BYTES + dades);
  const view = new DataView(buffer);

  const text = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  text(0, "RIFF");
  view.setUint32(4, 36 + dades, true);
  text(8, "WAVE");

  text(12, "fmt ");
  view.setUint32(16, 16, true); // mida del bloc fmt
  view.setUint16(20, 1, true); // 1 = PCM sense comprimir
  view.setUint16(22, canals, true);
  view.setUint32(24, audio.sampleRate, true);
  view.setUint32(28, audio.sampleRate * canals * bytesPerMostra, true);
  view.setUint16(32, canals * bytesPerMostra, true);
  view.setUint16(34, BITS, true);

  text(36, "data");
  view.setUint32(40, dades, true);

  // les mostres van entrellaçades: L R L R…
  const pistes = Array.from({ length: canals }, (_, c) =>
    audio.getChannelData(c),
  );
  let offset = HEADER_BYTES;
  for (let i = 0; i < mostres; i++) {
    for (let c = 0; c < canals; c++) {
      view.setInt16(offset, toPcm16(pistes[c][i] ?? 0), true);
      offset += 2;
    }
  }

  return buffer;
}

/** Un nom de fitxer que no espanti cap sistema operatiu. */
export function wavFileName(patternName: string): string {
  const net = patternName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${net || "ritme-16"}.wav`;
}
