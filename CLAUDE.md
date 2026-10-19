# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

Package manager is **bun** (`bun.lock`; `package-lock.json` is stale from scaffolding).

```bash
bun dev          # dev server (also regenerates AGENTS.md — see below)
bun run build
bun run lint     # bare `eslint` — Next 16 removed `next lint`
bunx shadcn@latest add <component>   # add UI primitives
```

No test runner is installed. Don't invent one — ask before adding.

## State

Demo-stage app. Routes: `/` → `/home`, plus `/login`, `/templates` and
`/templates/[uuid]`. That last one is the whole pipeline: the certificate is
pinned in the left pane at all times, and the right rail is a four-step wizard
(`?step=boxes|csv|mapping|generate`, `?batch=<uuid>` picking the run). Steps are
search params, not client state, so every panel stays a server component and a
half-finished run is a shareable URL — but that also means a tab click is a full
navigation that re-runs the page and *all* its fetches. They're already in one
`Promise.all`, so it costs one round trip of latency, not four; don't try to
cache it away.

Protected pages start with `requireUser()` (`lib/session.ts`), which
re-validates the session against the API and bounces to `/login` if it's gone —
don't re-inline that check. The one exception is `/templates/[uuid]`, which
skips it: its four data calls carry the session themselves, so a dead session
already surfaces as a **403** (DRF's answer for unauthenticated, not 401) and
`requireUser()` would only add a fifth Django hit to every step navigation.
Don't add it back there.

Auth is real, against the Django backend at `NEXT_PUBLIC_API_URL` (default `https://localhost:8022`; `lib/api-config.ts` is the generated client's `runtimeConfigPath`). `/core/login/`:

- `POST` takes `Authorization: Basic base64(username:password)` — no body — and
  answers `201` + a `sessionid` Set-Cookie. `app/actions.ts` lifts that value out
  and re-sets it on our own origin (httpOnly). Bad credentials come back as an
  **undocumented `400 {msg}`**, not the `409`/`418` the schema advertises.
- `GET` returns the current user, `DELETE` logs out. Both need the session
  forwarded explicitly via `sessionHeader()` (`lib/session.ts`) — Node has no
  cookie jar.

`/certificate-template/` is per-user template CRUD, wired up in `/templates`:

- `POST` and `PUT /{uuid}/` are **plain JSON** — `body: { name, upload }`, where
  `upload` is an uuid from the 3-step upload flow below. They never see a `File`.
  There is no `PATCH`, so `PUT` always resends `name`.
- Every list endpoint now returns DRF's **`Paginated…` envelope**
  (`count`/`next`/`previous`/`results`) — boxes and image boxes included, since the
  upstream `many=True` was fixed. `asList()` (`lib/api.ts`) still swallows both
  shapes, so it stays as the cheap defence. An *empty* list can arrive as `{}`,
  which `asList` reads as one blank row — callers filter on a required field
  (`box.key`, `batch.uuid`).
- The paginated endpoints declare **no query parameters**, so the generated `query`
  is `never` and passing one needs `as never` at the call site. Param names are
  PageNumberPagination's defaults (`page`, `page_size`) — inferred from the
  envelope, not from the schema. Only the certificates list has paging controls;
  `/templates` and the batch list still silently show page one.
- `status` is an untyped integer with no documented meaning, so it gets no UI.

**Files never touch the API.** Every upload — templates, image-box art, CSV batches —
is a 3-step dance, and `uploadFile()` (`lib/upload-client.ts`) is the only
implementation of it. Don't write a second one:

1. `POST /core/upload-url/` `{ filename, content_type, category }` →
   `{ upload_uuid, url, headers, expires_in }`. This goes through the
   `presignUpload` server action, because the `sessionid` cookie is httpOnly on our
   origin and the browser can't authenticate to Django directly.
2. The **browser** `PUT`s the raw `File` as the body straight to S3, sending the
   returned `headers` verbatim. **No `FormData`, no multipart** — this is a
   presigned *URL*, not a POST policy. The signature is computed over those headers,
   so adding or dropping one gets the request rejected. No `credentials` — the
   signature in the URL is the authorization. Success is `200` with an empty body;
   `res.ok` is the check, don't assert an exact status.
3. Confirm against the real endpoint with `body: { upload: upload_uuid }`.

- `content_type` is derived from the **category**, not `File.type` — the browser
  reports `.csv` as `application/vnd.ms-excel` on Windows and `""` often enough,
  and the backend validates the *declared* type at presign.
- `uploadFile` returns `{ upload } | { error }` rather than throwing, because
  callers sit next to server actions that `redirect()` — and `redirect` works by
  throwing, so a `try/catch` around the upload would swallow the navigation.
- Size is checked **only** client-side now (`MAX_UPLOAD_BYTES`); the server never
  sees the bytes, and a presigned PUT URL can't cap length the way a POST policy's
  `content-length-range` could. Real enforcement is backend work (check the object
  on confirm) — don't fake it here.
- A failed confirm orphans the S3 object. Nothing caches the uuid, so a retry
  re-runs all three steps; the backend sweeps the strays. Don't "optimise" this by
  uploading on file-pick and stashing the uuid in a hidden field.
- The bucket needs **CORS** for our origin allowing `PUT` + `GET`, **and the
  `Content-Type` request header**. Neither `PUT` nor a real `Content-Type` value is
  CORS-safelisted, so every upload is preceded by an `OPTIONS` preflight — the bucket
  has to answer that too. Without it step 2 fails as an opaque browser CORS error,
  not a readable API error.
- Rendered `{url, uuid}` file URLs are **freshly presigned per request and expire in
  an hour** — never persist one. `templateFileUrl()` passes absolute URLs through and
  `isImageFile()` strips the query before sniffing, so both already cope. The editor
  reloads on a stale-image `onError` (`router.refresh()` wouldn't work — `boxes` is
  seeded by a `useState` initializer that never re-runs). Cloudinary-backed generated
  certificates are still stable links.

`/certificate-template/{uuid}/boxes/` is where text lands on the artwork
(`components/template-workspace.tsx` — drag/resize on plain pointer events, no DnD
library). The canvas and the box inspector share drag state, so that one client
component owns both columns; the CSV/mapping/generate panels
(`components/batch-panels.tsx`) are server-rendered and passed in as children:

- `x/y/width/height` are **integers in the image's native pixels**, top-left origin.
  The editor measures the rendered `<img>` and converts; that's why it uses its own
  wrapper instead of `TemplatePreview`'s `object-contain` frame, which letterboxes.
- **No rotation field exists.** Don't ship a rotate handle until the backend has one.
- Placement needs an image — a PDF template can't be measured or overlaid, so the
  detail page falls back to the plain preview (`isImageFile()` in
  `components/template-preview.tsx`).
- `font` is a closed **3-value enum** (`sans-regular|sans-bold|serif-regular`).
  There is no fonts endpoint. `key` must match `^[-a-zA-Z0-9_]+$`.
- `PUT` isn't partial here either — `saveBox()` always sends the whole box, and it
  fires once per gesture (on pointer-up), never per frame.

Batches are the CSV side, `/certificate-template/{uuid}/batches/` then
`/certificate-batches/{uuid}/`:

- Upload is `body: { upload }` (see the upload flow below); the backend parses the
  header row into `csv_columns`. Both it and `mapping` are untyped in the schema —
  see `asStrings()` / `asMapping()` in `lib/api.ts`. A bad-columns rejection now
  arrives *after* the file is already in S3, but it's still just a 409 on this call.
- `mapping` is stored as **`{ boxKey: csvColumn }`**, the same way the form is
  keyed, so nothing is inverted on either side. Note the schema description says
  the opposite ("CSV column -> template box") — it's wrong. One column can feed
  several boxes.
- `naming/` (PUT only) sets the output **filename pattern**: an ordered
  `NamingPart[]`, each one of `csv_key`/`fixed`/`sequence`/`random`. Sending `null`
  clears it. There's no GET — read it back off `batch.naming_convention`, which is
  `unknown` like `mapping`. `asNamingParts()` (`lib/api.ts`) is the *only* validator;
  it runs on both the read and inside `saveNaming` on what the browser posts, so don't
  add a second one. Separators are just `fixed` parts.
  `components/naming-editor.tsx` is the editor — the wizard's one client-state form,
  because an ordered heterogeneous list doesn't fit the flat `map:<key>` FormData
  convention. It drags with native HTML5 drag events (no DnD library, same as the box
  editor) and keeps ↑/↓ buttons because native drag is mouse-only.
- `generate/` takes **no body** and enqueues. There's no socket or SSE, so
  `components/batch-progress.tsx` polls `/certificate-batches/{uuid}/progress/`
  every 5s while `generation_status` is `queued`/`processing` — three integers, not
  the whole batch. It runs through the `batchProgress` server action because the
  `sessionid` cookie is httpOnly on *our* origin, so the browser can't call the API
  directly. One `router.refresh()` fires when the status settles, to pull in the
  certificate list; polling stops at the same moment. Don't put a page-level timer
  back — this is the only thing that should be on an interval.
- `export/` zips the batch and has its own `export/progress/`, polled the same way by
  `ExportProgress` (`components/batch-progress.tsx`) off `export_status`.

The API client is generated: `bun run openapi-ts` → `src/client/`. Don't hand-edit
it. Note the barrel doesn't re-export the `client` instance — for `baseUrl` import
from `@/src/client/client.gen`. The dev cert is self-signed, so both `dev` and `openapi-ts` run with
`NODE_TLS_REJECT_UNAUTHORIZED=0` — drop that the moment the cert is trusted, and
never carry it into `build`/`start`.

**Toasts** (`sonner` via `components/ui/sonner.tsx`, mounted once in `app/layout.tsx`):

- Server actions that end in `redirect()` report outcomes with `flash()`/`fail()`
  in `app/actions.ts`: a one-shot `flash` cookie (`lib/flash.ts`). Setting a cookie
  in a server action re-renders the layouts, so the root layout reads it and
  `<FlashToaster>` shows it once and clears it. Don't go back to `?error=` /
  `?notice=` params, and call `fail()` as `return fail(...)` so TypeScript narrows.
- Client components that get a result back call `toast.*` from `sonner` directly
  (box saves in the editor, generation/export finishing in `batch-progress.tsx`).
- Sign-in and sign-up toast their errors (the fields keep a red underline via
  `aria-invalid`) and land on /home with a welcome toast. Other form validation
  stays inline next to the field (template form, CSV pick), and so do page-load
  failures. Toasts are for one-off outcomes.
- Styling is token-only, so it follows `.dark` without `next-themes`. Success is an
  accent fill, info an inverted fill, warning a destructive outline, error a
  destructive fill. The accent is never a text colour.

**Motion** (CSS only, no motion library; tokens and classes in `app/globals.css`):

- `ease-out` / `ease-in-out` are overridden in `@theme` with the strong curves, so
  every Tailwind easing utility already uses them. Don't add a parallel scale.
- Press feedback lives in `Button` (`active:scale-[0.97]`, 150ms). Don't add
  per-button `hover:scale` / `active:scale`.
- Loading is the stepping-squares `.loader` via `components/loader.tsx`, in
  currentColor, sized in multiples of 6px (12 / 18 / 60). `app/loading.tsx` and
  `app/templates/loading.tsx` cover new-page navigations; Next does *not* show them
  for search-param changes, so step tabs (`StepLink`) and submit buttons
  (`SubmitButton`) carry their own inline loader.
- Deliberately not animated: route/step transitions (tens a day), box drag and
  resize (direct manipulation), keyboard nudges, the template grid. The login
  poster is the one staggered entrance. Everything has a reduced-motion variant.

## Design system

The visual language is **Kinetic Typography** (spec in `theme.md`), applied through
`app/globals.css` tokens — don't hand-roll one-off colors:

- Acid yellow `#dfe104` is the only accent, and it's mapped to `--primary`, so the
  default `Button` is already the yellow one. Same yellow in both modes.
- **Never use the accent as text color** — it fails contrast on the light
  background. Use it as a fill (`bg-accent text-accent-foreground`).
- `--radius: 0`, no shadows anywhere. Depth comes from oversized `text-muted`
  background numbers and 2px borders.
- Uppercase + `tracking-tighter` on display text, `tracking-widest` on small
  labels. Hero headings use `text-[clamp(3rem,12vw,…)]`.
- Hairline grids are `grid gap-px bg-border` with `bg-background` children. `gap-px`
  only rules *between* cells, so outer edges need their own border.
- There is no marquee. It was removed from `/home` and `/login`; don't reintroduce
  scrolling text. Anything informational must exist in static markup, and metrics
  must not be invented — see PRODUCT.md's evidence rules.

Theme mode is a `.dark` class on `<html>`, set pre-paint by the inline script in
`app/layout.tsx` and flipped by `components/theme-toggle.tsx`.

## Architecture notes

- **Next 16 App Router, RSC by default.** Layout/page props use the generated
  global types (`LayoutProps<"/">`, `PageProps<"/route">`) rather than hand-written
  interfaces — these come from `.next/types`, so a build/dev run must have happened
  for typechecking to pass.
- **Tailwind v4, CSS-first.** No `tailwind.config.*`. Theme lives in
  `app/globals.css` via `@theme inline` + CSS variables; shadcn tokens come from
  `@import "shadcn/tailwind.css"`.
- **shadcn style is `radix-sera` / baseColor `taupe`** (`components.json`), not the
  default. Components are square (`rounded-none`), uppercase, tracked-out — match
  that when writing new UI instead of reaching for default shadcn styling.
- **Radix is imported as the unified `radix-ui` package** (`import { Slot } from "radix-ui"`),
  not per-primitive `@radix-ui/react-*`.
- **Fonts**: Space Grotesk drives both `--font-sans` and `--font-heading`; Geist
  Mono drives `--font-mono`. No serifs — they break the design system.
- `@/*` maps to the repo root.

## AGENTS.md

`next dev` rewrites `AGENTS.md` on every run. If it shows up dirty in `git status`,
commit it with your work rather than reverting it.
