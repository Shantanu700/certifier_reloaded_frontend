import { ExternalLink, FileText, ImageOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FileObject } from "@/src/client";
import { client } from "@/src/client/client.gen";

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"];

export function templateFileUrl(file?: FileObject) {
  if (!file?.url) return undefined;
  if (/^https?:\/\//.test(file.url)) return file.url;
  const base = client.getConfig().baseUrl ?? "";
  return `${base}${file.url.startsWith("/") ? "" : "/"}${file.url}`;
}

export function isImageFile(file?: FileObject) {
  if (!file?.url) return false;
  const path = file.url.toLowerCase().split("?")[0];
  return IMAGE_EXTENSIONS.some((ext) => path.endsWith(ext));
}

const CHIP_CLASS =
  "inline-flex items-center gap-2 border-2 border-border px-3 py-1.5 text-[0.6875rem] font-bold tracking-widest text-muted-foreground uppercase";

export function TemplatePreview({
  file,
  name,
  embed = false,
  className,
}: {
  file?: FileObject;
  name: string;
  embed?: boolean;
  className?: string;
}) {
  const frame = cn(
    "flex items-center justify-center overflow-hidden border-2 border-border bg-muted",
    className
  );

  if (!file?.url) {
    return (
      <div className={frame}>
        <span className={CHIP_CLASS}>
          <ImageOff className="size-3.5" aria-hidden="true" />
          No file
        </span>
      </div>
    );
  }

  const src = templateFileUrl(file)!;
  const isImage = IMAGE_EXTENSIONS.some((ext) =>
    file.url.toLowerCase().split("?")[0].endsWith(ext)
  );

  if (isImage) {
    return (
      <div className={frame}>
        <img
          src={src}
          alt={`Preview of ${name}`}
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  if (embed) {
    return (
      <object data={src} type="application/pdf" className={cn(frame, "block")}>
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
          <span className={CHIP_CLASS}>
            <FileText className="size-3.5" aria-hidden="true" />
            PDF
          </span>
          <Button asChild variant="outline" size="sm" className="border-2">
            <a href={src} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden="true" />
              Open in a new tab
            </a>
          </Button>
        </div>
      </object>
    );
  }

  return (
    <div className={frame}>
      <span className={CHIP_CLASS}>
        <FileText className="size-3.5" aria-hidden="true" />
        PDF
      </span>
    </div>
  );
}
