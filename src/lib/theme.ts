/**
 * La clau i els noms dels temes. Mòdul pla a posta: layout.tsx és un
 * component de servidor, i si això visqués al hook (que és "use client")
 * n'importaria una referència i el valor arribaria com a `undefined`.
 */
export type Theme = "day" | "night";

export const THEME_KEY = "ritme16.tema";

export function isTheme(v: unknown): v is Theme {
  return v === "day" || v === "night";
}
