"use client";

import { Knob } from "./Knob";
import { Meter } from "./Meter";
import { TrackMenu } from "./TrackMenu";
import { ROW_GAP, ROW_HEIGHT } from "./layout";
import type { ChannelMix, Track } from "@/lib/pattern";

interface Props {
  track: Track;
  /** Tecla d'audició ràpida, si la pista n'ha rebut una. */
  hotkey?: string;
  dimmed: boolean;
  onChangeMix: (changes: Partial<ChannelMix>) => void;
  onAudition: () => void;
  onOpenSound: () => void;
  onClear: () => void;
  soundOpen: boolean;
  /** Nivell del vúmetre, 0..1. */
  level: number;
  menu: React.ComponentProps<typeof TrackMenu>;
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
        "h-6 w-6 shrink-0 rounded-[3px] border border-ink/40 text-[11px] font-semibold leading-none transition-colors",
        active
          ? activeClass
          : "bg-panel-lo/60 text-ink/55 hover:bg-panel-lo/90",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

/**
 * Una fila de la llista de pistes: tot el que no són passos. L'alçada ha de
 * ser exactament la mateixa que la d'una fila de la graella.
 */
export function TrackRow({
  track,
  hotkey,
  dimmed,
  onChangeMix,
  onAudition,
  onOpenSound,
  onClear,
  soundOpen,
  level,
  menu,
}: Props) {
  const { name, mix } = track;
  const escoltar = hotkey ? `Escoltar ${name} (tecla ${hotkey})` : `Escoltar ${name}`;

  return (
    <div
      className={[
        "flex items-center gap-1.5",
        dimmed ? "opacity-45" : "",
      ].join(" ")}
      style={{ height: ROW_HEIGHT, marginBottom: ROW_GAP }}
    >
      <span
        aria-hidden
        style={{ backgroundColor: `var(--color-${track.color})` }}
        className="h-7 w-[3px] shrink-0 rounded-[1px]"
      />

      <button
        type="button"
        onClick={onAudition}
        aria-label={escoltar}
        title={escoltar}
        className="h-6 w-5 shrink-0 rounded-[3px] border border-ink/25 bg-panel-hi text-[9px] leading-none text-ink transition-colors hover:bg-white"
      >
        ▶
      </button>

      <button
        type="button"
        onClick={onOpenSound}
        onDoubleClick={onClear}
        aria-expanded={soundOpen}
        title={`So de ${name} · doble clic per buidar la fila`}
        className={[
          "min-w-0 flex-1 truncate rounded-[3px] border px-2 py-1 text-left text-[13px] text-ink transition-colors",
          soundOpen
            ? "border-ink/45 bg-white"
            : "border-ink/25 bg-panel-hi hover:bg-white",
        ].join(" ")}
      >
        {name}
      </button>

      <TrackMenu {...menu} />

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
        aria-label={`Volum de ${name}`}
        onChange={(e) => onChangeMix({ volume: Number(e.target.value) })}
        className="w-10 shrink-0"
      />

      <Knob
        hideLabel
        label={`Panoràmic de ${name}`}
        size={24}
        value={mix.pan}
        min={-1}
        max={1}
        step={0.02}
        bipolar
        format={(v) =>
          v === 0
            ? "centre"
            : `${Math.abs(Math.round(v * 100))} % ${v < 0 ? "esq." : "dre."}`
        }
        onChange={(pan) => onChangeMix({ pan })}
      />
      <Knob
        hideLabel
        label={`Enviament de ${name} al retorn A, reverb`}
        size={24}
        value={mix.sendA}
        min={0}
        max={1}
        step={0.01}
        format={(v) => `A ${Math.round(v * 100)} %`}
        onChange={(sendA) => onChangeMix({ sendA })}
      />
      <Knob
        hideLabel
        label={`Enviament de ${name} al retorn B, retard`}
        size={24}
        value={mix.sendB}
        min={0}
        max={1}
        step={0.01}
        format={(v) => `B ${Math.round(v * 100)} %`}
        onChange={(sendB) => onChangeMix({ sendB })}
      />

      <Meter level={level} label={`Nivell de ${name}`} />
    </div>
  );
}
