# Phase 2 Submission System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-friendly public `/submit` form that safely stores private submissions in Payload CMS for administrator review.

**Architecture:** Keep Payload collections private and expose one narrow Next.js route handler for public creation. Put validation, rate limiting, duplicate protection, and storage behind focused TypeScript modules so the security boundary can be tested without a browser or database. Use Payload's existing admin UI for review and a small client component for the accessible mobile form.

**Tech Stack:** Next.js 16 App Router, React 19, Payload CMS 3.88, PostgreSQL, TypeScript 5.9, Vitest 4, pnpm 11.

## Global Constraints

- Phase 2 accepts pasted plain text only; do not add file uploads or a rich-text editor.
- Public users do not register or log in.
- All submissions, contact details, member links, and review notes remain administrator-only.
- The public page must not expose the 32-member list or any disability information.
- AI, news search, notifications, public work pages, WeChat APIs, deployment, and Docker Compose remain out of scope.
- Public input is limited to a fixed allowlist and must never set status, review notes, member links, submission numbers, or timestamps.
- Store no passwords, API keys, real contact details, or real submissions in source control or test fixtures.
- Use clear Chinese copy, mobile touch targets, keyboard navigation, visible focus, explicit labels, and screen-reader-compatible errors.
- Use one existing Next.js/Payload/PostgreSQL application; add no Redis, CAPTCHA provider, email service, or external form service.

---

## File Map

- Create `src/collections/Submissions.ts`: Payload collection fields, private access, admin columns, and server-managed create hook.
- Create `src/collections/Submissions.test.ts`: collection structure, defaults, access, and managed-field tests.
- Create `src/submissions/submissionNumber.ts`: server-generated receipt number helper.
- Create `src/submissions/submissionNumber.test.ts`: deterministic number-format tests.
- Create `src/submissions/publicSubmission.ts`: public field allowlist, normalization, validation, result types, rate limiter, duplicate handling, and submission orchestration.
- Create `src/submissions/publicSubmission.test.ts`: validation, malicious-field, honeypot, limiting, duplicate, and storage-failure tests.
- Create `src/submissions/payloadSubmissionStore.ts`: narrow adapter from the public orchestration interface to Payload Local API.
- Create `src/app/(frontend)/api/public/submissions/route.ts`: JSON HTTP adapter with safe status codes and messages.
- Create `src/app/(frontend)/api/public/submissions/route.test.ts`: mocked route-level response and error tests.
- Create `src/app/(frontend)/submit/page.tsx`: public page metadata and server-generated one-time request token.
- Create `src/app/(frontend)/submit/SubmissionForm.tsx`: accessible client-side form and success/error states.
- Create `src/app/(frontend)/submit/SubmissionForm.module.css`: mobile and accessibility styling.
- Create `src/app/(frontend)/submit/SubmissionForm.test.tsx`: initial form semantics and privacy-copy tests.
- Create `scripts/verify-phase-2.ts`: end-to-end fictional submission, review, privacy, and cleanup check.
- Modify `src/payload.config.ts`: register `Submissions`.
- Modify `src/app/(frontend)/page.tsx`: link to the new submission page and update phase wording.
- Modify `src/app/(frontend)/page.test.tsx`: verify the submission link.
- Modify `README.md`: explain the submission workflow and verification command in plain Chinese.
- Regenerate `src/payload-types.ts` and `src/app/(payload)/admin/importMap.js` using Payload commands.

---

### Task 1: Private Submission Collection

**Files:**
- Create: `src/submissions/submissionNumber.ts`
- Create: `src/submissions/submissionNumber.test.ts`
- Create: `src/collections/Submissions.ts`
- Create: `src/collections/Submissions.test.ts`
- Modify: `src/payload.config.ts`

**Interfaces:**
- Produces: `generateSubmissionNumber(now?: Date, uuid?: string): string`.
- Produces: Payload collection slug `submissions` for the public storage adapter and admin UI.
- Consumes: existing `authenticated` access function and `members` relation.

- [ ] **Step 1: Write failing receipt-number tests**

Create `src/submissions/submissionNumber.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { generateSubmissionNumber } from './submissionNumber'

describe('投稿编号', () => {
  it('包含日期和不连续的随机片段', () => {
    expect(
      generateSubmissionNumber(
        new Date('2026-08-17T09:00:00.000Z'),
        '12345678-abcd-4abc-8def-1234567890ab',
      ),
    ).toBe('WC-20260817-12345678')
  })

  it('随机片段统一使用大写', () => {
    expect(
      generateSubmissionNumber(
        new Date('2026-01-02T00:00:00.000Z'),
        'abcdef12-3456-4789-8abc-def123456789',
      ),
    ).toBe('WC-20260102-ABCDEF12')
  })
})
```

