# Phase 8 Local Acceptance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a non-programmer one safe command and two concise Chinese documents for validating the existing Writers Circle application locally before public deployment.

**Architecture:** A small Node runner checks the existing health endpoint and sequentially invokes the Phase 2–6 verification scripts. Documentation covers repeatable daily operations and a manual pre-launch checklist, while browser checks validate the existing pages at desktop and mobile sizes.

**Tech Stack:** Node.js 20+, pnpm 11, Next.js 16, Payload CMS 3.88, PostgreSQL, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-20-phase-8-local-acceptance-design.md`

## Global Constraints

- Do not add or change business features.
- Use only fictitious acceptance data; never record real personal, disability, contact, submission, password, Secret, or Token values.
- The Phase 4 acceptance path must use its simulated provider and must not call Just One API or create charges.
- Do not deploy publicly in Phase 8.
- Preserve the existing local development and Docker Compose workflows.

---

### Task 1: Add one beginner-friendly acceptance command

**Files:**
- Create: `scripts/local-acceptance-core.mjs`
- Create: `src/acceptance/localAcceptance.test.ts`
- Create: `scripts/run-local-acceptance.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `GET /api/health`, `VERIFY_BASE_URL`, and the existing `scripts/verify-phase-{2,3,4,5,6}.ts` entry points.
- Produces: `pnpm verify:acceptance`, which exits with code `0` only after every acceptance phase succeeds.

- [ ] **Step 1: Write failing behavior tests**

  Test the real orchestration core through injected network and child-process boundaries. Verify three observable behaviors: an unhealthy website produces a clear Chinese startup error and runs no phase; a healthy website runs Phase 2–6 in order; a failed phase stops all later phases and reports the failed phase.

- [ ] **Step 2: Run the focused test and confirm the expected failure**

  Run `pnpm vitest run src/acceptance/localAcceptance.test.ts`. Expect failure because the orchestration core does not exist.

- [ ] **Step 3: Implement the minimal sequential runner**

  Add `scripts/local-acceptance-core.mjs` and `scripts/run-local-acceptance.mjs`. Keep the orchestration core dependency-injected and side-effect free until called. Use `fetch` with a bounded timeout for the health check. In the executable entry point, invoke pnpm through `process.env.npm_execpath` and `process.execPath`, inherit terminal output, pass `VERIFY_BASE_URL`, stop on the first non-zero child status, and print a concise Chinese success summary only after all phases pass.

- [ ] **Step 4: Add the package command and rerun the focused test**

  Add `"verify:acceptance": "node scripts/run-local-acceptance.mjs"` and rerun the focused behavior tests. Expect PASS.

- [ ] **Step 5: Commit Task 1**

  Commit the configuration test, runner, and package script with message `test: add unified local acceptance runner`.

### Task 2: Add non-programmer operations and pre-launch documents

**Files:**
- Create: `docs/operations/daily-use-guide.md`
- Create: `docs/acceptance/pre-launch-checklist.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: Existing public routes, Payload collection labels, publication and consent rules documented in README.
- Produces: Two linked Chinese guides with no secrets or real personal data.

- [ ] **Step 1: Write the daily-use guide**

  Use numbered, plain-Chinese steps. Clearly distinguish “save in the backend”, “allow public display”, and “publish”; state that disabling authorization hides content without deleting the internal record.

- [ ] **Step 2: Write the pre-launch checklist**

  Use Markdown checkboxes grouped by startup, pages, workflow, privacy, mobile, backup, and final decision. State that any unchecked privacy or backup item blocks public deployment.

- [ ] **Step 3: Link both documents from README and review every link and command**

  Add a short “本地验收与日常使用” section with clickable repository-relative links and the `pnpm verify:acceptance` command. Open both relative paths from the repository and confirm every referenced route and command exists.

- [ ] **Step 4: Commit Task 2**

  Commit the documents and README update with message `docs: add local acceptance and operations guides`.

### Task 3: Execute automated and browser acceptance

**Files:**
- Modify only implementation files if a reproducible defect is found; otherwise no product code changes.

**Interfaces:**
- Consumes: Running local PostgreSQL and Writers Circle server, `pnpm verify:acceptance`, browser viewport controls.
- Produces: Recorded verification results in the final Phase 8 handoff.

- [ ] **Step 1: Ensure the local database and website are healthy**

  Check PostgreSQL readiness and `GET http://127.0.0.1:3000/api/health`. Start only the missing local service and do not print `.env` values.

- [ ] **Step 2: Run the unified acceptance command**

  Run `pnpm verify:acceptance`. Expect Phase 2, 3, 4, 5, and 6 to succeed and their fictitious records to be removed.

- [ ] **Step 3: Check desktop routes in the browser**

  At a desktop viewport, open `/`, `/members`, `/works`, `/news`, `/submit`, `/admin`, and `/api/health`. Confirm each route loads, the page title/content matches its purpose, and no page has blocking console errors.

- [ ] **Step 4: Check mobile public routes in the browser**

  At a 390 × 844 viewport, open `/`, `/members`, `/works`, `/news`, and `/submit`. Confirm navigation, headings, forms, buttons, text wrapping, and horizontal overflow are usable, then reset the viewport override.

- [ ] **Step 5: Handle any reproducible defect with TDD**

  If a defect is found, first add a focused failing test, implement the smallest fix, rerun the focused test, and repeat the affected browser step. Do not add enhancements.

### Task 4: Final verification and private backup

**Files:**
- Modify: `docs/superpowers/plans/2026-08-20-phase-8-local-acceptance.md` only to mark completed checkboxes.

**Interfaces:**
- Consumes: The completed Phase 8 branch.
- Produces: A verified commit ready to fast-forward into `main` and push to the existing private GitHub repository.

- [ ] **Step 1: Run the full automated gate**

  Run `pnpm test --run`, `pnpm lint`, `pnpm generate:types`, and `pnpm build`. All commands must exit successfully.

- [ ] **Step 2: Review repository safety**

  Run `git status --short`, inspect the staged diff, and search tracked Phase 8 files for common secret assignments. Confirm no `.env`, database export, real personal data, Token, password, or Secret is tracked.

- [ ] **Step 3: Commit the completed plan**

  Mark every completed checkbox and commit with message `chore: complete phase 8 local acceptance`.

- [ ] **Step 4: Finish the branch**

  Re-run the complete test suite on the integration result, fast-forward `main`, and push `origin main` to the existing private repository, following the approved project convention.
