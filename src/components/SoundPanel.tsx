"use client";

import { useState } from "react";
import { AdsrGraph } from "./AdsrGraph";
import { FilterDisplay } from "./FilterDisplay";
import { Knob } from "./Knob";
import { Macros } from "./Macros";
import { ModStrip } from "./ModStrip";
import {
  canRoute,
  DECAY_MAX,
  DECAY_MIN,
  defaultParams,
  FAMILY_COLOR,
  KINDS,
  LFO_SHAPES,
  MOD_ROUTES,
  MOD_SOURCES,
  SOURCE_FAMILY,
  SOURCE_NAMES,
  SYNC_RATES,
  TARGET_NAMES,
  type LfoShape,
  type Macro,
  type Mod,
  type ModSource,
  type ModTarget,
  type SyncRate,
  type Track,
  type VoiceParams,
} from "@/lib/pattern";

interface Props {
  track: Track;
  tracks: Track[];
  macros: Macro[];
  onChange: (changes: Partial<VoiceParams>) => void;
  onMacro: (index: number, changes: Partial<Macro>) => void;
}

const hz = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(1)} kHz` : `${Math.round(v)} Hz`;
const ms = (v: number) => `${Math.round(v * 1000)} ms`;
const pct = (v: number) => `${Math.round(v * 100)} %`;
const st = (v: number) => `${v > 0 ? "+" : ""}${v} st`;

const FAMILIES = [
  { id: "env", nom: "Envolupants" },
  { id: "lfo", nom: "LFO" },
  { id: "random", nom: "Atzar" },
] as const;

function Bloc({
  nom,
  children,
}: {
  nom: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-r border-ink/15 px-4 first:pl-0 last:border-r-0">
      <div className="text-[11px] uppercase tracking-wide text-ink-soft">
        {nom}
      </div>
      <div className="flex items-start gap-3">{children}</div>
    </div>
  );
}

export function SoundPanel({ track, tracks, macros, onChange, onMacro }: Props) {
  const p = track.sound;
  const [font, setFont] = useState<ModSource | null>(null);
  const [familia, setFamilia] = useState<"env" | "lfo" | "random">("env");
  const factory = defaultParams(track.kind);
  const blocks = KINDS[track.kind].blocks;

  // L'anell només surt on la font pot arribar de debò; i l'envolupant de
  // filtre cap al tall ja té el seu propi camp, així que l'anell l'escriu.
  const quantitat = (target: ModTarget) => {
    if (!font || !canRoute(font, target)) return undefined;
    if (font === "envFilter" && target === "cutoff") return p.envFilter.amount;
    return p.mods.find((m) => m.source === font && m.target === target)?.amount ?? 0;
  };

  const posaMod = (target: ModTarget, amount: number) => {
    if (!font || !canRoute(font, target)) return;
    if (font === "envFilter" && target === "cutoff") {
      onChange({ envFilter: { ...p.envFilter, amount: Math.max(0, amount) } });
      return;
    }
    const resta = p.mods.filter(
      (m) => !(m.source === font && m.target === target),
    );
    const mods: Mod[] =
      amount === 0 ? resta : [...resta, { source: font, target, amount }];
    onChange({ mods });
  };

  const anell = font ? `var(--color-${FAMILY_COLOR[SOURCE_FAMILY[font]]})` : undefined;
  const knobMod = (target: ModTarget) => ({
    ring: quantitat(target),
    ringColor: anell,
    onRing: (a: number) => posaMod(target, Number(a.toFixed(2))),
  });

  const lfo = p.lfo[familia === "lfo" ? 0 : 0];
  const [lfoIndex, setLfoIndex] = useState(0);
  const lfoActual = p.lfo[lfoIndex] ?? lfo;

  const posaLfo = (canvis: Partial<(typeof p.lfo)[number]>) => {
    const seguent = p.lfo.map((l, i) =>
      i === lfoIndex ? { ...l, ...canvis } : l,
    );
    onChange({ lfo: seguent });
  };

  return (
    <div className="flex flex-col">
      {/* banda 1: la cadena, en l'ordre del senyal */}
      <div className="flex flex-wrap items-start gap-y-4 px-4 py-3 sm:px-6">
        {/* la cadena no s'ha de partir mai: si no hi cap, es desplaça, i els
            macros baixen a la seva línia abans que tapar-la */}
        <div className="flex min-w-0 flex-[1_1_600px] items-start overflow-x-auto pb-1">
          {blocks.includes("osc") ? (
            <Bloc nom="Oscil·lador">
              <Knob
                label="afinació"
                value={p.pitch}
                min={-12}
                max={12}
                step={1}
                bipolar
                format={st}
                onChange={(pitch) => onChange({ pitch })}
                {...knobMod("pitch")}
              />
            </Bloc>
          ) : null}

          {blocks.includes("filter") ? (
            <Bloc nom="Filtre">
              <Knob
                label="tall"
                size={40}
                value={p.filter.cutoff}
                min={20}
                max={20000}
                step={10}
                format={hz}
                onChange={(cutoff) =>
                  onChange({ filter: { ...p.filter, cutoff } })
                }
                {...knobMod("cutoff")}
              />
              <Knob
                label="ressonància"
                value={p.filter.q}
                min={0.1}
                max={16}
                step={0.1}
                format={(v) => v.toFixed(1)}
                onChange={(q) => onChange({ filter: { ...p.filter, q } })}
              />
              <div className="flex flex-col gap-1">
                <FilterDisplay
                  type={p.filter.type}
                  cutoff={p.filter.cutoff}
                  q={p.filter.q}
                />
                <div className="flex gap-1">
                  {(["lowpass", "highpass", "bandpass"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={p.filter.type === t}
                      onClick={() => onChange({ filter: { ...p.filter, type: t } })}
                      className={[
                        "rounded-[3px] border px-1.5 py-0.5 text-[11px] transition-colors",
                        p.filter.type === t
                          ? "border-ink/45 bg-panel-hi text-ink"
                          : "border-ink/25 bg-panel-lo/40 text-ink-soft hover:bg-panel-hi",
                      ].join(" ")}
                    >
                      {t === "lowpass" ? "greus" : t === "highpass" ? "aguts" : "banda"}
                    </button>
                  ))}
                </div>
              </div>
            </Bloc>
          ) : null}

          {blocks.includes("drive") ? (
            <Bloc nom="Drive">
              <Knob
                label="saturació"
                value={p.drive}
                min={0}
                max={1}
                step={0.01}
                format={pct}
                onChange={(drive) => onChange({ drive })}
                {...knobMod("drive")}
              />
            </Bloc>
          ) : null}

          {blocks.includes("amp") ? (
            <Bloc nom="Amp">
              <Knob
                label="caiguda"
                size={40}
                value={p.decay}
                min={DECAY_MIN}
                max={DECAY_MAX}
                step={0.005}
                format={ms}
                onChange={(decay) => onChange({ decay })}
                {...knobMod("decay")}
              />
            </Bloc>
          ) : null}
        </div>

        {/* macros, sempre visibles al lateral dret */}
        <div className="relative flex shrink-0 items-start gap-4 border-ink/15 pl-4 sm:border-l">
          <Macros
            macros={macros}
            tracks={tracks}
            current={track}
            onChange={onMacro}
          />
          <button
            type="button"
            onClick={() => onChange(factory)}
            className="rounded-[3px] border border-ink/30 bg-panel-hi px-2 py-1 text-[12px] text-ink transition-colors hover:bg-raise"
          >
            De fàbrica
          </button>
        </div>
      </div>

      {/* banda 2: les fonts */}
      <div className="border-t border-ink/15 px-4 py-3 sm:px-6">
        <ModStrip
          params={p}
          sources={MOD_SOURCES}
          selected={font}
          onSelect={setFont}
        />
        <p className="mt-2 text-[12px] text-ink-soft">
          {font
            ? `Arrossega l'anell per encaminar-hi ${SOURCE_NAMES[font]}. Aquesta font pot anar a: ${MOD_ROUTES[font].map((t) => TARGET_NAMES[t]).join(", ")}.`
            : "Tria una font per encaminar-la als comandaments."}
        </p>
      </div>

      {/* banda 3: l'editor de la família triada */}
      <div className="border-t border-ink/15 px-4 py-3 sm:px-6">
        <div className="mb-3 flex gap-1">
          {FAMILIES.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={familia === f.id}
              onClick={() => setFamilia(f.id)}
              style={
                familia === f.id
                  ? { borderBottomColor: `var(--color-${FAMILY_COLOR[f.id]})` }
                  : undefined
              }
              className={[
                "border-b-2 px-2 py-1 text-[13px] transition-colors",
                familia === f.id
                  ? "bg-panel-hi text-ink"
                  : "border-b-transparent text-ink-soft hover:text-ink",
              ].join(" ")}
            >
              {f.nom}
            </button>
          ))}
        </div>

        {familia === "env" ? (
          <div className="flex flex-wrap items-end gap-3">
            <AdsrGraph
              env={p.envFilter}
              onChange={(canvis) =>
                onChange({ envFilter: { ...p.envFilter, ...canvis } })
              }
            />
            <Knob label="atac" value={p.envFilter.attack} min={0.001} max={1} step={0.001} format={ms} onChange={(attack) => onChange({ envFilter: { ...p.envFilter, attack } })} />
            <Knob label="caiguda" value={p.envFilter.decay} min={0.01} max={2} step={0.01} format={ms} onChange={(decay) => onChange({ envFilter: { ...p.envFilter, decay } })} />
            <Knob label="sosteniment" value={p.envFilter.sustain} min={0} max={1} step={0.01} format={pct} onChange={(sustain) => onChange({ envFilter: { ...p.envFilter, sustain } })} />
            <Knob label="relaxació" value={p.envFilter.release} min={0.01} max={2} step={0.01} format={ms} onChange={(release) => onChange({ envFilter: { ...p.envFilter, release } })} />
            <Knob label="quantitat" size={40} value={p.envFilter.amount} min={0} max={1} step={0.01} format={pct} onChange={(amount) => onChange({ envFilter: { ...p.envFilter, amount } })} />
          </div>
        ) : familia === "lfo" ? (
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex gap-1">
              {p.lfo.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={lfoIndex === i}
                  onClick={() => setLfoIndex(i)}
                  className={[
                    "rounded-[3px] border px-2 py-1 text-[12px]",
                    lfoIndex === i
                      ? "border-ink/45 bg-panel-hi text-ink"
                      : "border-ink/25 bg-panel-lo/40 text-ink-soft",
                  ].join(" ")}
                >
                  LFO {i + 1}
                </button>
              ))}
            </div>
            <label className="flex flex-col text-[11px] text-ink-soft">
              forma
              <select
                value={lfoActual?.shape}
                onChange={(e) => posaLfo({ shape: e.target.value as LfoShape })}
                className="mt-1 rounded-[3px] border border-ink/30 bg-panel-hi px-1 py-0.5 text-[12px] text-ink"
              >
                {LFO_SHAPES.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-[11px] text-ink-soft">
              velocitat
              <select
                value={lfoActual?.rate}
                onChange={(e) => posaLfo({ rate: e.target.value as SyncRate })}
                className="mt-1 rounded-[3px] border border-ink/30 bg-panel-hi px-1 py-0.5 text-[12px] text-ink"
              >
                {SYNC_RATES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            <Knob label="profunditat" size={40} value={lfoActual?.depth ?? 0} min={0} max={1} step={0.01} format={pct} onChange={(depth) => posaLfo({ depth })} />
          </div>
        ) : (
          <p className="text-[13px] text-ink-soft">
            La velocitat i l&apos;atzar no tenen res a ajustar: la seva
            quantitat es posa a l&apos;anell del comandament de destinació.
          </p>
        )}

        {p.mods.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {p.mods.map((m) => (
              <li
                key={`${m.source}-${m.target}`}
                className="rounded-[3px] border border-ink/25 bg-panel-lo/40 px-2 py-0.5 text-[11px] text-ink-soft tabular-nums"
              >
                {SOURCE_NAMES[m.source]} → {TARGET_NAMES[m.target]}{" "}
                {Math.round(m.amount * 100)} %
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
