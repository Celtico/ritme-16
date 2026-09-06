"use client";

import { useCallback, useEffect, useState } from "react";
import { isTheme, THEME_KEY, type Theme } from "@/lib/theme";

export type { Theme };

/**
 * El tema el fixa un script en línia abans del primer pintat (vegeu
 * app/layout.tsx), perquè si esperéssim el primer render es veuria el
 * parpelleig del tema clar. Aquí només el llegim i el canviem.
 */
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>("day");

  useEffect(() => {
    const actual = document.documentElement.dataset.theme;
    if (isTheme(actual)) setTheme(actual);
  }, []);

  const canvia = useCallback((t: Theme) => {
    document.documentElement.dataset.theme = t;
    setTheme(t);
    try {
      window.localStorage.setItem(THEME_KEY, t);
    } catch {
      // mode privat o quota plena: el tema val per a aquesta sessió
    }
  }, []);

  return [theme, canvia];
}
