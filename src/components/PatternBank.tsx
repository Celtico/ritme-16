"use client";

import { useEffect, useState } from "react";
import { PRESETS, type Pattern } from "@/lib/pattern";
import { loadSaved, persist, type SavedPattern } from "@/lib/storage";

interface Props {
  pattern: Pattern;
  onLoad: (p: Pattern) => void;
  onClear: () => void;
  onRandomise: () => void;
}

function PanelButton({
  children,
  onClick,
  tone = "neutral",
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "neutral" | "warm";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-[3px] border border-ink/30 px-3 py-1.5 text-[13px] transition-colors",
        tone === "warm"
          ? "bg-teal text-on-accent hover:bg-teal/85"
          : "bg-panel-hi text-ink hover:bg-raise",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function PatternBank({
  pattern,
  onLoad,
  onClear,
  onRandomise,
}: Props) {
  const [saved, setSaved] = useState<SavedPattern[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    setSaved(loadSaved());
  }, []);

  const save = () => {
    const label = name.trim() || `Patró ${saved.length + 1}`;
    const entry: SavedPattern = {
      id: crypto.randomUUID(),
      pattern: { ...pattern, name: label },
      savedAt: Date.now(),
    };
    const next = [entry, ...saved].slice(0, 12);
    setSaved(next);
    persist(next);
    setName("");
  };

  const remove = (id: string) => {
    const next = saved.filter((s) => s.id !== id);
    setSaved(next);
    persist(next);
  };

  return (
    <div className="flex flex-col gap-4 border-t border-ink/15 px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <PanelButton key={p.name} onClick={() => onLoad(p)}>
            {p.name}
          </PanelButton>
        ))}
        <span className="mx-1 h-5 w-px bg-ink/20" aria-hidden />
        <PanelButton onClick={onRandomise}>Sortejar</PanelButton>
        <PanelButton onClick={onClear}>Buidar</PanelButton>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
          }}
          placeholder="Nom del patró"
          aria-label="Nom del patró a desar"
          className="w-48 rounded-[3px] border border-ink/30 bg-panel-hi px-2 py-1.5 text-[13px] text-ink placeholder:text-ink-soft/70"
        />
        <PanelButton tone="warm" onClick={save}>
          Desar al navegador
        </PanelButton>
      </div>

      {saved.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {saved.map((s) => (
            <li key={s.id} className="flex items-stretch">
              <button
                type="button"
                onClick={() => onLoad(s.pattern)}
                className="rounded-l-[3px] border border-ink/30 bg-panel-lo/50 px-3 py-1.5 text-[13px] text-ink hover:bg-panel-hi"
              >
                {s.pattern.name}
                <span className="ml-2 text-ink-soft tabular-nums">
                  {s.pattern.bpm}
                </span>
              </button>
              <button
                type="button"
                onClick={() => remove(s.id)}
                aria-label={`Esborrar ${s.pattern.name}`}
                className="rounded-r-[3px] border border-l-0 border-ink/30 bg-panel-lo/50 px-2 text-[13px] text-ink-soft hover:bg-oxblood hover:text-on-accent"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-ink-soft">
          Els patrons que desis es queden en aquest navegador i es carreguen amb
          un clic.
        </p>
      )}
    </div>
  );
}