- [ ] **Step 2: Run the receipt-number tests and confirm the missing-module failure**

Run: `pnpm test --run src/submissions/submissionNumber.test.ts`

Expected: FAIL because `./submissionNumber` does not exist.

- [ ] **Step 3: Implement the receipt-number helper**

Create `src/submissions/submissionNumber.ts`:

```ts
import { randomUUID } from 'node:crypto'

export function generateSubmissionNumber(
  now = new Date(),
  uuid = randomUUID(),
): string {
  const date = now.toISOString().slice(0, 10).replaceAll('-', '')
  const randomPart = uuid.replaceAll('-', '').slice(0, 8).toUpperCase()
  return `WC-${date}-${randomPart}`
}
```

- [ ] **Step 4: Run the receipt-number tests and confirm they pass**

Run: `pnpm test --run src/submissions/submissionNumber.test.ts`

Expected: 2 tests PASS.

- [ ] **Step 5: Write failing collection tests**

Create `src/collections/Submissions.test.ts`. Flatten tabs using the same helper pattern as `Members.test.ts`, then assert:

```ts
expect(Submissions.slug).toBe('submissions')
expect(Submissions.admin?.useAsTitle).toBe('title')
expect(findField('submissionNumber')).toMatchObject({
  index: true,
  required: true,
  type: 'text',
  unique: true,
})
expect(findField('requestToken')).toMatchObject({
  index: true,
  required: true,
  type: 'text',
  unique: true,
})
expect(findField('status')).toMatchObject({
  defaultValue: 'submitted',
  required: true,
  type: 'select',
})
expect(findField('relatedMember')).toMatchObject({
  relationTo: 'members',
  type: 'relationship',
})
expect(findField('rightsConfirmed')).toMatchObject({
  required: true,
  type: 'checkbox',
})
```

Also call all four collection access functions with `req.user = null` and assert `false`. Call the `beforeValidate` hook for a create operation with hostile values for `submissionNumber`, `status`, `reviewNotes`, `relatedMember`, and `submittedAt`; assert that the hook replaces managed fields with a generated receipt, `submitted`, empty review/member values, and a server timestamp.

- [ ] **Step 6: Run collection tests and confirm the missing-export failure**

Run: `pnpm test --run src/collections/Submissions.test.ts`

Expected: FAIL because `./Submissions` does not exist.

- [ ] **Step 7: Implement the private collection and create hook**

Create `src/collections/Submissions.ts` with:

```ts
import { randomUUID } from 'node:crypto'
import type { CollectionBeforeValidateHook, CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import { generateSubmissionNumber } from '../submissions/submissionNumber'

export const protectSubmissionCreateFields: CollectionBeforeValidateHook = ({
  data,
  operation,
}) => {
  if (operation !== 'create') return data

  return {
    ...data,
    relatedMember: null,
    requestToken: data?.requestToken || randomUUID(),
    reviewNotes: null,
    status: 'submitted',
    submissionNumber: generateSubmissionNumber(),
    submittedAt: new Date().toISOString(),
  }
}
```

Define `Submissions: CollectionConfig` with administrator-only `create`, `read`, `update`, and `delete`; `admin.group = '内容管理'`; `useAsTitle = 'title'`; and default columns `submissionNumber`, `title`, `submitterName`, `category`, `status`, `submittedAt`.

Use tabs named “稿件内容” and “审核管理”. Define exact field names from the design. Use select values `poetry`, `fiction`, `prose`, `criticism`, `other` and statuses `submitted`, `reviewing`, `revisionRequested`, `accepted`, `rejected`. Mark `submissionNumber`, `requestToken`, and `submittedAt` read-only in admin; hide `requestToken`; keep `reviewNotes` and `relatedMember` only in the review tab.

Modify `src/payload.config.ts`:

```ts
import { Submissions } from './collections/Submissions'

// Keep existing collections and add submissions.
collections: [Users, Members, Media, Submissions],
```

- [ ] **Step 8: Run the focused collection tests**

Run: `pnpm test --run src/submissions/submissionNumber.test.ts src/collections/Submissions.test.ts`

Expected: all focused tests PASS.

- [ ] **Step 9: Commit the collection**

