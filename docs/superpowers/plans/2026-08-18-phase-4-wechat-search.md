# Phase 4 WeChat Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Search the full third-party WeChat Official Account article index with member terms and ingest every valid result as a private, pending news candidate with bounded cost and an auditable run record.

**Architecture:** Keep the third-party boundary behind a small `WechatArticleSearchProvider`, normalize only recognizable public WeChat article metadata, and orchestrate searches against Payload-backed member, candidate, and run stores. An authenticated Next route starts a background run, while a small Payload list component gives nontechnical administrators one button and directs them to private run records.

**Tech Stack:** Next.js 16 App Router, React 19, Payload CMS 3.88, PostgreSQL, TypeScript 5.9, Vitest 4, pnpm 11, native `fetch` and Web APIs.

## Global Constraints

- Search the third-party service's full WeChat Official Account article index, not a fixed or followed account list.
- Search only active members using name, pen name, aliases, and explicit search keywords; never use disability or other private fields.
- Limit each run to 64 query calls, one page per query, recent-seven-day results sorted latest first.
- Store metadata only; do not fetch full articles, comments, readers, images, private messages, or other channels.
- Every discovered item must remain `automaticSearch`, `other`, and `pending`; never auto-link a member, verify, classify, publish, or send it.
- Keep the provider token in `WECHAT_SEARCH_API_TOKEN`; never write a real token to code, Payload data, logs, tests, or Git.
- No schedule, Docker Compose, AI, public news page, WeChat draft, automatic publishing, payment, or Phase 5 work.

---

## File Map

- Create `src/wechatSearch/searchTerms.ts`: build prioritized, deduplicated, bounded member query jobs.
- Create `src/wechatSearch/searchTerms.test.ts`: prove private fields are ignored and the 64-query cap is enforced.
- Create `src/wechatSearch/wechatArticleIdentity.ts`: accept, normalize, and fingerprint public WeChat article URLs.
- Create `src/wechatSearch/wechatArticleIdentity.test.ts`: prove URL validation and duplicate identities.
- Create `src/wechatSearch/justOneApiProvider.ts`: HTTPS form client, safe errors, and flexible response normalization.
- Create `src/wechatSearch/justOneApiProvider.test.ts`: verify request contract, parsing, timeout, and failures with a fake fetch.
- Create `src/wechatSearch/runWechatSearch.ts`: provider/store contracts and the bounded search orchestration.
- Create `src/wechatSearch/runWechatSearch.test.ts`: verify success, duplicates, partial failure, total failure, and no-member runs.
- Create `src/wechatSearch/payloadWechatSearchStore.ts`: Payload adapter for active members, dedupe, candidate ingestion, and run updates.
- Create `src/wechatSearch/payloadWechatSearchStore.test.ts`: verify Payload Local API requests and managed candidate fields.
- Create `src/wechatSearch/startWechatSearch.ts`: single-process run guard, configuration, and background execution.
- Create `src/wechatSearch/startWechatSearch.test.ts`: prove concurrent clicks reuse one active run and missing tokens fail safely.
- Create `src/collections/WechatSearchRuns.ts`: private server-managed run records.
- Create `src/collections/WechatSearchRuns.test.ts`: verify labels, fields, access, and generated run metadata.
- Create `src/app/(frontend)/api/internal/wechat-search/run/route.ts`: Payload-authenticated start endpoint.
- Create `src/app/(frontend)/api/internal/wechat-search/run/route.test.ts`: verify 401 and successful start responses.
- Create `src/components/admin/WechatSearchAction.tsx`: one-button Payload admin client component.
- Create `src/components/admin/WechatSearchAction.test.tsx`: verify button states and response messages.
- Create `scripts/verify-phase-4.ts`: real PostgreSQL verification with a fictional provider and complete cleanup.
- Modify `src/collections/NewsCandidates.ts`: place the search action above the private candidate list and clarify automatic search wording.
- Modify `src/payload.config.ts`: register the private run collection.
- Modify `src/config/env.ts` and `src/config/env.test.ts`: add optional trimmed environment access without making the token an app-start requirement.
- Modify `.env.example`: document a token placeholder and non-secret provider base URL.
- Modify `README.md`: explain full-index scope, cost cap, manual verification, setup, and verification limits.
- Modify `package.json`: add a Phase 4 verification script only if it materially simplifies the documented command.
- Regenerate `src/payload-types.ts` and `src/app/(payload)/admin/importMap.js`.

---

### Task 1: Search Terms and WeChat Article Identity

