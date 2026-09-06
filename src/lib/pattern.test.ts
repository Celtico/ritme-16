import { describe, expect, it } from "vitest";
import { stepColumn, stepGridTemplate } from "../components/grid";
import {
  applyMacroAssignment,
  clonePattern,
  DECAY_MAX,
  DECAY_MIN,
  defaultParams,
  defaultTracks,
  emptyPattern,
  KINDS,
  makeTrack,
  PRESETS,
  MAX_LFO,
  MAX_MACROS,
  degreeToChord,
  isInScale,
  isMelodic,
  midiToName,
  MAX_STEPS,
  isPatternLength,
  MOD_TARGETS,
  PATTERN_LENGTHS,
  VOICE_KINDS,
  anySolo,
  isAudible,
} from "./pattern";

describe("model del patró", () => {
  it("dona la capacitat sencera a totes les files de tots els presets", () => {
    for (const p of PRESETS) {
      for (const t of p.tracks) {
        expect(t.steps, `${p.name} / ${t.id}`).toHaveLength(MAX_STEPS);
      }
      expect(PATTERN_LENGTHS, p.name).toContain(p.length);
    }
  });

  it("posa la percussió a dalt i les melòdiques a sota, a cada preset", () => {
    const esperat = [
      ...VOICE_KINDS.filter((k) => !isMelodic(k)),
      ...VOICE_KINDS.filter(isMelodic),
    ];
    for (const p of PRESETS) {
      expect(p.tracks.map((t) => t.kind), p.name).toEqual(esperat);
    }
  });

  it("dona un id únic a cada pista", () => {
    for (const p of PRESETS) {
      const ids = p.tracks.map((t) => t.id);
      expect(new Set(ids).size, p.name).toBe(ids.length);
    }
  });

  it("clona sense compartir cap array ni cap objecte", () => {
    const a = emptyPattern("a");
    const b = clonePattern(a);
    b.tracks[0].steps[0] = 2;
    b.tracks[1].mix.muted = true;
    b.tracks[2].sound.drive = 0.8;
    expect(a.tracks[0].steps[0]).toBe(0);
    expect(a.tracks[1].mix.muted).toBe(false);
    expect(a.tracks[2].sound.drive).toBe(0);
  });

  it("no comparteix ni tan sols l'array de pistes", () => {
    const a = emptyPattern("a");
    const b = clonePattern(a);
    b.tracks.pop();
    expect(a.tracks).toHaveLength(10);
  });
});

describe("pistes", () => {
  it("agafa nom, color i nivell del tipus", () => {
    for (const kind of VOICE_KINDS) {
      const t = makeTrack(kind);
      expect(t.name).toBe(KINDS[kind].name);
      expect(t.color).toBe(KINDS[kind].color);
      expect(t.sound).toEqual(defaultParams(kind));
    }
  });

  it("fa servir el tipus com a id si no se n'hi dona cap", () => {
    expect(makeTrack("bombo").id).toBe("bombo");
    expect(makeTrack("bombo", "bombo-2").id).toBe("bombo-2");
  });

  it("dona objectes independents a cada crida", () => {
    const a = defaultTracks();
    a[0].sound.pitch = 5;
    expect(defaultTracks()[0].sound.pitch).toBe(0);
  });
});

