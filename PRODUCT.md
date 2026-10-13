# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary and, so far, only confirmed user: **staff at a single organisation who issue
certificates** — administrators, faculty, or event coordinators. They work in this app
as a back-office production tool: produce certificates and get them to recipients.

Recipients and third-party verifiers are **not** confirmed as users of this app. Do not
design recipient-collection or public-verification surfaces until that is established.

## Product Purpose

Give issuing staff a console for producing an organisation's certificates.

What "success" means for the organisation has not been established. Do not assert a
success metric (time saved, volume, error rate) until the user supplies one.

## Positioning

Greenfield. The user explicitly confirmed this replaces nothing — no v1 system, no
manual Word/PDF process, no commercial SaaS being displaced.

Consequently **no differentiating mechanism has been claimed yet**. Future work must not
invent one. No "faster than", no "unlike manual processes", no automation or scale claims
until the user establishes a real position.

## Operating Context

Staff-side issuance. The frontend talks to an existing, running backend that is the
source of truth for data shapes.

Not yet established: the shape of the issuance workflow (single vs. batch, template
authoring, delivery channel, approval steps), and how staff receive the recipient data
they issue against.

## Capabilities and Constraints

- Frontend only. Next.js 16 App Router, React 19, Tailwind v4, shadcn (`radix-sera`
  style, `taupe` base), Bun. See CLAUDE.md for stack conventions.
- **A backend already exists and is running.** Data shapes, auth, and endpoints are its
  to define. The frontend does not invent a schema it has not read.
- Current auth in `app/actions.ts` is a hardcoded demo credential writing an unsigned
  cookie. Placeholder, to be replaced by the real backend's auth.
- The `/login` and `/home` copy — the Issue/Verify/Revoke cards, the stat figures — was
  invented during scaffolding. It is **not** product truth and is not evidence that any
  of those features exist or are in scope.

Explicitly undecided: the organisation's identity, the API base URL and spec location,
roles beyond "issuing staff", and whether recipient or verification surfaces exist at all.

## Brand Commitments

The app carries the branding of **one specific organisation, which is not KIET** and is
not multi-tenant. The user confirmed the branding is binding; the identity itself is
still pending.

- The organisation's name, logo, colours, and any seal have **not** been supplied.
- Do not invent them. Do not default to KIET because the committing account uses
  `kiet.edu` — the user ruled that out directly.
- Until assets arrive, use marks that are obviously placeholders, never a plausible-
  looking institutional identity that could be mistaken for the real one.

## Evidence on Hand

**None.** Recording this so future work does not manufacture it:

- No product docs. README is the unmodified `create-next-app` default.
- No brand assets. `public/` holds only Next.js scaffold SVGs.
- One scaffold commit, no git remote, no issue tracker linked.
- `theme.md` is a visual-style brief (Kinetic Typography), not product evidence.
- The figures on `/home` — 12,481 issued, 99.98% uptime, 37 revoked — are fabricated
  placeholders. They must never be presented as real metrics.

## Product Principles

1. **The backend owns the data.** The frontend reads the contract; it does not guess a
   schema and it does not design around one it hasn't seen.
2. **Staff throughput is the measure.** This is a production tool for people doing a job
   repeatedly, not a showcase. Scanability and consistency beat expression.
3. **Placeholders stay visibly placeholder.** Invented copy, numbers, and marks must read
   as unfinished, so nobody ships them by accident or cites them as fact.
4. **Nothing is asserted about the organisation until it is supplied.** No name, no
   claim, no metric, no seal.
