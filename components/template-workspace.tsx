"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Image as ImageIcon, Plus, Trash2 } from "lucide-react";

import { deleteBox, deleteImageBox, saveBox, saveImageBox } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  ALIGNMENTS,
  BOX_DEFAULTS,
  CORNERS,
  FONTS,
  moveBox,
  nextKey,
  resizeBox,
  type Alignment,
  type BoxDraft,
  type Bounds,
  type Corner,
  type ImageBoxDraft,
  type Rect,
} from "@/lib/boxes";
import { uploadFile } from "@/lib/upload-client";
import { IMAGE_TYPES } from "@/lib/uploads";
import { cn } from "@/lib/utils";
import type { FontEnum, TemplateBox, TemplateImageBox } from "@/src/client";

export type EditorImageBox = TemplateImageBox & { imageUrl?: string };

type EditorBox =
  | (BoxDraft & { id: number; kind: "text" })
  | (ImageBoxDraft & { id: number; kind: "image"; imageUrl?: string });

type BoxPatch = Partial<BoxDraft & { imageUrl?: string }>;

const LABEL =
  "block text-[0.625rem] font-bold tracking-widest text-muted-foreground uppercase";
const FIELD =
  "mt-1 h-10 w-full border-2 border-border bg-transparent px-2 text-sm font-bold tracking-tight outline-none focus:border-accent";

const FONT_STACK: Record<FontEnum, string> = {
  "sans-regular": "var(--font-sans), sans-serif",
  "sans-bold": "var(--font-sans), sans-serif",
  "serif-regular": "serif",
};

const OUTLINE_ALPHA = "30";

const HANDLE_POSITION: Record<Corner, string> = {
  nw: "-top-1.5 -left-1.5 cursor-nwse-resize",
  ne: "-top-1.5 -right-1.5 cursor-nesw-resize",
  sw: "-bottom-1.5 -left-1.5 cursor-nesw-resize",
  se: "-bottom-1.5 -right-1.5 cursor-nwse-resize",
};

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
  tabs,
  children,
}: {
  templateUuid: string;
  src: string;
  name: string;
  boxes: TemplateBox[];
  imageBoxes: EditorImageBox[];
  editing: boolean;
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
  const [error, setError] = useState<string | null>(null);
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
  const gesture = useRef<{
    id: number;
    corner?: Corner;
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

  const persist = (id: number, image?: File) => {
    const box = boxes.find((b) => b.id === id);
    if (!box) return;
    startTransition(async () => {
      let upload: string | undefined;
      if (image) {
        const uploaded = await uploadFile(image, "image_box");
        if ("error" in uploaded) {
          setError(uploaded.error);
          return;
        }
        upload = uploaded.upload;
      }
      const result =
        box.kind === "image"
          ? await saveImageBox(templateUuid, toImageDraft(box), upload)
          : await saveBox(templateUuid, toDraft(box));
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setError(null);
      patch(id, {
        uuid: result.box.uuid,
        ...("imageUrl" in result ? { imageUrl: result.imageUrl } : {}),
      });
    });
  };

  const onPointerDown = (
    e: React.PointerEvent,
    box: EditorBox,
    corner?: Corner
  ) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setSelectedId(box.id);
    gesture.current = {
      id: box.id,
      corner,
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
    patch(
      g.id,
      g.corner
        ? resizeBox(g.rect, g.corner, dx, dy, natural)
        : moveBox(g.rect, dx, dy, natural)
    );
  };

  const endGesture = () => {
    const g = gesture.current;
    gesture.current = null;
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
    patch(box.id, moveBox(box, delta[0], delta[1], natural));
    persist(box.id);
  };

  const defaultRect = (): Rect | null => {
    const image = natural ?? measureImage();
    if (!image) {
      setError("The template image hasn't loaded yet. Try again in a moment.");
      return null;
    }
    const width = Math.max(16, Math.round(image.width * 0.4));
    const height = Math.max(16, Math.round(image.height * 0.08));
    const offset = (boxes.length % 6) * Math.round(height * 0.6);
    return {
      x: Math.round((image.width - width) / 2),
      y: Math.min(Math.round(image.height * 0.35) + offset, image.height - height),
      width,
      height,
    };
  };

  const addBox = () => {
    const rect = defaultRect();
    if (!rect) return;
    const id = nextId.current++;
    const box: EditorBox = {
      id,
      kind: "text",
      key: nextKey(boxes, "field"),
      ...rect,
      ...BOX_DEFAULTS,
    };
    setBoxes((all) => [...all, box]);
    setSelectedId(id);
    startTransition(async () => {
      const result = await saveBox(templateUuid, toDraft(box));
      if ("error" in result) {
        setError(result.error);
        setBoxes((all) => all.filter((b) => b.id !== id));
        setSelectedId(null);
        return;
      }
      setError(null);
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
        setError(message);
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
      setError(null);
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
        setError(result.error);
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
            className="relative mx-auto w-full touch-none select-none"
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
                        "absolute flex items-center overflow-hidden border-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                        editing ? "cursor-move" : "cursor-default",
                        active
                          ? "border-accent bg-accent/20"
                          : "border-dashed border-foreground/50 bg-foreground/5",
                        editing && !active ? "hover:border-foreground" : null
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
                          {box.key}
                        </span>
                      )}

                      {active
                        ? CORNERS.map((corner) => (
                            <span
                              key={corner}
                              aria-hidden="true"
                              onPointerDown={(e) => onPointerDown(e, box, corner)}
                              className={cn(
                                "absolute size-3 border-2 border-accent bg-background",
                                HANDLE_POSITION[corner]
                              )}
                            />
                          ))
                        : null}
                    </button>
                  );
                })
              : null}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-col lg:overflow-y-auto">
        {tabs}

        <div className="space-y-8 p-6 md:p-8">
          {editing ? (
            <section className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                  Boxes{pending ? " · Saving…" : null}
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={addBox}>
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

              {error ? (
                <p role="alert">
                  <span className="inline-block bg-destructive px-3 py-1.5 text-sm font-bold tracking-widest text-background uppercase">
                    {error}
                  </span>
                </p>
              ) : null}

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
                            <span className="shrink-0 border-2 border-current px-1 font-mono text-[0.5625rem] leading-4 tracking-widest opacity-70">
                              IMG
                            </span>
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
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      onClick={() => removeBox(selected)}
                      className="text-destructive"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      Delete
                    </Button>
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
                    ) : (
                      <>
                    <label>
                      <span className={LABEL}>Font</span>
                      <select
                        value={selected.font}
                        onChange={(e) =>
                          patch(selected.id, { font: e.target.value as FontEnum })
                        }
                        onBlur={() => persist(selected.id)}
                        className={FIELD}
                      >
                        {FONTS.map((font) => (
                          <option key={font} value={font}>
                            {font}
                          </option>
                        ))}
                      </select>
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
                      <select
                        value={selected.alignment}
                        onChange={(e) =>
                          patch(selected.id, {
                            alignment: e.target.value as Alignment,
                          })
                        }
                        onBlur={() => persist(selected.id)}
                        className={FIELD}
                      >
                        {ALIGNMENTS.map((alignment) => (
                          <option key={alignment} value={alignment}>
                            {alignment}
                          </option>
                        ))}
                      </select>
                    </label>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <p className="border-2 border-dashed border-border p-4 text-sm text-muted-foreground">
                  {boxes.length
                    ? "Pick a box to change its key, font or exact position. Drag to move, corners to resize, arrow keys to nudge."
                    : "No boxes yet. Add a box for a value from your CSV, or an image that prints on every certificate, then drag it into place."}
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
