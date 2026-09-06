"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  size?: number;
  /** Omple des del centre en comptes de des de l'esquerra. */
  bipolar?: boolean;
  /** Com es mostra el valor al globus mentre s'arrossega. */
  format?: (v: number) => string;
  onChange: (v: number) => void;
  /** Quantitat de modulació, -1..1. Si és undefined, no es dibuixa l'anell. */
  ring?: number;
  ringColor?: string;
  onRing?: (amount: number) => void;
  /** A les files no hi cap l'etiqueta: queda al títol i a l'aria-label. */
  hideLabel?: boolean;
}

const INICI = -135;
const ESCOMBRAT = 270;

/**
 * Punt del cercle a l'angle demanat, en graus, amb 0 a dalt.
 *
 * Els valors s'arrodoneixen a tres decimals a posta: el servidor i el
 * navegador poden donar l'últim bit diferent a Math.cos i Math.sin, i llavors
 * React es queixa que l'HTML renderitzat no coincideix.
 */
function punt(cx: number, cy: number, r: number, graus: number) {
  const rad = ((graus - 90) * Math.PI) / 180;
  return [
    Number((cx + r * Math.cos(rad)).toFixed(3)),
    Number((cy + r * Math.sin(rad)).toFixed(3)),
  ];
}

function arc(cx: number, cy: number, r: number, de: number, a: number) {
  if (Math.abs(a - de) < 0.01) return "";
  const [x1, y1] = punt(cx, cy, r, de);
  const [x2, y2] = punt(cx, cy, r, a);
  const gran = Math.abs(a - de) > 180 ? 1 : 0;
  const sentit = a > de ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${gran} ${sentit} ${x2} ${y2}`;
}

export function Knob({
  label,
  value,
  min,
  max,
  step = (max - min) / 100,
  size = 28,
  bipolar = false,
  format,
  onChange,
  ring,
  ringColor = "var(--color-oxblood)",
  onRing,
  hideLabel = false,
}: Props) {
  const [arrossegant, setArrossegant] = useState(false);
  const inici = useRef({ y: 0, valor: 0, anell: false });

  const norm = (max - min === 0 ? 0 : (value - min) / (max - min));
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - (ring !== undefined ? 5 : 2);
  const angleValor = INICI + norm * ESCOMBRAT;
  const angleZero = bipolar ? INICI + ESCOMBRAT / 2 : INICI;
  const [mx, my] = punt(cx, cy, r - 1.5, angleValor);

  const moure = useCallback(
    (e: PointerEvent) => {
      const d = inici.current.y - e.clientY;
      const fi = e.shiftKey ? 4 : 1;
      if (inici.current.anell && onRing) {
        onRing(Math.max(-1, Math.min(1, inici.current.valor + d / (150 * fi))));
        return;
      }
      const abast = max - min;
      const cru = inici.current.valor + (d / (150 * fi)) * abast;
      const passos = Math.round(cru / step) * step;
      onChange(Math.max(min, Math.min(max, Number(passos.toFixed(6)))));
    },
    [max, min, onChange, onRing, step],
  );

  useEffect(() => {
    if (!arrossegant) return;
    const acabar = () => setArrossegant(false);
    window.addEventListener("pointermove", moure);
    window.addEventListener("pointerup", acabar);
    return () => {
      window.removeEventListener("pointermove", moure);
      window.removeEventListener("pointerup", acabar);
    };
  }, [arrossegant, moure]);

  const començar = (e: React.PointerEvent, anell: boolean) => {
    e.preventDefault();
    inici.current = {
      y: e.clientY,
      valor: anell ? (ring ?? 0) : value,
      anell,
    };
    setArrossegant(true);
  };

  const teclat = (e: React.KeyboardEvent) => {
    const d =
      e.key === "ArrowUp" || e.key === "ArrowRight"
        ? step
        : e.key === "ArrowDown" || e.key === "ArrowLeft"
          ? -step
          : 0;
    if (!d) return;
    e.preventDefault();
    onChange(Math.max(min, Math.min(max, Number((value + d).toFixed(6)))));
  };

  const mostrat = format ? format(value) : String(Math.round(value));

  return (
    <div className="relative flex flex-col items-center">
      {arrossegant ? (
        <div className="pointer-events-none absolute -top-6 z-20 whitespace-nowrap rounded-[3px] border border-ink/40 bg-header px-1.5 py-0.5 font-display text-[11px] text-on-accent tabular-nums">
          {inici.current.anell
            ? `${Math.round((ring ?? 0) * 100)} %`
            : mostrat}
        </div>
      ) : null}

      <svg
        width={size}
        height={size}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={mostrat}
        onKeyDown={teclat}
        onPointerDown={(e) => començar(e, false)}
        onDoubleClick={() => onChange(bipolar ? 0 : min)}
        className="cursor-ns-resize touch-none focus-visible:outline-2 focus-visible:outline-ochre"
      >
        <path
          d={arc(cx, cy, r, INICI, INICI + ESCOMBRAT)}
          fill="none"
          stroke="var(--color-panel-lo)"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <path
          d={arc(cx, cy, r, angleZero, angleValor)}
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <line
          x1={cx}
          y1={cy}
          x2={mx}
          y2={my}
          stroke="var(--color-ink)"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        {ring !== undefined ? (
          <g
            onPointerDown={(e) => {
              // sense això l'esdeveniment tornaria a arribar a l'svg i el
              // segon gestor sobreescriuria el primer, movent el valor
              e.stopPropagation();
              començar(e, true);
            }}
          >
            <circle
              cx={cx}
              cy={cy}
              r={r + 3.5}
              fill="none"
              stroke="transparent"
              strokeWidth={9}
              // un traç transparent no és clicable si no s'hi diu explícitament
              style={{ pointerEvents: "stroke" }}
              className="cursor-ns-resize"
            />
            <path
              d={arc(cx, cy, r + 3.5, INICI, INICI + ESCOMBRAT)}
              fill="none"
              stroke="var(--color-panel-lo)"
              strokeWidth={2}
              opacity={0.5}
            />
            <path
              d={arc(
                cx,
                cy,
                r + 3.5,
                angleValor,
                Math.max(
                  INICI,
                  Math.min(INICI + ESCOMBRAT, angleValor + ring * ESCOMBRAT * 0.5),
                ),
              )}
              fill="none"
              stroke={ringColor}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          </g>
        ) : null}
      </svg>

      {hideLabel ? null : (
        <span className="mt-1 text-[12px] leading-none text-ink-soft">
          {label}
        </span>
      )}
    </div>
  );
}