```bash
git add src/submissions/submissionNumber.ts src/submissions/submissionNumber.test.ts src/collections/Submissions.ts src/collections/Submissions.test.ts src/payload.config.ts
git commit -m "feat: add private submissions collection"
```

---

### Task 2: Public Validation, Rate Limiting, and Duplicate Protection

**Files:**
- Create: `src/submissions/publicSubmission.ts`
- Create: `src/submissions/publicSubmission.test.ts`

**Interfaces:**
- Produces: `validatePublicSubmission(raw: unknown): ValidationResult`.
- Produces: `SubmissionRateLimiter.consume(source: string, now?: number): boolean`.
- Produces: `processPublicSubmission(raw, source, dependencies): Promise<ProcessResult>`.
- Produces: `SubmissionStore` interface used by the Payload adapter.

- [ ] **Step 1: Write failing validation and service tests**

Create `src/submissions/publicSubmission.test.ts` with the valid fixture:

```ts
const validInput = {
  category: 'prose',
  contact: 'fictional-wechat-contact',
  content: '这是一篇完全虚构、只用于自动化测试的投稿正文。',
  notes: '',
  penName: '测试笔名',
  requestToken: '12345678-abcd-4abc-8def-1234567890ab',
  rightsConfirmed: true,
  submitterName: '虚构投稿人',
  title: '虚构测试稿件',
  website: '',
}
```

Add explicit tests for:

- trimming valid strings and returning `ok: true`;
- missing name, contact, title, content, category, request token, or rights confirmation;
- rejecting content shorter than 20 characters or longer than 100,000 characters;
- rejecting an unknown category;
- rejecting any unknown input key such as `status`, `reviewNotes`, or `relatedMember`;
- rejecting a filled `website` honeypot;
- allowing five requests per source in ten minutes and rejecting the sixth;
- allowing requests again after the ten-minute window;
- returning an existing submission number for the same request token without creating a second row;
- returning `rateLimited` without calling `store.create`;
- passing only normalized public fields to `store.create`;
- propagating a storage exception so the route can return a generic server error.

Use an in-memory fake implementing:

```ts
interface SubmissionStore {
  findByRequestToken(token: string): Promise<{ submissionNumber: string } | null>
  create(data: ValidSubmission): Promise<{ submissionNumber: string }>
}
```

- [ ] **Step 2: Run the focused tests and confirm the missing-module failure**

Run: `pnpm test --run src/submissions/publicSubmission.test.ts`

Expected: FAIL because `./publicSubmission` does not exist.

- [ ] **Step 3: Implement exact validation limits and allowlist**

Create `src/submissions/publicSubmission.ts` with these constants:

```ts
export const submissionCategories = [
  'poetry',
  'fiction',
  'prose',
  'criticism',
  'other',
] as const

const allowedKeys = new Set([
  'category',
  'contact',
  'content',
  'notes',
  'penName',
  'requestToken',
  'rightsConfirmed',
  'submitterName',
  'title',
  'website',
])

const limits = {
  contact: 100,
  contentMax: 100_000,
  contentMin: 20,
  name: 100,
  notes: 2_000,
  penName: 100,
  title: 200,
} as const
```

Accept only a plain object. Reject unknown keys before normalization. Require UUID syntax for `requestToken`, require `rightsConfirmed === true`, require an empty `website`, trim strings, and return Chinese field messages keyed by the exact form field name. Return only normalized fields needed for storage; do not include `website`.

- [ ] **Step 4: Implement the rate limiter and orchestrator**

In the same file, implement:

```ts
export class SubmissionRateLimiter {
  private readonly attempts = new Map<string, number[]>()

  constructor(
    private readonly limit = 5,
    private readonly windowMs = 10 * 60 * 1000,
  ) {}

  consume(source: string, now = Date.now()): boolean {
    const recent = (this.attempts.get(source) ?? []).filter(
      (timestamp) => now - timestamp < this.windowMs,
    )
    if (recent.length >= this.limit) return false
    recent.push(now)
    this.attempts.set(source, recent)
    return true
  }
}
```

`processPublicSubmission` must validate first, check `store.findByRequestToken` second, consume the limiter third, and call `store.create` last. Use a discriminated union with outcomes `invalid`, `rateLimited`, and `created`; the created result contains only `submissionNumber` and `duplicate`.

- [ ] **Step 5: Run the focused tests**

Run: `pnpm test --run src/submissions/publicSubmission.test.ts`

Expected: all validation, limit, duplicate, and failure tests PASS.

- [ ] **Step 6: Commit the public submission domain**

