"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

// Mirrors MIN/MAX/EXPORT_WIDTH in the backend's modules/canva/services.py, which enforces them.
const MIN_WIDTH = 800;
const MAX_WIDTH = 4000;
// 20, not 100: every preset (and the 2480 default) must sit on the min + n·step grid, or the
// browser silently snaps the submitted value away from what the readout shows.
const STEP = 20;

const PRESETS = [
  { label: "Standard", width: 1200 },
  { label: "High", width: 2480 },
  { label: "Print", width: 3500 },
] as const;

/**
 * Export width for a Canva import. Canva's API doesn't expose a design's real
 * size outside a preview endpoint (which blocks public review), so this works
 * in pixels rather than Canva's ×1/×2 multiples; the thumbnail has the
 * design's proportions, which is all the height readout needs.
 */
export function CanvaQualitySlider({
  id,
  thumbnailWidth,
  thumbnailHeight,
}: {
  id: string;
  thumbnailWidth: number | null;
  thumbnailHeight: number | null;
}) {
  const [width, setWidth] = useState<number>(PRESETS[1].width);
  const height =
    thumbnailWidth && thumbnailHeight
      ? Math.round((width * thumbnailHeight) / thumbnailWidth)
      : null;
  const size = height ? `${width} × ${height} px` : `${width} px wide`;

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[0.6875rem] font-bold tracking-widest text-muted-foreground uppercase"
      >
        Quality
      </label>
      <input
        id={id}
        name="width"
        type="range"
        min={MIN_WIDTH}
        max={MAX_WIDTH}
        step={STEP}
        value={width}
        list={`${id}-stops`}
        aria-valuetext={height ? `${width} by ${height} pixels` : `${width} pixels wide`}
        onChange={(e) => setWidth(Number(e.currentTarget.value))}
        className="mt-2 w-full cursor-pointer accent-accent"
      />
      <datalist id={`${id}-stops`}>
        {PRESETS.map((p) => (
          <option key={p.width} value={p.width} label={p.label} />
        ))}
      </datalist>
      <p className="mt-1 flex items-baseline justify-between gap-2 text-[0.6875rem] tracking-widest text-muted-foreground uppercase">
        <span>Smaller file</span>
        <output htmlFor={id} className="font-mono font-bold text-foreground normal-case">
          {size}
        </output>
        <span>Sharper</span>
      </p>
      <div className="mt-3 flex gap-2" role="group" aria-label="Quality presets">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            aria-pressed={width === p.width}
            onClick={() => setWidth(p.width)}
            className={cn(
              "flex-1 border-2 px-2 py-1.5 text-[0.6875rem] font-bold tracking-widest uppercase transition-colors pointer-coarse:py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              width === p.width
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border hover:bg-muted"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
