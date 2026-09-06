"use client";

import { responseCurve, type FilterType } from "@/lib/filter";

const W = 200;
const H = 60;
const MIN_HZ = 20;
const MAX_HZ = 20000;
const MAX_DB = 20;
const MIN_DB = -40;

const x = (hz: number) =>
  (Math.log(hz / MIN_HZ) / Math.log(MAX_HZ / MIN_HZ)) * W;
const y = (db: number) =>
  H - ((Math.max(MIN_DB, Math.min(MAX_DB, db)) - MIN_DB) / (MAX_DB - MIN_DB)) * H;

/** La resposta real del filtre, calculada, no una corba decorativa. */
export function FilterDisplay({
  type,
  cutoff,
  q,
}: {
  type: FilterType;
  cutoff: number;
  q: number;
}) {
  const corba = responseCurve(type, cutoff, q, 120, MIN_HZ, MAX_HZ);
  const d = corba
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.freq).toFixed(1)} ${y(p.db).toFixed(1)}`)
    .join(" ");

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="rounded-[3px] bg-panel-lo/40"
      role="img"
      aria-label={`Resposta del filtre, tall a ${Math.round(cutoff)} hertz`}
    >
      {[100, 1000, 10000].map((hz) => (
        <line
          key={hz}
          x1={x(hz)}
          y1={0}
          x2={x(hz)}
          y2={H}
          stroke="var(--color-ink)"
          strokeWidth={0.5}
          opacity={0.15}
        />
      ))}
      <line
        x1={0}
        y1={y(0)}
        x2={W}
        y2={y(0)}
        stroke="var(--color-ink)"
        strokeWidth={0.5}
        opacity={0.2}
      />
      <line
        x1={x(cutoff)}
        y1={0}
        x2={x(cutoff)}
        y2={H}
        stroke="var(--color-ochre)"
        strokeWidth={1}
      />
      <path d={d} fill="none" stroke="var(--color-ink)" strokeWidth={1.5} />
    </svg>
  );
}
