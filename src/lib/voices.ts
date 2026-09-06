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

/**
 * Els quatre comandaments de so de cada veu. Els valors per defecte
 * reprodueixen exactament el so de fàbrica: `tone` 0,5 és el centre del
 * recorregut i `drive` 0 deixa la saturació completament fora.
 */
export interface VoiceParams {
  /** Semitons, -12..+12. A les veus de soroll mou el filtre en comptes del to. */
  pitch: number;
  /** Caiguda de l'envolupant, en segons. */
  decay: number;
  /** 0..1 de fosc a brillant; 0,5 és el filtre tal com ve de fàbrica. */
  tone: number;
  /** 0..1 de net a saturat. */
  drive: number;
}

/** Marge del control de caiguda. El mínim baixa fins a 0,02 s perquè el
 * charles (0,045) i l'aro (0,035) ja hi són per sota i no han de canviar. */
export const DECAY_MIN = 0.02;
export const DECAY_MAX = 1.5;

export interface KindSpec {
  /** Nom que rep una pista nova d'aquest tipus. */
  name: string;
  /** Color per defecte, un nom de la paleta de globals.css. */
  color: string;
  /** El pes de la veu dins la barreja, en dB. */
  level: number;
  /** La caiguda de fàbrica, tal com estava escrita a la cadena. */
  decay: number;
  /** Tipus que aquesta veu ofega en sonar, com el charles amb l'obert. */
  chokes?: VoiceKind[];
  /** Cada quant surt aquesta veu en sortejar un patró, de 0 a 1. */
  density: number;
}

export const KINDS: Record<VoiceKind, KindSpec> = {
  bombo: { name: "Bombo", color: "oxblood", level: -2, decay: 0.42, density: 0.22 },
  caixa: { name: "Caixa", color: "oxblood", level: -9, decay: 0.17, density: 0.12 },
  palmada: { name: "Palmada", color: "ochre", level: -10, decay: 0.11, density: 0.08 },
  charles: {
    name: "Charles",
    color: "ochre",
    level: -16,
    decay: 0.045,
    density: 0.45,
    chokes: ["charlesObert"],
  },
  charlesObert: {
    name: "Charles obert",
    color: "ochre",
    level: -18,
    decay: 0.38,
    density: 0.06,
  },
  aro: { name: "Aro", color: "teal", level: -22, decay: 0.035, density: 0.1 },
  timbal: { name: "Timbal", color: "oxblood", level: -8, decay: 0.34, density: 0.07 },
  cencerro: { name: "Cencerro", color: "teal", level: -24, decay: 0.3, density: 0.05 },
};

export const VOICE_KINDS = Object.keys(KINDS) as VoiceKind[];

export function defaultParams(kind: VoiceKind): VoiceParams {
  return { pitch: 0, decay: KINDS[kind].decay, tone: 0.5, drive: 0 };
}

const semitons = (n: number) => Math.pow(2, n / 12);

/**
 * Recorregut del comandament de to. El 0,5 sempre cau exactament al valor de
 * fàbrica, així que un patró sense tocar sona igual que abans; per sota baixa
 * dues octaves i per sobre puja fins al sostre que admeti la veu.
 */
function sweep(base: number, tone: number, ceiling = base * 4): number {
  const floor = base / 4;
  const top = Math.min(base * 4, ceiling);
  return tone < 0.5
    ? floor * Math.pow(base / floor, tone * 2)
    : base * Math.pow(top / base, (tone - 0.5) * 2);
}

export interface VoiceChain {
  trigger(time: number, velocity: number): void;
  /** Ofega la veu; només la fan servir les que en poden ofegar d'altres. */
  release(time: number): void;
  setParams(params: VoiceParams): void;
  dispose(): void;
}

type Factory = (Tone: ToneModule, out: Destination) => VoiceChain;

