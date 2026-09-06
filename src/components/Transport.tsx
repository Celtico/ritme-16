"use client";

import type { Theme } from "@/lib/theme";
import {
  MODE_NAMES,
  pitchClassName,
  type Key,
  type Mode,
} from "@/lib/pattern";

interface Props {
  theme: Theme;
  onTheme: (t: Theme) => void;
  isPlaying: boolean;
  bpm: number;
  swing: number;
  currentStep: number;
  patternKey: Key;
  onKey: (key: Key) => void;
  snap: boolean;
  onSnap: (v: boolean) => void;
  onToggle: () => void;
  onBpm: (bpm: number) => void;
  onSwing: (swing: number) => void;
}

/** Una sola franja de 52 px: hi ha de cabre tot en una línia. */
export function Transport({
  theme,
  onTheme,
  isPlaying,
  bpm,
  swing,
  currentStep,
  patternKey,
  onKey,
  snap,
  onSnap,
  onToggle,
  onBpm,
  onSwing,
}: Props) {
  const beat = currentStep < 0 ? 0 : Math.floor(currentStep / 4) + 1;

  return (
    <div className="flex h-[52px] items-center gap-4 border-b border-header bg-header px-3 text-on-accent">
      <h1 className="font-display text-[15px] tracking-tight">RITME-16</h1>

      <button
        type="button"
        onClick={onToggle}
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink/45 transition-all duration-100",
          "active:translate-y-[1px] active:shadow-none",
          isPlaying
            ? "bg-oxblood shadow-[var(--shadow-key-on)]"
            : "bg-panel-hi shadow-[var(--shadow-key)] hover:bg-raise",
        ].join(" ")}
        aria-label={isPlaying ? "Aturar" : "Reproduir"}
      >
        {isPlaying ? (
          <span className="block h-3 w-3 rounded-[2px] bg-on-accent" />
        ) : (
          <span
            className="ml-0.5 block h-0 w-0 border-y-[7px] border-l-[11px] border-y-transparent border-l-ink"
            aria-hidden
          />
        )}
      </button>

      <div className="flex items-center gap-2">
        <span className="font-display text-xl leading-none tabular-nums">
          {bpm}
        </span>
        <span className="text-[10px] text-on-accent/55">ppm</span>
        <input
          type="range"
          min={40}
          max={200}
          value={bpm}
          aria-label="Tempo"
          onChange={(e) => onBpm(Number(e.target.value))}
          className="w-24"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="font-display text-base leading-none tabular-nums">
          {Math.round(swing * 100)}%
        </span>
        <span className="text-[10px] text-on-accent/55">swing</span>
        <input
          type="range"
          min={0}
          max={0.6}
          step={0.02}
          value={swing}
          aria-label="Quantitat de swing"
          onChange={(e) => onSwing(Number(e.target.value))}
          className="w-20"
        />
      </div>

      <div className="flex items-center gap-1">
        <select
          value={patternKey.root}
          aria-label="Fonamental"
          onChange={(e) => onKey({ ...patternKey, root: Number(e.target.value) })}
          className="rounded-[3px] border border-on-accent/30 bg-header px-1 py-0.5 text-[12px] text-on-accent"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i}>
              {pitchClassName(i)}
            </option>
          ))}
        </select>
        <select
          value={patternKey.mode}
          aria-label="Mode"
          onChange={(e) =>
            onKey({ ...patternKey, mode: e.target.value as Mode })
          }
          className="rounded-[3px] border border-on-accent/30 bg-header px-1 py-0.5 text-[12px] text-on-accent"
        >
          {(Object.keys(MODE_NAMES) as Mode[]).map((m) => (
            <option key={m} value={m}>
              {MODE_NAMES[m]}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-pressed={snap}
          onClick={() => onSnap(!snap)}
          title="Ajusta a l'escala les notes que hi triïs"
          className={[
            "rounded-[3px] border px-1.5 py-0.5 text-[11px] transition-colors",
            snap
              ? "border-ochre bg-ochre text-on-accent"
              : "border-on-accent/30 text-on-accent/70 hover:bg-on-accent/15",
          ].join(" ")}
        >
          escala
        </button>
      </div>

      <button
        type="button"
        onClick={() => onTheme(theme === "night" ? "day" : "night")}
        aria-pressed={theme === "night"}
        title={theme === "night" ? "Passar al tema dia" : "Passar al tema nit"}
        aria-label={theme === "night" ? "Passar al tema dia" : "Passar al tema nit"}
        className="ml-auto h-7 w-7 shrink-0 rounded-[3px] border border-on-accent/30 text-[13px] leading-none text-on-accent transition-colors hover:bg-on-accent/15"
      >
        {theme === "night" ? "☾" : "☀"}
      </button>

      <div className="flex items-center gap-1.5" aria-hidden>
        {[1, 2, 3, 4].map((b) => (
          <span
            key={b}
            className={[
              "h-2.5 w-2.5 rounded-full border border-on-accent/30 transition-colors duration-75",
              isPlaying && beat === b ? "bg-ochre" : "bg-desk-deep",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}
