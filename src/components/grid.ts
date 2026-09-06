/**
 * La graella de passos. Setze (o vuit, o trenta-dues) columnes iguals amb un
 * buit gran entre grups de quatre.
 *
 * Abans les cel·les eren flex amb un màxim de 64 px: en pantalles amples
 * arribaven al màxim i tot el que sobrava es convertia en forats enormes
 * entre grups. Amb columnes de 1fr, el que sobra va a les cel·les i el buit
 * entre grups és sempre el mateix.
 */

/** El buit petit, entre cel·les del mateix grup. */
export const CELL_GAP = 4;
/** Columna morta entre grups: amb els dos buits petits dels costats fa 12 px. */
const GUTTER = CELL_GAP;

export function stepGridTemplate(length: number): string {
  const grups = Math.ceil(length / 4);
  const parts: string[] = [];
  for (let g = 0; g < grups; g++) {
    const n = Math.min(4, length - g * 4);
    if (g > 0) parts.push(`${GUTTER}px`);
    parts.push(`repeat(${n}, minmax(0, 1fr))`);
  }
  return parts.join(" ");
}

/** A quina columna de la graella va el pas `i`, comptant les columnes mortes. */
export function stepColumn(i: number): number {
  return i + 1 + Math.floor(i / 4);
}
