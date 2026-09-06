/**
 * Una funció per tipus de veu. Afegir una veu nova al RITME-16 és afegir una
 * entrada a KINDS i una fàbrica a FACTORIES: enlloc més del programa no hi ha
 * d'haver cap tipus de veu escrit a mà.
 *
 * Aquest fitxer no importa Tone en temps d'execució: el rep per paràmetre.
 */

type ToneModule = typeof import("tone");
type Destination = import("tone").InputNode;

export type VoiceKind =
  | "bombo"
  | "caixa"
  | "palmada"
  | "charles"
  | "charlesObert"
  | "aro"
  | "timbal"
  | "cencerro";

export type { FilterType } from "./filter";
import type { FilterType } from "./filter";

export interface FilterParams {
  type: FilterType;
  /** Freqüència de tall en Hz. */
  cutoff: number;
  /** Factor de qualitat; 0,707 és la resposta plana. */
  q: number;
}

export interface EnvParams {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  /** 0..1. A 0 l'envolupant no mou res i el filtre es queda al tall. */
  amount: number;
}

export type LfoShape = "sine" | "triangle" | "square" | "sawtooth";
export type SyncRate = "1n" | "2n" | "4n" | "8n" | "16n";

export interface LfoParams {
  shape: LfoShape;
  /** Sincronitzat al transport. */
  rate: SyncRate;
  /** 0..1. A 0 l'LFO no mou res. */
  depth: number;
}

export type ModSource =
  | "envAmp"
  | "envFilter"
  | "lfo1"
  | "lfo2"
  | "velocity"
  | "random";

export type ModTarget = "cutoff" | "pitch" | "decay" | "drive";

export interface Mod {
  source: ModSource;
  target: ModTarget;
  /** -1..1, que a la interfície es veu com -100..100 %. */
  amount: number;
}

/**
 * Els comandaments de so d'una veu. Els valors per defecte reprodueixen
 * exactament el so de fàbrica: el filtre al seu tall original, l'envolupant
 * de filtre amb quantitat 0, els LFO amb profunditat 0 i cap modulació.
 */
export interface VoiceParams {
  /** Semitons, -12..+12. A les veus de soroll mou el filtre en comptes del to. */
  pitch: number;
  /** Caiguda de l'envolupant d'amplitud, en segons. */
  decay: number;
  /** 0..1 de net a saturat. */
  drive: number;
  filter: FilterParams;
  envFilter: EnvParams;
  /** Com a màxim dos; el model no en desa més. */
  lfo: LfoParams[];
  mods: Mod[];
}

export const MAX_LFO = 2;
export const MAX_MACROS = 4;

export const LFO_SHAPES: LfoShape[] = [
  "sine",
  "triangle",
  "square",
  "sawtooth",
];
export const SYNC_RATES: SyncRate[] = ["1n", "2n", "4n", "8n", "16n"];
export const MOD_SOURCES: ModSource[] = [
  "envAmp",
  "envFilter",
  "lfo1",
  "lfo2",
  "velocity",
  "random",
];
export const MOD_TARGETS: ModTarget[] = ["cutoff", "pitch", "decay", "drive"];

/** Noms en català de les fonts i les destinacions, per a la interfície. */
export const SOURCE_NAMES: Record<ModSource, string> = {
  envAmp: "Env Amp",
  envFilter: "Env Filtre",
  lfo1: "LFO 1",
  lfo2: "LFO 2",
  velocity: "Velocitat",
  random: "Atzar",
};

/** Cada font pertany a una família, i cada família té el seu color. */
export const SOURCE_FAMILY: Record<ModSource, "env" | "lfo" | "random"> = {
  envAmp: "env",
  envFilter: "env",
  lfo1: "lfo",
  lfo2: "lfo",
  velocity: "random",
  random: "random",
};

export const FAMILY_COLOR: Record<"env" | "lfo" | "random", string> = {
  env: "oxblood",
  lfo: "ochre",
  random: "teal",
};

export const TARGET_NAMES: Record<ModTarget, string> = {
  cutoff: "tall",
  pitch: "afinació",
  decay: "caiguda",
  drive: "saturació",
};

/** Marge del control de caiguda. El mínim baixa fins a 0,02 s perquè el
 * charles (0,045) i l'aro (0,035) ja hi són per sota i no han de canviar. */
export const DECAY_MIN = 0.02;
export const DECAY_MAX = 1.5;

/** Els blocs de la cadena, en l'ordre en què hi passa el senyal. */
export type BlockId = "osc" | "filter" | "drive" | "amp";

