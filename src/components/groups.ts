/**
 * Els índexs d'una fila repartits en grups de quatre. La regla, els passos i
 * les files melòdiques han de fer servir exactament la mateixa partició: si
 * cadascú es fes la seva, deixarien de caure alineats en canviar la llargada.
 */
export function groupsOf4(length: number): number[][] {
  const grups: number[][] = [];
  for (let i = 0; i < length; i += 4) {
    grups.push(Array.from({ length: Math.min(4, length - i) }, (_, k) => i + k));
  }
  return grups;
}
