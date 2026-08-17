# Writers Circle Phase 0 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal local Writers Circle application whose Next.js home page and Payload CMS admin use PostgreSQL, with no Phase 1 business features.

**Architecture:** One TypeScript Next.js App Router application hosts the public route and Payload's admin/API route groups. A single Payload config registers only an authenticated users collection and connects through Payload's official PostgreSQL adapter; secrets stay in an ignored local environment file.

**Tech Stack:** Node.js 20.9+, pnpm 11.22.0, Next.js 16.3.1, React 19.2.8, Payload CMS 3.88.0, PostgreSQL, TypeScript, ESLint, Vitest.

## Global Constraints

- Phase 0 only: do not implement member profiles, submissions, news search, AI, WeChat, or any other business feature.
- Use one repository and one application for the simplest long-term maintenance.
- Keep all passwords, API keys, database credentials, and Payload secrets out of committed files.
- Use PostgreSQL only; do not substitute SQLite or another database.
- Reserve a clean environment-variable boundary for future Docker Compose work, but do not implement the full container stack in Phase 0.
- The final running service must expose `/` and `/admin`, and work stops after Phase 0 verification.

---

### Task 1: Repository and package foundation

**Files:**
- Create: `.gitignore`
- Create: `.env.example`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next-env.d.ts`
- Create: `next.config.mjs`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `scripts/setup-local-env.mjs`
- Create: `README.md`
- Generate: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: Node.js 20.9+ and pnpm.
- Produces: scripts `dev`, `build`, `start`, `lint`, `test`, `generate:importmap`, `generate:types`, and `setup:env`; aliases `@/*` and `@payload-config`; ignored `.env` with generated `PAYLOAD_SECRET` and local `DATABASE_URI`.

- [ ] **Step 1: Add repository ignore and safe environment templates**

  Ignore `.env`, `.env.*` except `.env.example`, `node_modules`, `.next`, test coverage, Payload generated types/import-map artifacts where appropriate, logs, editor files, `.DS_Store`, and local PostgreSQL data. Set `.env.example` to invalid placeholders only: `DATABASE_URI=postgresql://USER:PASSWORD@localhost:5432/writers_circle` and `PAYLOAD_SECRET=generate-with-pnpm-setup-env`.

- [ ] **Step 2: Add the minimal package and TypeScript configuration**

  Pin runtime packages to Next.js 16.3.1, React 19.2.8, and all Payload packages to 3.88.0. Do not add Tailwind, rich-text, upload, GraphQL, search, or AI dependencies.

- [ ] **Step 3: Add a local environment generator**

  Implement `scripts/setup-local-env.mjs` with `node:crypto.randomBytes(32).toString('hex')`; create `.env` only when absent and write `DATABASE_URI=postgresql://localhost:5432/writers_circle` plus the generated `PAYLOAD_SECRET`. Never print the generated secret.

- [ ] **Step 4: Install dependencies and initialize the environment**

  Run `pnpm install` and `pnpm setup:env`. Confirm `.env` exists and `git status --short` does not list it.

- [ ] **Step 5: Rename the initial branch and commit**

  Run `git branch -m main`, stage only Task 1 files, and commit `chore: initialize project foundation`.

### Task 2: Home page through a red-green test cycle

**Files:**
- Create: `src/app/(frontend)/page.test.tsx`
- Create: `src/app/(frontend)/page.tsx`
- Create: `src/app/(frontend)/layout.tsx`
- Create: `src/app/(frontend)/styles.css`

**Interfaces:**
- Consumes: React, Vitest, and the App Router source root.
- Produces: default `HomePage()` component mounted at `/`, containing the visible text `Writers Circle` and `三十二人文学志后台`.

- [ ] **Step 1: Write the failing home-page test**

  Use `renderToStaticMarkup(<HomePage />)` and assert that the markup contains both `Writers Circle` and `三十二人文学志后台`.

- [ ] **Step 2: Verify the test fails for the intended reason**

  Run `pnpm test --run src/app/\(frontend\)/page.test.tsx`. Expected: failure because `page.tsx` does not exist.

- [ ] **Step 3: Implement the minimal home page and layout**

  Add only the project name, a Phase 0 foundation status sentence, and a link to `/admin`. Use a small local stylesheet without a UI framework.

- [ ] **Step 4: Verify the home-page test passes**

  Run `pnpm test --run src/app/\(frontend\)/page.test.tsx`. Expected: one passing test.

- [ ] **Step 5: Commit the home page**

  Stage the four Task 2 files and commit `feat: add phase 0 home page`.

### Task 3: Payload CMS and PostgreSQL integration

**Files:**
- Create: `src/config/env.test.ts`
- Create: `src/config/env.ts`
- Create: `src/collections/Users.ts`
- Create: `src/payload.config.ts`
- Create: `src/app/(payload)/layout.tsx`
- Create: `src/app/(payload)/admin/[[...segments]]/page.tsx`
- Create: `src/app/(payload)/admin/importMap.js`
- Create: `src/app/(payload)/api/[...slug]/route.ts`
- Generate: `src/payload-types.ts`

**Interfaces:**
- Consumes: `DATABASE_URI` and `PAYLOAD_SECRET` from the runtime environment.
- Produces: `requireEnvironment(name: 'DATABASE_URI' | 'PAYLOAD_SECRET'): string`; Payload config alias `@payload-config`; authenticated collection slug `users`; routes `/admin` and `/api/*`.

- [ ] **Step 1: Write failing environment validation tests**

  Assert that `requireEnvironment` returns a non-empty configured value and throws `Missing required environment variable: DATABASE_URI` when it is absent.

- [ ] **Step 2: Verify the environment tests fail for the intended reason**

  Run `pnpm test --run src/config/env.test.ts`. Expected: failure because `env.ts` does not exist.

- [ ] **Step 3: Implement minimal environment validation**

  Add the exact `requireEnvironment` interface, reading `process.env` at call time and rejecting empty strings.

- [ ] **Step 4: Verify environment tests pass**

  Run `pnpm test --run src/config/env.test.ts`. Expected: all environment tests pass.

- [ ] **Step 5: Add the minimal Payload configuration**

  Configure `postgresAdapter({ pool: { connectionString: requireEnvironment('DATABASE_URI') } })`, set `secret` from `PAYLOAD_SECRET`, register only `Users`, configure TypeScript output at `src/payload-types.ts`, and use the standard Payload admin and REST route wrappers. Do not add Media or any business collection.

- [ ] **Step 6: Generate Payload artifacts and run the full tests**

  Run `pnpm generate:importmap`, `pnpm generate:types`, and `pnpm test --run`. Expected: generated artifacts complete and all tests pass.

- [ ] **Step 7: Commit the CMS foundation**

  Stage Task 3 source/generated files and commit `feat: integrate payload with postgres`.

### Task 4: Local PostgreSQL and end-to-end verification

**Files:**
- Modify: `README.md`
- Create only if required by the selected local PostgreSQL distribution: ignored `.postgres/` runtime data under the repository.

**Interfaces:**
- Consumes: local PostgreSQL server on `localhost:5432` and the generated `.env`.
- Produces: a running development process on `http://localhost:3000`, with `/` and `/admin` returning HTTP success.

- [ ] **Step 1: Resolve a real local PostgreSQL runtime**

  Recheck installed services. If none exists, install a macOS-compatible PostgreSQL distribution after the required system approval, initialize a local database cluster with local-only trust access, create the `writers_circle` database, and keep all runtime data outside Git. Do not replace PostgreSQL with SQLite or a mock.

- [ ] **Step 2: Run static verification**

  Run `pnpm test --run`, `pnpm lint`, `pnpm generate:types`, and `pnpm build`. Record exit codes and failure counts.

- [ ] **Step 3: Start and inspect the application**

  Run `pnpm dev` in a persistent process, wait for readiness, then request `http://localhost:3000/` and `http://localhost:3000/admin` with HTTP clients. Confirm successful status codes, required home-page text, and the Payload first-user screen or login screen.

- [ ] **Step 4: Inspect runtime logs and repository state**

  Confirm there are no blocking application or database errors. Run `git status --short`, verify `.env` and PostgreSQL runtime data are absent from tracked changes, and list the exact remaining project files.

- [ ] **Step 5: Update documentation and commit verification notes**

  Document the simple setup, commands, URLs, environment-variable names, PostgreSQL requirement, and the explicit Phase 0 scope in `README.md`. Commit `docs: add local development guide`.

- [ ] **Step 6: Leave the project running and stop work**

  Keep the verified development server running, report the homepage/admin URLs, all fresh test/build results, principal files, and any remaining errors. Do not start Phase 1.
