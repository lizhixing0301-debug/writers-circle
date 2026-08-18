# Phase 7 Docker Compose Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a secure, persistent, production-like Docker Compose stack for Writers Circle without adding business features or public deployment.

**Architecture:** Build the Next.js/Payload application as a multi-stage standalone image. Compose starts PostgreSQL, runs a one-shot Payload migration service, then starts the application with health checks and named database/media volumes.

**Tech Stack:** Next.js 16, Payload CMS 3.88, PostgreSQL 18, Docker Compose, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-18-phase-7-docker-compose-design.md`

## Global Constraints

- Real secrets remain only in ignored environment files.
- Retain the existing direct `pnpm dev` local-development workflow.
- Do not add a server, domain, HTTPS, scheduler, AI, WeChat publication, or product features.
- Every production behavior starts with a focused failing test and finishes with a full verification gate.

---

### Task 1: Test and add deployment configuration

**Files:**
- Create: `src/deployment/dockerConfiguration.test.ts`
- Create: `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.env.docker.example`
- Modify: `next.config.mjs`, `package.json`, `.gitignore`

- [ ] Write configuration tests that fail while Docker files and standalone output are absent.
- [ ] Run `pnpm vitest run src/deployment/dockerConfiguration.test.ts`; expect failure because required deployment files do not exist.
- [ ] Add a multi-stage Node 24 image, `postgres`/`migrate`/`app` services, Postgres healthcheck, named `postgres_data` and `media_data` volumes, and variable-only configuration.
- [ ] Enable `output: 'standalone'`, add safe Docker npm commands, and rerun the focused test.

### Task 2: Test and add the health interface and persistent media location

**Files:**
- Create: `src/app/api/health/route.ts`, `src/app/api/health/route.test.ts`
- Modify: `src/collections/Media.ts`, `src/collections/Media.test.ts`

- [ ] Write failing tests for a minimal public health response and explicit `/app/media`-compatible media storage configuration.
- [ ] Run focused tests and confirm expected failures.
- [ ] Query Payload without exposing data; return `{ ok: true }` only after a harmless database query, otherwise return `{ ok: false }` with HTTP 503.
- [ ] Configure Media with an explicit environment-compatible static directory, then rerun focused tests.

### Task 3: Add the initial migration and beginner documentation

**Files:**
- Create: `src/migrations/20260818_204500_initial_schema.ts`
- Modify: `src/payload.config.ts`, `README.md`

- [ ] Generate the initial Payload migration against an isolated database, never against the user's data.
- [ ] Configure the adapter to use `src/migrations` and ensure the Docker migration service runs `payload migrate`.
- [ ] Document copying the Docker environment example, one-command start/stop/logs, admin address, data persistence, backup command and the rule for future migrations.

### Task 4: Install Docker Desktop and verify a fresh stack

**Files:**
- Create or modify only disposable test configuration outside Git when required.

- [ ] Install and start Docker Desktop for macOS.
- [ ] Run `docker compose config`, build the image, and start a clean Compose project on a non-conflicting local port.
- [ ] Verify `/api/health`, `/`, `/admin`, `/members`, `/news`, and `/works` over HTTP.
- [ ] Restart the stack and confirm both named volumes remain present; stop only the disposable validation stack.

### Task 5: Full verification, merge, and private GitHub backup

- [ ] Run `pnpm test --run`, `pnpm lint`, `pnpm generate:types`, and `pnpm build`.
- [ ] Commit the Phase 7 work, fast-forward `main`, rerun the applicable verification on `main`, and push `origin main` to the existing private GitHub repository.
