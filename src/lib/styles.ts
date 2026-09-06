import type { Pattern, VoiceKind } from "./pattern";
import { chance, type Rng } from "./rng";
import type { StyleSpec } from "./generate";

const veu = (p: Pattern, kind: VoiceKind) =>
  p.tracks.find((t) => t.kind === kind);

/** Buida una fila i hi escriu només els passos demanats. */
function nomesA(p: Pattern, kind: VoiceKind, passos: number[], accent = 2) {
  const t = veu(p, kind);
  if (!t) return;
  t.steps = t.steps.map(() => 0);
  for (const i of passos) if (i < p.length) t.steps[i] = accent as 1 | 2;
}

function afegeixA(p: Pattern, kind: VoiceKind, passos: number[], accent = 2) {
  const t = veu(p, kind);
  if (!t) return;
  for (const i of passos) if (i < p.length) t.steps[i] = accent as 1 | 2;
}

/** Els passos de cada temps fort del patró. */
const temps = (p: Pattern) =>
  Array.from({ length: p.length / 4 }, (_, i) => i * 4);

/** Els temps 2 i 4 de cada compàs, que és on va la caixa. */
const dosIQuatre = (p: Pattern) =>
  Array.from({ length: Math.max(1, p.length / 16) }, (_, c) => [
    c * 16 + 4,
    c * 16 + 12,
  ]).flat();

