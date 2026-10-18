"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Plus, QrCode, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteBox, deleteImageBox, saveBox, saveImageBox } from "@/app/actions";
import { ConfirmPopover } from "@/components/confirm-popover";
import { Loader } from "@/components/loader";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import {
  ALIGNMENTS,
  BOX_DEFAULTS,
  FONTS,
  GUIDE_FRACTIONS,
  HANDLES,
  isQr,
  moveBox,
  nextKey,
  resizeBox,
  snapMove,
  snapResize,
  anchorAt,
  type Alignment,
  type Anchor,
  type BoxDraft,
  type Bounds,
  type Handle,
  type ImageBoxDraft,
  type Rect,
  type SnapLines,
} from "@/lib/boxes";
import { uploadFile } from "@/lib/upload-client";
import { IMAGE_TYPES } from "@/lib/uploads";
import { cn } from "@/lib/utils";
import type { BoxTypeEnum, FontEnum, TemplateBox, TemplateImageBox } from "@/src/client";

export type EditorImageBox = TemplateImageBox & { imageUrl?: string };

type EditorBox =
  | (BoxDraft & { id: number; kind: "text" })
  | (ImageBoxDraft & { id: number; kind: "image"; imageUrl?: string });

type BoxPatch = Partial<BoxDraft & { imageUrl?: string }>;

const LABEL =
  "block text-[0.625rem] font-bold tracking-widest text-muted-foreground uppercase";
const FIELD =
  "mt-1 h-10 w-full border-2 border-border bg-transparent px-2 text-sm font-bold tracking-tight outline-none focus:border-accent";

// Same box as FIELD, in the shared dropdown.
const SELECT = "mt-1 h-10 px-2";

const FONT_STACK: Record<FontEnum, string> = {
  "sans-regular": "var(--font-sans), sans-serif",
  "sans-bold": "var(--font-sans), sans-serif",
  "serif-regular": "serif",
};

const OUTLINE_ALPHA = "30";

// Handles sit centred on the box outline: white with a lime rim, matching the selected box.
// Corners are squares, edge midpoints slim bars along their edge.
const HANDLE_BASE = "absolute border-[1.5px] border-accent bg-white";
const CORNER = "size-2.5 pointer-coarse:size-4";
const BAR_X = "h-1.5 w-5 pointer-coarse:h-3 pointer-coarse:w-8";
const BAR_Y = "h-5 w-1.5 pointer-coarse:h-8 pointer-coarse:w-3";
const HANDLE_POSITION: Record<Handle, string> = {
  nw: `${CORNER} -top-px -left-px -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize`,
  n: `${BAR_X} -top-px left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize`,
  ne: `${CORNER} -top-px -right-px translate-x-1/2 -translate-y-1/2 cursor-nesw-resize`,
  e: `${BAR_Y} top-1/2 -right-px translate-x-1/2 -translate-y-1/2 cursor-ew-resize`,
  se: `${CORNER} -bottom-px -right-px translate-x-1/2 translate-y-1/2 cursor-nwse-resize`,
  s: `${BAR_X} -bottom-px left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize`,
  sw: `${CORNER} -bottom-px -left-px -translate-x-1/2 translate-y-1/2 cursor-nesw-resize`,
  w: `${BAR_Y} top-1/2 -left-px -translate-x-1/2 -translate-y-1/2 cursor-ew-resize`,
};

// Smart-guide pink: unlike the yellow accent it stays visible on cream, white and dark artwork.
const GUIDE = "var(--color-pink-500)";
const GUIDE_CHIP =
  "pointer-events-none absolute bg-pink-500 px-1 py-0.5 font-mono text-[0.625rem] leading-none font-bold whitespace-nowrap text-white";
const CHIP =
  "pointer-events-none absolute bg-neutral-900 px-1.5 py-1 font-mono text-[0.625rem] leading-none whitespace-nowrap text-white";

// Index-aligned with GUIDE_FRACTIONS; shown on the line a box snaps to.
const GUIDE_LABELS = ["1/4", "1/3", "1/2", "2/3", "3/4"];
const guideLabel = (line: number, size: number) =>
  GUIDE_LABELS[GUIDE_FRACTIONS.findIndex((f) => Math.round(size * f) === line)];

