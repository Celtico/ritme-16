"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AddTrack } from "./AddTrack";
import { PatternBank } from "./PatternBank";
import { ReturnRows } from "./ReturnRows";
import { SceneColumn } from "./SceneColumn";
import { SlotBank } from "./SlotBank";
import { SoundPanel } from "./SoundPanel";
import { MelodyRow } from "./MelodyRow";
import { StepRow } from "./StepRow";
import { StepRuler } from "./StepRuler";
import { TrackRow } from "./TrackRow";
import { Transport } from "./Transport";
import {
  LIST_MAX,
  LIST_MIN,
  LIST_WIDTH,
  PANEL_HEIGHT,
  PANEL_MIN,
  RULER_HEIGHT,
} from "./layout";
import { useMeters } from "@/hooks/useMeters";
import { useSequencer } from "@/hooks/useSequencer";
import { useTheme } from "@/hooks/useTheme";
import { isAudible, isMelodic, MAX_TRACKS } from "@/lib/pattern";
import { decodePattern, SHARE_PARAM } from "@/lib/share";

/** Divisor arrossegable. `axis` diu si mou amplada o alçada. */
function Divider({
  axis,
  onDrag,
  label,
}: {
  axis: "x" | "y";
  onDrag: (delta: number) => void;
  label: string;
}) {
  const inici = useRef(0);
  const [actiu, setActiu] = useState(false);

  useEffect(() => {
    if (!actiu) return;
    const moure = (e: PointerEvent) => {
      const ara = axis === "x" ? e.clientX : e.clientY;
      onDrag(ara - inici.current);
      inici.current = ara;
    };
    const acabar = () => setActiu(false);
    window.addEventListener("pointermove", moure);
    window.addEventListener("pointerup", acabar);
    return () => {
      window.removeEventListener("pointermove", moure);
      window.removeEventListener("pointerup", acabar);
    };
  }, [actiu, axis, onDrag]);

  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation={axis === "x" ? "vertical" : "horizontal"}
      onPointerDown={(e) => {
        e.preventDefault();
        inici.current = axis === "x" ? e.clientX : e.clientY;
        setActiu(true);
      }}
      className={[
        "shrink-0 bg-desk/40 transition-colors hover:bg-desk",
        actiu ? "bg-desk" : "",
        axis === "x" ? "w-1.5 cursor-col-resize" : "h-1.5 cursor-row-resize",
      ].join(" ")}
    />
  );
}

