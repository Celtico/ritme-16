"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AddTrack } from "./AddTrack";
import { PatternBank } from "./PatternBank";
import { ReturnRows } from "./ReturnRows";
import { SoundPanel } from "./SoundPanel";
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
import { isAudible, MAX_TRACKS } from "@/lib/pattern";

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
  const [soundTrack, setSoundTrack] = useState<string | null>(null);
  // només un menú de pista obert alhora
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [listWidth, setListWidth] = useState(LIST_WIDTH);
  const [panelHeight, setPanelHeight] = useState(PANEL_HEIGHT);

  const { tracks } = seq.pattern;
  const openTrack = tracks.find((t) => t.id === soundTrack);
  const levels = useMeters(seq.readLevels, seq.isPlaying);
  const hotkeys = new Map(tracks.slice(0, 8).map((t, i) => [t.id, String(i + 1)]));

  const { toggleTransport, audition } = seq;
  const tracksRef = useRef(tracks);
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

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
      style={{ gridTemplateRows: "52px 1fr auto", gridTemplateColumns: "1fr" }}
    >
      <Transport
        isPlaying={seq.isPlaying}
        bpm={seq.pattern.bpm}
        swing={seq.pattern.swing}
        currentStep={seq.currentStep}
        onToggle={seq.toggleTransport}
        onBpm={seq.setBpm}
        onSwing={seq.setSwing}
      />

      {/* centre: passos a l'esquerra, llista de pistes a la dreta */}
      <div
        className="grid min-h-0"
        style={{ gridTemplateColumns: `1fr auto ${listWidth}px` }}
      >
        <div
          ref={grid}
          onScroll={() => sincronitza(grid.current, list.current)}
          className="min-w-0 overflow-auto px-3 pt-2"
        >
          <div className="min-w-[420px]">
            <StepRuler currentStep={seq.currentStep} />
            {tracks.map((track) => (
              <StepRow
                key={track.id}
                track={track}
                currentStep={seq.currentStep}
                dimmed={!isAudible(seq.pattern, track)}
                onToggleStep={(index, accent) =>
                  seq.toggleStep(track.id, index, accent)
                }
              />
            ))}
          </div>
        </div>

        <Divider
          axis="x"
          label="Amplada de la llista de pistes"
          onDrag={(d) =>
            setListWidth((w) =>
              Math.max(LIST_MIN, Math.min(LIST_MAX, w - d)),
            )
          }
        />

        <div
          ref={list}
          onScroll={() => sincronitza(list.current, grid.current)}
          className="min-w-0 overflow-auto border-l border-ink/15 px-2 pt-2"
        >
          {/* A 280 px no hi caben tots els controls sense aixafar el nom, així
              que la fila té amplada mínima i la llista es desplaça; qui la
              vulgui sencera pot arrossegar el divisor. */}
          <div className="min-w-[372px]">
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

      <div style={{ height: panelHeight }} className="flex min-h-0 flex-col">
        <Divider
          axis="y"
          label="Alçada del panell inferior"
          onDrag={(d) =>
            setPanelHeight((h) => Math.max(PANEL_MIN, h - d))
          }
        />
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
          />
        </div>
      </div>
    </div>
  );
}