export const STYLES: StyleSpec[] = [
  {
    id: "house",
    name: "House",
    bpm: [120, 128],
    swing: [0, 0.08],
    modes: ["minor", "dorian", "pentMin"],
    length: 16,
    melodic: true,
    slots: [4, 6],
    progressions: [
      [1, 6, 3, 7],
      [1, 4, 5, 1],
      [1, 7, 6, 7],
    ],
    voices: {
      bombo: { density: [1, 0, 0, 0], accent: 0.5 },
      charles: { density: [0.1, 0.08, 0.9, 0.1], accent: 0.1 },
      palmada: { density: [0, 0, 0.15, 0], accent: 0.4 },
      charlesObert: { density: [0, 0, 0.2, 0], accent: 0.1, optional: true },
      caixa: { density: [0, 0.05, 0.1, 0.05], accent: 0.1, optional: true },
    },
    rules: [
      // el que fa que sigui house: bombo als quatre temps, sense excepció
      (p) => nomesA(p, "bombo", temps(p)),
      // i la palmada al 2 i al 4
      (p) => afegeixA(p, "palmada", dosIQuatre(p)),
      // La palmada i el charles obert ocupen el mateix lloc de l'espectre i
      // tots dos van al contratemps: si coincideixen, es tapen i se sent un
      // sol cop més fort. Guanya la palmada, que és la que marca el temps.
      (p) => {
        const palmada = veu(p, "palmada");
        const obert = veu(p, "charlesObert");
        if (!palmada || !obert) return;
        for (let i = 0; i < p.length; i++) {
          if (palmada.steps[i] && obert.steps[i]) obert.steps[i] = 0;
        }
      },
    ],
    sound: {
      bombo: (r) => ({ decay: 0.3 + r() * 0.15, drive: r() * 0.2 }),
      charles: (r) => ({ decay: 0.03 + r() * 0.03 }),
    },
  },

  {
    id: "breakbeat",
    name: "Breakbeat",
    bpm: [88, 98],
    swing: [0.12, 0.22],
    modes: ["minor", "dorian"],
    length: 16,
    melodic: true,
    slots: [4, 6],
    progressions: [
      [1, 7, 6, 7],
      [1, 6, 3, 7],
    ],
    voices: {
      bombo: { density: [0.55, 0.12, 0.25, 0.12], accent: 0.4 },
      caixa: { density: [0, 0.1, 0.2, 0.15], accent: 0.3 },
      charles: { density: [0.5, 0.4, 0.6, 0.4], accent: 0.1 },
      aro: { density: [0, 0.15, 0.35, 0.15], accent: 0.2 },
      palmada: { density: [0, 0, 0.1, 0.05], accent: 0.2, optional: true },
    },
    rules: [
      // la caixa mana al 2 i al 4, i la resta són fantasmes
      (p) => afegeixA(p, "caixa", dosIQuatre(p)),
      // mai bombo al tercer temps: és el que fa que el compàs coixegi
      (p) => {
        const b = veu(p, "bombo");
        if (!b) return;
        for (let c = 0; c * 16 < p.length; c++) b.steps[c * 16 + 8] = 0;
      },
      (p) => afegeixA(p, "bombo", [0], 2),
      // Els cops fantasma van enganxats darrere d'una caixa forta, a un o
      // dos passos. Els que el sorteig deixa escampats no són fantasmes:
      // són brossa, i s'esborren. Sempre n'hi ha d'haver almenys un.
      (p, rng: Rng) => {
        const c = veu(p, "caixa");
        if (!c) return;
        const forts = dosIQuatre(p).filter((i) => i < p.length);
        const permesos = new Set<number>(forts);
        for (const i of forts) permesos.add(i + 1).add(i + 2);
        for (let i = 0; i < p.length; i++) {
          if (c.steps[i] && !permesos.has(i)) c.steps[i] = 0;
        }
        let posats = 0;
        for (const i of forts) {
          if (!chance(rng, 0.7)) continue;
          const j = i + (chance(rng, 0.5) ? 1 : 2);
          if (j < p.length) {
            c.steps[j] = 1;
            posats++;
          }
        }
        if (posats === 0 && forts[0] + 1 < p.length) c.steps[forts[0] + 1] = 1;
      },
    ],
    sound: {
      caixa: (r) => ({ decay: 0.12 + r() * 0.08 }),
      aro: (r) => ({ drive: 0.1 + r() * 0.25 }),
    },
  },

  {
    id: "triphop",
    name: "Trip-hop",
    bpm: [68, 82],
    swing: [0.2, 0.36],
    modes: ["minor", "dorian"],
    length: 32,
    melodic: true,
    slots: [3, 5],
    progressions: [
      [1, 6, 1, 7],
      [1, 4, 6, 5],
    ],
    voices: {
      bombo: { density: [0.35, 0.05, 0.1, 0.08], accent: 0.5 },
      caixa: { density: [0, 0.05, 0.1, 0.05], accent: 0.3 },
      charles: { density: [0.4, 0.05, 0.25, 0.05], accent: 0.1 },
      cencerro: { density: [0, 0.05, 0.1, 0.05], accent: 0.2, optional: true },
      timbal: { density: [0, 0.05, 0.08, 0.05], accent: 0.3, optional: true },
    },
    rules: [
      // el bombo entra tard: al 0 i cap al final del temps 3
      (p) => {
        const b = veu(p, "bombo");
        if (!b) return;
        b.steps = b.steps.map(() => 0);
        for (let c = 0; c * 16 < p.length; c++) {
          b.steps[c * 16] = 2;
          b.steps[c * 16 + 10] = 1;
        }
      },
      (p) => afegeixA(p, "caixa", dosIQuatre(p)),
      // La caixa és l'àncora, i amb més de mig patró en silenci cada cop de
      // més se sent i li treu pes al que toca. Es queda als contratemps
      // forts i, com a molt, un sol fantasma a tot el patró.
      (p) => {
        const c = veu(p, "caixa");
        if (!c) return;
        const forts = new Set(dosIQuatre(p));
        let fantasma = false;
        for (let i = 0; i < p.length; i++) {
          if (!c.steps[i] || forts.has(i)) continue;
          if (fantasma) c.steps[i] = 0;
          else {
            c.steps[i] = 1;
            fantasma = true;
          }
        }
      },
    ],
    sound: {
      bombo: (r) => ({ decay: 0.5 + r() * 0.4, filter: { type: "lowpass", cutoff: 3000 + r() * 3000, q: 0.9 } }),
      caixa: (r) => ({ decay: 0.22 + r() * 0.15 }),
      charles: (r) => ({ filter: { type: "highpass", cutoff: 4000 + r() * 2500, q: 0.7 } }),
    },
    mix: {
      // la reverberació és mig instrument, aquí
      caixa: (r) => ({ sendA: 0.35 + r() * 0.35 }),
      cencerro: (r) => ({ sendA: 0.4 + r() * 0.4 }),
    },
  },

  {
    id: "techno",
    name: "Techno",
    bpm: [128, 142],
    swing: [0, 0.05],
    modes: ["minor", "pentMin"],
    length: 16,
    melodic: true,
    slots: [4, 6],
    progressions: [[1, 1, 6, 6], [1, 7, 1, 7]],
    voices: {
      bombo: { density: [1, 0, 0, 0], accent: 0.6 },
      charles: { density: [0.5, 0.45, 0.7, 0.45], accent: 0.1 },
      aro: { density: [0, 0.15, 0.3, 0.15], accent: 0.2 },
      cencerro: { density: [0, 0.05, 0.15, 0.05], accent: 0.2, optional: true },
      palmada: { density: [0, 0, 0.12, 0], accent: 0.3, optional: true },
    },
    rules: [
      (p) => nomesA(p, "bombo", temps(p)),
      // El charles és pràcticament l'única altra veu i, amb densitat mitja
      // al temps fort, dos dels quatre bombos en porten un a sobre. En
      // techno això s'empassa el transitori, que és de què viu l'estil.
      (p) => {
        const h = veu(p, "charles");
        const k = veu(p, "bombo");
        if (!h || !k) return;
        for (let i = 0; i < p.length; i++) if (k.steps[i]) h.steps[i] = 0;
      },
    ],
    sound: {
      // curt i brut: el techno viu del transitori
      bombo: (r) => ({ decay: 0.16 + r() * 0.1, drive: 0.25 + r() * 0.35 }),
      charles: (r) => ({ decay: 0.02 + r() * 0.02, drive: 0.15 + r() * 0.25 }),
      aro: (r) => ({ drive: 0.3 + r() * 0.4 }),
    },
  },

  {
    id: "dub",
    name: "Dub",
    bpm: [68, 78],
    swing: [0.15, 0.3],
    modes: ["minor", "dorian", "pentMin"],
    length: 32,
    melodic: true,
    slots: [3, 5],
    progressions: [[1, 1, 4, 4], [1, 6, 1, 6]],
    voices: {
      bombo: { density: [0.5, 0.05, 0.08, 0.05], accent: 0.5 },
      caixa: { density: [0, 0.05, 0.12, 0.05], accent: 0.3 },
      charlesObert: { density: [0, 0, 0.6, 0], accent: 0.2 },
      charles: { density: [0.25, 0.05, 0.1, 0.05], accent: 0.1, optional: true },
      cencerro: { density: [0, 0.05, 0.1, 0.05], accent: 0.2, optional: true },
    },
    rules: [
      // el charles obert al contratemps és la marca de la casa
      (p) => {
        const passos: number[] = [];
        for (let i = 2; i < p.length; i += 4) passos.push(i);
        nomesA(p, "charlesObert", passos, 1);
      },
      (p) => afegeixA(p, "caixa", dosIQuatre(p)),
      // Sortien 2,9 bombos per compàs. El dub va d'espai: amb el charles
      // obert ja als vuit contratemps, el bombo ha de ser un o dos per
      // compàs perquè el buit tingui pes. Es queden els dos primers.
      (p) => {
        const k = veu(p, "bombo");
        if (!k) return;
        for (let c = 0; c * 16 < p.length; c++) {
          let posats = 0;
          for (let i = 0; i < 16 && c * 16 + i < p.length; i++) {
            const j = c * 16 + i;
            if (!k.steps[j]) continue;
            if (posats >= 2) k.steps[j] = 0;
            else posats++;
          }
        }
      },
    ],
    sound: {
      bombo: (r) => ({ decay: 0.55 + r() * 0.4, filter: { type: "lowpass", cutoff: 1200 + r() * 1500, q: 1.1 } }),
      caixa: (r) => ({ decay: 0.25 + r() * 0.2 }),
    },
    mix: {
      // el retard és l'instrument principal del dub
      caixa: (r) => ({ sendB: 0.45 + r() * 0.4 }),
      charlesObert: (r) => ({ sendB: 0.35 + r() * 0.4 }),
      cencerro: (r) => ({ sendB: 0.3 + r() * 0.4, sendA: r() * 0.3 }),
    },
  },

  {
    id: "ternari",
    name: "Ternari",
    bpm: [120, 138],
    swing: [0.5, 0.62],
    modes: ["minor", "dorian", "pentMin"],
    length: 32,
    melodic: true,
    slots: [3, 5],
    progressions: [[1, 4, 5, 1], [1, 6, 4, 5]],
    voices: {
      bombo: { density: [0.6, 0, 0.1, 0], accent: 0.5 },
      timbal: { density: [0.15, 0.1, 0.25, 0.1], accent: 0.3 },
      cencerro: { density: [0.2, 0.05, 0.3, 0.05], accent: 0.25 },
      charles: { density: [0.7, 0, 0, 0], accent: 0.15 },
      caixa: { density: [0, 0, 0.15, 0], accent: 0.3, optional: true },
    },
    rules: [
      // Tresillo 3+3+2 dins de cada grup de vuit. És l'única manera de tenir
      // sensació ternària en una graella binària: 12 i 24 passos no existeixen.
      (p) => {
        const passos: number[] = [];
        for (let g = 0; g < p.length; g += 8) passos.push(g, g + 3, g + 6);
        nomesA(p, "bombo", passos, 1);
        const b = veu(p, "bombo");
        if (b) for (let g = 0; g < p.length; g += 8) b.steps[g] = 2;
      },
      // el charles només als temps, per no tapar el tresillo
      (p) => nomesA(p, "charles", temps(p), 1),
      // És l'estil més dens (30,6 cel·les, i dotze les posa el bombo) i el
      // timbal hi queia a sobre dues vegades per patró: dues veus greus
      // juntes al patró més carregat. El timbal s'aparta del tresillo.
      (p) => {
        const t = veu(p, "timbal");
        const k = veu(p, "bombo");
        if (!t || !k) return;
        for (let i = 0; i < p.length; i++) if (k.steps[i]) t.steps[i] = 0;
      },
    ],
    sound: {
      timbal: (r) => ({ decay: 0.25 + r() * 0.2 }),
      cencerro: (r) => ({ decay: 0.15 + r() * 0.2, drive: r() * 0.2 }),
    },
  },

  {
    id: "percussio",
    name: "Percussió",
    bpm: [100, 118],
    swing: [0, 0.25],
    modes: ["minor"],
    length: 16,
    melodic: false,
    slots: [5, 6],
    progressions: [[1]],
    voices: {
      bombo: { density: [0.6, 0.05, 0.2, 0.05], accent: 0.4 },
      caixa: { density: [0, 0.1, 0.2, 0.1], accent: 0.3 },
      timbal: { density: [0.15, 0.1, 0.2, 0.1], accent: 0.3 },
      cencerro: { density: [0.2, 0.1, 0.35, 0.1], accent: 0.25 },
      aro: { density: [0.1, 0.2, 0.3, 0.2], accent: 0.2 },
      palmada: { density: [0, 0.05, 0.2, 0.05], accent: 0.3, optional: true },
      charles: { density: [0.3, 0.3, 0.4, 0.3], accent: 0.1, optional: true },
    },
    rules: [
      // que sempre hi hagi un ancoratge al primer temps
      (p) => afegeixA(p, "bombo", [0], 2),
      // i que el cencerro no vagi mai clavat amb l'aro
      (p, rng: Rng) => {
        const a = veu(p, "aro");
        const c = veu(p, "cencerro");
        if (!a || !c) return;
        for (let i = 0; i < p.length; i++) {
          if (a.steps[i] && c.steps[i] && chance(rng, 0.8)) c.steps[i] = 0;
        }
      },
      // És l'estil amb més veus (5,65) i totes pesaven gairebé igual: la més
      // carregada en feia 5,55 i la mitjana per veu 3,15, una relació d'1,76.
      // Amb sis veus del mateix pes no hi ha figura, hi ha textura. La més
      // densa passa a ser la líder i se li dobla el pes de la mediana.
      (p) => {
        const amb = p.tracks.filter((t) =>
          t.steps.slice(0, p.length).some(Boolean),
        );
        if (amb.length < 3) return;
        const cops = (t: (typeof amb)[number]) =>
          t.steps.slice(0, p.length).filter(Boolean).length;
        const ordenades = [...amb].sort((x, y) => cops(y) - cops(x));
        const lider = ordenades[0];
        const mediana = cops(ordenades[Math.floor(ordenades.length / 2)]);
        // s'afegeixen cops a la líder als passos que li queden lliures
        for (let i = 0; i < p.length && cops(lider) < mediana * 2; i++) {
          if (!lider.steps[i]) lider.steps[i] = 1;
        }
      },
    ],
    sound: {
      timbal: (r) => ({ pitch: Math.round(-4 + r() * 8) }),
      cencerro: (r) => ({ pitch: Math.round(-3 + r() * 6) }),
    },
  },
];

export const STYLE_IDS = STYLES.map((s) => s.id);

export function styleById(id: string): StyleSpec | undefined {
  return STYLES.find((s) => s.id === id);
}