```bash
git add src/submissions/publicSubmission.ts src/submissions/publicSubmission.test.ts
git commit -m "feat: validate public submissions"
```

---

### Task 3: Narrow Public HTTP Endpoint

**Files:**
- Create: `src/submissions/payloadSubmissionStore.ts`
- Create: `src/app/(frontend)/api/public/submissions/route.ts`
- Create: `src/app/(frontend)/api/public/submissions/route.test.ts`

**Interfaces:**
- Consumes: `SubmissionStore`, `processPublicSubmission`, and `SubmissionRateLimiter` from Task 2.
- Produces: `POST /api/public/submissions` JSON endpoint.

- [ ] **Step 1: Write failing route tests with Payload mocked**

Create `route.test.ts` and mock `payload`, `@payload-config`, and `payloadSubmissionStore` before dynamically importing the route. Test these exact responses:

```ts
expect(response.status).toBe(201)
expect(await response.json()).toEqual({
  submissionNumber: 'WC-20260817-ABCDEF12',
})
```

Also test malformed JSON returns 400; validation failure returns 400 with `fieldErrors`; rate limiting returns 429; and a thrown storage error returns 500 with only `{ message: '投稿暂时未成功，请稍后再试。' }`. Assert no response includes submitted content, contact details, review fields, stack traces, or Payload documents.

- [ ] **Step 2: Run the route tests and confirm the missing-route failure**

Run: `pnpm test --run 'src/app/(frontend)/api/public/submissions/route.test.ts'`

Expected: FAIL because `route.ts` does not exist.

- [ ] **Step 3: Implement the Payload storage adapter**

Create `src/submissions/payloadSubmissionStore.ts`:

```ts
import type { Payload } from 'payload'

import type { SubmissionStore, ValidSubmission } from './publicSubmission'
import { generateSubmissionNumber } from './submissionNumber'

export function createPayloadSubmissionStore(payload: Payload): SubmissionStore {
  return {
    async findByRequestToken(token) {
      const result = await payload.find({
        collection: 'submissions',
        depth: 0,
        limit: 1,
        overrideAccess: true,
        where: { requestToken: { equals: token } },
      })
      const existing = result.docs[0]
      return existing ? { submissionNumber: existing.submissionNumber } : null
    },
    async create(data: ValidSubmission) {
      const created = await payload.create({
        collection: 'submissions',
        data: {
          ...data,
          status: 'submitted',
          submissionNumber: generateSubmissionNumber(),
          submittedAt: new Date().toISOString(),
        },
        overrideAccess: true,
      })
      return { submissionNumber: created.submissionNumber }
    },
  }
}
```

The collection hook, not this adapter, owns the status, receipt number, member link, review notes, and submitted timestamp.

- [ ] **Step 4: Implement the route adapter**

Create `route.ts` with one module-level `new SubmissionRateLimiter()`. Derive the source key from the first `x-forwarded-for` value, then `x-real-ip`, then `local`; truncate it to 100 characters. Parse JSON in a dedicated `try` block, initialize Payload with `getPayload({ config })`, pass the narrow store into `processPublicSubmission`, and return:

- `201` with only `{ submissionNumber }` for both new and safely repeated request tokens;
- `400` with `{ message, fieldErrors }` for invalid input;
- `429` with `{ message: '提交次数较多，请十分钟后再试。' }`;
- `500` with `{ message: '投稿暂时未成功，请稍后再试。' }` for unexpected failures.

Do not log the raw request or error object because it may include the article or contact information.

- [ ] **Step 5: Run route and domain tests**

Run: `pnpm test --run src/submissions/publicSubmission.test.ts 'src/app/(frontend)/api/public/submissions/route.test.ts'`

Expected: all focused tests PASS.

- [ ] **Step 6: Commit the endpoint**

```bash
git add src/submissions/payloadSubmissionStore.ts 'src/app/(frontend)/api/public/submissions/route.ts' 'src/app/(frontend)/api/public/submissions/route.test.ts'
git commit -m "feat: add safe public submission endpoint"
```

---

### Task 4: Accessible Mobile Submission Page

**Files:**
- Create: `src/app/(frontend)/submit/page.tsx`
- Create: `src/app/(frontend)/submit/SubmissionForm.tsx`
- Create: `src/app/(frontend)/submit/SubmissionForm.module.css`
- Create: `src/app/(frontend)/submit/SubmissionForm.test.tsx`
- Modify: `src/app/(frontend)/page.tsx`
- Modify: `src/app/(frontend)/page.test.tsx`

