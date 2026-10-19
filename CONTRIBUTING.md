# Contributing

Thanks for wanting to help. Certifier is two repositories: this Next.js frontend and the [Django API](https://github.com/Shantanu700/certifier_reloaded_backend). Most features touch both.

The project-wide guidelines live in the backend's [CONTRIBUTING.md](https://github.com/Shantanu700/certifier_reloaded_backend/blob/main/CONTRIBUTING.md): how to propose a change, the **DCO sign-off every commit needs** (`git commit -s`), and the licence your contributions are under (AGPL-3.0). This page adds what's specific to the frontend.

## Getting set up

Run the backend with `docker compose up` (see its [development guide](https://github.com/Shantanu700/certifier_reloaded_backend/blob/main/docs/development.md)), then here:

```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" >> .env.local
bun install
bun dev
```

Sign in at <http://localhost:3000> as `demo_issuer` or `student01`, password `demo-password`.

[CLAUDE.md](CLAUDE.md) and [AGENTS.md](AGENTS.md) describe the app's structure and conventions, and [theme.md](theme.md) the visual design. Note that this is Next.js 16: some APIs differ from older versions.

## Before opening a pull request

Run the checks CI runs:

```bash
bun run lint
bun test
bun run build   # also the type check
```

- Never edit `src/client/` by hand. After an API change, regenerate it with `bun run openapi-ts` (against a running backend, or `OPENAPI_INPUT` pointing at its schema).
- If your change needs a backend change too, link the two pull requests.

Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md). Report security problems privately, as described in [SECURITY.md](SECURITY.md).
