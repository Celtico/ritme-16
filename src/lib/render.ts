import { createKit } from "./kit";
import { applyTracks, triggerStep } from "./playback";
import type { Pattern } from "./pattern";
import { encodeWav, type RenderedAudio } from "./wav";

type ToneModule = typeof import("tone");

/** Quants compassos de 4/4 s'exporten. */
export const EXPORT_BARS = 4;
/** Segons de més al final, perquè no es talli la cua de la reverberació. */
export const EXPORT_TAIL = 2.5;

export function exportSeconds(bpm: number, bars = EXPORT_BARS): number {
  return (bars * 4 * 60) / bpm + EXPORT_TAIL;
}

/**
 * Renderitza el patró fora de línia. Munta un kit nou dins del context
 * d'offline i el toca amb exactament les mateixes funcions que el transport
 * en directe, per no acabar exportant una cosa i sentint-ne una altra.
 *
 * Va més ràpid que el temps real, però no és instantani: quatre compassos a
 * 76 ppm són gairebé tretze segons de so.
 */
export async function renderPattern(
  Tone: ToneModule,
  pattern: Pattern,
  bars = EXPORT_BARS,
): Promise<ArrayBuffer> {
  const seconds = exportSeconds(pattern.bpm, bars);

  const buffer = await Tone.Offline(({ transport }) => {
    const kit = createKit(Tone);
    applyTracks(kit, pattern);

    transport.bpm.value = pattern.bpm;
    transport.swing = pattern.swing;
    transport.swingSubdivision = "16n";

    const pas = 15 / pattern.bpm; // un setzè, en segons
    new Tone.Sequence(
      (time, step) => triggerStep(kit, pattern, step, time, pas),
      Array.from({ length: pattern.length }, (_, i) => i),
      "16n",
    ).start(0);

    transport.start();
  }, seconds);

  // ToneAudioBuffer embolcalla l'AudioBuffer del navegador
  const audio = buffer.get();
  if (!audio) throw new Error("El renderitzat no ha donat cap so.");
  return encodeWav(audio as RenderedAudio);
}
