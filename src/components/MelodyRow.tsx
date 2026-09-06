"use client";

import { useState } from "react";
import { NotePicker } from "./NotePicker";
import { ChordPicker } from "./ChordPicker";
import { CELL_GAP, stepColumn, stepGridTemplate } from "./grid";
import { ROW_GAP, ROW_HEIGHT } from "./layout";
import {
  BASS_MAX_LENGTH,
  CHORD_MAX_LENGTH,
  degreeRoman,
  midiToName,
  noteCovering,
  type BassNote,
  type ChordNote,
  type Key,
  type Track,
} from "@/lib/pattern";

interface Props {
  track: Track;
  length: number;
  patternKey: Key;
  currentStep: number;
  dimmed: boolean;
  snap: boolean;
  onBass: (index: number, note: BassNote | null) => void;
  onChord: (index: number, chord: ChordNote | null) => void;
}

/**
 * Una fila de notes. A diferència dels passos de percussió, una nota s'estén
 * visualment sobre les cel·les que cobreix: es dibuixa una barra contínua i
 * les cel·les de sota no es repeteixen.
 */
export function MelodyRow({
  track,
  length,
  patternKey,
  currentStep,
  dimmed,
  snap,
  onBass,
  onChord,
}: Props) {
  const [obert, setObert] = useState<number | null>(null);
  const esBaix = track.kind === "baix";
  // les dues files es dibuixen igual; només canvia què hi ha dins de cada nota
  const fila: (BassNote | ChordNote | null)[] =
    (esBaix ? track.bass : track.chords) ?? [];
  const maxLen = esBaix ? BASS_MAX_LENGTH : CHORD_MAX_LENGTH;

  const etiqueta = (i: number): string | null => {
    const n = fila[i];
    if (!n) return null;
    if (esBaix) return midiToName((n as BassNote).midi);
    const c = n as ChordNote;
    return (
      degreeRoman(patternKey, c.degree) +
      (c.kind === "seventh" ? "7" : "") +
      (c.octave === 0 ? "" : c.octave > 0 ? "+" : "−")
    );
  };

  const titol = (i: number): string => {
    const n = fila[i];
    if (!n || esBaix) return "";
    const c = n as ChordNote;
    return `Graus reals: ${degreeRoman(patternKey, c.degree)}`;
  };

  const canviaLlargada = (start: number, delta: number) => {
    const n = fila[start];
    if (!n) return;
    const length = Math.max(1, Math.min(maxLen, n.length + delta));
    if (esBaix) onBass(start, { ...(n as BassNote), length });
    else onChord(start, { ...(n as ChordNote), length });
  };

  return (
    <div
      className={["relative", dimmed ? "opacity-45" : ""].join(" ")}
      style={{
        display: "grid",
        gridTemplateColumns: stepGridTemplate(length),
        columnGap: CELL_GAP,
        height: ROW_HEIGHT,
        marginBottom: ROW_GAP,
      }}
    >
      {Array.from({ length }, (_, i) => {
            const cobreix = noteCovering(fila, i);
            const propia = cobreix?.start === i;
            // les cel·les que una nota cobreix no es tornen a dibuixar
            const continua = !!cobreix && !propia;
            const accent = esBaix && (fila[i] as BassNote | null)?.accent;

            return (
              <button
                key={i}
                type="button"
                title={titol(i)}
                aria-label={
                  cobreix
                    ? `${track.name}, pas ${i + 1}, ${etiqueta(cobreix.start)}`
                    : `${track.name}, pas ${i + 1}, buit`
                }
                onClick={(e) => {
                  if (cobreix) {
                    if (e.shiftKey && esBaix) {
                      const n = fila[cobreix.start] as BassNote;
                      onBass(cobreix.start, { ...n, accent: !n.accent });
                    } else if (esBaix) {
                      // clic sobre una nota existent la treu
                      onBass(cobreix.start, null);
                    } else {
                      onChord(cobreix.start, null);
                    }
                    return;
                  }
                  setObert(obert === i ? null : i);
                }}
                style={{ gridColumn: stepColumn(i) }}
                className={[
                  "relative h-9 min-w-[20px] border border-ink/40 text-[10px] leading-none transition-colors",
                  continua ? "rounded-none border-l-0" : "rounded-[3px]",
                  cobreix
                    ? accent
                      ? "bg-ochre text-on-accent shadow-[var(--shadow-accent)]"
                      : "bg-teal text-on-accent shadow-[var(--shadow-raised)]"
                    : "bg-panel-lo/70 shadow-[var(--shadow-inset)]",
                  cobreix && !continua && (cobreix.note.length > 1)
                    ? "rounded-r-none border-r-0"
                    : "",
                  currentStep === i ? "ring-2 ring-panel-hi/90 brightness-125" : "",
                ].join(" ")}
              >
                {propia ? etiqueta(i) : null}

                {propia && cobreix.note.length < maxLen ? (
                  <span
                    role="button"
                    aria-label={`Allargar la nota del pas ${i + 1}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      canviaLlargada(i, 1);
                    }}
                    className="absolute right-0 top-0 h-full w-1.5 cursor-e-resize bg-on-accent/25 hover:bg-on-accent/50"
                  />
                ) : null}
              </button>
            );
      })}

      {obert !== null ? (
        esBaix ? (
          <NotePicker
            step={obert}
            patternKey={patternKey}
            snap={snap}
            onPick={(midi) => {
              onBass(obert, { midi, length: 1, accent: false });
              setObert(null);
            }}
            onClose={() => setObert(null)}
          />
        ) : (
          <ChordPicker
            step={obert}
            patternKey={patternKey}
            onPick={(chord) => {
              onChord(obert, chord);
              setObert(null);
            }}
            onClose={() => setObert(null)}
          />
        )
      ) : null}
    </div>
  );
}
