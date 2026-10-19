# Certifier — frontend

A back-office console for producing certificates in bulk: upload a certificate design,
mark where the text goes, upload a CSV of recipients, match columns to text boxes, and
generate one certificate per row.

Built with Next.js 16 (App Router), React 19, Tailwind CSS v4 and shadcn/ui. It talks to
a separate Django REST backend ([certifier_reloaded_backend](https://github.com/Shantanu700/certifier_reloaded_backend)),
which holds all the data.

## Running the project

### Prerequisites

- [Bun](https://bun.sh) (the package manager for this repo — ignore `package-lock.json`)
- The Django backend running at `https://localhost:8022`
- An S3 bucket configured on the backend, with CORS allowing `PUT` and `GET` from
  `http://localhost:3000` and the `Content-Type` request header (uploads go straight
  from the browser to S3)

### Steps

```bash
bun install          # install dependencies
bun dev              # start the dev server
```

Open <http://localhost:3000> and sign in with an account that exists on the backend.

Other commands:

```bash
bun run build        # production build
bun run start        # serve the production build
bun run lint         # ESLint
bun run openapi-ts   # regenerate the API client in src/client/ from the backend schema
```

### Notes

- The API address is set in `src/client/client.gen.ts` (generated from
  `openapi-ts.config.ts`). To point at a different backend, change the `input` in
  `openapi-ts.config.ts` and rerun `bun run openapi-ts`. Never hand-edit `src/client/`.
- The dev backend uses a self-signed certificate, so only `dev` and `openapi-ts` set
  `NODE_TLS_REJECT_UNAUTHORIZED=0`. `build` and `start` check certificates: to run a
  production build against the dev backend, trust its certificate with
  `NODE_EXTRA_CA_CERTS=/path/to/cert.pem bun run start` instead of switching checks off.
- Sign-up and the verify page forward the visitor's `X-Forwarded-For` so the backend can
  rate-limit per visitor. Deploy behind a host that appends the real address (Vercel, nginx).
- To show the "Continue with Google" button, set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `.env.local`
  to the same OAuth client id the backend has as `GOOGLE_CLIENT_ID`, and add
  `http://localhost:3000` to that client's authorised JavaScript origins. Without it the
  button is hidden; nothing else needs environment variables.
- There is no test suite yet.

## How the app works

### Pages

| Route | Purpose |
|---|---|
| `/` | Redirects to `/home` |
| `/home` | Signed-in home page |
| `/login` | Sign in, create an account, or continue with Google |
| `/templates` | List, create, rename and replace certificate templates |
| `/templates/[uuid]` | The full pipeline for one template (see below) |

### 1. Sign in

`/login` posts the username and password to the backend (`/core/login/`). The backend
returns a session cookie, which the app stores on its own domain as an httpOnly cookie
and forwards on every server-side API call. When the session expires, protected pages
send you back to `/login`.

### 2. Create a template

On `/templates`, upload the certificate artwork (an image or PDF) and give it a name.

Every file upload — templates, image art, CSV files — works the same way
(`lib/upload-client.ts`):

1. The app asks the backend for a one-time upload link.
2. The browser sends the file directly to S3 using that link.
3. The app tells the backend the upload is done, and the backend attaches it.

### 3. Run the pipeline — `/templates/[uuid]`

The certificate stays on the left. The right side is a four-step wizard. The current
step and batch live in the URL (`?step=…&batch=…`), so a half-finished run can be
bookmarked or shared.

```
 boxes  ──►  csv  ──►  mapping  ──►  generate
```

1. **Boxes** — Draw text boxes on the certificate where names, dates etc. should go.
   Drag to move, pull the corners to resize, and set each box's key, font and size in
   the side panel. Each change saves when you let go of the mouse. (Image templates
   only — a PDF can be previewed but not marked up.)
2. **CSV** — Upload a CSV of recipients. Its first row must be the column headers; the
   backend reads them and creates a *batch*. See `sample_data.csv` for the format.
3. **Mapping** — Choose which CSV column fills each box. One column can feed several
   boxes. Optionally set the output file name pattern by combining CSV values, fixed
   text, a running number and a random part.
4. **Generate** — Start generation. The page checks progress every 5 seconds and shows
   the finished certificates when done. You can then export the whole batch as a zip
   file, which is tracked the same way.

### Where the code lives

```
app/                    routes and server actions (app/actions.ts)
components/             UI; template-workspace.tsx is the box editor,
                        batch-panels.tsx the CSV / mapping / generate steps
lib/api.ts              helpers that tidy up loosely typed API responses
lib/session.ts          session cookie handling, requireUser()
lib/upload-client.ts    the three-step file upload
src/client/             generated API client (do not edit)
```

See `CLAUDE.md` for detailed backend quirks and conventions, and `theme.md` for the
design system.
