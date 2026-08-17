# Phase 3 News Candidates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an administrator-only news candidate library with human verification fields and a tested server-only ingestion interface for later collectors.

**Architecture:** Keep every candidate private in a Payload collection and use the existing Payload admin UI for manual work. Put input normalization and validation behind a narrow TypeScript interface with a replaceable store adapter; future public tips or automated search can call that interface without receiving an HTTP endpoint in Phase 3.

**Tech Stack:** Next.js 16 App Router, React 19, Payload CMS 3.88, PostgreSQL, TypeScript 5.9, Vitest 4, pnpm 11.

## Global Constraints

- Do not create `/tip` or any public news-candidate API route.
- Do not collect tip-provider identity or contact details.
- Do not implement automatic search, crawling, AI, public news pages, weekly reports, WeChat, notifications, Docker Compose, or deployment.
- All candidates, source details, member links, and verification notes remain administrator-only.
- Every new candidate starts as `pending`; later ingestion must never mark a candidate verified or published.
- Do not store disability category, disability level, identity documents, credentials, real news, or real member privacy in code or test data.
- Only `http` and `https` source URLs are accepted; summaries remain plain text.
- Use Payload's built-in admin UI and add no external dependency, queue, scheduler, search service, or custom dashboard.

---

## File Map

- Create `src/newsCandidates/newsCandidateNumber.ts`: generate non-sequential candidate receipt numbers.
- Create `src/newsCandidates/newsCandidateNumber.test.ts`: deterministic number-format tests.
- Create `src/newsCandidates/ingestNewsCandidate.ts`: categories, sources, input allowlist, validation, store contract, and orchestration.
- Create `src/newsCandidates/ingestNewsCandidate.test.ts`: validation, managed-field rejection, safe URL, and storage tests.
- Create `src/newsCandidates/payloadNewsCandidateStore.ts`: Payload Local API adapter used only by server code.
- Create `src/collections/NewsCandidates.ts`: private Payload collection and server-managed create fields.
- Create `src/collections/NewsCandidates.test.ts`: collection structure, access, defaults, and hook tests.
- Create `scripts/verify-phase-3.ts`: real PostgreSQL/Payload runtime verification using fictional data and cleanup.
- Modify `src/payload.config.ts`: register `NewsCandidates`.
- Modify `README.md`: explain manual candidate management, verification warning, future interface, and verification command.
- Modify `src/app/(frontend)/page.tsx`: describe the platform without advertising undeveloped public news features.
- Regenerate `src/payload-types.ts` and `src/app/(payload)/admin/importMap.js` with Payload commands.

---

### Task 1: Candidate Number and Private Collection

**Files:**
- Create: `src/newsCandidates/newsCandidateNumber.ts`
- Create: `src/newsCandidates/newsCandidateNumber.test.ts`
- Create: `src/collections/NewsCandidates.ts`
- Create: `src/collections/NewsCandidates.test.ts`
- Modify: `src/payload.config.ts`

**Interfaces:**
- Produces: `generateNewsCandidateNumber(now?: Date, uuid?: string): string`.
- Produces: `protectNewsCandidateCreateFields: CollectionBeforeValidateHook`.
- Produces: Payload collection slug `news-candidates`.
- Consumes: existing `authenticated` access function and `members` relation.

- [ ] **Step 1: Write the failing number tests**

Create `src/newsCandidates/newsCandidateNumber.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { generateNewsCandidateNumber } from './newsCandidateNumber'

describe('新闻候选编号', () => {
  it('包含日期和随机片段', () => {
    expect(generateNewsCandidateNumber(
      new Date('2026-08-17T09:00:00.000Z'),
      '12345678-abcd-4abc-8def-1234567890ab',
    )).toBe('NEWS-20260817-12345678')
  })

  it('随机片段统一使用大写', () => {
    expect(generateNewsCandidateNumber(
      new Date('2026-01-02T00:00:00.000Z'),
      'abcdef12-3456-4789-8abc-def123456789',
    )).toBe('NEWS-20260102-ABCDEF12')
  })
})
```

- [ ] **Step 2: Run the number test and verify the missing-module failure**

Run: `pnpm test --run src/newsCandidates/newsCandidateNumber.test.ts`

Expected: FAIL because `./newsCandidateNumber` does not exist.

- [ ] **Step 3: Implement the number helper**