**Files:**
- Create: `src/wechatSearch/searchTerms.test.ts`
- Create: `src/wechatSearch/searchTerms.ts`
- Create: `src/wechatSearch/wechatArticleIdentity.test.ts`
- Create: `src/wechatSearch/wechatArticleIdentity.ts`

**Interfaces:**
- Produces: `buildWechatSearchJobs(members, maximumQueries?): WechatSearchJob[]`.
- Produces: `normalizeWechatArticleUrl(raw): string | null`.
- Produces: `createWechatArticleReference(raw): string | null`.

- [ ] **Step 1: Write failing search-term tests**

Test hand-written members showing name-first round-robin priority, whitespace/case-insensitive deduplication, archived-member exclusion before this function's input, ignored disability/internal fields, and a literal 64-job maximum.

- [ ] **Step 2: Run `pnpm test --run src/wechatSearch/searchTerms.test.ts`**

Expected: FAIL because `searchTerms.ts` does not exist.

- [ ] **Step 3: Implement the minimal pure query builder**

Use this public input boundary:

```ts
export type WechatSearchMember = {
  aliases?: Array<{ value?: null | string }> | null
  id: number | string
  name: string
  penName?: null | string
  searchKeywords?: Array<{ value?: null | string }> | null
}

export type WechatSearchJob = {
  memberId: number | string
  memberName: string
  query: string
}
```

Build each member's ordered unique term list, add one primary term per member first, then add secondary terms in round-robin order until `maximumQueries` (default 64).

- [ ] **Step 4: Run the focused search-term tests and verify PASS**

- [ ] **Step 5: Write failing WeChat article identity tests**

Cover `https://mp.weixin.qq.com/s/FICTIONAL`, legacy `__biz`/`mid`/`idx` links with different tracking parameters, fragments, non-HTTPS normalization, non-WeChat hosts, credentials, and malformed input.

- [ ] **Step 6: Run `pnpm test --run src/wechatSearch/wechatArticleIdentity.test.ts`**

Expected: FAIL because the identity helper does not exist.

- [ ] **Step 7: Implement URL normalization and SHA-256 references**

Accept only `http:` or `https:` on the exact host `mp.weixin.qq.com`, reject credentials, upgrade to HTTPS, remove fragments and known tracking parameters, and return `wechat:${sha256(identity)}`. Use `__biz|mid|idx` when all exist, `/s/<token>` otherwise, and the normalized URL as a safe fallback.

- [ ] **Step 8: Run both Task 1 test files and commit**

```bash
git add src/wechatSearch/searchTerms.ts src/wechatSearch/searchTerms.test.ts src/wechatSearch/wechatArticleIdentity.ts src/wechatSearch/wechatArticleIdentity.test.ts
git commit -m "feat: add bounded WeChat search terms"
```

### Task 2: Just One API Provider Boundary

**Files:**
- Create: `src/wechatSearch/justOneApiProvider.test.ts`
- Create: `src/wechatSearch/justOneApiProvider.ts`

**Interfaces:**
- Produces: `WechatArticleSearchItem` and `WechatArticleSearchProvider`.
- Produces: `createJustOneApiWechatProvider(options): WechatArticleSearchProvider`.
- Consumes: `normalizeWechatArticleUrl`.

- [ ] **Step 1: Write failing provider contract tests**

Use a real `Request` captured by a small fake `fetch` and a complete fictional JSON envelope. Assert the POST target, HTTPS enforcement, form fields `token`, `keyword`, `publishTimeType=SEVEN_DAYS`, `sortType=LATEST`, `currentPage=1`, `offset=0`, and blank `cookies_buffer`; assert the token is absent from the URL.

- [ ] **Step 2: Run the provider tests and verify the missing-module failure**

- [ ] **Step 3: Implement the request and response boundary**

Implement:

```ts
export type WechatArticleSearchItem = {
  publishedAt?: string
  sourceName?: string
  summary?: string
  title: string
  url: string
}

export type WechatArticleSearchProvider = {
  search(query: string): Promise<WechatArticleSearchItem[]>
}
```

Use `AbortSignal.timeout(60_000)`. Parse `code === 0`, recursively find article-shaped records beneath `data`, accept common title/url/account/summary/date aliases, strip HTML and collapse whitespace, cap title at 300 and summary at 2000, dedupe by normalized URL, and never include the token or raw response in thrown errors.

- [ ] **Step 4: Add failing tests for business errors, HTTP errors, malformed JSON, unusable records, duplicate URLs, HTML cleanup, and Unix timestamps**

- [ ] **Step 5: Implement minimal safe error mapping and normalization**

Map codes 100, 302, 303, 600, 601, and 602 to concise Chinese messages. Other nonzero codes use a generic provider error containing only the numeric code.

