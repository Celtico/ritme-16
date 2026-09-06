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
  | "baix"
  | "acords"
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
export const MAX_TRACKS = 16;

/** Els vuit colors que pot tenir una pista, tots de globals.css. */
export const TRACK_COLORS = [
  "oxblood",
  "rust",
  "ochre",
  "olive",
  "teal",
  "slate",
  "plum",
  "coffee",
] as const;

export type TrackColor = (typeof TRACK_COLORS)[number];

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

/**
 * On pot arribar cada font. Les envolupants només saben moure el filtre: són
 * senyals que varien amb el temps, i mostrejar-les en el moment del cop
 * donaria sempre zero. La resta de fonts es mostregen en disparar, així que
 * poden anar a qualsevol paràmetre.
 *
 * La interfície només dibuixa l'anell on aquesta taula ho permet: val més no
 * poder encaminar una cosa que deixar-la encaminar i que no soni.
 */
export const MOD_ROUTES: Record<ModSource, ModTarget[]> = {
  envAmp: ["cutoff"],
  envFilter: ["cutoff"],
  lfo1: ["cutoff", "pitch", "decay", "drive"],
  lfo2: ["cutoff", "pitch", "decay", "drive"],
  velocity: ["cutoff", "pitch", "decay", "drive"],
  random: ["cutoff", "pitch", "decay", "drive"],
};

export function canRoute(source: ModSource, target: ModTarget): boolean {
  return MOD_ROUTES[source].includes(target);
}

/**
 * El valor d'un LFO, de -1 a 1, en un instant concret. És una funció pura
 * perquè les veus el mostregen en disparar: així una modulació d'LFO cap a
 * l'afinació o la caiguda es pot calcular sense llegir cap node d'àudio.
 */
export function lfoValueAt(
  shape: LfoShape,
  periodSeconds: number,
  seconds: number,
): number {
  if (periodSeconds <= 0) return 0;
  const t = ((seconds % periodSeconds) + periodSeconds) % periodSeconds;
  const phase = t / periodSeconds;
  switch (shape) {
    case "sine":
      return Math.sin(phase * 2 * Math.PI);
    case "triangle":
      return 1 - 4 * Math.abs(phase - 0.5);
    case "square":
      return phase < 0.5 ? 1 : -1;
    case "sawtooth":
      return 2 * phase - 1;
  }
}

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

/** Les veus que toquen notes en comptes de cops. */
export const MELODIC_KINDS: VoiceKind[] = ["baix", "acords"];

export function isMelodic(kind: VoiceKind): boolean {
  return MELODIC_KINDS.includes(kind);
}