**Interfaces:**
- Consumes: `POST /api/public/submissions` from Task 3.
- Produces: `/submit` page with one-time request token, accessible form, and receipt state.

- [ ] **Step 1: Write failing page and form tests**

In `SubmissionForm.test.tsx`, render the initial form with `renderToStaticMarkup(<SubmissionForm requestToken="12345678-abcd-4abc-8def-1234567890ab" />)` and assert markup contains:

- one `<form>` and a visible heading “提交文学作品”;
- explicit labels for 投稿人姓名、笔名、联系方式、文章标题、作品类别、文章正文、补充说明;
- a required rights checkbox and “原创或已经获得投稿授权” wording;
- the request token as a hidden input;
- the `website` honeypot without normal keyboard focus;
- a submit button named “确认投稿”;
- privacy copy saying the稿件和联系方式仅管理员可见;
- no member names, disability fields, file input, rich editor, login prompt, AI wording, or WeChat credential wording.

Modify `page.test.tsx` to assert the home markup contains `href="/submit"` and “我要投稿”.

- [ ] **Step 2: Run UI tests and confirm the missing-component failure**

Run: `pnpm test --run 'src/app/(frontend)/submit/SubmissionForm.test.tsx' 'src/app/(frontend)/page.test.tsx'`

Expected: FAIL because the submission files and home link do not exist.

- [ ] **Step 3: Implement the client form**

Create `SubmissionForm.tsx` with `'use client'`. Use an uncontrolled form plus component state for `submitting`, `fieldErrors`, `message`, and `submissionNumber`. On submit:

```ts
const formData = new FormData(event.currentTarget)
const payload = {
  category: String(formData.get('category') ?? ''),
  contact: String(formData.get('contact') ?? ''),
  content: String(formData.get('content') ?? ''),
  notes: String(formData.get('notes') ?? ''),
  penName: String(formData.get('penName') ?? ''),
  requestToken,
  rightsConfirmed: formData.get('rightsConfirmed') === 'on',
  submitterName: String(formData.get('submitterName') ?? ''),
  title: String(formData.get('title') ?? ''),
  website: String(formData.get('website') ?? ''),
}
```

POST JSON to `/api/public/submissions`. For 400, show field errors without clearing the form. For 429 or 500, show the returned general message. On 201, replace the form with a success panel containing only the receipt number, a reminder to save it, and a link back to `/`. Always restore the submit button after failure.

For every field, use `<label htmlFor>`, `required` where applicable, `aria-invalid`, and `aria-describedby` pointing to description and error IDs. Render general status inside `role="alert"` and receipt success inside `role="status"`. Keep the honeypot in an `aria-hidden="true"` wrapper with `tabIndex={-1}` and `autoComplete="off"`.

- [ ] **Step 4: Implement page metadata and one-time token**

Create `page.tsx` as a server component:

```tsx
import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'

import SubmissionForm from './SubmissionForm'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  description: '向三十二人文学志提交文学作品',
  title: '我要投稿｜Writers Circle',
}

export default function SubmitPage() {
  return <SubmissionForm requestToken={randomUUID()} />
}
```

- [ ] **Step 5: Add mobile and accessible styling**

Create the CSS module with a single-column form, maximum width 46rem, minimum 48px control/button height, 1rem or larger base text, strong label contrast, visible 3px `:focus-visible` outline, error text that includes an icon or wording rather than color alone, and a textarea minimum height of 18rem. At widths below 40rem, reduce outer padding but retain touch target sizes. Add a visually hidden honeypot using off-screen positioning, not `display: none`, so simple bots still encounter it.

- [ ] **Step 6: Update the home page**

Change the eyebrow from Phase 0 wording to “三十二人文学志”, replace the foundation-only status sentence with a neutral project description, and add a primary “我要投稿” link to `/submit` plus the existing administrator link. Keep the homepage free of member details and future feature claims.

- [ ] **Step 7: Run the UI tests**

Run: `pnpm test --run 'src/app/(frontend)/submit/SubmissionForm.test.tsx' 'src/app/(frontend)/page.test.tsx'`

Expected: all UI tests PASS.

- [ ] **Step 8: Commit the public page**

```bash
git add 'src/app/(frontend)/submit' 'src/app/(frontend)/page.tsx' 'src/app/(frontend)/page.test.tsx'
git commit -m "feat: add accessible submission form"
```

---

### Task 5: Runtime Verification, Documentation, and Final Checks