describe("comandaments de so per defecte", () => {
  it("deixa la veu neta: sense saturació, sense envolupant de filtre i sense LFO", () => {
    for (const kind of VOICE_KINDS) {
      const p = defaultParams(kind);
      expect(p.pitch, kind).toBe(0);
      expect(p.drive, kind).toBe(0);
      expect(p.envFilter.amount, kind).toBe(0);
      expect(p.mods, kind).toEqual([]);
      for (const l of p.lfo) expect(l.depth, kind).toBe(0);
    }
  });

  it("posa el filtre de cada veu al que ja tenia la seva cadena", () => {
    const esperat: Record<string, [string, number]> = {
      baix: ["lowpass", 900],
      acords: ["lowpass", 2400],
      bombo: ["lowpass", 12000],
      caixa: ["highpass", 1500],
      palmada: ["bandpass", 1100],
      charles: ["highpass", 7200],
      charlesObert: ["highpass", 7200],
      aro: ["highpass", 5200],
      timbal: ["lowpass", 12000],
      cencerro: ["highpass", 900],
    };
    for (const kind of VOICE_KINDS) {
      const f = defaultParams(kind).filter;
      expect([f.type, f.cutoff], kind).toEqual(esperat[kind]);
    }
  });

  it("no dona mai més de dos LFO", () => {
    for (const kind of VOICE_KINDS) {
      expect(defaultParams(kind).lfo.length, kind).toBeLessThanOrEqual(MAX_LFO);
    }
  });

  it("dona una fila de notes a les pistes melòdiques i a cap més", () => {
    const p = emptyPattern();
    for (const t of p.tracks) {
      if (t.kind === "baix") {
        expect(t.bass, t.id).toHaveLength(MAX_STEPS);
        expect(t.chords, t.id).toBeUndefined();
      } else if (t.kind === "acords") {
        expect(t.chords, t.id).toHaveLength(MAX_STEPS);
        expect(t.bass, t.id).toBeUndefined();
      } else {
        expect(t.bass, t.id).toBeUndefined();
        expect(t.chords, t.id).toBeUndefined();
      }
    }
  });

  it("clona les notes sense compartir-les", () => {
    const a = emptyPattern();
    const baix = a.tracks.find((t) => t.kind === "baix")!;
    baix.bass![0] = { midi: 45, length: 2, accent: false };
    const b = clonePattern(a);
    b.tracks.find((t) => t.kind === "baix")!.bass![0]!.midi = 60;
    expect(baix.bass![0]!.midi).toBe(45);
  });

  it("dona tonalitat al patró i la clona a part", () => {
    const a = emptyPattern();
    expect(a.key).toEqual({ root: 9, mode: "minor" });
    const b = clonePattern(a);
    b.key.root = 0;
    expect(a.key.root).toBe(9);
  });

  it("dona quatre macros buides al patró", () => {
    const p = emptyPattern();
    expect(p.macros).toHaveLength(MAX_MACROS);
    for (const m of p.macros) expect(m.assignments).toEqual([]);
  });

  it("clona els macros sense compartir-ne les assignacions", () => {
    const a = emptyPattern();
    a.macros[0].assignments.push({ trackId: "bombo", param: "cutoff", amount: 1 });
    const b = clonePattern(a);
    b.macros[0].assignments[0].amount = -1;
    expect(a.macros[0].assignments[0].amount).toBe(1);
  });

  it("dona a cada veu la caiguda que tenia la cadena, dins del marge", () => {
    const esperat: Record<string, number> = {
      baix: 0.3,
      acords: 0.3,
      bombo: 0.42,
      caixa: 0.17,
      palmada: 0.11,
      charles: 0.045,
      charlesObert: 0.38,
      aro: 0.035,
      timbal: 0.34,
      cencerro: 0.3,
    };
    for (const kind of VOICE_KINDS) {
      const { decay } = defaultParams(kind);
      expect(decay, kind).toBe(esperat[kind]);
      expect(decay, kind).toBeGreaterThanOrEqual(DECAY_MIN);
      expect(decay, kind).toBeLessThanOrEqual(DECAY_MAX);
    }
  });
});

describe("macros", () => {
  it("torna la veu al valor de fàbrica quan el macro és a zero", () => {
    const p = emptyPattern();
    const t = p.tracks[0];
    const so = applyMacroAssignment(
      t,
      { trackId: t.id, param: "cutoff", amount: 1 },
      0,
    );
    expect(so.filter.cutoff).toBe(defaultParams(t.kind).filter.cutoff);
  });

  it("no va derivant si es mou dues vegades seguides", () => {
    const p = emptyPattern();
    const t = p.tracks[0];
    const a = { trackId: t.id, param: "cutoff" as const, amount: 1 };
    t.sound = applyMacroAssignment(t, a, 0.5);
    const primer = t.sound.filter.cutoff;
    t.sound = applyMacroAssignment(t, a, 0.5);
    expect(t.sound.filter.cutoff).toBe(primer);
  });

  it("puja i baixa segons el signe de la quantitat", () => {
    const p = emptyPattern();
    const t = p.tracks[1];
    const base = defaultParams(t.kind).filter.cutoff;
    const amunt = applyMacroAssignment(t, { trackId: t.id, param: "cutoff", amount: 1 }, 1);
    const avall = applyMacroAssignment(t, { trackId: t.id, param: "cutoff", amount: -1 }, 1);
    expect(amunt.filter.cutoff).toBeGreaterThan(base);
    expect(avall.filter.cutoff).toBeLessThan(base);
  });

  it("no se'n va mai fora dels límits de cada paràmetre", () => {
    const p = emptyPattern();
    for (const t of p.tracks) {
      for (const param of MOD_TARGETS) {
        for (const amount of [-1, 1]) {
          const so = applyMacroAssignment(t, { trackId: t.id, param, amount }, 1);
          expect(so.filter.cutoff, `${t.id} ${param}`).toBeGreaterThanOrEqual(20);
          expect(so.filter.cutoff).toBeLessThanOrEqual(20000);
          expect(so.drive).toBeGreaterThanOrEqual(0);
          expect(so.drive).toBeLessThanOrEqual(1);
          expect(so.pitch).toBeGreaterThanOrEqual(-12);
          expect(so.pitch).toBeLessThanOrEqual(12);
          expect(so.decay).toBeGreaterThanOrEqual(DECAY_MIN);
          expect(so.decay).toBeLessThanOrEqual(DECAY_MAX);
        }
      }
    }
  });
});

