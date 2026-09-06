/**
 * Serialització del patró a un paràmetre de query. Cap API del navegador:
 * ni btoa, ni Buffer, ni CompressionStream, perquè el còdec es pugui provar
 * sencer i perquè el que en surti sigui idèntic a tot arreu.
 *
 * El format és una llista de posicions, no un objecte amb noms: els noms de
 * camp ocuparien més que les dades. La versió va davant de tot per poder
 * rebutjar enllaços d'un format que ja no s'entengui.
 */
import {
  defaultMacros,
  defaultParams,
  defaultReturns,
  KINDS,
  MAX_STEPS,
  VOICE_KINDS,
  type Cell,
  type Pattern,
  type Track,
  type VoiceKind,
} from "./pattern";
import { normalise } from "./storage";

export const SHARE_VERSION = 1;
export const SHARE_PARAM = "p";

const ALFABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function bytesToBase64url(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += ALFABET[a >> 2];
    out += ALFABET[((a & 3) << 4) | ((b ?? 0) >> 4)];
    if (b === undefined) break;
    out += ALFABET[((b & 15) << 2) | ((c ?? 0) >> 6)];
    if (c === undefined) break;
    out += ALFABET[c & 63];
  }
  return out;
}

function base64urlToBytes(s: string): Uint8Array {
  const nums: number[] = [];
  for (const ch of s) {
    const v = ALFABET.indexOf(ch);
    if (v < 0) throw new Error("caràcter que no és del format");
    nums.push(v);
  }
  const bytes: number[] = [];
  for (let i = 0; i < nums.length; i += 4) {
    const [a, b, c, d] = [nums[i], nums[i + 1], nums[i + 2], nums[i + 3]];
    if (b === undefined) break;
    bytes.push(((a << 2) | (b >> 4)) & 255);
    if (c === undefined) break;
    bytes.push(((b << 4) | (c >> 2)) & 255);
    if (d === undefined) break;
    bytes.push(((c << 6) | d) & 255);
  }
  return Uint8Array.from(bytes);
}

/** Els 32 passos caben en 8 bytes: dos bits per cel·la. */
function packSteps(steps: Cell[]): string {
  const bytes = new Uint8Array(MAX_STEPS / 4);
  for (let i = 0; i < MAX_STEPS; i++) {
    const v = steps[i] ?? 0;
    if (v) bytes[i >> 2] |= (v & 3) << ((i & 3) * 2);
  }
  return bytesToBase64url(bytes);
}

function unpackSteps(s: string): Cell[] {
  const bytes = base64urlToBytes(s);
  return Array.from({ length: MAX_STEPS }, (_, i) => {
    const v = ((bytes[i >> 2] ?? 0) >> ((i & 3) * 2)) & 3;
    return (v === 1 || v === 2 ? v : 0) as Cell;
  });
}

const igual = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

/** Un patró en forma de llistes, prou curt per cabre en una adreça. */
export function encodePattern(p: Pattern): string {
  const tracks = p.tracks.map((t) => {
    const entrada: unknown[] = [
      VOICE_KINDS.indexOf(t.kind),
      packSteps(t.steps),
      (t.bass ?? [])
        .map((n, i) => (n ? [i, n.midi, n.length, n.accent ? 1 : 0] : null))
        .filter(Boolean),
      (t.chords ?? [])
        .map((c, i) =>
          c ? [i, c.degree, c.kind === "seventh" ? 1 : 0, c.length, c.octave] : null,
        )
        .filter(Boolean),
      [
        t.mix.volume,
        t.mix.muted ? 1 : 0,
        t.mix.solo ? 1 : 0,
        +t.mix.pan.toFixed(2),
        +t.mix.sendA.toFixed(2),
        +t.mix.sendB.toFixed(2),
      ],
    ];
    // el nom, el color i el so només hi van si algú els ha tocat
    if (t.name !== KINDS[t.kind].name) entrada[5] = t.name;
    if (t.color !== KINDS[t.kind].color) entrada[6] = t.color;
    if (!igual(t.sound, defaultParams(t.kind))) entrada[7] = t.sound;
    return entrada;
  });

  const dades: unknown[] = [
    SHARE_VERSION,
    p.name,
    p.bpm,
    +p.swing.toFixed(2),
    p.length,
    p.key.root,
    p.key.mode,
    tracks,
  ];
  if (!igual(p.returns, defaultReturns())) dades[8] = p.returns;
  if (!igual(p.macros, defaultMacros())) dades[9] = p.macros;

  const json = JSON.stringify(dades);
  return bytesToBase64url(new TextEncoder().encode(json));
}

/**
 * Torna un patró vàlid o null. Passa sempre per normalise(), que és la porta
 * d'entrada de tot el que ve de fora: així un enllaç manipulat no pot deixar
 * el model en un estat impossible.
 */
export function decodePattern(s: string): Pattern | null {
  try {
    const json = new TextDecoder().decode(base64urlToBytes(s));
    const d = JSON.parse(json);
    if (!Array.isArray(d) || d[0] !== SHARE_VERSION) return null;

    const tracks = Array.isArray(d[7]) ? d[7] : [];
    const cru = {
      name: d[1],
      bpm: d[2],
      swing: d[3],
      length: d[4],
      key: { root: d[5], mode: d[6] },
      returns: d[8],
      macros: d[9],
      tracks: tracks.map((t: unknown[], i: number) => {
        const kind = VOICE_KINDS[t[0] as number] as VoiceKind | undefined;
        const mix = Array.isArray(t[4]) ? (t[4] as number[]) : [];
        const bass = Array.isArray(t[2]) ? (t[2] as number[][]) : [];
        const chords = Array.isArray(t[3]) ? (t[3] as number[][]) : [];
        const files: Partial<Track> = {};
        if (kind === "baix") {
          const fila = Array<unknown>(MAX_STEPS).fill(null);
          for (const [pas, midi, len, acc] of bass) {
            fila[pas] = { midi, length: len, accent: acc === 1 };
          }
          files.bass = fila as Track["bass"];
        }
        if (kind === "acords") {
          const fila = Array<unknown>(MAX_STEPS).fill(null);
          for (const [pas, degree, sev, len, oct] of chords) {
            fila[pas] = {
              degree,
              kind: sev === 1 ? "seventh" : "triad",
              length: len,
              octave: oct,
            };
          }
          files.chords = fila as Track["chords"];
        }
        return {
          id: `${kind ?? "x"}-${i}`,
          kind,
          name: t[5],
          color: t[6],
          sound: t[7],
          steps: typeof t[1] === "string" ? unpackSteps(t[1]) : [],
          ...files,
          mix: {
            volume: mix[0],
            muted: mix[1] === 1,
            solo: mix[2] === 1,
            pan: mix[3],
            sendA: mix[4],
            sendB: mix[5],
          },
        };
      }),
    };
    return normalise(cru);
  } catch {
    return null;
  }
}

/** L'adreça d'aquesta pàgina amb el patró a dins. */
export function shareUrl(base: string, p: Pattern): string {
  const url = new URL(base);
  url.search = `${SHARE_PARAM}=${encodePattern(p)}`;
  url.hash = "";
  return url.toString();
}
