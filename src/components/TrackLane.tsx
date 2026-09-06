"use client";

import { StepButton } from "./StepButton";
import type { Cell, ChannelMix, VoiceMeta } from "@/lib/pattern";

interface Props {
  voice: VoiceMeta;
  cells: Cell[];
  mix: ChannelMix;
  currentStep: number;
  dimmed: boolean;
  onToggleStep: (index: number, accent: boolean) => void;
  onChangeMix: (changes: Partial<ChannelMix>) => void;
  onAudition: () => void;
  onOpenSound: () => void;
  onClear: () => void;
  soundOpen: boolean;
}

function MiniToggle({
  active,
  label,
  title,
  activeClass,
  onClick,
}: {
  active: boolean;
  label: string;
  title: string;
  activeClass: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={[
        "h-6 w-6 rounded-[3px] border border-ink/40 text-[11px] font-semibold leading-none transition-colors",
        active
          ? activeClass
          : "bg-panel-lo/60 text-ink/55 hover:bg-panel-lo/90",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

export function TrackLane({
  voice,
  cells,
  mix,
  currentStep,
  dimmed,
  onToggleStep,
  onChangeMix,
  onAudition,
  onOpenSound,
  onClear,
  soundOpen,
}: Props) {
  const groups = [0, 1, 2, 3];

  return (
    <div
      className={[
        "flex items-center gap-3 border-b border-ink/10 py-1.5 last:border-b-0",
        dimmed ? "opacity-45" : "",
      ].join(" ")}
    >
      <div className="sticky left-0 z-10 flex w-[222px] shrink-0 items-center gap-2 bg-panel pr-2">
        <button
          type="button"
          onClick={onAudition}
          aria-label={`Escoltar ${voice.name} (tecla ${voice.key})`}
          title={`Escoltar ${voice.name} (tecla ${voice.key})`}
          className="h-6 w-5 shrink-0 rounded-[3px] border border-ink/25 bg-panel-hi text-[9px] leading-none text-ink transition-colors hover:bg-white"
        >
          ▶
        </button>

        <button
          type="button"
          onClick={onOpenSound}
          onDoubleClick={onClear}
          aria-expanded={soundOpen}
          title={`So de ${voice.name} · doble clic per buidar la fila`}
          className={[
            "w-[92px] truncate rounded-[3px] border px-2 py-1.5 text-left text-[13px] text-ink transition-colors",
            soundOpen
              ? "border-ink/45 bg-white"
              : "border-ink/25 bg-panel-hi hover:bg-white",
          ].join(" ")}
        >
          {voice.name}
        </button>

        <MiniToggle
          active={mix.muted}
          label="M"
          title="Silenciar"
          activeClass="bg-oxblood text-panel-hi"
          onClick={() => onChangeMix({ muted: !mix.muted })}
        />
        <MiniToggle
          active={mix.solo}
          label="S"
          title="Sonar en solitari"
          activeClass="bg-teal text-panel-hi"
          onClick={() => onChangeMix({ solo: !mix.solo })}
        />

        <input
          type="range"
          min={-32}
          max={6}
          step={1}
          value={mix.volume}
          aria-label={`Volum de ${voice.name}`}
          onChange={(e) => onChangeMix({ volume: Number(e.target.value) })}
          className="w-12"
        />
      </div>

      <div className="flex gap-3">
        {groups.map((g) => (
          <div key={g} className="flex gap-1">
            {cells.slice(g * 4, g * 4 + 4).map((cell, i) => {
              const index = g * 4 + i;
              return (
                <StepButton
                  key={index}
                  cell={cell}
                  index={index}
                  voiceName={voice.name}
                  underPlayhead={currentStep === index}
                  onToggle={(accent) => onToggleStep(index, accent)}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