describe("silenci i solitari", () => {
  it("deixa sonar tothom quan no hi ha cap solitari", () => {
    const p = emptyPattern();
    expect(anySolo(p)).toBe(false);
    for (const t of p.tracks) expect(isAudible(p, t)).toBe(true);
  });

  it("calla tothom menys el solitari", () => {
    const p = emptyPattern();
    p.tracks[2].mix.solo = true;
    expect(anySolo(p)).toBe(true);
    expect(isAudible(p, p.tracks[2])).toBe(true);
    expect(isAudible(p, p.tracks[0])).toBe(false);
  });

  it("fa que el silenci guanyi al solitari de la mateixa pista", () => {
    const p = emptyPattern();
    p.tracks[1].mix.solo = true;
    p.tracks[1].mix.muted = true;
    expect(isAudible(p, p.tracks[1])).toBe(false);
  });
});

describe("baix i acords dels presets", () => {
  const melodica = (p: (typeof PRESETS)[number], kind: "baix" | "acords") =>
    p.tracks.find((t) => t.kind === kind)!;

  it("dona la capacitat sencera a les dues files melòdiques", () => {
    for (const p of PRESETS) {
      expect(melodica(p, "baix").bass, p.name).toHaveLength(MAX_STEPS);
      expect(melodica(p, "acords").chords, p.name).toHaveLength(MAX_STEPS);
    }
  });

  it("posa notes de baix i acords a tots els presets", () => {
    for (const p of PRESETS) {
      // com a mínim una nota per compàs de baix, i un acord
      expect(
        melodica(p, "baix").bass!.filter(Boolean).length,
        p.name,
      ).toBeGreaterThanOrEqual(2);
      expect(
        melodica(p, "acords").chords!.filter(Boolean).length,
        p.name,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("no deixa que cap nota trepitgi la següent", () => {
    for (const p of PRESETS) {
      for (const fila of [melodica(p, "baix").bass!, melodica(p, "acords").chords!]) {
        for (let i = 0; i < fila.length; i++) {
          const n = fila[i];
          if (!n) continue;
          for (let j = i + 1; j < i + n.length; j++) {
            expect(fila[j], `${p.name} pas ${i} cobreix ${j}`).toBeNull();
          }
          expect(i + n.length, `${p.name} pas ${i} surt del compàs`).toBeLessThanOrEqual(p.length);
        }
      }
    }
  });

  it("manté el baix dins d'un registre que es pugui tocar", () => {
    for (const p of PRESETS) {
      for (const n of melodica(p, "baix").bass!) {
        if (!n) continue;
        // de Mi1 a Do4: prou greu per fer de baix i prou agut per sentir-se
        expect(n.midi, p.name).toBeGreaterThanOrEqual(28);
        expect(n.midi, p.name).toBeLessThanOrEqual(60);
      }
    }
  });

  it("fa que cada nota del baix sigui de l'escala del patró", () => {
    for (const p of PRESETS) {
      for (const n of melodica(p, "baix").bass!) {
        if (!n) continue;
        expect(isInScale(p.key, n.midi), `${p.name} ${midiToName(n.midi)}`).toBe(
          true,
        );
      }
    }
  });

  it("fa servir graus que existeixen i acords que sonen sencers", () => {
    for (const p of PRESETS) {
      for (const c of melodica(p, "acords").chords!) {
        if (!c) continue;
        expect(c.degree, p.name).toBeGreaterThanOrEqual(1);
        expect(c.degree, p.name).toBeLessThanOrEqual(7);
        expect(degreeToChord(p.key, c.degree, c.kind), p.name).toHaveLength(
          c.kind === "seventh" ? 4 : 3,
        );
      }
    }
  });

  it("comença cada preset amb la tònica al primer pas", () => {
    for (const p of PRESETS) {
      const primer = melodica(p, "acords").chords![0];
      expect(primer?.degree, p.name).toBe(1);
      const nota = melodica(p, "baix").bass![0];
      expect(nota, p.name).not.toBeNull();
      expect(nota!.midi % 12, p.name).toBe(p.key.root);
    }
  });

  it("no deixa cap pas actiu més enllà de la llargada del patró", () => {
    for (const p of PRESETS) {
      for (const t of p.tracks) {
        for (let i = p.length; i < t.steps.length; i++) {
          expect(t.steps[i], `${p.name} / ${t.id} / pas ${i}`).toBe(0);
        }
        for (const fila of [t.bass, t.chords]) {
          for (let i = p.length; i < (fila?.length ?? 0); i++) {
            expect(fila![i], `${p.name} / ${t.id} / pas ${i}`).toBeNull();
          }
        }
      }
    }
  });

  it("cobreix les tres llargades amb algun exemple", () => {
    const llargades = new Set(PRESETS.map((p) => p.length));
    for (const n of PATTERN_LENGTHS) {
      expect(llargades, `cap preset de ${n} passos`).toContain(n);
    }
  });

  it("dona al 'Trencat' el IV major que caracteritza el dòric", () => {
    const trencat = PRESETS.find((p) => p.name === "Trencat")!;
    expect(trencat.key.mode).toBe("dorian");
    const quart = melodica(trencat, "acords").chords!.find((c) => c?.degree === 4);
    expect(quart).toBeTruthy();
    const acord = degreeToChord(trencat.key, 4, "triad");
    expect(acord[1] - acord[0]).toBe(4);
  });
});

describe("llargada del patró", () => {
  it("només accepta 8, 16 o 32", () => {
    expect(PATTERN_LENGTHS).toEqual([8, 16, 32]);
    expect(isPatternLength(16)).toBe(true);
    expect(isPatternLength(12)).toBe(false);
    expect(isPatternLength("16")).toBe(false);
  });

  it("guarda sempre la capacitat sencera, sigui quina sigui la llargada", () => {
    const p = emptyPattern();
    p.length = 8;
    for (const t of p.tracks) expect(t.steps).toHaveLength(MAX_STEPS);
  });

  it("no esborra res en escurçar i tornar a allargar", () => {
    const p = emptyPattern();
    p.tracks[0].steps[20] = 2;
    p.length = 8;
    const clonat = clonePattern(p);
    clonat.length = 32;
    expect(clonat.tracks[0].steps[20]).toBe(2);
  });

  it("fa una graella de columnes iguals amb un buit entre grups de quatre", () => {
    expect(stepGridTemplate(8)).toBe(
      "repeat(4, minmax(0, 1fr)) 4px repeat(4, minmax(0, 1fr))",
    );
    // una columna morta per cada frontera de grup
    for (const n of PATTERN_LENGTHS) {
      const t = stepGridTemplate(n);
      expect((t.match(/repeat/g) ?? []).length, `${n}`).toBe(n / 4);
      expect((t.match(/4px/g) ?? []).length, `${n}`).toBe(n / 4 - 1);
    }
  });

  it("col·loca cada pas a la seva columna, saltant-se les mortes", () => {
    // primer grup: columnes 1-4; segon grup: 6-9, perquè la 5 és el buit
    expect([0, 1, 2, 3].map(stepColumn)).toEqual([1, 2, 3, 4]);
    expect([4, 5, 6, 7].map(stepColumn)).toEqual([6, 7, 8, 9]);
    expect(stepColumn(15)).toBe(19);
    // mai dues passes a la mateixa columna
    for (const n of PATTERN_LENGTHS) {
      const cols = Array.from({ length: n }, (_, i) => stepColumn(i));
      expect(new Set(cols).size, `${n}`).toBe(n);
    }
  });
});