export interface KindSpec {
  /** Nom que rep una pista nova d'aquest tipus. */
  name: string;
  /** Color per defecte, un nom de la paleta de globals.css. */
  color: string;
  /** El pes de la veu dins la barreja, en dB. */
  level: number;
  /** La caiguda de fàbrica, tal com estava escrita a la cadena. */
  decay: number;
  /** El filtre que la cadena ja tenia. A les veus metàl·liques, la ressonància. */
  filter: FilterParams;
  /** Quins blocs existeixen de debò en aquesta cadena; el panell només dibuixa els que hi són. */
  blocks: BlockId[];
  /** Tipus que aquesta veu ofega en sonar, com el charles amb l'obert. */
  chokes?: VoiceKind[];
  /** Cada quant surt aquesta veu en sortejar un patró, de 0 a 1. */
  density: number;
}

export const KINDS: Record<VoiceKind, KindSpec> = {
  bombo: { name: "Bombo", color: "oxblood", level: -2, decay: 0.42, density: 0.22, filter: { type: "lowpass", cutoff: 12000, q: 0.707 }, blocks: ["osc", "filter", "drive", "amp"] },
  caixa: { name: "Caixa", color: "oxblood", level: -9, decay: 0.17, density: 0.12, filter: { type: "highpass", cutoff: 1500, q: 0.707 }, blocks: ["osc", "filter", "drive", "amp"] },
  palmada: { name: "Palmada", color: "ochre", level: -10, decay: 0.11, density: 0.08, filter: { type: "bandpass", cutoff: 1100, q: 1.6 }, blocks: ["filter", "drive", "amp"] },
  charles: {
    name: "Charles",
    color: "ochre",
    level: -16,
    decay: 0.045,
    density: 0.45,
    filter: { type: "highpass", cutoff: 7200, q: 0.707 },
    blocks: ["filter", "drive", "amp"],
    chokes: ["charlesObert"],
  },
  charlesObert: {
    name: "Charles obert",
    color: "ochre",
    level: -18,
    decay: 0.38,
    density: 0.06,
    filter: { type: "highpass", cutoff: 7200, q: 0.707 },
    blocks: ["filter", "drive", "amp"],
  },
  aro: { name: "Aro", color: "teal", level: -22, decay: 0.035, density: 0.1, filter: { type: "highpass", cutoff: 5200, q: 0.707 }, blocks: ["osc", "filter", "drive", "amp"] },
  timbal: { name: "Timbal", color: "oxblood", level: -8, decay: 0.34, density: 0.07, filter: { type: "lowpass", cutoff: 12000, q: 0.707 }, blocks: ["osc", "filter", "drive", "amp"] },
  cencerro: { name: "Cencerro", color: "teal", level: -24, decay: 0.3, density: 0.05, filter: { type: "highpass", cutoff: 900, q: 0.707 }, blocks: ["osc", "filter", "drive", "amp"] },
};

export const VOICE_KINDS = Object.keys(KINDS) as VoiceKind[];

export function defaultFilter(kind: VoiceKind): FilterParams {
  return { ...KINDS[kind].filter };
}

export function defaultParams(kind: VoiceKind): VoiceParams {
  return {
    pitch: 0,
    decay: KINDS[kind].decay,
    drive: 0,
    filter: defaultFilter(kind),
    envFilter: {
      attack: 0.001,
      decay: KINDS[kind].decay,
      sustain: 0,
      release: 0.1,
      amount: 0,
    },
    lfo: [
      { shape: "sine", rate: "4n", depth: 0 },
      { shape: "triangle", rate: "8n", depth: 0 },
    ],
    mods: [],
  };
}

const semitons = (n: number) => Math.pow(2, n / 12);

export interface VoiceChain {
  trigger(time: number, velocity: number): void;
  /** Ofega la veu; només la fan servir les que en poden ofegar d'altres. */
  release(time: number): void;
  setParams(params: VoiceParams): void;
  dispose(): void;
}

type Filter = InstanceType<ToneModule["Filter"]>;

/**
 * El bloc de filtre d'una veu: el node, la seva envolupant i els dos LFO.
 *
 * L'envolupant governa `filter.frequency` sencera (per això el valor del node
 * es deixa a 0) i amb `octaves` a 0 hi manté el tall constant, que és com ve
 * de fàbrica. Els LFO s'hi sumen a sobre; amb profunditat 0 no mouen res.
 */