Create `src/newsCandidates/newsCandidateNumber.ts`:

```ts
import { randomUUID } from 'node:crypto'

export function generateNewsCandidateNumber(
  now = new Date(),
  uuid = randomUUID(),
): string {
  const date = now.toISOString().slice(0, 10).replaceAll('-', '')
  const randomPart = uuid.replaceAll('-', '').slice(0, 8).toUpperCase()
  return `NEWS-${date}-${randomPart}`
}
```

- [ ] **Step 4: Run the number tests and verify they pass**

Run: `pnpm test --run src/newsCandidates/newsCandidateNumber.test.ts`

Expected: 2 tests PASS.

- [ ] **Step 5: Write failing collection tests**

Create `src/collections/NewsCandidates.test.ts`. Reuse the recursive field-flattening pattern from `Submissions.test.ts`, then assert:

```ts
expect(NewsCandidates.slug).toBe('news-candidates')
expect(NewsCandidates.admin).toMatchObject({
  defaultColumns: [
    'candidateNumber', 'title', 'relatedMember', 'category', 'status', 'discoveredAt',
  ],
  group: '内容管理',
  useAsTitle: 'title',
})
expect(findField('candidateNumber')).toMatchObject({
  index: true, required: true, type: 'text', unique: true,
})
expect(findField('status')).toMatchObject({
  defaultValue: 'pending', required: true, type: 'select',
})
expect(findField('sourceType')).toMatchObject({
  defaultValue: 'manual', required: true, type: 'select',
})
expect(findField('relatedMember')).toMatchObject({
  relationTo: 'members', type: 'relationship',
})
```

Call `create`, `read`, `update`, and `delete` access functions with `req.user = null` and expect `false`. Call the create hook with hostile `candidateNumber`, `status`, `verificationNotes`, `verifiedAt`, and `discoveredAt`; verify that it generates a `NEWS-...` number and server time, forces `pending`, and clears the verification fields. Verify an update retains administrator review fields.

- [ ] **Step 6: Run the collection tests and verify the missing-export failure**

Run: `pnpm test --run src/collections/NewsCandidates.test.ts`

Expected: FAIL because `./NewsCandidates` does not exist.

- [ ] **Step 7: Implement and register the private collection**

Create `NewsCandidates` with administrator-only `create`, `read`, `update`, and `delete`; `defaultSort = '-discoveredAt'`; labels “新闻候选”; and tabs “候选信息”, “来源信息”, and “核实管理”. Define the exact fields from the design with these maximum lengths:

```ts
title: 300
relatedPersonName: 100
summary: 3000
sourceName: 200
sourceUrl: 2000
sourceReference: 500
verificationNotes: 5000
```

Use category values `creation`, `award`, `activity`, `media`, `personal`, `other`; source values `manual`, `publicTip`, `automaticSearch`; and status values `pending`, `verifying`, `confirmed`, `rejected`, `duplicate`. Add the exact warning “新闻候选未经人工核实不得发布；“已确认”不代表已经对外发布。” to the status admin description.

Set `sourceType.admin.readOnly = true` so a manual admin record keeps the default `manual`; later server code can still supply a reserved source value. Add a `sourceUrl` field validator that accepts blank values, parses nonblank text with `new URL(value)`, and returns a Chinese error unless the protocol is exactly `http:` or `https:`.

Implement the create hook as:

```ts
export const protectNewsCandidateCreateFields: CollectionBeforeValidateHook = ({
  data,
  operation,
}) => {
  if (operation !== 'create') return data

  return {
    ...data,
    candidateNumber: generateNewsCandidateNumber(),
    discoveredAt: new Date().toISOString(),
    status: 'pending',
    verificationNotes: null,
    verifiedAt: null,
  }
}
```

Register it after `Submissions` in `src/payload.config.ts`:

```ts
collections: [Users, Members, Media, Submissions, NewsCandidates]
```

- [ ] **Step 8: Run focused collection tests**

Run: `pnpm test --run src/newsCandidates/newsCandidateNumber.test.ts src/collections/NewsCandidates.test.ts`

Expected: all focused tests PASS.

- [ ] **Step 9: Commit the private collection**

```bash
git add src/newsCandidates/newsCandidateNumber.ts src/newsCandidates/newsCandidateNumber.test.ts src/collections/NewsCandidates.ts src/collections/NewsCandidates.test.ts src/payload.config.ts
git commit -m "feat: add private news candidate collection"
```