- [ ] **Step 6: Run all provider tests and commit**

```bash
git add src/wechatSearch/justOneApiProvider.ts src/wechatSearch/justOneApiProvider.test.ts
git commit -m "feat: add replaceable WeChat search provider"
```

### Task 3: Private Run Records and Payload Store

**Files:**
- Create: `src/collections/WechatSearchRuns.test.ts`
- Create: `src/collections/WechatSearchRuns.ts`
- Create: `src/wechatSearch/payloadWechatSearchStore.test.ts`
- Create: `src/wechatSearch/payloadWechatSearchStore.ts`
- Modify: `src/payload.config.ts`

**Interfaces:**
- Produces: Payload slug `wechat-search-runs` and `generateWechatSearchRunNumber`.
- Produces: `createPayloadWechatSearchStore(payload): WechatSearchStore`.
- Consumes: active `members`, `news-candidates`, `ingestNewsCandidate`, and stable article references.

- [ ] **Step 1: Write failing run collection tests**

Assert Chinese labels, `内容管理` group, newest-first sorting, authenticated read/delete, blocked public create/update, run-number uniqueness, statuses `queued|running|succeeded|partial|failed`, trigger values `admin|verification`, read-only statistics, and a server create hook that generates `WXSEARCH-YYYYMMDD-XXXXXXXX`, sets `queued`, and clears caller-controlled counts and errors.

- [ ] **Step 2: Run the collection tests and verify RED**

- [ ] **Step 3: Implement and register the run collection**

Define dates and integer counts with minimum zero. Keep `errorSummary` at 5000 characters and add an admin warning that search results are unverified leads. Register after `NewsCandidates`.

- [ ] **Step 4: Run focused collection tests and verify GREEN**

- [ ] **Step 5: Write failing Payload store tests**

Assert active-member retrieval requests only the needed fields, `sourceReference` duplicate lookup, candidate creation through `ingestNewsCandidate` with `automaticSearch|other|pending` and no `relatedMember`, and server-only create/update run calls with `overrideAccess: true`.

- [ ] **Step 6: Implement the Payload store adapter**

Do not expose raw Payload documents. Return only `WechatSearchMember`, duplicate boolean, run ID/number, and count-update results needed by orchestration.

- [ ] **Step 7: Run Task 3 tests and commit**

```bash
git add src/collections/WechatSearchRuns.ts src/collections/WechatSearchRuns.test.ts src/wechatSearch/payloadWechatSearchStore.ts src/wechatSearch/payloadWechatSearchStore.test.ts src/payload.config.ts
git commit -m "feat: add private WeChat search run records"
```

### Task 4: Search Orchestration and Start Guard

**Files:**
- Create: `src/wechatSearch/runWechatSearch.test.ts`
- Create: `src/wechatSearch/runWechatSearch.ts`
- Create: `src/wechatSearch/startWechatSearch.test.ts`
- Create: `src/wechatSearch/startWechatSearch.ts`

**Interfaces:**
- Produces: `runWechatSearch({ provider, store, trigger, maximumQueries? })`.
- Produces: `startWechatSearch(payload, dependencies?): Promise<StartWechatSearchResult>`.
- Consumes: query builder, article references, provider, and Payload store.

- [ ] **Step 1: Write failing orchestration tests**

Use real orchestration with in-memory fake store/provider data. Assert exact final statistics for all success, duplicates, one failed query, all failed, and no active members. Assert every created candidate is `automaticSearch`, `other`, pending through the ingestion boundary, has the query in `relatedPersonName`, and has no member relationship.

- [ ] **Step 2: Run orchestration tests and verify RED**

- [ ] **Step 3: Implement sequential bounded orchestration**

Create the run, mark it running, fetch members, build at most 64 jobs, process one job at a time, dedupe within the run and against the store, continue after individual failures, cap the human error summary, and finish with `succeeded`, `partial`, or `failed`. Never throw an external provider error after the run record exists; persist it safely instead.

- [ ] **Step 4: Run orchestration tests and verify GREEN**

- [ ] **Step 5: Write failing start-guard tests**

Prove two concurrent calls reuse the same active promise/run, the token is trimmed, an absent token creates a failed run with a safe message, and the configured base URL must be HTTPS.

- [ ] **Step 6: Implement the process-local guard and provider wiring**

Read `WECHAT_SEARCH_API_TOKEN` only when a run starts. Return immediately with `{ kind: 'started', runNumber }` or `{ kind: 'alreadyRunning', runNumber }`, and keep the background promise private.

- [ ] **Step 7: Run Task 4 tests and commit**