export function Workspace() {
  const seq = useSequencer();
  const [theme, setTheme] = useTheme();
  const [soundTrack, setSoundTrack] = useState<string | null>(null);
  // només un menú de pista obert alhora
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [listWidth, setListWidth] = useState(LIST_WIDTH);
  /** L'usuari ha arrossegat el divisor? Llavors no se li toca l'amplada. */
  const amplsdaManual = useRef(false);
  const [panelHeight, setPanelHeight] = useState(PANEL_HEIGHT);
  const [snap, setSnap] = useState(true);
  /**
   * Per sota d'aquesta amplada les dues zones del centre no hi caben de
   * costat: la llista de pistes passa a sota de la graella i el divisor
   * desapareix. Sense això, a 390 px quedaven 183 controls inabastables.
   */
  const [estret, setEstret] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const aplica = () => setEstret(mq.matches);
    aplica();
    mq.addEventListener("change", aplica);
    return () => mq.removeEventListener("change", aplica);
  }, []);

  const { tracks } = seq.pattern;
  const openTrack = tracks.find((t) => t.id === soundTrack);
  const levels = useMeters(seq.readLevels, seq.isPlaying);
  const hotkeys = new Map(tracks.slice(0, 8).map((t, i) => [t.id, String(i + 1)]));

  const { toggleTransport, audition, loadPattern } = seq;

  /**
   * Un patró compartit per adreça. Es carrega després del muntatge i no
   * durant el render de servidor, que no sap res dels paràmetres de query;
   * i es treu de la barra d'adreces perquè recarregar no el torni a imposar
   * per damunt del que hagis fet des de llavors.
   */
  useEffect(() => {
    const codi = new URLSearchParams(window.location.search).get(SHARE_PARAM);
    if (!codi) return;
    const compartit = decodePattern(codi);
    if (compartit) loadPattern(compartit);
    const net = new URL(window.location.href);
    net.searchParams.delete(SHARE_PARAM);
    window.history.replaceState(null, "", net.toString());
  }, [loadPattern]);
  const tracksRef = useRef(tracks);
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  /**
   * La columna de pistes ha de ser tan ampla com el que hi ha a dins. Amb un
   * número fix, afegir-hi un control la deixa curta en silenci: aquí en
   * queien fora el panoràmic, els dos enviaments i el vúmetre de cada pista,
   * 108 px de contingut que no hi cabien.
   */
  useEffect(() => {
    if (amplsdaManual.current) return;
    const el = list.current;
    if (!el) return;
    const mesura = () => {
      if (amplsdaManual.current) return;
      const cal = el.scrollWidth;
      if (cal > el.clientWidth) {
        setListWidth((w) => Math.min(LIST_MAX, Math.max(w, cal)));
      }
    };
    mesura();
    const ro = new ResizeObserver(mesura);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tracks.length]);

  // --- desplaçament vertical sincronitzat entre els dos panells ----------
  const grid = useRef<HTMLDivElement | null>(null);
  const list = useRef<HTMLDivElement | null>(null);
  const copiant = useRef(false);

  const sincronitza = useCallback(
    (de: HTMLDivElement | null, a: HTMLDivElement | null) => {
      if (!de || !a || copiant.current) return;
      copiant.current = true;
      a.scrollTop = de.scrollTop;
      // sense aquesta bandera els dos onScroll es cridarien l'un a l'altre
      requestAnimationFrame(() => {
        copiant.current = false;
      });
    },
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const escrivint =
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable ||
        (target instanceof HTMLInputElement &&
          !["range", "checkbox", "radio", "button", "submit"].includes(
            target.type,
          ));
      if (escrivint) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (!e.repeat) toggleTransport();
        return;
      }
      const index = Number(e.key) - 1;
      const track = index >= 0 && index < 8 ? tracksRef.current[index] : undefined;
      if (track) void audition(track.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleTransport, audition]);

  return (
    <div
      className="grid h-dvh w-screen overflow-hidden bg-panel text-ink"
      style={{
        // la primera fila és de contingut: a poca amplada el transport
        // s'embolica en més d'una línia i ha de poder créixer
        gridTemplateRows: "auto auto minmax(0, 1fr) auto",
        // minmax(0, …) o la columna pren l'amplada mínima del seu contingut
        // i l'arrel es fa més ampla que el viewport
        gridTemplateColumns: "minmax(0, 1fr)",
      }}
    >
      <Transport
        theme={theme}
        onTheme={setTheme}
        isPlaying={seq.isPlaying}
        bpm={seq.pattern.bpm}
        swing={seq.pattern.swing}
        currentStep={seq.currentStep}
        patternKey={seq.pattern.key}
        onKey={seq.setKey}
        length={seq.pattern.length}
        onLength={seq.setLength}
        snap={snap}
        onSnap={setSnap}
        onToggle={seq.toggleTransport}
        onBpm={seq.setBpm}
        onSwing={seq.setSwing}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-ink/15">
        <SlotBank
          song={seq.song}
          onSelect={seq.selectSlot}
          onFollow={seq.setFollow}
          onCopy={seq.copySlot}
          onClear={seq.clearSlot}
        />
        <div className="px-3 py-1.5">
          <SceneColumn
            pattern={seq.pattern}
            onApply={seq.applyScene}
            onSave={seq.saveScene}
            onRename={seq.renameScene}
            onRemove={seq.removeScene}
          />
        </div>
      </div>

      {/* centre: passos a l'esquerra, llista de pistes a la dreta */}
      <div
        className="grid min-h-0"
        style={
          estret
            ? {
                gridTemplateColumns: "minmax(0, 1fr)",
                gridTemplateRows: "minmax(0, 1fr) auto",
              }
            : { gridTemplateColumns: `minmax(0, 1fr) auto ${listWidth}px` }
        }
      >
        <div
          ref={grid}
          onScroll={() => sincronitza(grid.current, list.current)}
          className="min-w-0 overflow-auto px-3 pt-2"
        >
          {/* w-max perquè el panell tingui alguna cosa a desplaçar quan les
              files no hi caben; min-w-full perquè ompli quan sí que hi caben */}
          <div className="w-max min-w-full">
            <StepRuler currentStep={seq.currentStep} length={seq.pattern.length} />
            {tracks.map((track) =>
              isMelodic(track.kind) ? (
                <MelodyRow
                  key={track.id}
                  track={track}
                  length={seq.pattern.length}
                  patternKey={seq.pattern.key}
                  currentStep={seq.currentStep}
                  dimmed={!isAudible(seq.pattern, track)}
                  snap={snap}
                  onBass={(i, n) => seq.setBassNote(track.id, i, n)}
                  onChord={(i, c) => seq.setChordNote(track.id, i, c)}
                />
              ) : (
                <StepRow
                  key={track.id}
                  track={track}
                  length={seq.pattern.length}
                  currentStep={seq.currentStep}
                  dimmed={!isAudible(seq.pattern, track)}
                  onToggleStep={(index, accent) =>
                    seq.toggleStep(track.id, index, accent)
                  }
                />
              ),
            )}
          </div>
        </div>

        {estret ? null : (
        <Divider
          axis="x"
          label="Amplada de la llista de pistes"
          onDrag={(d) => {
            amplsdaManual.current = true;
            setListWidth((w) => Math.max(LIST_MIN, Math.min(LIST_MAX, w - d)));
          }}
        />
        )}

        <div
          ref={list}
          onScroll={() => sincronitza(list.current, grid.current)}
          className={[
            "min-w-0 overflow-auto px-2 pt-2",
            estret ? "max-h-[45vh] border-t" : "border-l",
            "border-ink/15",
          ].join(" ")}
        >
          {/* A 280 px no hi caben tots els controls sense aixafar el nom, així
              que la fila té amplada mínima i la llista es desplaça; qui la
              vulgui sencera pot arrossegar el divisor. */}
          <div className="w-max min-w-full">
          {/* el mateix espai que ocupa la regla, perquè les files s'alineïn */}
          <div style={{ height: RULER_HEIGHT }} aria-hidden />
          {tracks.map((track, i) => (
            <TrackRow
              key={track.id}
              track={track}
              hotkey={hotkeys.get(track.id)}
              dimmed={!isAudible(seq.pattern, track)}
              onChangeMix={(changes) => seq.setChannel(track.id, changes)}
              onAudition={() => void seq.audition(track.id)}
              onOpenSound={() =>
                setSoundTrack((v) => (v === track.id ? null : track.id))
              }
              onClear={() => seq.clearLane(track.id)}
              soundOpen={soundTrack === track.id}
              level={levels.tracks[track.id] ?? 0}
              menu={{
                track,
                first: i === 0,
                last: i === tracks.length - 1,
                canDuplicate: tracks.length < MAX_TRACKS,
                canRemove: tracks.length > 1,
                onRename: (name) => seq.renameTrack(track.id, name),
                onColor: (color) => seq.setTrackColor(track.id, color),
                onDuplicate: () => {
                  seq.duplicateTrack(track.id);
                  setOpenMenu(null);
                },
                onMove: (delta) => seq.moveTrack(track.id, delta),
                onRemove: () => {
                  seq.removeTrack(track.id);
                  setOpenMenu(null);
                },
                open: openMenu === track.id,
                onToggle: (v: boolean) => setOpenMenu(v ? track.id : null),
              }}
            />
          ))}

          <AddTrack
            onAdd={seq.addTrack}
            remaining={MAX_TRACKS - tracks.length}
          />
          <ReturnRows returns={seq.pattern.returns} onChange={seq.setReturns} />
          </div>
        </div>
      </div>

      {/* Sense pista seleccionada el panell no ha de reservar 300 px per a
          una frase: es queda a l'alçada del seu contingut. */}
      <div
        style={{ height: openTrack ? panelHeight : undefined }}
        className="flex min-h-0 flex-col"
      >
        {openTrack ? (
          <Divider
            axis="y"
            label="Alçada del panell inferior"
            onDrag={(d) => setPanelHeight((h) => Math.max(PANEL_MIN, h - d))}
          />
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-ink/15">
          <div className="flex gap-1 px-3 pt-2">
            <button
              type="button"
              aria-pressed
              className="border-b-2 border-oxblood bg-panel-hi px-2 py-1 text-[13px] text-ink"
            >
              So
            </button>
          </div>
          {openTrack ? (
            <SoundPanel
              track={openTrack}
              tracks={tracks}
              macros={seq.pattern.macros}
              onChange={(changes) => seq.setSound(openTrack.id, changes)}
              onMacro={seq.setMacro}
            />
          ) : (
            <p className="px-3 py-3 text-[13px] text-ink-soft">
              Clica el nom d&apos;una pista per veure&apos;n els comandaments de so.
            </p>
          )}
          <PatternBank
            pattern={seq.pattern}
            onLoad={seq.loadPattern}
            onClear={seq.clearAll}
            onRandomise={seq.randomise}
            onExport={seq.exportWav}
            exporting={seq.exporting}
            dirty={seq.dirty}
            onGenerate={seq.loadSong}
          />
        </div>
      </div>
    </div>
  );
}
