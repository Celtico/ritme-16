import type { DrumKit } from "./kit";
import { degreeToChord } from "./theory";
import { CHORD_BASE_MIDI, isAudible, type Pattern } from "./pattern";

export const ACCENT_VELOCITY = 1;
export const NORMAL_VELOCITY = 0.6;

/** Aboca al kit tot el que el patró diu de cada pista i dels retorns. */
export function applyTracks(kit: DrumKit, p: Pattern) {
  for (const t of p.tracks) {
    kit.ensureTrack(t.id, t.kind);
    kit.setVolume(t.id, t.mix.volume);
    kit.setParams(t.id, t.sound);
    kit.setRouting(t.id, t.mix);
  }
  kit.setReturns(p.returns);
}

/**
 * Dispara tot el que sona en un pas. La fan servir tant el transport en
 * directe com l'exportació a WAV: si cadascú tingués la seva còpia, el
 * fitxer exportat acabaria sonant diferent del que se sent.
 *
 * @param stepSeconds quant dura un pas, que surt del tempo
 */
export function triggerStep(
  kit: DrumKit,
  p: Pattern,
  step: number,
  time: number,
  stepSeconds: number,
) {
  for (const t of p.tracks) {
    if (!isAudible(p, t)) continue;

    const nota = t.bass?.[step];
    if (nota) {
      kit.triggerNote(
        t.id,
        time,
        [nota.midi],
        stepSeconds * nota.length,
        nota.accent ? ACCENT_VELOCITY : NORMAL_VELOCITY,
      );
      continue;
    }

    const acord = t.chords?.[step];
    if (acord) {
      kit.triggerNote(
        t.id,
        time,
        degreeToChord(p.key, acord.degree, acord.kind).map(
          (n) => n + CHORD_BASE_MIDI + acord.octave * 12,
        ),
        stepSeconds * acord.length,
        NORMAL_VELOCITY,
      );
      continue;
    }

    const cell = t.steps[step];
    if (!cell) continue;
    kit.trigger(t.id, time, cell === 2 ? ACCENT_VELOCITY : NORMAL_VELOCITY);
  }
}
