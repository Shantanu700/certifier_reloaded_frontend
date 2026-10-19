# Security policy

## Reporting a vulnerability

Please **don't** open a public issue for security problems. Report them privately through GitHub instead:

- Backend: [Report a vulnerability](https://github.com/Shantanu700/certifier_reloaded_backend/security/advisories/new)
- Frontend (this repo): [Report a vulnerability](https://github.com/Shantanu700/certifier_reloaded_frontend/security/advisories/new)

Include what you found, how to reproduce it, and what an attacker could do with it. Only the maintainer sees the report. You'll get a reply once it has been looked at, and the fix is credited to you unless you'd rather stay anonymous.

## What's in scope

The code in these two repositories: the Django API, the Celery tasks and the Next.js frontend. Problems in a self-hosted deployment's own configuration (for example a missing `ALLOWED_HOSTS` or a public storage bucket) are worth reporting to that deployment's operator; [the self-hosting guide](https://github.com/Shantanu700/certifier_reloaded_backend/blob/main/docs/self-hosting.md) covers how to set those up safely.

## Supported versions

There are no releases yet: only the latest `main` gets security fixes.
