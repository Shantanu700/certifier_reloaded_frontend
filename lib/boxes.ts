import type { BoxTypeEnum, FontEnum } from "@/src/client";

export const FONTS: FontEnum[] = ["sans-regular", "sans-bold", "serif-regular"];
export const ALIGNMENTS = ["left", "center", "right"] as const;
export type Alignment = (typeof ALIGNMENTS)[number];

export const BOX_DEFAULTS = {
  font: "sans-regular" as FontEnum,
  font_size: 32,
  font_color: "#000000",
  alignment: "center" as Alignment,
  type: "text" as BoxTypeEnum,
};

export const BOX_TYPES: BoxTypeEnum[] = ["text", "qr", "verify_qr", "verify_code"];
/** QR boxes draw a code in `font_color`; font, size and alignment don't apply. */
export const isQr = (type?: BoxTypeEnum) => type === "qr" || type === "verify_qr";
/** Boxes filled from a CSV column (or typed values). verify_* ones print the certificate's own code. */
export const isMappable = (type?: BoxTypeEnum) => !type || type === "text" || type === "qr";

export type BoxDraft = {
  uuid?: string;
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  font: FontEnum;
  font_size: number;
  font_color: string;
  alignment: Alignment;
  type: BoxTypeEnum;
};

export type Rect = { x: number; y: number; width: number; height: number };
export type Bounds = { width: number; height: number };

export type ImageBoxDraft = Rect & {
  uuid?: string;
  key: string;
};

export function nextKey(boxes: { key: string }[], prefix: string) {
  const taken = new Set(boxes.map((b) => b.key));
  for (let n = boxes.length + 1; ; n++) {
    if (!taken.has(`${prefix}_${n}`)) return `${prefix}_${n}`;
  }
}

export const MIN_BOX = 8;

// Corners resize two edges, edge midpoints one.
export const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;
export type Handle = (typeof HANDLES)[number];
/** QR boxes resize from these only, staying square. */
export const CORNERS = ["nw", "ne", "se", "sw"] as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export function moveBox(start: Rect, dx: number, dy: number, b: Bounds): Rect {
  return {
    ...start,
    x: clamp(Math.round(start.x + dx), 0, Math.max(0, b.width - start.width)),
    y: clamp(Math.round(start.y + dy), 0, Math.max(0, b.height - start.height)),
  };
}

export function resizeBox(
  start: Rect,
  handle: Handle,
  dx: number,
  dy: number,
  b: Bounds,
  square = false
): Rect {
  const west = handle.includes("w");
  const east = handle.includes("e");
  const north = handle.includes("n");
  const south = handle.includes("s");

  let left = Math.round(west ? start.x + dx : start.x);
  let right = Math.round(east ? start.x + start.width + dx : start.x + start.width);
  let top = Math.round(north ? start.y + dy : start.y);
  let bottom = Math.round(south ? start.y + start.height + dy : start.y + start.height);

  left = clamp(left, 0, b.width);
  right = clamp(right, 0, b.width);
  top = clamp(top, 0, b.height);
  bottom = clamp(bottom, 0, b.height);

  if (right - left < MIN_BOX) {
    if (west) left = right - MIN_BOX;
    else right = left + MIN_BOX;
  }
  if (bottom - top < MIN_BOX) {
    if (north) top = bottom - MIN_BOX;
    else bottom = top + MIN_BOX;
  }

  if (square) {
    // The opposite corner stays put; the side grows to the larger drag, as far as the page allows.
    const anchorX = west ? start.x + start.width : start.x;
    const anchorY = north ? start.y + start.height : start.y;
    const room = Math.min(west ? anchorX : b.width - anchorX, north ? anchorY : b.height - anchorY);
    const side = clamp(Math.max(right - left, bottom - top), Math.min(MIN_BOX, room), room);
    return { x: west ? anchorX - side : anchorX, y: north ? anchorY - side : anchorY, width: side, height: side };
  }

  return { x: left, y: top, width: right - left, height: bottom - top };
}

// Halves, thirds and quarters of the template: the 1-, 2- and 3-line divisions together.
export const GUIDE_FRACTIONS = [1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4];

/** Guide positions (image px) a box is snapped to, per axis; drawn while dragging. */
export type SnapLines = { x?: number; y?: number };

/** Closest (point, guide) pair along one axis within `threshold`: the shift that lines them up, and the guide. */
function nearestGuide(points: number[], size: number, threshold: number) {
  let best: { shift: number; line: number } | null = null;
  for (const fraction of GUIDE_FRACTIONS) {
    const line = Math.round(size * fraction);
    for (const point of points) {
      const shift = line - point;
      if (Math.abs(shift) <= threshold && (!best || Math.abs(shift) < Math.abs(best.shift))) {
        best = { shift, line };
      }
    }
  }
  return best;
}

/** Which line of the box snaps, per axis, as a fraction of its size: start edge, centre or end edge. */
export type Anchor = { x: 0 | 0.5 | 1; y: 0 | 0.5 | 1 };

/** The box line nearest a point inside it (0-1 across the box): grab near the top and the top edge snaps. */
export const anchorAt = (fraction: number): 0 | 0.5 | 1 =>
  fraction < 0.25 ? 0 : fraction > 0.75 ? 1 : 0.5;

/** Moves the box so its `anchor` line, per axis, sits on the nearest guide within `threshold`. */
export function snapMove(
  rect: Rect,
  b: Bounds,
  threshold: number,
  anchor: Anchor
): { rect: Rect; lines: SnapLines } {
  const x = nearestGuide([rect.x + rect.width * anchor.x], b.width, threshold);
  const y = nearestGuide([rect.y + rect.height * anchor.y], b.height, threshold);
  return {
    rect: moveBox(rect, Math.round(x?.shift ?? 0), Math.round(y?.shift ?? 0), b),
    lines: { x: x?.line, y: y?.line },
  };
}

/**
 * Snaps only the edges `handle` drags: one axis for an edge handle, both for a corner.
 * A square box snaps the nearer of its two dragged edges and grows the other to match.
 */
export function snapResize(
  rect: Rect,
  handle: Handle,
  b: Bounds,
  threshold: number,
  square = false
): { rect: Rect; lines: SnapLines } {
  const x = handle.includes("w")
    ? nearestGuide([rect.x], b.width, threshold)
    : handle.includes("e")
      ? nearestGuide([rect.x + rect.width], b.width, threshold)
      : null;
  const y = handle.includes("n")
    ? nearestGuide([rect.y], b.height, threshold)
    : handle.includes("s")
      ? nearestGuide([rect.y + rect.height], b.height, threshold)
      : null;
  if (square) {
    const useX = x && (!y || Math.abs(x.shift) <= Math.abs(y.shift));
    // How much the side grows: dragging a west/north edge outward is a negative shift.
    const grow = useX
      ? (handle.includes("e") ? 1 : -1) * x.shift
      : y
        ? (handle.includes("s") ? 1 : -1) * y.shift
        : 0;
    return {
      rect: resizeBox(rect, handle, handle.includes("e") ? grow : -grow, handle.includes("s") ? grow : -grow, b, true),
      lines: useX ? { x: x.line } : { y: y?.line },
    };
  }
  return {
    rect: resizeBox(rect, handle, x?.shift ?? 0, y?.shift ?? 0, b),
    lines: { x: x?.line, y: y?.line },
  };
}
