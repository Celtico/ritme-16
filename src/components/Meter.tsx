"use client";

/**
 * Una barra vertical de 4 px. El valor arriba ja llegit: tots els vúmetres
 * es llegeixen d'un sol cop des d'un únic bucle de dibuix.
 */
export function Meter({ level, label }: { level: number; label: string }) {
  const alçada = Math.min(100, Math.max(0, level * 100));
  return (
    <div
      className="ml-2 h-8 w-1 shrink-0 self-center overflow-hidden rounded-[1px] bg-ink/15"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(alçada)}
    >
      <div
        className="w-full origin-bottom bg-ochre"
        style={{ height: `${alçada}%`, marginTop: `${100 - alçada}%` }}
      />
    </div>
  );
}