// Snap reach in screen pixels, so it feels the same at any zoom.
const SNAP_PX = 8;

// Key prefix for a new box, and the tag it gets in the box list (text boxes get none).
const TYPE_KEY: Record<BoxTypeEnum, string> = {
  text: "field",
  qr: "qr",
  verify_qr: "verify_qr",
  verify_code: "verify_code",
};
const TYPE_TAG: Partial<Record<BoxTypeEnum, string>> = {
  qr: "QR",
  verify_qr: "VERIFY QR",
  verify_code: "CODE",
};
const TAG =
  "shrink-0 border-2 border-current px-1 font-mono text-[0.5625rem] leading-4 tracking-widest opacity-70";
const NOTE = "col-span-2 text-xs text-muted-foreground";

function toEditorBox(box: TemplateBox, id: number): EditorBox {
  return {
    id,
    kind: "text",
    uuid: box.uuid,
    key: box.key,
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    font: box.font ?? BOX_DEFAULTS.font,
    font_size: box.font_size ?? BOX_DEFAULTS.font_size,
    font_color: box.font_color ?? BOX_DEFAULTS.font_color,
    alignment: (box.alignment ?? BOX_DEFAULTS.alignment) as Alignment,
    type: box.type ?? BOX_DEFAULTS.type,
  };
}

function toEditorImageBox(box: EditorImageBox, id: number): EditorBox {
  return {
    id,
    kind: "image",
    uuid: box.uuid,
    key: box.key,
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    imageUrl: box.imageUrl,
  };
}

function toDraft(box: Extract<EditorBox, { kind: "text" }>): BoxDraft {
  return {
    uuid: box.uuid,
    key: box.key,
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    font: box.font,
    font_size: box.font_size,
    font_color: box.font_color,
    alignment: box.alignment,
    type: box.type,
  };
}

function toImageDraft(box: EditorBox): ImageBoxDraft {
  return {
    uuid: box.uuid,
    key: box.key,
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
  };
}