function filterRig(Tone: ToneModule, node: Filter) {
  const env = new Tone.FrequencyEnvelope({
    attack: 0.001,
    decay: 0.2,
    sustain: 0,
    release: 0.1,
    baseFrequency: 1000,
    octaves: 0,
  });
  node.frequency.value = 0;
  env.connect(node.frequency);

  const lfos = [new Tone.LFO(4, 0, 0), new Tone.LFO(8, 0, 0)];
  for (const l of lfos) {
    l.connect(node.frequency);
    l.sync().start(0);
  }

  return {
    apply(p: VoiceParams) {
      node.type = p.filter.type;
      node.Q.value = p.filter.q;
      env.baseFrequency = p.filter.cutoff;
      env.octaves = p.envFilter.amount * 4;
      env.attack = p.envFilter.attack;
      env.decay = p.envFilter.decay;
      env.sustain = p.envFilter.sustain;
      env.release = p.envFilter.release;

      lfos.forEach((l, i) => {
        const cfg = p.lfo[i];
        if (!cfg) return;
        const font = i === 0 ? "lfo1" : "lfo2";
        const mod = p.mods.find(
          (m) => m.source === font && m.target === "cutoff",
        );
        // sense una modulació que l'encamini, un LFO no va enlloc
        const abast = p.filter.cutoff * cfg.depth * Math.abs(mod?.amount ?? 0);
        l.type = cfg.shape;
        l.frequency.value = cfg.rate;
        l.min = -abast;
        l.max = abast;
      });
    },
    trigger(time: number, velocity: number) {
      env.triggerAttackRelease(0.05, time, velocity);
    },
    dispose() {
      env.dispose();
      for (const l of lfos) l.dispose();
    },
  };
}

/**
 * Les modulacions que s'apliquen en disparar, no en temps d'àudio. Accepta un
 * paràmetre nul perquè una cadena es pot disparar abans que li arribin els
 * seus valors, i llavors no ha de modular res, no ha de petar.
 */
function perTrigger(
  p: VoiceParams | null,
  target: ModTarget,
  velocity: number,
) {
  if (!p) return 0;
  let total = 0;
  for (const m of p.mods) {
    if (m.target !== target) continue;
    if (m.source === "velocity") total += m.amount * velocity;
    else if (m.source === "random") total += m.amount * (Math.random() * 2 - 1);
  }
  return total;
}

type Factory = (Tone: ToneModule, out: Destination) => VoiceChain;

/** Les membranes (bombo i timbal) només es diferencien pels seus valors. */
function membraneChain(
  Tone: ToneModule,
  out: Destination,
  o: {
    nota: string;
    pitchDecay: number;
    octaves: number;
    envelope: { attack: number; decay: number; sustain: number; release: number };
  },
): VoiceChain {
  const node = new Tone.Filter(12000, "lowpass").connect(out);
  const rig = filterRig(Tone, node);
  const synth = new Tone.MembraneSynth({
    pitchDecay: o.pitchDecay,
    octaves: o.octaves,
    oscillator: { type: "sine" },
    envelope: o.envelope,
  }).connect(node);
  let params: VoiceParams | null = null;
  return {
    trigger: (t, v) => {
      const pitch = (params?.pitch ?? 0) + perTrigger(params, "pitch", v) * 12;
      rig.trigger(t, v);
      synth.triggerAttackRelease(
        Tone.Frequency(o.nota).transpose(pitch).toFrequency(),
        "8n",
        t,
        v,
      );
    },
    release: () => {},
    setParams: (p) => {
      params = p;
      synth.envelope.decay = p.decay;
      rig.apply(p);
    },
    dispose: () => {
      synth.dispose();
      rig.dispose();
      node.dispose();
    },
  };
}

/** Els dos charles comparteixen cadena: soroll per un passa-alts. */
function hatChain(
  Tone: ToneModule,
  out: Destination,
  decay: number,
  durada: string,
  extra: { sustain?: number; release?: number } = {},
): VoiceChain {
  const node = new Tone.Filter(7200, "highpass").connect(out);
  const rig = filterRig(Tone, node);
  const synth = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay, sustain: 0, ...extra },
  }).connect(node);
  return {
    trigger: (t, v) => {
      rig.trigger(t, v);
      synth.triggerAttackRelease(durada, t, v);
    },
    release: (t) => synth.triggerRelease(t),
    setParams: (p) => {
      synth.envelope.decay = p.decay;
      rig.apply(p);
    },
    dispose: () => {
      synth.dispose();
      rig.dispose();
      node.dispose();
    },
  };
}

/**
 * Les veus metàl·liques no tenen cap node Filter: el MetalSynth porta el seu
 * passa-alts a dins i el tall és la seva `resonance`, que és una propietat i
 * no un senyal. Per això aquí no hi ha ni envolupant de filtre ni LFO.
 */
