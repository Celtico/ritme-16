"use client";

import { Knob } from "./Knob";
import { SYNC_RATES, type Returns, type SyncRate } from "@/lib/pattern";

interface Props {
  returns: Returns;
  onChange: (changes: Partial<Returns>) => void;
}

function MuteToggle({
  muted,
  label,
  onClick,
}: {
  muted: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={muted}
      onClick={onClick}
      className={[
        "h-6 w-6 shrink-0 rounded-[3px] border border-ink/40 text-[11px] font-semibold leading-none transition-colors",
        muted
          ? "bg-oxblood text-panel-hi"
          : "bg-panel-lo/60 text-ink/55 hover:bg-panel-lo/90",
      ].join(" ")}
    >
      M
    </button>
  );
}

/**
 * Els dos retorns, al final de la llista i separats per una línia més
 * gruixuda: no són pistes, són on va a parar el que hi envien les pistes.
 */
export function ReturnRows({ returns, onChange }: Props) {
  const { a, b } = returns;
  return (
    <div className="mt-1 border-t-2 border-ink/25 pt-1">
      <div
        className={[
          "flex items-center gap-3 border-b border-ink/10 py-1.5",
          a.muted ? "opacity-45" : "",
        ].join(" ")}
      >
        <div className="flex w-[372px] shrink-0 items-center gap-2 pr-2">
          <span className="w-[118px] shrink-0 truncate text-[13px] text-ink">
            Retorn A · Reverb
          </span>
          <MuteToggle
            muted={a.muted}
            label="Silenciar el retorn A"
            onClick={() => onChange({ a: { ...a, muted: !a.muted } })}
          />
          <Knob
            hideLabel
            label="Cua de la reverberació"
            size={28}
            value={a.decay}
            min={0.2}
            max={8}
            step={0.1}
            format={(v) => `${v.toFixed(1)} s`}
            onChange={(decay) => onChange({ a: { ...a, decay } })}
          />
          <Knob
            hideLabel
            label="Nivell del retorn A"
            size={28}
            value={a.wet}
            min={0}
            max={1}
            step={0.01}
            format={(v) => `${Math.round(v * 100)} %`}
            onChange={(wet) => onChange({ a: { ...a, wet } })}
          />
          <span className="text-[11px] text-ink-soft">cua · nivell</span>
        </div>
      </div>

      <div
        className={[
          "flex items-center gap-3 py-1.5",
          b.muted ? "opacity-45" : "",
        ].join(" ")}
      >
        <div className="flex w-[372px] shrink-0 items-center gap-2 pr-2">
          <span className="w-[118px] shrink-0 truncate text-[13px] text-ink">
            Retorn B · Retard
          </span>
          <MuteToggle
            muted={b.muted}
            label="Silenciar el retorn B"
            onClick={() => onChange({ b: { ...b, muted: !b.muted } })}
          />
          <select
            value={b.time}
            aria-label="Temps del retard"
            onChange={(e) =>
              onChange({ b: { ...b, time: e.target.value as SyncRate } })
            }
            className="rounded-[3px] border border-ink/30 bg-panel-hi px-1 py-0.5 text-[12px] text-ink"
          >
            {SYNC_RATES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <Knob
            hideLabel
            label="Realimentació del retard"
            size={28}
            value={b.feedback}
            min={0}
            max={0.9}
            step={0.01}
            format={(v) => `${Math.round(v * 100)} %`}
            onChange={(feedback) => onChange({ b: { ...b, feedback } })}
          />
          <span className="text-[11px] text-ink-soft">temps · realim.</span>
        </div>
      </div>
    </div>
  );
}
