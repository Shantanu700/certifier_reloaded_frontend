import { expect, test } from "bun:test";

import { anchorAt, resizeBox, snapMove, snapResize } from "./boxes";

const page = { width: 1200, height: 900 };
const box = (x: number, y: number, width = 200, height = 100) => ({ x, y, width, height });

// Guides on a 1200 x 900 page: x 300, 400, 600, 800, 900 and y 225, 300, 450, 600, 675.

const CENTRE = { x: 0.5, y: 0.5 } as const;

test("the grabbed line snaps: centre near the middle", () => {
  const { rect, lines } = snapMove(box(496, 20), page, 8, CENTRE); // centre 596 -> 600
  expect(rect).toEqual(box(500, 20));
  expect(lines).toEqual({ x: 600, y: undefined });
});

test("only the line nearest the pointer is considered", () => {
  // Left edge 404 is near 1/3 (400) but the box was grabbed by its centre (504): nothing snaps.
  expect(snapMove(box(404, 20, 200), page, 8, CENTRE).lines.x).toBeUndefined();
  // Grabbed near the left edge: the left edge snaps.
  const { rect, lines } = snapMove(box(404, 20, 200), page, 8, { x: 0, y: 0.5 });
  expect(rect.x).toBe(400);
  expect(lines.x).toBe(400);
  // Grabbed near the bottom: bottom 597 -> 600 (2/3 of 900).
  expect(snapMove(box(20, 497), page, 8, { x: 0.5, y: 1 }).rect.y).toBe(500);
});

test("anchorAt picks the nearest of start, centre and end", () => {
  expect([0, 0.2, 0.3, 0.5, 0.7, 0.8, 1].map(anchorAt)).toEqual([0, 0, 0.5, 0.5, 0.5, 1, 1]);
});

test("nothing snaps beyond the threshold, and the box stays on the page", () => {
  expect(snapMove(box(560, 360), page, 4, CENTRE)).toEqual({ rect: box(560, 360), lines: { x: undefined, y: undefined } });
  const edge = snapMove(box(1000, 800), page, 8, CENTRE); // right edge 1200 is clamped, nothing near a guide
  expect(edge.rect.x + edge.rect.width).toBeLessThanOrEqual(page.width);
});

test("a corner resize snaps only the edges it drags", () => {
  const { rect, lines } = snapResize(box(100, 100, 795, 570), "se", page, 8); // right 895 -> 900, bottom 670 -> 675
  expect(rect).toEqual(box(100, 100, 800, 575));
  expect(lines).toEqual({ x: 900, y: 675 });
});

test("edge handles move one edge only", () => {
  expect(resizeBox(box(100, 100), "e", 40, 30, page)).toEqual(box(100, 100, 240, 100));
  expect(resizeBox(box(100, 100), "n", 40, -30, page)).toEqual(box(100, 70, 200, 130));
  expect(resizeBox(box(100, 100), "w", -20, 99, page)).toEqual(box(80, 100, 220, 100));
  expect(resizeBox(box(100, 100), "s", 5, 25, page)).toEqual(box(100, 100, 200, 125));
  const { rect, lines } = snapResize(box(100, 100, 497, 100), "e", page, 8); // right 597 -> 600, y untouched
  expect(rect).toEqual(box(100, 100, 500, 100));
  expect(lines).toEqual({ x: 600, y: undefined });
});

test("a square corner drag stays square and keeps the opposite corner put", () => {
  // Dragging se mostly right: the side follows the larger drag.
  expect(resizeBox(box(100, 100, 100, 100), "se", 60, 10, page, true)).toEqual(box(100, 100, 160, 160));
  // Dragging nw: the bottom-right corner (200, 200) stays.
  expect(resizeBox(box(100, 100, 100, 100), "nw", -30, -50, page, true)).toEqual(box(50, 50, 150, 150));
  // A rectangle from before the rule becomes square on its first drag.
  expect(resizeBox(box(100, 100, 200, 100), "ne", 0, 0, page, true)).toEqual(box(100, 0, 200, 200));
});

test("a square box stops at the page edge on either axis", () => {
  // 100 px of room below, 1000 to the right: the side stops at 100 + 100.
  expect(resizeBox(box(100, 700, 100, 100), "se", 500, 500, page, true)).toEqual(box(100, 700, 200, 200));
});

test("a square snap uses the nearer guide and keeps the box square", () => {
  // Right edge 596 and bottom 596 are both 4 from 600: x wins the tie.
  const { rect, lines } = snapResize(box(100, 100, 496, 496), "se", page, 8, true);
  expect(rect).toEqual(box(100, 100, 500, 500));
  expect(lines).toEqual({ x: 600 });
  // Dragging the west edge: left 302 snaps out to 300, so the side grows by 2.
  expect(snapResize(box(302, 400, 100, 100), "sw", page, 8, true).rect).toEqual(box(300, 400, 102, 102));
});
