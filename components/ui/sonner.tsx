"use client"

import type { CSSProperties } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon } from "lucide-react"

import { Loader } from "@/components/loader"

// The app themes with a `.dark` class (app/layout.tsx), not next-themes, so the
// toasts take every colour from our tokens instead of Sonner's light/dark
// palettes. The tokens already swap with `.dark`, so the theme prop is moot.
const ICON =
  "[&_[data-icon]]:!m-0 [&_[data-icon]]:!flex [&_[data-icon]]:!size-8 [&_[data-icon]]:shrink-0 [&_[data-icon]]:!items-center [&_[data-icon]]:!justify-center"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader size="18px" />,
      }}
      style={
        {
          "--normal-bg": "var(--background)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as CSSProperties
      }
      toastOptions={{
        classNames: {
          // No shadows anywhere in the system: depth is the 2px border.
          toast: `cn-toast !gap-3 !border-2 !shadow-none font-sans ${ICON}`,
          title: "!text-sm !font-bold !tracking-tight",
          description: "!text-sm !text-muted-foreground",
          // The accent is a fill, never a text colour (it fails contrast on light).
          success: "[&_[data-icon]]:bg-accent [&_[data-icon]]:text-accent-foreground",
          info: "[&_[data-icon]]:bg-foreground [&_[data-icon]]:text-background",
          warning: "[&_[data-icon]]:border-2 [&_[data-icon]]:border-destructive [&_[data-icon]]:text-destructive",
          error: "!border-destructive [&_[data-icon]]:bg-destructive [&_[data-icon]]:text-background",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
