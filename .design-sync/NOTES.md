# design-sync notes — certifier_reloaded_frontend

## This repo is an app, not a component library

There is no `dist/`, no library build, no Storybook. Everything the converter needs is
hand-declared under `.design-sync/ds-src/`:

- **`entry.tsx`** — the bundle entry. It is the *only* place the syncable export surface is
  declared. Adding a component means editing **both** `entry.tsx` and `componentSrcMap` in
  `config.json`; editing one alone silently does nothing.
- **`input.css` → `compiled.css`** — `cfg.cssEntry`. `app/globals.css` cannot be used directly:
  it starts with `@import "tailwindcss"` and needs the Tailwind compiler.
  **Recompile before every converter build** (this is `cfg.buildCmd`):
  `bunx @tailwindcss/cli -i .design-sync/ds-src/input.css -o .design-sync/ds-src/compiled.css --minify`
  Skipping it means classes used only in newly-authored previews render unstyled.
- **`fonts.css`** — Space Grotesk + Geist Mono, latin subsets, embedded as base64 data URIs.
  The app gets these from `next/font/google` at runtime; the DS bundle has no such host, so
  they must ship inline. Regenerate with `inline-fonts.mjs` (fetch the Google Fonts CSS to
  `.cache/gf.css` first — the script's header comment has the URL). Do **not** switch to a
  remote `@import`: the design runtime may have no network.

`compiled.css` is committed on purpose so a fresh clone can build without the Tailwind step.

## Why only 5 of 14 components sync

`Modal` and `StepLink` call `useRouter` / `useLinkStatus` and throw outside Next's app-router
context — no `cfg.provider` can supply that without faking a router, which the skill forbids.
`AppHeader`, `BatchPanels`, `BatchProgress`, `ExportProgress`, `CsvUploadForm`, `NamingEditor`,
`TemplateForm`, `TemplatePreview`, `TemplateWorkspace` are server components, server-action
forms, or bound to the generated API client. All are `null` in `componentSrcMap`.
If Next ever ships a testable router stub, `Modal` is the one worth revisiting.

## Tailwind safelist — don't remove it

Tailwind only emits utilities it sees *used*. The design agent builds new screens with tokens
this repo happens not to use, so `input.css` safelists the full semantic colour surface via
`@source inline(...)`. Without it `bg-card`, `text-chart-2` etc. resolve to nothing in the
uploaded CSS. Costs ~12KB.

## Playwright

Local cache is `chromium-1228`, which is pinned by **playwright 1.61.x** — not by latest
(1.62.1 → 1234). Installing latest fails with `Executable doesn't exist`. Install
`playwright@1.61.1` into `.ds-sync/` with `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`.
A bare `npm i --silent playwright` appeared to succeed while installing nothing — always
verify with `node -e "import('playwright')"` before running validate.

## The design project belongs to a specific account — check before syncing

`cfg.projectId` is `98ed3e50-7a3f-430a-b297-cdae497ca93b`, owned by **Shantanu** (the same
account that owns the `Modernist` / `Nocturne` projects and has `EduVerse Design System`
shared to it by Pranjal).

The first sync silently landed under a *different* account: `DesignSync` authenticates
independently of the browser, so the CLI happily created and uploaded a project the browser
session could not open ("no edit permission"). Nothing failed — `get_project` reported
`canEdit: true` the whole time, because it was true *for the CLI's identity*.

**Before the first upload of any session, run `list_projects` and check `ownerDisplayName`
against who you expect.** If `Modernist`/`Nocturne` aren't in the list as `isOwned`, the
session is on the wrong identity — run `/design-login` and re-check before creating anything.
The orphan from the first attempt (`bd7b1826-a4e5-440e-a004-d7e503bce499`) is unreachable
from this account and cannot be deleted via the tool; ignore it.

## Known render warns

None. All 5 components render clean; any warn on a future sync is new.

## Finding for the repo (not a sync issue)

`<Button variant="link">` is `text-primary` — acid yellow text, which `theme.md` itself
forbids ("never use the accent as text color"). It is illegible on `bg-background`.
Documented as do-not-use in `conventions.md`; the real fix is in
`components/ui/button.tsx`.

## Re-sync risks

- **`entry.tsx` drifts silently.** Components added to `components/` never appear in the DS
  until someone edits it. Nothing warns.
- **Preview classes vs. compiled CSS.** Authoring a preview with a utility no source file uses
  requires a Tailwind recompile; the render check catches it only if the result looks blank.
- **Font subsets are pinned to Google Fonts' current URLs.** `gf.css` is gitignored; regenerating
  fonts needs network. The committed `fonts.css` is self-contained, so this only matters if the
  font choice changes.
- **`cn`/`class-variance-authority`/`radix-ui`/`lucide-react` are bundled from `node_modules`.**
  A major bump in any of them changes the bundle without changing any component source.
- Grades were carried forward with 0 cleared on the final capture — re-syncs should stay cheap.
