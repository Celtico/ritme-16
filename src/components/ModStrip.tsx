"use client";

import {
  FAMILY_COLOR,
  SOURCE_FAMILY,
  SOURCE_NAMES,
  type ModSource,
  type VoiceParams,
} from "@/lib/pattern";

const W = 52;
const H = 22;

/** Perfil d'una envolupant, dibuixat amb els seus propis valors. */
function envPath(a: number, d: number, s: number, r: number) {
  const total = Math.max(a + d + 0.2 + r, 0.001);
  const xa = (a / total) * W;
  const xd = xa + (d / total) * W;
  const xs = xd + (0.2 / total) * W;
  const ys = H - s * H;
  return `M 0 ${H} L ${xa.toFixed(1)} 0 L ${xd.toFixed(1)} ${ys.toFixed(1)} L ${xs.toFixed(1)} ${ys.toFixed(1)} L ${W} ${H}`;
}

function wavePath(shape: string) {
  const punts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    let v: number;
    if (shape === "square") v = t % 0.5 < 0.25 ? 1 : -1;
    else if (shape === "sawtooth") v = 1 - 2 * ((t * 2) % 1);
    else if (shape === "triangle") v = 1 - 4 * Math.abs(((t * 2) % 1) - 0.5);
    else v = Math.sin(t * Math.PI * 4);
    punts.push(`${((i / 40) * W).toFixed(1)} ${(H / 2 - (v * H) / 2.4).toFixed(1)}`);
  }
  return `M ${punts.join(" L ")}`;
}

function Mini({ source, params }: { source: ModSource; params: VoiceParams }) {
  let d: string;
  if (source === "envAmp") d = envPath(0.001, params.decay, 0, 0.1);
  else if (source === "envFilter") {
    const e = params.envFilter;
    d = envPath(e.attack, e.decay, e.sustain, e.release);
  } else if (source === "lfo1" || source === "lfo2") {
    d = wavePath(params.lfo[source === "lfo1" ? 0 : 1]?.shape ?? "sine");
  } else if (source === "velocity") {
    d = `M 0 ${H} L ${W} 0`;
  } else {
    d = `M 0 ${H * 0.6} L ${W * 0.2} ${H * 0.15} L ${W * 0.35} ${H * 0.8} L ${W * 0.55} ${H * 0.3} L ${W * 0.7} ${H * 0.95} L ${W} ${H * 0.4}`;
  }
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.25} />
    </svg>
  );
}

interface Props {
  params: VoiceParams;
  sources: ModSource[];
  selected: ModSource | null;
  onSelect: (s: ModSource | null) => void;
}

/**
 * Les fonts de modulació. Triar-ne una fa aparèixer els anells sobre els
 * knobs; sense cap font triada el panell es llegeix net.
 */
export function ModStrip({ params, sources, selected, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {sources.map((s) => {
        const actiu = params.mods.some(
          (m) => m.source === s && m.amount !== 0,
        );
        const triat = selected === s;
        const color = `var(--color-${FAMILY_COLOR[SOURCE_FAMILY[s]]})`;
        return (
          <button
            key={s}
            type="button"
            aria-pressed={triat}
            onClick={() => onSelect(triat ? null : s)}
            style={triat ? { borderColor: color, color } : undefined}
            className={[
              "flex h-[80px] w-[64px] flex-col items-center justify-between rounded-[3px] border px-1 py-1.5 transition-colors",
              triat
                ? "bg-panel-hi"
                : "border-ink/25 bg-panel-lo/40 hover:bg-panel-hi",
              actiu || triat ? "" : "opacity-45",
            ].join(" ")}
          >
            <span className="text-center text-[11px] leading-tight text-ink">
              {SOURCE_NAMES[s]}
            </span>
            <span style={{ color: triat ? color : "var(--color-ink-soft)" }}>
              <Mini source={s} params={params} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
