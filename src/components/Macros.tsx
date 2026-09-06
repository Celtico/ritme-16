"use client";

import { useState } from "react";
import { Knob } from "./Knob";
import {
  MOD_TARGETS,
  TARGET_NAMES,
  type Macro,
  type ModTarget,
  type Track,
} from "@/lib/pattern";

interface Props {
  macros: Macro[];
  tracks: Track[];
  /** La pista que mira el panell, per poder-hi assignar amb un clic. */
  current: Track;
  onChange: (index: number, changes: Partial<Macro>) => void;
}

function Editable({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [editant, setEditant] = useState(false);
  const [text, setText] = useState(value);
  if (!editant) {
    return (
      <button
        type="button"
        onClick={() => {
          setText(value);
          setEditant(true);
        }}
        title="Canviar el nom del macro"
        className="max-w-[64px] truncate text-[11px] text-ink-soft hover:text-ink"
      >
        {value}
      </button>
    );
  }
  return (
    <input
      autoFocus
      value={text}
      aria-label="Nom del macro"
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        onChange(text.trim() || value);
        setEditant(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setEditant(false);
      }}
      className="w-[64px] rounded-[2px] border border-ink/30 bg-panel-hi px-1 text-[11px] text-ink"
    />
  );
}

/**
 * Els macros són del patró, no de la pista: un de sol pot moure coses de
 * pistes diferents alhora, que és tot el sentit que tenen.
 */
export function Macros({ macros, tracks, current, onChange }: Props) {
  const [obert, setObert] = useState<number | null>(null);

  const commuta = (i: number, param: ModTarget) => {
    const m = macros[i];
    const hi = m.assignments.some(
      (a) => a.trackId === current.id && a.param === param,
    );
    onChange(i, {
      assignments: hi
        ? m.assignments.filter(
            (a) => !(a.trackId === current.id && a.param === param),
          )
        : [...m.assignments, { trackId: current.id, param, amount: 0.5 }],
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[11px] uppercase tracking-wide text-ink-soft">
        Macros
      </div>
      <div className="flex gap-3">
        {macros.map((m, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Knob
              label=""
              size={56}
              value={m.value}
              min={0}
              max={1}
              step={0.01}
              format={(v) => `${Math.round(v * 100)} %`}
              onChange={(value) => onChange(i, { value })}
            />
            <Editable value={m.name} onChange={(name) => onChange(i, { name })} />
            <button
              type="button"
              aria-expanded={obert === i}
              onClick={() => setObert(obert === i ? null : i)}
              title="Assignacions del macro"
              className="text-[11px] text-ink-soft tabular-nums hover:text-ink"
            >
              {m.assignments.length} ▾
            </button>

            {obert === i ? (
              <div className="absolute z-30 mt-[132px] w-44 rounded-[3px] border border-ink/40 bg-panel-hi p-2 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.5)]">
                <p className="mb-1 text-[11px] text-ink-soft">
                  A {current.name}:
                </p>
                {MOD_TARGETS.map((param) => {
                  const a = m.assignments.find(
                    (x) => x.trackId === current.id && x.param === param,
                  );
                  return (
                    <div key={param} className="flex items-center gap-1 py-0.5">
                      <button
                        type="button"
                        aria-pressed={!!a}
                        onClick={() => commuta(i, param)}
                        className={[
                          "flex-1 rounded-[2px] border px-1 py-0.5 text-left text-[11px]",
                          a
                            ? "border-ink/45 bg-teal text-panel-hi"
                            : "border-ink/25 bg-panel-lo/40 text-ink-soft",
                        ].join(" ")}
                      >
                        {TARGET_NAMES[param]}
                      </button>
                      {a ? (
                        <input
                          type="range"
                          min={-1}
                          max={1}
                          step={0.05}
                          value={a.amount}
                          aria-label={`Quantitat de ${m.name} sobre ${TARGET_NAMES[param]}`}
                          onChange={(e) =>
                            onChange(i, {
                              assignments: m.assignments.map((x) =>
                                x === a
                                  ? { ...x, amount: Number(e.target.value) }
                                  : x,
                              ),
                            })
                          }
                          className="w-12"
                        />
                      ) : null}
                    </div>
                  );
                })}
                {tracks.length > 1 ? (
                  <p className="mt-1 text-[11px] text-ink-soft">
                    Tria una altra pista per assignar-n&apos;hi paràmetres.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
