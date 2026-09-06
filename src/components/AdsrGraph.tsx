"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EnvParams } from "@/lib/pattern";

const W = 200;
const H = 72;
/** Píxels que es reparteix cada tram, i el valor màxim que hi cap. */
const A_PX = 58;
const A_MAX = 1;
const D_PX = 58;
const D_MAX = 2;
const HOLD_PX = 26;
const R_PX = 58;
const R_MAX = 2;

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

type Handle = "attack" | "decay" | "release";

interface Props {
  env: EnvParams;
  onChange: (changes: Partial<EnvParams>) => void;
}

/**
 * L'envolupant, arrossegant-ne els punts. Els mateixos valors que els knobs
 * de sota: el gràfic va bé per trobar la forma i els knobs per afinar-la.
 */
export function AdsrGraph({ env, onChange }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [agafat, setAgafat] = useState<Handle | null>(null);

  const xa = (env.attack / A_MAX) * A_PX;
  const xd = xa + (env.decay / D_MAX) * D_PX;
  const xs = xd + HOLD_PX;
  const xr = xs + (env.release / R_MAX) * R_PX;
  const ys = H - env.sustain * H;

  const moure = useCallback(
    (e: PointerEvent) => {
      const svg = svgRef.current;
      if (!svg || !agafat) return;
      const r = svg.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * W;
      const y = ((e.clientY - r.top) / r.height) * H;
      if (agafat === "attack") {
        onChange({ attack: clamp((x / A_PX) * A_MAX, 0.001, A_MAX) });
      } else if (agafat === "decay") {
        onChange({
          decay: clamp(((x - xa) / D_PX) * D_MAX, 0.01, D_MAX),
          sustain: clamp(1 - y / H, 0, 1),
        });
      } else {
        onChange({ release: clamp(((x - xs) / R_PX) * R_MAX, 0.01, R_MAX) });
      }
    },
    [agafat, onChange, xa, xs],
  );

  useEffect(() => {
    if (!agafat) return;
    const acabar = () => setAgafat(null);
    window.addEventListener("pointermove", moure);
    window.addEventListener("pointerup", acabar);
    return () => {
      window.removeEventListener("pointermove", moure);
      window.removeEventListener("pointerup", acabar);
    };
  }, [agafat, moure]);

  const Punt = ({
    id,
    x,
    y,
    etiqueta,
  }: {
    id: Handle;
    x: number;
    y: number;
    etiqueta: string;
  }) => (
    <circle
      cx={x}
      cy={y}
      r={4.5}
      fill={agafat === id ? "var(--color-ochre)" : "var(--color-panel-hi)"}
      stroke="var(--color-ink)"
      strokeWidth={1.5}
      className="cursor-grab touch-none"
      role="button"
      aria-label={etiqueta}
      onPointerDown={(e) => {
        e.preventDefault();
        setAgafat(id);
      }}
    />
  );

  return (
    <svg
      ref={svgRef}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="rounded-[3px] bg-panel-lo/40"
      aria-label="Forma de l'envolupant de filtre"
    >
      <path
        d={`M 0 ${H} L ${xa.toFixed(1)} 0 L ${xd.toFixed(1)} ${ys.toFixed(1)} L ${xs.toFixed(1)} ${ys.toFixed(1)} L ${xr.toFixed(1)} ${H}`}
        fill="none"
        stroke="var(--color-oxblood)"
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      <line
        x1={xd}
        y1={ys}
        x2={xs}
        y2={ys}
        stroke="var(--color-oxblood)"
        strokeWidth={1.75}
        opacity={0.5}
        strokeDasharray="2 2"
      />
      <Punt id="attack" x={xa} y={0} etiqueta="Atac" />
      <Punt id="decay" x={xd} y={ys} etiqueta="Caiguda i sosteniment" />
      <Punt id="release" x={xr} y={H} etiqueta="Relaxació" />
    </svg>
  );
}