function metalChain(
  Tone: ToneModule,
  out: Destination,
  o: {
    envelope: { attack: number; decay: number; release: number };
    harmonicity: number;
    modulationIndex: number;
    resonance: number;
    octaves: number;
    freq: number;
    durada: string;
  },
): VoiceChain {
  const synth = new Tone.MetalSynth({
    envelope: o.envelope,
    harmonicity: o.harmonicity,
    modulationIndex: o.modulationIndex,
    resonance: o.resonance,
    octaves: o.octaves,
  }).connect(out);
  let params: VoiceParams | null = null;
  return {
    trigger: (t, v) => {
      const pitch = (params?.pitch ?? 0) + perTrigger(params, "pitch", v) * 12;
      synth.triggerAttackRelease(o.freq * semitons(pitch), o.durada, t, v);
    },
    release: () => {},
    setParams: (p) => {
      params = p;
      synth.envelope.decay = p.decay;
      // el sostre de resonance del MetalSynth és 7000 Hz
      synth.resonance = Math.min(7000, Math.max(0, p.filter.cutoff));
    },
    dispose: () => synth.dispose(),
  };
}

const FACTORIES: Record<VoiceKind, Factory> = {
  bombo: (Tone, out) =>
    membraneChain(Tone, out, {
      nota: "C1",
      pitchDecay: 0.045,
      octaves: 6,
      envelope: { attack: 0.001, decay: 0.42, sustain: 0.008, release: 1.2 },
    }),

  timbal: (Tone, out) =>
    membraneChain(Tone, out, {
      nota: "A1",
      pitchDecay: 0.1,
      octaves: 3,
      envelope: { attack: 0.001, decay: 0.34, sustain: 0.01, release: 0.6 },
    }),

  // --- Caixa: cos tonal + soroll filtrat --------------------------------
  caixa: (Tone, out) => {
    const node = new Tone.Filter(1500, "highpass").connect(out);
    const rig = filterRig(Tone, node);
    const soroll = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.17, sustain: 0 },
    }).connect(node);
    const volumCos = new Tone.Volume(-8).connect(out);
    const cos = new Tone.MembraneSynth({
      pitchDecay: 0.02,
      octaves: 3,
      envelope: { attack: 0.001, decay: 0.14, sustain: 0, release: 0.1 },
    }).connect(volumCos);
    let params: VoiceParams | null = null;
    return {
      trigger: (t, v) => {
        const pitch =
          (params?.pitch ?? 0) + perTrigger(params, "pitch", v) * 12;
        rig.trigger(t, v);
        cos.triggerAttackRelease(
          Tone.Frequency("G2").transpose(pitch).toFrequency(),
          "32n",
          t,
          v,
        );
        soroll.triggerAttackRelease("16n", t, v);
      },
      release: () => {},
      setParams: (p) => {
        params = p;
        soroll.envelope.decay = p.decay;
        // el cos segueix la cua amb la proporció que tenia de fàbrica
        cos.envelope.decay = p.decay * (0.14 / 0.17);
        rig.apply(p);
      },
      dispose: () => {
        soroll.dispose();
        cos.dispose();
        rig.dispose();
        node.dispose();
        volumCos.dispose();
      },
    };
  },

  // --- Palmada: tres ràfegues curtes + cua ------------------------------
  palmada: (Tone, out) => {
    const node = new Tone.Filter({
      frequency: 1100,
      type: "bandpass",
      Q: 1.6,
    }).connect(out);
    const rig = filterRig(Tone, node);
    const synth = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.11, sustain: 0 },
    }).connect(node);
    return {
      trigger: (t, v) => {
        rig.trigger(t, v);
        synth.triggerAttackRelease("32n", t, v * 0.7);
        synth.triggerAttackRelease("32n", t + 0.011, v * 0.85);
        synth.triggerAttackRelease("16n", t + 0.023, v);
      },
      release: () => {},
      setParams: (p) => {
        synth.envelope.decay = p.decay;
        rig.apply(p);
      },
      dispose: () => {
        synth.dispose();
        rig.dispose();
        node.dispose();
      },
    };
  },

  charles: (Tone, out) => hatChain(Tone, out, 0.045, "32n"),
  charlesObert: (Tone, out) =>
    hatChain(Tone, out, 0.38, "8n", { sustain: 0.02, release: 0.12 }),

  aro: (Tone, out) =>
    metalChain(Tone, out, {
      envelope: { attack: 0.001, decay: 0.035, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 5200,
      octaves: 1.2,
      freq: 420,
      durada: "64n",
    }),
  cencerro: (Tone, out) =>
    metalChain(Tone, out, {
      envelope: { attack: 0.001, decay: 0.3, release: 0.08 },
      harmonicity: 12,
      modulationIndex: 16,
      resonance: 900,
      octaves: 0.4,
      freq: 560,
      durada: "16n",
    }),
};

export function createVoice(
  Tone: ToneModule,
  kind: VoiceKind,
  out: Destination,
): VoiceChain {
  return FACTORIES[kind](Tone, out);
}
