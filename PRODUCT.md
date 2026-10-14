# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Issuing staff** (confirmed, built for): administrators, faculty or event coordinators
at whichever organisation runs the deployment. They use the app as a back-office
production tool: they set up a certificate design and produce certificates in bulk from
a list of recipients. Staff sign in with a username and password or with Google, and can
register their own accounts. Each staff member's templates belong to them alone.

**Recipients** (confirmed as future users, nothing built): the people the certificates are
issued to. Three planned ways for them to use it:

- receive their certificate by email;
- view and download it from a dedicated page or link;
- public verification: anyone can check that a certificate is genuine (by ID or QR code).

The backend has no endpoints for any of these yet: no email delivery, no recipient
page and no verification lookup. Don't design these screens as if they work until the
backend contract exists. The QR code and ID scheme is undecided.

## Product Purpose

Certifier is an open-source tool that lets an organisation produce its own certificates
in bulk, and later deliver them to recipients and let others verify them.

What success means has **not** been established. Don't claim a success metric (time
saved, volume, error rate) until the user provides one.

## Positioning

A standalone, **self-hosted, open-source** project. Any organisation runs its own copy.
It replaces no earlier system and displaces no named product.

No differentiating mechanism has been claimed. Don't invent one: no "faster than", no
"unlike manual processes", no scale or automation claims.

## Operating Context

The issuance workflow as built (`/templates/[uuid]`, four-step wizard):

1. Upload a certificate design (image or PDF) as a template.
2. Place text boxes and image boxes on the design (image templates only).
3. Upload a CSV of recipients. The header row supplies the columns.
4. Map CSV columns to boxes, set an optional pattern for output filenames, then
   generate one certificate per row. Progress is polled. The whole batch can be exported
   as a zip.

Recipient data arrives as a CSV that staff prepare elsewhere. Approval steps, roles
beyond "issuing staff", and delivery are not part of the workflow yet.

## Capabilities and Constraints

- Frontend only. Next.js 16 App Router, React 19, Tailwind v4, shadcn (`radix-sera`,
  `taupe`), Bun. Stack and API details live in CLAUDE.md, which is authoritative.
- **The backend is the source of truth**: Django REST, a separate repo
  (`Shantanu700/certifier_reloaded_backend`), with a generated client in `src/client/`.
  The frontend doesn't guess shapes the schema doesn't define.
- Auth is real: session-based login, registration, Google sign-in.
- Files go browser → S3 through presigned URLs and never pass through the API.
- Built: templates, text/image box placement, CSV batches, column mapping, filename
  patterns, generation, zip export.
- Not built: anything recipient-facing, roles and permissions, and approval steps.
- Undecided: the licence (no LICENSE file in this repo yet), and the QR code and ID
  scheme for verification.

## Brand Commitments

- The app's name is **Certifier** (repo name "Certifier Reloaded"). It is not an EduVverse
  product, not KIET-branded, and not white-labelled per deployment.
- The deploying organisation's identity appears **only on the certificates it designs**
  (its own uploaded artwork), never in the app's own chrome.
- No logo or mark for Certifier itself has been supplied. Don't invent one that
  could pass for a finished identity.

## Evidence on Hand

- README describes the real workflow and setup. No users, adoption figures, testimonials
  or case studies exist.
- `public/` contains only Next.js scaffold SVGs. There are no brand assets.
- `theme.md` is a visual-style brief (Kinetic Typography), not product evidence.
- `/home` and `/login` still contain placeholder copy from scaffolding (for example the
  Issue/Verify/Revoke cards). It is not product truth. Never present any figure there as
  a real metric.

## Product Principles

1. **The backend owns the data.** Read the contract; don't design around a schema
   that hasn't been seen, which includes every recipient-facing feature for now.
2. **Staff throughput is the measure.** The staff side is a production tool used
   repeatedly. Scanability and consistency beat expression.
3. **The organisation's identity lives on its certificates, not in the app.** Certifier
   stays neutral so any self-hosting organisation can use it as-is.
4. **Placeholders stay visibly placeholder.** Invented copy, numbers and marks must read
   as unfinished, so nobody ships or cites them as fact.
5. **Recipient surfaces must be trustworthy.** When verification is built, it has to
   state only what the backend can prove about a certificate.
