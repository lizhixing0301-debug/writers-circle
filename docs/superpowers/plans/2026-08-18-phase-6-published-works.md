# Phase 6 Published Works Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manually controlled public literary-works section without ever auto-publishing submissions or exposing private submission data.

**Architecture:** A private Payload `published-works` collection stores editorial copies of public works. Server hooks enforce authorization and publication-state consistency; the existing `publicContent` boundary queries only published, authorized records and maps an explicit whitelist into public page types.

**Tech Stack:** Next.js 16 App Router, React 19, Payload CMS 3.88, PostgreSQL, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-18-phase-6-published-works-design.md`

## Global Constraints

- Never automatically publish, copy, or transform a submission.
- Never expose submission contacts, numbers, notes, review state, authorization notes, source relationships, or private member fields.
- Store and render work content as plain text only; do not use `dangerouslySetInnerHTML`.
- A work is public only when `status='published'` and `publicationAuthorized=true`.
- Do not call external APIs or add AI, WeChat publishing, schedulers, deployment, or Docker.
- Every production behavior starts with a focused failing test and ends with full verification.

---

### Task 1: Create the private published-works collection and safety hook

**Files:**
- Create: `src/collections/PublishedWorks.ts`
- Create: `src/collections/PublishedWorks.test.ts`
- Modify: `src/payload.config.ts`
- Modify: `src/payload-types.ts` (generated)

**Interfaces:**
- Produces: collection slug `published-works` and `enforcePublishedWorkSafety(data, originalDoc, operation)`.
- Consumed by: the public-content store in Task 2.

- [ ] **Step 1: Write failing tests for private access and publication safety**

```ts
it('未获授权时自动保持草稿', () => {
  expect(normalizePublishedWork({ publicationAuthorized: false, status: 'published' }))
    .toMatchObject({ publicationAuthorized: false, publishedAt: null, status: 'draft' })
})

it('首次发布时由服务器生成发布时间', () => {
  const result = normalizePublishedWork({ publicationAuthorized: true, status: 'published' })
  expect(Number.isNaN(Date.parse(String(result.publishedAt)))).toBe(false)
})

it.each(['create', 'read', 'update', 'delete'] as const)('未登录时拒绝 %s', (operation) => {
  expect(runAccess(operation, null)).toBe(false)
})
```

- [ ] **Step 2: Run the focused test**

Run: `pnpm vitest run src/collections/PublishedWorks.test.ts`

Expected: FAIL because the collection does not exist.

- [ ] **Step 3: Implement the collection and hook**

Use tabs “公开内容” and “发布管理”. Add `title`, `slug`, `authorName`, `relatedMember`, `category`, `excerpt`, `content`, `sourceSubmission`, `publicationAuthorized`, `authorizationNotes`, `status`, and `publishedAt`. Use authenticated-only collection access and a slug validator matching `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`.

- [ ] **Step 4: Register the collection, generate types, and rerun tests**

Run: `pnpm generate:types && pnpm vitest run src/collections/PublishedWorks.test.ts`

Expected: collection tests pass and generated types include `PublishedWork`.

### Task 2: Extend the safe public-content boundary

**Files:**
- Modify: `src/publicContent/publicContent.ts`
- Modify: `src/publicContent/publicContent.test.ts`
- Modify: `src/publicContent/getPublicContent.ts`

**Interfaces:**
- Produces: `PublicWork`, `toPublicWork`, `getPublicWorks()`, and `getPublicWorkBySlug(slug)`.
- Consumes: selected `PublishedWork` fields from Payload Local API.
- Consumed by: public pages in Task 3.

- [ ] **Step 1: Write failing privacy-boundary tests**

```ts
it('只返回已发布且已获授权的作品', async () => {
  const works = await store.getPublicWorks()
  expect(works.map((work) => work.title)).toEqual(['允许公开的虚构作品'])
})

