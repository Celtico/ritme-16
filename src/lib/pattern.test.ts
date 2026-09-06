import { describe, expect, it } from "vitest";
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
  STEPS,
  MAX_LFO,
  MAX_MACROS,
  MOD_TARGETS,
  VOICE_KINDS,
  anySolo,
  isAudible,
} from "./pattern";

describe("model del patró", () => {
  it("dona setze cel·les a totes les pistes de tots els presets", () => {
    for (const p of PRESETS) {
      for (const t of p.tracks) {
        expect(t.steps, `${p.name} / ${t.id}`).toHaveLength(STEPS);
      }
    }
  });

  it("posa les vuit veus de percussió, en ordre, a cada preset", () => {
    for (const p of PRESETS) {
      expect(p.tracks.map((t) => t.kind)).toEqual(VOICE_KINDS);
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
    expect(a.tracks).toHaveLength(8);
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
