import type { FontEnum } from "@/src/client";

export const FONTS: FontEnum[] = ["sans-regular", "sans-bold", "serif-regular"];
export const ALIGNMENTS = ["left", "center", "right"] as const;
export type Alignment = (typeof ALIGNMENTS)[number];

export const BOX_DEFAULTS = {
  font: "sans-regular" as FontEnum,
  font_size: 32,
  font_color: "#000000",
  alignment: "center" as Alignment,
};

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

export const CORNERS = ["nw", "ne", "sw", "se"] as const;
export type Corner = (typeof CORNERS)[number];

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
  corner: Corner,
  dx: number,
  dy: number,
  b: Bounds
): Rect {
  const west = corner === "nw" || corner === "sw";
  const north = corner === "nw" || corner === "ne";

  let left = Math.round(west ? start.x + dx : start.x);
  let right = Math.round(west ? start.x + start.width : start.x + start.width + dx);
  let top = Math.round(north ? start.y + dy : start.y);
  let bottom = Math.round(north ? start.y + start.height : start.y + start.height + dy);

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

  return { x: left, y: top, width: right - left, height: bottom - top };
}
