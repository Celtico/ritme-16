"use client";

interface Props {
  isPlaying: boolean;
  bpm: number;
  swing: number;
  currentStep: number;
  onToggle: () => void;
  onBpm: (bpm: number) => void;
  onSwing: (swing: number) => void;
}

/** Una sola franja de 52 px: hi ha de cabre tot en una línia. */
export function Transport({
  isPlaying,
  bpm,
  swing,
  currentStep,
  onToggle,
  onBpm,
  onSwing,
}: Props) {
  const beat = currentStep < 0 ? 0 : Math.floor(currentStep / 4) + 1;

  return (
    <div className="flex h-[52px] items-center gap-4 border-b border-ink/20 bg-ink px-3 text-panel-hi">
      <h1 className="font-display text-[15px] tracking-tight">RITME-16</h1>

      <button
        type="button"
        onClick={onToggle}
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink/45 transition-all duration-100",
          "active:translate-y-[1px] active:shadow-none",
          isPlaying
            ? "bg-oxblood shadow-[0_2px_0_rgba(29,27,23,0.5)]"
            : "bg-panel-hi shadow-[0_3px_0_rgba(29,27,23,0.45)] hover:bg-white",
        ].join(" ")}
        aria-label={isPlaying ? "Aturar" : "Reproduir"}
      >
        {isPlaying ? (
          <span className="block h-3 w-3 rounded-[2px] bg-panel-hi" />
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
        <span className="text-[10px] text-panel-lo">ppm</span>
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
        <span className="text-[10px] text-panel-lo">swing</span>
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

      <div className="ml-auto flex items-center gap-1.5" aria-hidden>
        {[1, 2, 3, 4].map((b) => (
          <span
            key={b}
            className={[
              "h-2.5 w-2.5 rounded-full border border-panel-lo/40 transition-colors duration-75",
              isPlaying && beat === b ? "bg-ochre" : "bg-ink",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}