const FACTORIES: Record<VoiceKind, Factory> = {
  // --- Bombo: membrana amb caiguda de to ràpida -------------------------
  bombo: (Tone, out) => {
    const filtre = new Tone.Filter(12000, "lowpass").connect(out);
    const synth = new Tone.MembraneSynth({
      pitchDecay: 0.045,
      octaves: 6,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.42, sustain: 0.008, release: 1.2 },
    }).connect(filtre);
    let pitch = 0;
    return {
      trigger: (t, v) =>
        synth.triggerAttackRelease(
          Tone.Frequency("C1").transpose(pitch).toFrequency(),
          "8n",
          t,
          v,
        ),
      release: () => {},
      setParams: (p) => {
        pitch = p.pitch;
        synth.envelope.decay = p.decay;
        filtre.frequency.value = sweep(12000, p.tone, 18000);
      },
      dispose: () => {
        synth.dispose();
        filtre.dispose();
      },
    };
  },

  // --- Caixa: cos tonal + soroll filtrat --------------------------------
  caixa: (Tone, out) => {
    const passaAlts = new Tone.Filter(1500, "highpass").connect(out);
    const soroll = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.17, sustain: 0 },
    }).connect(passaAlts);
    const volumCos = new Tone.Volume(-8).connect(out);
    const cos = new Tone.MembraneSynth({
      pitchDecay: 0.02,
      octaves: 3,
      envelope: { attack: 0.001, decay: 0.14, sustain: 0, release: 0.1 },
    }).connect(volumCos);
    let pitch = 0;
    return {
      trigger: (t, v) => {
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
        pitch = p.pitch;
        soroll.envelope.decay = p.decay;
        // el cos segueix la cua amb la proporció que tenia de fàbrica
        cos.envelope.decay = p.decay * (0.14 / 0.17);
        passaAlts.frequency.value = sweep(1500, p.tone);
      },
      dispose: () => {
        soroll.dispose();
        cos.dispose();
        passaAlts.dispose();
        volumCos.dispose();
      },
    };
  },

  // --- Palmada: tres ràfegues curtes + cua ------------------------------
  palmada: (Tone, out) => {
    const filtre = new Tone.Filter({
      frequency: 1100,
      type: "bandpass",
      Q: 1.6,
    }).connect(out);
    const synth = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.11, sustain: 0 },
    }).connect(filtre);
    return {
      trigger: (t, v) => {
        synth.triggerAttackRelease("32n", t, v * 0.7);
        synth.triggerAttackRelease("32n", t + 0.011, v * 0.85);
        synth.triggerAttackRelease("16n", t + 0.023, v);
      },
      release: () => {},
      setParams: (p) => {
        synth.envelope.decay = p.decay;
        filtre.frequency.value = sweep(1100, p.tone) * semitons(p.pitch);
      },
      dispose: () => {
        synth.dispose();
        filtre.dispose();
      },
    };
  },

  charles: (Tone, out) => hatChain(Tone, out, 0.045, "32n"),
  charlesObert: (Tone, out) =>
    hatChain(Tone, out, 0.38, "8n", { sustain: 0.02, release: 0.12 }),

  // --- Aro i cencerro: metàl·lics ---------------------------------------
  aro: (Tone, out) =>
    metalChain(Tone, out, {
      envelope: { attack: 0.001, decay: 0.035, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 5200,
      octaves: 1.2,
      freq: 420,
      durada: "64n",
      // el sostre de resonance del MetalSynth és 7000 Hz
      sostre: 7000,
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

  // --- Timbal greu -------------------------------------------------------
  timbal: (Tone, out) => {
    const filtre = new Tone.Filter(12000, "lowpass").connect(out);
    const synth = new Tone.MembraneSynth({
      pitchDecay: 0.1,
      octaves: 3,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.34, sustain: 0.01, release: 0.6 },
    }).connect(filtre);
    let pitch = 0;
    return {
      trigger: (t, v) =>
        synth.triggerAttackRelease(
          Tone.Frequency("A1").transpose(pitch).toFrequency(),
          "8n",
          t,
          v,
        ),
      release: () => {},
      setParams: (p) => {
        pitch = p.pitch;
        synth.envelope.decay = p.decay;
        filtre.frequency.value = sweep(12000, p.tone, 18000);
      },
      dispose: () => {
        synth.dispose();
        filtre.dispose();
      },
    };
  },
};

/** Els dos charles comparteixen cadena: soroll per un passa-alts a 7200 Hz. */
function hatChain(
  Tone: ToneModule,
  out: Destination,
  decay: number,
  durada: string,
  extra: { sustain?: number; release?: number } = {},
): VoiceChain {
  const filtre = new Tone.Filter(7200, "highpass").connect(out);
  const synth = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay, sustain: 0, ...extra },
  }).connect(filtre);
  return {
    trigger: (t, v) => synth.triggerAttackRelease(durada, t, v),
    release: (t) => synth.triggerRelease(t),
    setParams: (p) => {
      synth.envelope.decay = p.decay;
      filtre.frequency.value = sweep(7200, p.tone, 16000) * semitons(p.pitch);
    },
    dispose: () => {
      synth.dispose();
      filtre.dispose();
    },
  };
}

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
    sostre?: number;
  },
): VoiceChain {
  const synth = new Tone.MetalSynth({
    envelope: o.envelope,
    harmonicity: o.harmonicity,
    modulationIndex: o.modulationIndex,
    resonance: o.resonance,
    octaves: o.octaves,
  }).connect(out);
  let pitch = 0;
  return {
    trigger: (t, v) =>
      synth.triggerAttackRelease(o.freq * semitons(pitch), o.durada, t, v),
    release: () => {},
    setParams: (p) => {
      pitch = p.pitch;
      synth.envelope.decay = p.decay;
      synth.resonance = sweep(o.resonance, p.tone, o.sostre);
    },
    dispose: () => synth.dispose(),
  };
}

export function createVoice(
  Tone: ToneModule,
  kind: VoiceKind,
  out: Destination,
): VoiceChain {
  return FACTORIES[kind](Tone, out);
}