---

### Task 2: Server-Only Ingestion Interface

**Files:**
- Create: `src/newsCandidates/ingestNewsCandidate.ts`
- Create: `src/newsCandidates/ingestNewsCandidate.test.ts`
- Create: `src/newsCandidates/payloadNewsCandidateStore.ts`

**Interfaces:**
- Produces: `newsCategories`, `newsSourceTypes`, `NewsCategory`, and `NewsSourceType`.
- Produces: `validateNewsCandidateInput(raw: unknown): NewsCandidateValidationResult`.
- Produces: `ingestNewsCandidate(raw, store): Promise<NewsCandidateIngestionResult>`.
- Produces: `NewsCandidateStore.create(data): Promise<{ candidateNumber: string }>`.
- Produces: `createPayloadNewsCandidateStore(payload: Payload): NewsCandidateStore`.
- Consumes: collection slug `news-candidates` and `generateNewsCandidateNumber`.

- [ ] **Step 1: Write failing validation and ingestion tests**

Use this valid fixture in `src/newsCandidates/ingestNewsCandidate.test.ts`:

```ts
const validInput = {
  category: 'activity',
  publishedAt: '2026-08-16T00:00:00.000Z',
  relatedPersonName: '虚构候选成员',
  sourceName: '虚构文学机构',
  sourceReference: 'fictional-source-001',
  sourceType: 'manual',
  sourceUrl: 'https://example.com/fictional-news',
  summary: '这是一条完全虚构、只用于自动化测试的新闻摘要。',
  title: 'Phase 3 虚构新闻候选',
}
```

Assert that whitespace is trimmed; optional blank strings become empty strings; `javascript:`, malformed URLs, invalid dates, unknown category/source values, oversized fields, arrays, and non-object input are rejected. For each of `candidateNumber`, `status`, `verificationNotes`, `verifiedAt`, and `discoveredAt`, add the key to the input and verify the whole request is rejected as containing a disallowed field.

Use a fake store to verify successful ingestion passes only the normalized public-to-internal fields and returns exactly:

```ts
{ candidateNumber: 'NEWS-20260817-ABCDEF12', kind: 'created' }
```

Make the fake store throw and verify the error propagates without a fabricated success result.

- [ ] **Step 2: Run the tests and verify the missing-module failure**

Run: `pnpm test --run src/newsCandidates/ingestNewsCandidate.test.ts`

Expected: FAIL because `./ingestNewsCandidate` does not exist.

- [ ] **Step 3: Implement strict input validation and orchestration**

Define the input data as:

```ts
export type ValidNewsCandidateInput = {
  category: NewsCategory
  publishedAt: string
  relatedMember?: number | string
  relatedPersonName: string
  sourceName: string
  sourceReference: string
  sourceType: NewsSourceType
  sourceUrl: string
  summary: string
  title: string
}
```

The allowlist must contain only these nine keys. Require a nonblank `title`, `category`, and `sourceType`. Apply the exact length limits from Task 1. Treat a blank optional date or URL as valid; otherwise require a parseable ISO date and a URL whose `protocol` is exactly `http:` or `https:`. Accept `relatedMember` only when it is a positive integer or nonblank string. Return field-specific Chinese errors and never mutate the caller's object.

Implement orchestration as:

```ts
export async function ingestNewsCandidate(
  raw: unknown,
  store: NewsCandidateStore,
): Promise<NewsCandidateIngestionResult> {
  const validation = validateNewsCandidateInput(raw)
  if (!validation.ok) {
    return { fieldErrors: validation.fieldErrors, kind: 'invalid', message: validation.message }
  }

  const created = await store.create(validation.data)
  return { candidateNumber: created.candidateNumber, kind: 'created' }
}
```

- [ ] **Step 4: Run ingestion tests and verify they pass**

Run: `pnpm test --run src/newsCandidates/ingestNewsCandidate.test.ts`

Expected: all ingestion tests PASS.

- [ ] **Step 5: Implement the Payload store adapter**

Create a server-only adapter that calls:

```ts
payload.create({
  collection: 'news-candidates',
  data: {
    ...data,
    candidateNumber: generateNewsCandidateNumber(),
    discoveredAt: new Date().toISOString(),
    status: 'pending',
  },
  overrideAccess: true,
})
```