it('公开作品不包含投稿和授权后台字段', async () => {
  const text = JSON.stringify(await store.getPublicWorks())
  expect(text).not.toContain('sourceSubmission')
  expect(text).not.toContain('authorizationNotes')
  expect(text).not.toContain('contact')
})
```

- [ ] **Step 2: Run the focused test**

Run: `pnpm vitest run src/publicContent/publicContent.test.ts`

Expected: FAIL because the work methods do not exist.

- [ ] **Step 3: Implement allowlisted work mapping and queries**

Query `published-works` with both publication conditions, select only title/slug/author/category/excerpt/content/publishedAt/relatedMember/status/authorization flag, and map the related member only through the existing member-publication predicate.

- [ ] **Step 4: Rerun the focused test**

Run: `pnpm vitest run src/publicContent/publicContent.test.ts`

Expected: all public-content tests pass.

### Task 3: Add public work list and detail pages

**Files:**
- Create: `src/app/(frontend)/works/page.tsx`
- Create: `src/app/(frontend)/works/page.test.tsx`
- Create: `src/app/(frontend)/works/[slug]/page.tsx`
- Create: `src/app/(frontend)/works/[slug]/page.test.tsx`
- Modify: `src/app/(frontend)/page.tsx`
- Modify: `src/app/(frontend)/page.test.tsx`
- Modify: `src/app/(frontend)/styles.css`

**Interfaces:**
- Consumes: `getPublicWorks()` and `getPublicWorkBySlug(slug)`.
- Produces: `/works`, `/works/[slug]`, and the homepage works link.

- [ ] **Step 1: Write failing rendering and 404 tests**

```tsx
it('作品列表显示公开署名和详情链接', async () => {
  const markup = renderToStaticMarkup(await WorksPage())
  expect(markup).toContain('允许公开的虚构作品')
  expect(markup).toContain('href="/works/fictional-work"')
})

it('不存在或未公开作品返回 404', async () => {
  await expect(WorkPage({ params: Promise.resolve({ slug: 'hidden' }) }))
    .rejects.toThrow('NEXT_NOT_FOUND')
})
```

- [ ] **Step 2: Run the focused page tests**

Run: `pnpm vitest run 'src/app/(frontend)/works/page.test.tsx' 'src/app/(frontend)/works/[slug]/page.test.tsx' 'src/app/(frontend)/page.test.tsx'`

Expected: FAIL because the pages and homepage link do not exist.

- [ ] **Step 3: Implement accessible plain-text pages and styles**

Render work cards with category, title, public author, excerpt and date. Render detail content by splitting on blank lines and returning ordinary `<p>` elements. Link to a related member only when the safe public object contains that member.

- [ ] **Step 4: Rerun focused page tests**

Run the same Vitest command.

Expected: all work-page and homepage tests pass.

### Task 4: Add real-database verification, documentation, and GitHub backup

**Files:**
- Create: `scripts/verify-phase-6.ts`
- Modify: `README.md`

**Interfaces:**
- Produces: a disposable fictional-data verifier and Chinese administrator instructions.

- [ ] **Step 1: Confirm the verifier is initially absent**

Run: `pnpm payload run scripts/verify-phase-6.ts`

Expected: FAIL with module not found.

- [ ] **Step 2: Implement fictional runtime verification**

Create one authorized published work and one hidden draft, check the safe store, check `/works`, the public detail, and hidden 404, then delete all created work records in `finally`. Assert serialized public data omits `sourceSubmission`, `authorizationNotes`, and any submission contact.

- [ ] **Step 3: Document the non-programmer workflow**

Explain: open “公开作品”, create/edit a work, verify public byline and text, record authorization, enable authorization, set “已发布”, save, and use `/works` to check it. Explicitly state accepted submissions never auto-publish.

- [ ] **Step 4: Run the full verification gate**

Run: `pnpm test --run && pnpm lint && pnpm generate:types && pnpm build && pnpm payload run scripts/verify-phase-6.ts`

Expected: all commands exit 0, fictional records are removed, and no external API is called.

- [ ] **Step 5: Merge and back up**

Commit the Phase 6 files, fast-forward `main`, rerun the full tests on merged `main`, and push `origin main` to the existing private repository. Keep `.env`, media uploads, database files, and secrets ignored.