**Files:**
- Create: `scripts/verify-phase-2.ts`
- Modify: `README.md`
- Regenerate: `src/payload-types.ts`
- Regenerate: `src/app/(payload)/admin/importMap.js`

**Interfaces:**
- Consumes: running local PostgreSQL and Next.js application.
- Produces: repeatable `pnpm payload run scripts/verify-phase-2.ts` acceptance check that deletes its fictional data.

- [ ] **Step 1: Write the runtime verification script**

Create `scripts/verify-phase-2.ts`. Generate a new UUID and use obviously fictional values. The script must:

1. POST the valid fixture to `http://127.0.0.1:3000/api/public/submissions` and require HTTP 201.
2. Require the response to contain only a receipt matching `^WC-\d{8}-[A-F0-9]{8}$`.
3. POST the same request token again and require the same receipt.
4. Initialize Payload Local API and find exactly one row by request token.
5. Assert `status === 'submitted'`, `relatedMember` is empty, `reviewNotes` is empty, and all public fixture fields match.
6. Create one clearly fictional member through Payload Local API, update the fictional submission to `reviewing`, link that member, add a fictional internal note, and require all saved values.
7. Fetch `/api/submissions` without authentication and require HTTP 403.
8. In a `finally` block, delete every submission with that request token and delete the fictional member by its unique fictional slug.
9. Query both collections again and require zero remaining fictional submissions and zero remaining fictional members.

Never print the fictional article body or contact value. Print only named checkpoints, the receipt, and cleanup count.

- [ ] **Step 2: Update the Chinese README**

Add sections “公开投稿” and “投稿管理” explaining:

- local URLs `/submit` and `/admin`;
- what the contributor fills in;
- what the administrator can do;
- that all submissions are private and the public cannot query them;
- that Phase 2 accepts pasted text only;
- that real data must not be committed;
- the runtime command `pnpm payload run scripts/verify-phase-2.ts`;
- all excluded Phase 2 features from the design.

Update the opening description so it no longer claims the repository contains only Phase 0 or has no member/submission features.

- [ ] **Step 3: Regenerate Payload artifacts**

Run: `pnpm generate:types`

Expected: `src/payload-types.ts` contains the `submissions` collection and generated submission fields.

Run: `pnpm generate:importmap`

Expected: command exits 0 and the admin import map remains valid.

- [ ] **Step 4: Run the complete automated checks**

Run: `pnpm test --run`

Expected: all tests PASS with zero failures.

Run: `pnpm lint`

Expected: exit 0 with no ESLint errors.

Run: `pnpm generate:types`

Expected: exit 0 and no uncommitted type drift after the second run.

Run: `pnpm build`

Expected: production build exits 0 and lists `/`, `/submit`, `/admin`, and `/api/public/submissions` routes.

- [ ] **Step 5: Start or refresh the local services**

Ensure the project PostgreSQL instance is listening on `127.0.0.1:5432`. Start `pnpm dev` on port 3000 if the existing development process is not healthy. Do not expose the development server to the public internet.

- [ ] **Step 6: Run HTTP and end-to-end verification**

Require HTTP 200 for:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/submit
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/admin
```

Run: `pnpm payload run scripts/verify-phase-2.ts`

Expected: public creation, duplicate protection, private API denial, review update, and cleanup all report PASS; final fictional-row count is zero.

- [ ] **Step 7: Inspect secrets and repository scope**

Run:

```bash
git status --short --ignored
git diff --check
git grep -n -I -E '(PAYLOAD_SECRET=.{8,}|DATABASE_URI=postgres[^ ]+:[^@ ]+@|APP_SECRET=.{8,}|API_KEY=.{8,})' -- ':!pnpm-lock.yaml' ':!.env.example'
```

Expected: `.env`, `.postgres`, `.next`, and `node_modules` remain ignored; no real secret is tracked; only intended Phase 2 files are changed.

- [ ] **Step 8: Commit documentation and generated artifacts**

```bash
git add README.md scripts/verify-phase-2.ts src/payload-types.ts src/app/'(payload)'/admin/importMap.js
git commit -m "docs: explain submission workflow"
```

- [ ] **Step 9: Verify the final commit and push the private backup**

Run the full test, lint, type generation, build, runtime verification, and secret scan again after the final commit. Then push `main` to the existing private `origin` and verify:

```bash
git status -sb
git log -1 --oneline --decorate
```

Expected: `main` and `origin/main` point at the same commit, the worktree is clean, all fictional rows have been deleted, and the local development server remains available on port 3000.