Return only `{ candidateNumber: created.candidateNumber }`. Do not export an HTTP handler or browser function.

- [ ] **Step 6: Run every news-candidate unit test**

Run: `pnpm test --run src/newsCandidates src/collections/NewsCandidates.test.ts`

Expected: all news-candidate tests PASS.

- [ ] **Step 7: Commit the internal interface**

```bash
git add src/newsCandidates/ingestNewsCandidate.ts src/newsCandidates/ingestNewsCandidate.test.ts src/newsCandidates/payloadNewsCandidateStore.ts
git commit -m "feat: add news candidate ingestion interface"
```

---

### Task 3: Generated Types, Runtime Verification, and Documentation

**Files:**
- Create: `scripts/verify-phase-3.ts`
- Modify: `src/payload-types.ts`
- Modify: `src/app/(payload)/admin/importMap.js`
- Modify: `README.md`
- Modify: `src/app/(frontend)/page.tsx`

**Interfaces:**
- Consumes: `ingestNewsCandidate`, `createPayloadNewsCandidateStore`, Payload Local API, and the running local app.
- Produces: repeatable `pnpm payload run scripts/verify-phase-3.ts` verification.

- [ ] **Step 1: Generate Payload types and import map**

Run:

```bash
pnpm generate:types
pnpm generate:importmap
```

Expected: generated code includes collection slug `news-candidates` and TypeScript accepts the Payload store adapter.

- [ ] **Step 2: Write the runtime verification script**

Create `scripts/verify-phase-3.ts` with a random fictional member slug and source reference. In a `try/finally` block:

1. Call the internal ingestion interface using `sourceType: 'manual'` and fully fictional content.
2. Find exactly one candidate by its returned candidate number and verify `status === 'pending'`, no member link, no verification notes, and a `NEWS-...` number.
3. Create a fictional member, update the candidate to `verifying`, associate the member, and save fictional verification notes.
4. Fetch `/api/news-candidates?limit=1` without login and require HTTP 403.
5. Fetch `/`, `/submit`, and `/admin` and require HTTP 200.
6. In `finally`, delete the fictional candidate and member, query both identifiers again, and require zero remaining records.

Print one short Chinese `PASS` line for each verified behavior. Do not print full candidate content, database credentials, or Secret values.

- [ ] **Step 3: Update plain-Chinese documentation and homepage wording**

Update README to say Phase 3 includes a private “新闻候选” backend, list the five statuses, repeat the “人工核实后才能使用” warning, explain that the internal interface has no public URL, and document:

```bash
pnpm payload run scripts/verify-phase-3.ts
```

Keep explicit statements that `/tip`, automatic search, AI, public news pages, and WeChat are absent. Update the homepage status sentence to “用于提交文学作品、管理成员资料和整理新闻候选的内容平台。” without adding any public news or tip link.

- [ ] **Step 4: Run the complete automated verification**

Run:

```bash
pnpm test --run
pnpm lint
pnpm generate:types
pnpm build
```

Expected: every command exits 0.

- [ ] **Step 5: Run PostgreSQL/Payload and HTTP verification**

Confirm PostgreSQL and the app are running, then run:

```bash
pnpm payload run scripts/verify-phase-3.ts
```

Expected: every behavior prints `PASS`; fictional data cleanup reports zero remaining records.

- [ ] **Step 6: Inspect privacy and scope boundaries**

Run:

```bash
rg -n "tip|automaticSearch|publicTip|AI|微信|disability|残疾|contact|联系方式" src scripts README.md
git status --short --ignored
```

Expected: `automaticSearch` and `publicTip` occur only as reserved source values or documentation; there is no `/tip`, public candidate route, tip-provider identity field, real credential, tracked `.env`, database directory, or build output.

- [ ] **Step 7: Commit the completed Phase 3 implementation**

```bash
git add README.md scripts/verify-phase-3.ts src/app/(frontend)/page.tsx src/payload-types.ts src/app/(payload)/admin/importMap.js
git commit -m "chore: verify phase 3 news workflow"
```

- [ ] **Step 8: Merge, push, and leave the app running**

Verify `git status -sb` is clean, push `main` to the existing private GitHub repository, start the final development server on port 3000, and confirm HTTP 200 for `/`, `/submit`, and `/admin`. Stop without entering Phase 4.