```bash
git add src/wechatSearch/runWechatSearch.ts src/wechatSearch/runWechatSearch.test.ts src/wechatSearch/startWechatSearch.ts src/wechatSearch/startWechatSearch.test.ts
git commit -m "feat: orchestrate WeChat article discovery"
```

### Task 5: Authenticated Admin Action

**Files:**
- Create: `src/app/(frontend)/api/internal/wechat-search/run/route.test.ts`
- Create: `src/app/(frontend)/api/internal/wechat-search/run/route.ts`
- Create: `src/components/admin/WechatSearchAction.test.tsx`
- Create: `src/components/admin/WechatSearchAction.tsx`
- Create: `src/components/admin/WechatSearchAction.module.css`
- Modify: `src/collections/NewsCandidates.ts`

**Interfaces:**
- Produces: authenticated `POST /api/internal/wechat-search/run`.
- Produces: Payload client component `WechatSearchAction` above the candidate list.
- Consumes: `payload.auth`, `startWechatSearch`, and the generated Payload import map.

- [ ] **Step 1: Write failing route tests**

Extract `createWechatSearchRoute(dependencies)` for direct testing. Assert missing user returns 401 without starting, authenticated start returns 202 and the run number, already-running returns 200, and internal errors return a safe 500 message.

- [ ] **Step 2: Implement the authenticated route and verify route tests pass**

Use `payload.auth({ headers: request.headers })`; never rely only on a client-side check.

- [ ] **Step 3: Write failing component tests**

Render the component with a fake request function. Assert the Chinese explanation, disabled “正在启动…” state, success/already-running message with run number, and safe failure text.

- [ ] **Step 4: Implement the client action and list placement**

Register `beforeListTable: ['/components/admin/WechatSearchAction']` on `NewsCandidates`. Use a normal button and an `aria-live` result region; do not add a new design system or package.

- [ ] **Step 5: Run Task 5 tests, regenerate import map, and commit**

```bash
pnpm generate:importmap
git add src/app/(frontend)/api/internal/wechat-search/run src/components/admin src/collections/NewsCandidates.ts src/app/(payload)/admin/importMap.js
git commit -m "feat: add one-click WeChat search action"
```

### Task 6: Environment, Documentation, Runtime Verification, and Full Gate

**Files:**
- Modify: `src/config/env.test.ts`
- Modify: `src/config/env.ts`
- Modify: `.env.example`
- Create: `scripts/verify-phase-4.ts`
- Modify: `README.md`
- Regenerate: `src/payload-types.ts`

**Interfaces:**
- Produces: `optionalEnvironment(name): string | undefined`.
- Produces: a no-network Phase 4 runtime verification command.

- [ ] **Step 1: Write the failing optional environment tests**

Assert trimmed values are returned and blank/missing optional values become `undefined`; retain required environment behavior.

- [ ] **Step 2: Implement the helper and verify focused tests pass**

- [ ] **Step 3: Write the PostgreSQL verification script**

Use a fictional provider and fictional active member. Execute the real orchestration twice: first create one pending candidate, then count it as a duplicate. Verify all run statistics, no auto member relation, private REST access, and HTTP 200 for `/`, `/submit`, and `/admin`. Delete every fictional run, candidate, and member in `finally`, then prove zero remain.

- [ ] **Step 4: Update safe configuration and Chinese maintenance documentation**

Add only `WECHAT_SEARCH_API_TOKEN=replace-with-provider-token` to `.env.example`. Explain that real external testing remains unavailable until the user creates a provider token, that pricing is controlled by the provider account, and that no recharge occurs automatically.

- [ ] **Step 5: Regenerate types and run the full verification gate**

Run:

```bash
pnpm generate:types
pnpm generate:importmap
pnpm test --run
pnpm lint
pnpm build
```

Then start the app against the existing local PostgreSQL and run:

```bash
VERIFY_BASE_URL=http://127.0.0.1:3001 pnpm payload run scripts/verify-phase-4.ts
```

Expected: all unit tests, lint, production build, runtime database assertions, privacy checks, page checks, and cleanup PASS.

- [ ] **Step 6: Inspect Git status for secrets and commit**

```bash
git status --short --ignored
git diff --check
git add .env.example README.md src/config scripts/verify-phase-4.ts src/payload-types.ts docs/superpowers
git commit -m "docs: verify Phase 4 WeChat search"
```

- [ ] **Step 7: Finish the development branch**

Use `superpowers:finishing-a-development-branch`, re-run the fresh verification gate, merge the feature branch into `main`, push `main` to the existing private GitHub repository, remove the worktree, and restart the main project. Do not start Phase 5.
