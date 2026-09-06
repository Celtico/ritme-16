"use client";

import {
  DECAY_MAX,
  DECAY_MIN,
  defaultParams,
  type VoiceMeta,
  type VoiceParams,
} from "@/lib/pattern";

interface Props {
  voice: VoiceMeta;
  params: VoiceParams;
  onChange: (changes: Partial<VoiceParams>) => void;
  onClose: () => void;
}

function Knob({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="w-28">
      <div className="font-display text-xl leading-none text-ink tabular-nums">
        {display}
      </div>
      <div className="mt-1 mb-2 text-[11px] text-ink-soft">{label}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24"
      />
    </div>
  );
}

export function VoicePanel({ voice, params, onChange, onClose }: Props) {
  const factory = defaultParams(voice.id);
  const untouched =
    params.pitch === factory.pitch &&
    params.decay === factory.decay &&
    params.tone === factory.tone &&
    params.drive === factory.drive;

  return (
    <div className="border-t border-ink/15 bg-panel-lo/25 px-4 py-3 sm:px-6">
      <div className="mb-2 flex items-center gap-3">
        <h2 className="font-display text-[15px] tracking-tight text-ink">
          So de {voice.name.toLowerCase()}
        </h2>
        <button
          type="button"
          onClick={() => onChange(factory)}
          disabled={untouched}
          className="rounded-[3px] border border-ink/30 bg-panel-hi px-2 py-1 text-[12px] text-ink transition-colors hover:bg-white disabled:cursor-default disabled:opacity-40 disabled:hover:bg-panel-hi"
        >
          De fàbrica
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tancar el panell de so"
          className="ml-auto rounded-[3px] border border-ink/30 bg-panel-hi px-2 py-1 text-[13px] text-ink-soft transition-colors hover:bg-white"
        >
          ×
        </button>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-3">
        <Knob
          label="afinació"
          value={params.pitch}
          display={`${params.pitch > 0 ? "+" : ""}${params.pitch}`}
          min={-12}
          max={12}
          step={1}
          onChange={(pitch) => onChange({ pitch })}
        />
        <Knob
          label="caiguda"
          value={params.decay}
          display={`${Math.round(params.decay * 1000)} ms`}
          min={DECAY_MIN}
          max={DECAY_MAX}
          step={0.005}
          onChange={(decay) => onChange({ decay })}
        />
        <Knob
          label="to"
          value={params.tone}
          display={`${Math.round(params.tone * 100)}%`}
          min={0}
          max={1}
          step={0.01}
          onChange={(tone) => onChange({ tone })}
        />
        <Knob
          label="saturació"
          value={params.drive}
          display={`${Math.round(params.drive * 100)}%`}
          min={0}
          max={1}
          step={0.01}
          onChange={(drive) => onChange({ drive })}
        />
      </div>
    </div>
  );
}
