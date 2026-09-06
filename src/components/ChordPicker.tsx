"use client";

import { useEffect, useRef, useState } from "react";
import {
  degreeRoman,
  degreeToChord,
  midiToName,
  CHORD_BASE_MIDI,
  type ChordKind,
  type ChordNote,
  type Key,
} from "@/lib/pattern";

interface Props {
  step: number;
  patternKey: Key;
  onPick: (chord: ChordNote) => void;
  onClose: () => void;
}

const GRAUS = [1, 2, 3, 4, 5, 6, 7];

export function ChordPicker({ step, patternKey, onPick, onClose }: Props) {
  const [kind, setKind] = useState<ChordKind>("triad");
  const [octave, setOctave] = useState<-1 | 0 | 1>(0);
  const caixa = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) onClose();
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla, true);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla, true);
    };
  }, [onClose]);

  const notes = (degree: number) =>
    degreeToChord(patternKey, degree, kind)
      .map((n) => midiToName(n + CHORD_BASE_MIDI + octave * 12))
      .join(" ");

  return (
    <div
      ref={caixa}
      className="absolute bottom-full left-0 z-50 mb-1 w-44 rounded-[3px] border border-ink/40 bg-panel-hi p-1 shadow-[var(--shadow-pop)]"
    >
      <div className="mb-1 px-1 text-[11px] text-ink-soft">Pas {step + 1}</div>

      <div className="mb-1 flex gap-1 px-1">
        {(["triad", "seventh"] as const).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
            className={[
              "flex-1 rounded-[2px] border px-1 py-0.5 text-[11px]",
              kind === k
                ? "border-ink/45 bg-teal text-on-accent"
                : "border-ink/25 bg-panel-lo/40 text-ink-soft",
            ].join(" ")}
          >
            {k === "triad" ? "tríada" : "sèptima"}
          </button>
        ))}
        {([-1, 0, 1] as const).map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={octave === o}
            aria-label={`Octava ${o}`}
            onClick={() => setOctave(o)}
            className={[
              "w-6 rounded-[2px] border text-[11px]",
              octave === o
                ? "border-ink/45 bg-teal text-on-accent"
                : "border-ink/25 bg-panel-lo/40 text-ink-soft",
            ].join(" ")}
          >
            {o === 0 ? "0" : o > 0 ? "+" : "−"}
          </button>
        ))}
      </div>

      {GRAUS.map((degree) => (
        <button
          key={degree}
          type="button"
          title={notes(degree)}
          onClick={() => onPick({ degree, kind, length: 4, octave })}
          className="flex w-full items-baseline gap-2 rounded-[2px] px-2 py-0.5 text-left text-[12px] text-ink transition-colors hover:bg-teal hover:text-on-accent"
        >
          <span className="w-10 font-display">
            {degreeRoman(patternKey, degree)}
          </span>
          <span className="truncate text-[10px] opacity-70">
            {notes(degree)}
          </span>
        </button>
      ))}

      <p className="mt-1 px-1 text-[10px] text-ink-soft">Esc tanca</p>
    </div>
  );
}
