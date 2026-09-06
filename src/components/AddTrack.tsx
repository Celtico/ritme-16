"use client";

import { useEffect, useRef, useState } from "react";
import { KINDS, VOICE_KINDS, type VoiceKind } from "@/lib/pattern";

interface Props {
  onAdd: (kind: VoiceKind) => void;
  /** Quantes en caben encara. */
  remaining: number;
}

export function AddTrack({ onAdd, remaining }: Props) {
  const [obert, setObert] = useState(false);
  const caixa = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!obert) return;
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) {
        setObert(false);
      }
    };
    const escapada = (e: KeyboardEvent) => {
      if (e.key === "Escape") setObert(false);
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", escapada);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", escapada);
    };
  }, [obert]);

  return (
    <div ref={caixa} className="relative mt-1 flex items-center gap-3">
      <button
        type="button"
        disabled={remaining <= 0}
        aria-expanded={obert}
        onClick={() => setObert((v) => !v)}
        className="rounded-[3px] border border-ink/30 bg-panel-hi px-3 py-1 text-[13px] text-ink transition-colors hover:bg-raise disabled:cursor-default disabled:opacity-40"
      >
        + Pista
      </button>
      <span className="text-[11px] text-ink-soft tabular-nums">
        {remaining > 0
          ? `${remaining} lliures`
          : "no hi caben més pistes"}
      </span>

      {obert ? (
        <div className="absolute left-0 top-9 z-40 w-52 rounded-[3px] border border-ink/40 bg-panel-hi p-1 shadow-[var(--shadow-pop)]">
          {VOICE_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => {
                onAdd(kind);
                setObert(false);
              }}
              className="flex w-full items-center gap-2 rounded-[2px] px-2 py-1 text-left text-[12px] text-ink transition-colors hover:bg-panel-lo/70"
            >
              <span
                aria-hidden
                style={{ backgroundColor: `var(--color-${KINDS[kind].color})` }}
                className="h-3 w-3 shrink-0 rounded-[2px] border border-ink/30"
              />
              {KINDS[kind].name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
