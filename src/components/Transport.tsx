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
    <div className="flex flex-wrap items-center gap-x-6 gap-y-4 border-b border-ink/15 px-4 py-4 sm:px-6">
      <button
        type="button"
        onClick={onToggle}
        className={[
          "h-14 w-14 rounded-full border-2 border-ink/45 transition-all duration-100",
          "flex items-center justify-center active:translate-y-[2px] active:shadow-none",
          isPlaying
            ? "bg-oxblood shadow-[0_3px_0_rgba(29,27,23,0.5)]"
            : "bg-panel-hi shadow-[0_4px_0_rgba(29,27,23,0.45)] hover:bg-white",
        ].join(" ")}
        aria-label={isPlaying ? "Aturar" : "Reproduir"}
      >
        {isPlaying ? (
          <span className="block h-4 w-4 rounded-[2px] bg-panel-hi" />
        ) : (
          <span
            className="ml-1 block h-0 w-0 border-y-[10px] border-l-[16px] border-y-transparent border-l-ink"
            aria-hidden
          />
        )}
      </button>

      <div className="flex items-end gap-3">
        <div>
          <div className="font-display text-4xl leading-none tracking-tight text-ink tabular-nums">
            {bpm}
          </div>
          <div className="mt-1 text-[11px] text-ink-soft">pulsacions/min</div>
        </div>
        <input
          type="range"
          min={40}
          max={200}
          value={bpm}
          aria-label="Tempo"
          onChange={(e) => onBpm(Number(e.target.value))}
          className="mb-2 w-32"
        />
      </div>

      <div>
        <div className="font-display text-2xl leading-none text-ink tabular-nums">
          {Math.round(swing * 100)}%
        </div>
        <div className="mt-1 mb-2 text-[11px] text-ink-soft">swing</div>
        <input
          type="range"
          min={0}
          max={0.6}
          step={0.02}
          value={swing}
          aria-label="Quantitat de swing"
          onChange={(e) => onSwing(Number(e.target.value))}
          className="w-28"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5" aria-hidden>
        {[1, 2, 3, 4].map((b) => (
          <span
            key={b}
            className={[
              "h-2.5 w-2.5 rounded-full border border-ink/40 transition-colors duration-75",
              isPlaying && beat === b ? "bg-ochre" : "bg-panel-lo/70",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}