export const KINDS: Record<VoiceKind, KindSpec> = {
  baix: {
    name: "Baix",
    color: "slate",
    level: -10,
    decay: 0.3,
    density: 0,
    filter: { type: "lowpass", cutoff: 900, q: 1.2 },
    blocks: ["osc", "filter", "drive", "amp"],
  },
  acords: {
    name: "Acords",
    color: "plum",
    level: -16,
    decay: 0.3,
    density: 0,
    filter: { type: "lowpass", cutoff: 2400, q: 0.8 },
    blocks: ["osc", "filter", "drive", "amp"],
  },
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
  /**
   * Les veus melòdiques toquen notes: reben els MIDI que han de sonar alhora
   * i quant han de durar. Les de percussió no la tenen.
   */
  triggerNote?(
    time: number,
    midis: number[],
    duration: number,
    velocity: number,
  ): void;
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

  // L'envolupant d'amplitud com a font del filtre. Va per un Envelope pelat i
  // una escala, i no per un segon FrequencyEnvelope, perquè un Envelope
  // reposa exactament a zero i per tant no desplaça el tall quan no s'usa.
  const ampEnv = new Tone.Envelope({
    attack: 0.001,
    decay: 0.2,
    sustain: 0,
    release: 0.1,
  });
  const ampScale = new Tone.Scale(0, 0);
  ampEnv.connect(ampScale);
  ampScale.connect(node.frequency);

  let actuals: VoiceParams | null = null;

  return {
    apply(p: VoiceParams) {
      actuals = p;
      node.type = p.filter.type;
      node.Q.value = p.filter.q;
      env.baseFrequency = p.filter.cutoff;
      env.octaves = p.envFilter.amount * 4;
      ampEnv.decay = p.decay;
      ampScale.max = modAmount(p, "envAmp", "cutoff") * p.filter.cutoff * 3;
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
    /** `mod` és la desviació del tall per aquest cop, de -1 a 1. */
    trigger(time: number, velocity: number, mod = 0) {
      if (actuals) {
        env.baseFrequency = Math.max(
          20,
          Math.min(20000, actuals.filter.cutoff * Math.pow(4, mod)),
        );
      }
      env.triggerAttackRelease(0.05, time, velocity);
      ampEnv.triggerAttackRelease(0.05, time, velocity);
    },
    dispose() {
      env.dispose();
      ampEnv.dispose();
      ampScale.dispose();
      for (const l of lfos) l.dispose();
    },
  };
}

export type ModSampler = (
  p: VoiceParams | null,
  target: ModTarget,
  velocity: number,
) => number;

/**
 * Mostreja totes les fonts que apunten a un paràmetre i en suma les
 * quantitats, de -1 a 1. Es crida en disparar, no en temps d'àudio: en una
 * caixa de ritmes les veus són d'un sol cop, i el valor de la font en el
 * moment del cop és justament el que es vol.
 *
 * Accepta un paràmetre nul perquè una cadena es pot disparar abans que li
 * arribin els seus valors, i llavors no ha de modular res, no ha de petar.
 */
export function makeModSampler(Tone: ToneModule): ModSampler {
  return (p, target, velocity) => {
    if (!p) return 0;
    let total = 0;
    for (const m of p.mods) {
      if (m.target !== target || !canRoute(m.source, target)) continue;
      if (m.source === "velocity") {
        total += m.amount * velocity;
      } else if (m.source === "random") {
        total += m.amount * (Math.random() * 2 - 1);
      } else if (m.source === "lfo1" || m.source === "lfo2") {
        const cfg = p.lfo[m.source === "lfo1" ? 0 : 1];
        if (!cfg || cfg.depth === 0) continue;
        total +=
          m.amount *
          cfg.depth *
          lfoValueAt(
            cfg.shape,
            Tone.Time(cfg.rate).toSeconds(),
            Tone.getTransport().seconds,
          );
      }
    }
    return Math.max(-1, Math.min(1, total));
  };
}

/** Quantitat d'una modulació concreta, per als encaminaments d'àudio. */
export function modAmount(
  p: VoiceParams,
  source: ModSource,
  target: ModTarget,
): number {
  return p.mods.find((m) => m.source === source && m.target === target)?.amount ?? 0;
}

type Factory = (
  Tone: ToneModule,
  out: Destination,
  mod: ModSampler,
) => VoiceChain;

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

/** La caiguda d'aquest cop, amb la modulació aplicada. */
function decayAmb(p: VoiceParams | null, m: number) {
  if (!p) return 0.2;
  return clamp(p.decay * Math.pow(4, m), DECAY_MIN, DECAY_MAX);
}

/** Les membranes (bombo i timbal) només es diferencien pels seus valors. */
function membraneChain(
  Tone: ToneModule,
  out: Destination,
  mod: ModSampler,
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
      const pitch = clamp(
        (params?.pitch ?? 0) + mod(params, "pitch", v) * 12,
        -24,
        24,
      );
      synth.envelope.decay = decayAmb(params, mod(params, "decay", v));
      rig.trigger(t, v, mod(params, "cutoff", v));
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
  mod: ModSampler,
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
  let params: VoiceParams | null = null;
  return {
    trigger: (t, v) => {
      synth.envelope.decay = decayAmb(params, mod(params, "decay", v));
      rig.trigger(t, v, mod(params, "cutoff", v));
      synth.triggerAttackRelease(durada, t, v);
    },
    release: (t) => synth.triggerRelease(t),
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

/**
 * Les veus metàl·liques no tenen cap node Filter: el MetalSynth porta el seu
 * passa-alts a dins i el tall és la seva `resonance`, que és una propietat i
 * no un senyal. Per això aquí no hi ha ni envolupant de filtre ni LFO.
 */
function metalChain(
  Tone: ToneModule,
  out: Destination,
  mod: ModSampler,
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
      const pitch = clamp(
        (params?.pitch ?? 0) + mod(params, "pitch", v) * 12,
        -24,
        24,
      );
      synth.envelope.decay = decayAmb(params, mod(params, "decay", v));
      if (params) {
        // sense node Filter, el tall és la ressonància, que és una propietat
        synth.resonance = clamp(
          params.filter.cutoff * Math.pow(4, mod(params, "cutoff", v)),
          0,
          7000,
        );
      }
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

/** Hz d'una nota MIDI. El 69 és el la de 440. */
export const midiToHz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

const FACTORIES: Record<VoiceKind, Factory> = {
  // --- Baix: monofònic, amb filtre d'envolupant i portamento curt --------
  baix: (Tone, out, mod) => {
    const node = new Tone.Filter(900, "lowpass").connect(out);
    const rig = filterRig(Tone, node);
    const synth = new Tone.MonoSynth({
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.005, decay: 0.3, sustain: 0.5, release: 0.2 },
      filterEnvelope: {
        attack: 0.005,
        decay: 0.18,
        sustain: 0.3,
        release: 0.2,
        baseFrequency: 120,
        octaves: 2.6,
      },
      portamento: 0.03,
    }).connect(node);
    let params: VoiceParams | null = null;
    return {
      // sense nota no hi ha res a tocar; l'audició fa servir la tònica
      trigger: (t, v) => {
        rig.trigger(t, v, 0);
        synth.triggerAttackRelease(midiToHz(45), 0.25, t, v);
      },
      triggerNote: (t, midis, dur, v) => {
        const midi = midis[0];
        if (midi === undefined) return;
        const pitch = (params?.pitch ?? 0) + mod(params, "pitch", v) * 12;
        rig.trigger(t, v, mod(params, "cutoff", v));
        synth.triggerAttackRelease(midiToHz(midi + pitch), dur, t, v);
      },
      release: (t) => synth.triggerRelease(t),
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
  },

  // --- Acords: polifònic, triangular i suau ------------------------------
  acords: (Tone, out, mod) => {
    const chorus = new Tone.Chorus({
      frequency: 0.6,
      delayTime: 3.5,
      depth: 0.35,
      wet: 0.3,
    }).connect(out);
    chorus.start();
    const node = new Tone.Filter(2400, "lowpass").connect(chorus);
    const rig = filterRig(Tone, node);
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.45, release: 0.3 },
    }).connect(node);
    synth.maxPolyphony = 6;
    let params: VoiceParams | null = null;
    return {
      trigger: (t, v) => {
        rig.trigger(t, v, 0);
        synth.triggerAttackRelease([midiToHz(60), midiToHz(64), midiToHz(67)], 0.4, t, v);
      },
      triggerNote: (t, midis, dur, v) => {
        if (midis.length === 0) return;
        const pitch = (params?.pitch ?? 0) + mod(params, "pitch", v) * 12;
        rig.trigger(t, v, mod(params, "cutoff", v));
        synth.triggerAttackRelease(
          midis.slice(0, 6).map((m) => midiToHz(m + pitch)),
          dur,
          t,
          v,
        );
      },
      release: (t) => synth.releaseAll(t),
      setParams: (p) => {
        params = p;
        synth.set({ envelope: { decay: p.decay } });
        rig.apply(p);
      },
      dispose: () => {
        synth.dispose();
        rig.dispose();
        node.dispose();
        chorus.dispose();
      },
    };
  },

  bombo: (Tone, out, mod) =>
    membraneChain(Tone, out, mod, {
      nota: "C1",
      pitchDecay: 0.045,
      octaves: 6,
      envelope: { attack: 0.001, decay: 0.42, sustain: 0.008, release: 1.2 },
    }),

  timbal: (Tone, out, mod) =>
    membraneChain(Tone, out, mod, {
      nota: "A1",
      pitchDecay: 0.1,
      octaves: 3,
      envelope: { attack: 0.001, decay: 0.34, sustain: 0.01, release: 0.6 },
    }),

  // --- Caixa: cos tonal + soroll filtrat --------------------------------
  caixa: (Tone, out, mod) => {
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
        const pitch = clamp(
          (params?.pitch ?? 0) + mod(params, "pitch", v) * 12,
          -24,
          24,
        );
        soroll.envelope.decay = decayAmb(params, mod(params, "decay", v));
        rig.trigger(t, v, mod(params, "cutoff", v));
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
  palmada: (Tone, out, mod) => {
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
    let params: VoiceParams | null = null;
    return {
      trigger: (t, v) => {
        synth.envelope.decay = decayAmb(params, mod(params, "decay", v));
        rig.trigger(t, v, mod(params, "cutoff", v));
        synth.triggerAttackRelease("32n", t, v * 0.7);
        synth.triggerAttackRelease("32n", t + 0.011, v * 0.85);
        synth.triggerAttackRelease("16n", t + 0.023, v);
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
  },

  charles: (Tone, out, mod) => hatChain(Tone, out, mod, 0.045, "32n"),
  charlesObert: (Tone, out, mod) =>
    hatChain(Tone, out, mod, 0.38, "8n", { sustain: 0.02, release: 0.12 }),

  aro: (Tone, out, mod) =>
    metalChain(Tone, out, mod, {
      envelope: { attack: 0.001, decay: 0.035, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 5200,
      octaves: 1.2,
      freq: 420,
      durada: "64n",
    }),
  cencerro: (Tone, out, mod) =>
    metalChain(Tone, out, mod, {
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
  mod: ModSampler,
): VoiceChain {
  return FACTORIES[kind](Tone, out, mod);
}