export function TemplateWorkspace({
  templateUuid,
  src,
  name,
  boxes: initialBoxes,
  imageBoxes: initialImageBoxes,
  editing,
  editHref,
  tabs,
  children,
}: {
  templateUuid: string;
  src: string;
  name: string;
  boxes: TemplateBox[];
  imageBoxes: EditorImageBox[];
  editing: boolean;
  /** Where clicking the canvas on another step goes: step 01 with the same batch. */
  editHref: string;
  tabs: React.ReactNode;
  children?: React.ReactNode;
}) {
  const [imgSrc] = useState(src);
  const [boxes, setBoxes] = useState<EditorBox[]>(() => [
    ...initialBoxes.map(toEditorBox),
    ...initialImageBoxes.map((box, i) =>
      toEditorImageBox(box, initialBoxes.length + i)
    ),
  ]);
  const [selectedId, setSelectedId] = useState<number | null>(
    initialBoxes.length || initialImageBoxes.length ? 0 : null
  );
  const [pending, startTransition] = useTransition();

  const [natural, setNatural] = useState<Bounds | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(0);
  const nextId = useRef(initialBoxes.length + initialImageBoxes.length);

  const reloaded = useRef(false);
  const reloadStaleImage = () => {
    if (reloaded.current) return;
    reloaded.current = true;
    location.reload();
  };
  const router = useRouter();
  const [guides, setGuides] = useState<SnapLines>({});
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<{
    id: number;
    handle?: Handle;
    anchor: Anchor;
    pointerX: number;
    pointerY: number;
    rect: Rect;
  } | null>(null);

  const measureImage = useCallback(() => {
    const img = imgRef.current;
    if (!img?.naturalWidth) return null;
    const size = { width: img.naturalWidth, height: img.naturalHeight };
    setNatural(size);
    return size;
  }, []);

  useEffect(() => {
    measureImage();
  }, [measureImage, imgSrc]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !natural) return;
    const measure = () => setScale(wrap.clientWidth / natural.width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [natural]);

  const selected = boxes.find((b) => b.id === selectedId) ?? null;

  const patch = (id: number, changes: BoxPatch) =>
    setBoxes((all) =>
      all.map((b) => (b.id === id ? ({ ...b, ...changes } as EditorBox) : b))
    );

  // `changes` is for a value set in the same handler: `boxes` here is still this render's copy.
  const persist = (id: number, image?: File, changes?: BoxPatch) => {
    const found = boxes.find((b) => b.id === id);
    if (!found) return;
    const box = { ...found, ...changes } as EditorBox;
    startTransition(async () => {
      let upload: string | undefined;
      if (image) {
        const uploaded = await uploadFile(image, "image_box");
        if ("error" in uploaded) {
          toast.error(uploaded.error);
          return;
        }
        upload = uploaded.upload;
      }
      const result =
        box.kind === "image"
          ? await saveImageBox(templateUuid, toImageDraft(box), upload)
          : await saveBox(templateUuid, toDraft(box));
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      patch(id, {
        uuid: result.box.uuid,
        ...("imageUrl" in result ? { imageUrl: result.imageUrl } : {}),
      });
    });
  };

  const onPointerDown = (
    e: React.PointerEvent,
    box: EditorBox,
    handle?: Handle
  ) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setSelectedId(box.id);
    setDragging(true);
    // Where in the box it was grabbed decides which of its lines snaps: near the top, the top edge.
    const grab = (e.currentTarget as HTMLElement).getBoundingClientRect();
    gesture.current = {
      id: box.id,
      handle,
      anchor: {
        x: anchorAt((e.clientX - grab.left) / grab.width),
        y: anchorAt((e.clientY - grab.top) / grab.height),
      },
      pointerX: e.clientX,
      pointerY: e.clientY,
      rect: { x: box.x, y: box.y, width: box.width, height: box.height },
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || !natural || !scale) return;
    const dx = (e.clientX - g.pointerX) / scale;
    const dy = (e.clientY - g.pointerY) / scale;
    const raw = g.handle
      ? resizeBox(g.rect, g.handle, dx, dy, natural)
      : moveBox(g.rect, dx, dy, natural);
    // Alt places freely; otherwise the nearest guide within reach takes the box.
    const snapped = e.altKey
      ? { rect: raw, lines: {} }
      : g.handle
        ? snapResize(raw, g.handle, natural, SNAP_PX / scale)
        : snapMove(raw, natural, SNAP_PX / scale, g.anchor);
    patch(g.id, snapped.rect);
    setGuides(snapped.lines);
  };

  /** On steps 02-05 the canvas is a way back into the editor, landing on the box that was clicked. */
  const openEditor = (e: React.MouseEvent) => {
    const wrap = wrapRef.current;
    if (wrap && scale) {
      const bounds = wrap.getBoundingClientRect();
      const px = (e.clientX - bounds.left) / scale;
      const py = (e.clientY - bounds.top) / scale;
      // Last drawn is on top.
      const hit = [...boxes]
        .reverse()
        .find((b) => px >= b.x && px <= b.x + b.width && py >= b.y && py <= b.y + b.height);
      if (hit) setSelectedId(hit.id);
    }
    router.push(editHref, { scroll: false });
  };

  const endGesture = () => {
    const g = gesture.current;
    gesture.current = null;
    setGuides({});
    setDragging(false);
    if (g) persist(g.id);
  };

  const onKeyDown = (e: React.KeyboardEvent, box: EditorBox) => {
    const step = e.shiftKey ? 10 : 1;
    const nudge: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const delta = nudge[e.key];
    if (!delta || !natural) return;
    e.preventDefault();
    const moved = moveBox(box, delta[0], delta[1], natural);
    patch(box.id, moved);
    persist(box.id, undefined, moved); // `boxes` is still this render's copy
  };

  const defaultRect = (type: BoxTypeEnum = "text"): Rect | null => {
    const image = natural ?? measureImage();
    if (!image) {
      toast.error("The template image hasn't loaded yet. Try again in a moment.");
      return null;
    }
    // QR codes start in the bottom-right corner, each new one to the left of the last.
    if (isQr(type)) {
      const side = Math.max(48, Math.round(Math.min(image.width, image.height) * 0.2));
      const margin = Math.round(Math.min(image.width, image.height) * 0.05);
      const slot = boxes.filter((b) => b.kind === "text" && isQr(b.type)).length % 3;
      return {
        x: Math.max(0, image.width - margin - side - slot * (side + margin)),
        y: Math.max(0, image.height - margin - side),
        width: side,
        height: side,
      };
    }
    const width = Math.max(16, Math.round(image.width * 0.4));
    const height = Math.max(16, Math.round(image.height * 0.08));
    // The code sits along the bottom edge, where certificate IDs usually go.
    if (type === "verify_code") {
      return {
        x: Math.round((image.width - width) / 2),
        y: Math.round(image.height * 0.9 - height),
        width,
        height,
      };
    }
    const offset = (boxes.length % 6) * Math.round(height * 0.6);
    return {
      x: Math.round((image.width - width) / 2),
      y: Math.min(Math.round(image.height * 0.35) + offset, image.height - height),
      width,
      height,
    };
  };

  const addBox = (type: BoxTypeEnum = "text") => {
    const rect = defaultRect(type);
    if (!rect) return;
    const id = nextId.current++;
    const box: EditorBox = {
      id,
      kind: "text",
      key: nextKey(boxes, TYPE_KEY[type]),
      ...rect,
      ...BOX_DEFAULTS,
      type,
    };
    setBoxes((all) => [...all, box]);
    setSelectedId(id);
    startTransition(async () => {
      const result = await saveBox(templateUuid, toDraft(box));
      if ("error" in result) {
        toast.error(result.error);
        setBoxes((all) => all.filter((b) => b.id !== id));
        setSelectedId(null);
        return;
      }
      patch(id, { uuid: result.box.uuid });
    });
  };

  const addImageBox = (image: File) => {
    const rect = defaultRect();
    if (!rect) return;
    const id = nextId.current++;
    const box: EditorBox = {
      id,
      kind: "image",
      key: nextKey(boxes, "image"),
      ...rect,
      imageUrl: URL.createObjectURL(image),
    };
    setBoxes((all) => [...all, box]);
    setSelectedId(id);
    startTransition(async () => {
      const rollback = (message: string) => {
        toast.error(message);
        setBoxes((all) => all.filter((b) => b.id !== id));
        setSelectedId(null);
      };
      const uploaded = await uploadFile(image, "image_box");
      if ("error" in uploaded) return rollback(uploaded.error);

      const result = await saveImageBox(
        templateUuid,
        toImageDraft(box),
        uploaded.upload
      );
      if ("error" in result) {
        rollback(result.error);
        return;
      }
      patch(id, { uuid: result.box.uuid, imageUrl: result.imageUrl });
    });
  };

  const removeBox = (box: EditorBox) => {
    setBoxes((all) => all.filter((b) => b.id !== box.id));
    setSelectedId(null);
    if (!box.uuid) return;
    const uuid = box.uuid;
    startTransition(async () => {
      const result =
        box.kind === "image"
          ? await deleteImageBox(templateUuid, uuid)
          : await deleteBox(templateUuid, uuid);
      if (result) {
        toast.error(result.error);
        setBoxes((all) => [...all, box].sort((a, b) => a.id - b.id));
      }
    });
  };

  return (
    <div className="grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="flex min-h-0 flex-col border-b-2 border-border p-6 md:p-8 lg:border-r-2 lg:border-b-0">
        <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-4">
          <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
            {name}
          </h2>
          <p className="text-[0.6875rem] font-bold tracking-widest text-muted-foreground uppercase">
            {boxes.length} {boxes.length === 1 ? "box" : "boxes"}
            {natural ? ` · ${natural.width}×${natural.height} px` : null}
          </p>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-auto border-2 border-border bg-muted/40 p-4">
          <div
            ref={wrapRef}
            // Stacked layouts cap the artwork at 40% of the viewport height so the
            // steps stay in reach on a portrait tablet; scale follows the width.
            className="relative mx-auto w-full touch-none select-none max-lg:max-w-[calc(40dvh*var(--ar))]"
            style={
              natural
                ? ({ "--ar": natural.width / natural.height } as CSSProperties)
                : undefined
            }
            onPointerMove={onPointerMove}
            onPointerUp={endGesture}
            onPointerCancel={endGesture}
          >
            <img
              ref={imgRef}
              src={imgSrc}
              alt={`Template ${name}`}
              className="block h-auto w-full"
              onLoad={() => measureImage()}
              onError={reloadStaleImage}
            />

            {natural && scale
              ? boxes.map((box) => {
                  const active = editing && box.id === selectedId;
                  return (
                    <button
                      key={box.id}
                      type="button"
                      disabled={!editing}
                      aria-label={`Box ${box.key}`}
                      aria-current={active || undefined}
                      onPointerDown={(e) => onPointerDown(e, box)}
                      onFocus={() => setSelectedId(box.id)}
                      onKeyDown={(e) => onKeyDown(e, box)}
                      style={{
                        left: `${(box.x / natural.width) * 100}%`,
                        top: `${(box.y / natural.height) * 100}%`,
                        width: `${(box.width / natural.width) * 100}%`,
                        height: `${(box.height / natural.height) * 100}%`,
                        ...(box.kind === "text" && !active
                          ? { borderColor: `${box.font_color}${OUTLINE_ALPHA}` }
                          : {}),
                      }}
                      className={cn(
                        "absolute flex items-center border-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                        editing ? "cursor-move" : "cursor-default",
                        // The artwork stays light or dark whatever the app theme, so these colours are fixed.
                        active
                          ? "border-accent bg-accent/10"
                          : "border-dashed border-neutral-900/40 bg-neutral-900/[0.03]",
                        editing && !active ? "hover:border-neutral-900/70" : null
                      )}
                    >
                      {box.kind === "image" ? (
                        box.imageUrl ? (
                          <img
                            src={box.imageUrl}
                            alt=""
                            className="pointer-events-none h-full w-full object-contain"
                            onError={reloadStaleImage}
                          />
                        ) : (
                          <ImageIcon
                            className="m-auto size-5 text-muted-foreground"
                            aria-hidden="true"
                          />
                        )
                      ) : isQr(box.type) ? (
                        <QrCode
                          className="pointer-events-none h-full w-full p-[6%]"
                          style={{ color: box.font_color }}
                          aria-hidden="true"
                        />
                      ) : (
                        <span
                          className="w-full truncate px-1"
                          style={{
                            fontSize: `${box.font_size * scale}px`,
                            fontFamily: FONT_STACK[box.font],
                            fontWeight: box.font === "sans-bold" ? 700 : 400,
                            color: box.font_color,
                            textAlign: box.alignment,
                          }}
                        >
                          {/* A sample code, so its size reads true; text boxes show their key. */}
                          {box.type === "verify_code" ? "XXXX-XXXX-XXXX" : box.key}
                        </span>
                      )}

                      {active
                        ? HANDLES.map((handle) => (
                            <span
                              key={handle}
                              aria-hidden="true"
                              onPointerDown={(e) => onPointerDown(e, box, handle)}
                              className={cn(HANDLE_BASE, HANDLE_POSITION[handle])}
                            />
                          ))
                        : null}
                      {active && dragging ? (
                        <span className={cn(CHIP, "top-full left-1/2 mt-2.5 -translate-x-1/2")}>
                          {box.x}, {box.y} · {box.width} × {box.height}
                        </span>
                      ) : null}
                    </button>
                  );
                })
              : null}

            {/* Only the guide the box is snapping to is drawn, labelled beside the box with its division. */}
            {natural && selected && guides.x !== undefined ? (
              <>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2"
                  style={{
                    left: `${(guides.x / natural.width) * 100}%`,
                    background: `repeating-linear-gradient(to bottom, ${GUIDE} 0 6px, transparent 6px 10px)`,
                  }}
                />
                <span
                  aria-hidden="true"
                  className={cn(GUIDE_CHIP, "-mt-2 ml-3 -translate-y-full")}
                  style={{
                    left: `${(guides.x / natural.width) * 100}%`,
                    top: `${(selected.y / natural.height) * 100}%`,
                  }}
                >
                  {guideLabel(guides.x, natural.width)}
                </span>
              </>
            ) : null}
            {natural && selected && guides.y !== undefined ? (
              <>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 h-px -translate-y-1/2"
                  style={{
                    top: `${(guides.y / natural.height) * 100}%`,
                    background: `repeating-linear-gradient(to right, ${GUIDE} 0 6px, transparent 6px 10px)`,
                  }}
                />
                <span
                  aria-hidden="true"
                  className={cn(GUIDE_CHIP, "ml-3 -translate-y-1/2")}
                  style={{
                    top: `${(guides.y / natural.height) * 100}%`,
                    left: `${((selected.x + selected.width) / natural.width) * 100}%`,
                  }}
                >
                  {guideLabel(guides.y, natural.height)}
                </span>
              </>
            ) : null}

            {!editing ? (
              <button
                type="button"
                aria-label="Edit boxes"
                onClick={openEditor}
                className="group/edit absolute inset-0 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
              >
                <span className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 bg-foreground px-2.5 py-1.5 text-[0.6875rem] font-bold tracking-widest whitespace-nowrap text-background uppercase opacity-0 transition-opacity group-hover/edit:opacity-100 group-focus-visible/edit:opacity-100">
                  Click to edit boxes
                </span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-col">
        {tabs}

        <div className="relative min-h-0 flex-1 space-y-8 p-6 md:p-8 lg:overflow-y-auto">
          {editing ? (
            <section className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-xs font-bold tracking-widest text-muted-foreground uppercase">
                  Boxes
                  {pending ? (
                    <>
                      <Loader size="12px" />
                      <span>Saving…</span>
                    </>
                  ) : null}
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => addBox()}>
                    <Plus className="size-4" aria-hidden="true" />
                    Add box
                  </Button>
                  <Button asChild size="sm">
                    <label className="cursor-pointer">
                      <ImageIcon className="size-4" aria-hidden="true" />
                      Add image
                      <input
                        type="file"
                        accept={IMAGE_TYPES}
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) addImageBox(file);
                        }}
                      />
                    </label>
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className={LABEL}>QR and verification (optional)</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => addBox("qr")}>
                    <QrCode className="size-4" aria-hidden="true" />
                    QR from CSV
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => addBox("verify_qr")}>
                    <ShieldCheck className="size-4" aria-hidden="true" />
                    Verify QR
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => addBox("verify_code")}>
                    <ShieldCheck className="size-4" aria-hidden="true" />
                    Verify code
                  </Button>
                </div>
              </div>

              {boxes.length ? (
                <ul className="grid gap-px bg-border">
                  {boxes.map((box) => (
                    <li key={box.id} className="bg-background">
                      <button
                        type="button"
                        onClick={() => setSelectedId(box.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm font-bold tracking-tight transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
                          box.id === selectedId
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-muted"
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {box.kind === "image" ? (
                            <span className={TAG}>IMG</span>
                          ) : TYPE_TAG[box.type] ? (
                            <span className={TAG}>{TYPE_TAG[box.type]}</span>
                          ) : null}
                          <span className="truncate">{box.key}</span>
                        </span>
                        <span className="shrink-0 font-mono text-[0.6875rem] opacity-70">
                          {box.x},{box.y}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {selected ? (
                <div className="border-2 border-border p-4">
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="text-xs font-bold tracking-widest uppercase">
                      {selected.key}
                    </h4>
                    <ConfirmPopover
                      label="Delete box"
                      iconOnly
                      icon={<Trash2 aria-hidden="true" />}
                      align="end"
                      title={`Delete the ${selected.key} box?`}
                      description="It stops printing on certificates generated from now on."
                      confirmLabel="Delete"
                      onConfirm={() => removeBox(selected)}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <label className="col-span-2">
                      <span className={LABEL}>Key: the name it&apos;s mapped by</span>
                      <input
                        type="text"
                        value={selected.key}
                        maxLength={100}
                        pattern="[-a-zA-Z0-9_]+"
                        onChange={(e) => patch(selected.id, { key: e.target.value })}
                        onBlur={() => persist(selected.id)}
                        className={FIELD}
                      />
                    </label>

                    {(["x", "y", "width", "height"] as const).map((field) => (
                      <label key={field}>
                        <span className={LABEL}>{field}</span>
                        <input
                          type="number"
                          min={field === "width" || field === "height" ? 1 : 0}
                          max={
                            natural
                              ? field === "x" || field === "width"
                                ? natural.width
                                : natural.height
                              : undefined
                          }
                          value={selected[field]}
                          onChange={(e) =>
                            patch(selected.id, {
                              [field]: Math.max(
                                0,
                                Math.round(Number(e.target.value) || 0)
                              ),
                            })
                          }
                          onBlur={() => persist(selected.id)}
                          className={FIELD}
                        />
                      </label>
                    ))}

                    {selected.kind === "image" ? (
                      <div className="col-span-2">
                        <span className={LABEL}>Image</span>
                        <div className="mt-1 flex items-center gap-3">
                          <span className="flex size-16 shrink-0 items-center justify-center border-2 border-border bg-muted/40">
                            {selected.imageUrl ? (
                              <img
                                src={selected.imageUrl}
                                alt=""
                                className="h-full w-full object-contain"
                                onError={reloadStaleImage}
                              />
                            ) : (
                              <ImageIcon
                                className="size-5 text-muted-foreground"
                                aria-hidden="true"
                              />
                            )}
                          </span>
                          <Button asChild size="sm" variant="outline">
                            <label className="cursor-pointer">
                              Replace image
                              <input
                                type="file"
                                accept={IMAGE_TYPES}
                                className="sr-only"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  e.target.value = "";
                                  if (file) persist(selected.id, file);
                                }}
                              />
                            </label>
                          </Button>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          The same image prints on every certificate. It isn&apos;t
                          mapped to a CSV column.
                        </p>
                      </div>
                    ) : isQr(selected.type) ? (
                      <>
                        <label>
                          <span className={LABEL}>Colour</span>
                          <input
                            type="color"
                            value={selected.font_color}
                            onChange={(e) =>
                              patch(selected.id, { font_color: e.target.value })
                            }
                            onBlur={() => persist(selected.id)}
                            className={cn(FIELD, "cursor-pointer p-1")}
                          />
                        </label>
                        <p className={NOTE}>
                          {selected.type === "verify_qr"
                            ? "Opens the public verify page for each certificate. Filled in automatically, no CSV column needed."
                            : "Encodes the text of the CSV column you map it to, like a text box."}{" "}
                          The QR prints on a transparent background in a dark colour: keep it
                          on a plain, light area of the artwork so phones can scan it.
                        </p>
                      </>
                    ) : (
                      <>
                    <label>
                      <span className={LABEL}>Font</span>
                      <SelectField
                        value={selected.font}
                        onValueChange={(value) => {
                          const font = value as FontEnum;
                          patch(selected.id, { font });
                          persist(selected.id, undefined, { font });
                        }}
                        className={SELECT}
                        options={FONTS.map((font) => ({ value: font, label: font }))}
                      />
                    </label>

                    <label>
                      <span className={LABEL}>Size</span>
                      <input
                        type="number"
                        min={1}
                        value={selected.font_size}
                        onChange={(e) =>
                          patch(selected.id, {
                            font_size: Math.max(
                              1,
                              Math.round(Number(e.target.value) || 1)
                            ),
                          })
                        }
                        onBlur={() => persist(selected.id)}
                        className={FIELD}
                      />
                    </label>

                    <label>
                      <span className={LABEL}>Colour</span>
                      <input
                        type="color"
                        value={selected.font_color}
                        onChange={(e) =>
                          patch(selected.id, { font_color: e.target.value })
                        }
                        onBlur={() => persist(selected.id)}
                        className={cn(FIELD, "cursor-pointer p-1")}
                      />
                    </label>

                    <label>
                      <span className={LABEL}>Align</span>
                      <SelectField
                        value={selected.alignment}
                        onValueChange={(value) => {
                          const alignment = value as Alignment;
                          patch(selected.id, { alignment });
                          persist(selected.id, undefined, { alignment });
                        }}
                        className={SELECT}
                        options={ALIGNMENTS.map((alignment) => ({
                          value: alignment,
                          label: alignment[0].toUpperCase() + alignment.slice(1),
                        }))}
                      />
                    </label>
                    {selected.type === "verify_code" ? (
                      <p className={NOTE}>
                        Prints each certificate&apos;s verification code, for example
                        7KQ2-M9XD-4TFA. Put a label such as &ldquo;Certificate ID&rdquo; in
                        your artwork next to it. Anyone can check the code on the public
                        verify page.
                      </p>
                    ) : null}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <p className="border-2 border-dashed border-border p-4 text-sm text-muted-foreground">
                  {boxes.length
                    ? "Pick a box to change its key, font or exact position. Drag to move, corners to resize, arrow keys to nudge."
                    : "No boxes yet. Add a box for a value from your CSV, an image that prints on every certificate, or a QR or verification code, then drag it into place."}
                </p>
              )}
            </section>
          ) : null}

          {children}
        </div>
      </div>
    </div>
  );
}
