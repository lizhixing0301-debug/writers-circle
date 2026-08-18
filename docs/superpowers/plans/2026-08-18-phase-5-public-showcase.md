# Phase 5 Public Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build safe public member and verified-news pages that are maintained through the existing Payload CMS.

**Architecture:** A small server-only `publicContent` module will be the only bridge from Payload records to public pages. It will map allowlisted fields into dedicated public types, ensuring private data cannot reach React components. News records gain a manual `publiclyVisible` gate in addition to the existing human-verification status.

**Tech Stack:** Next.js App Router, React 19, Payload CMS 3, PostgreSQL, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-18-phase-5-public-showcase-design.md`

## Global Constraints

- Do not add external services, API keys, paid calls, AI, schedulers, Docker, deployment, public tips, or WeChat publishing.
- Never return contact data, internal notes, consent notes, search data, full biographies, candidate numbers, verification notes, source references, or an unapproved disability field to a public page.
- A member is public only when active, consent is granted, and profile display is enabled.
- A news item is public only when it is confirmed and the administrator enables its public switch.
- Run the relevant failing test before production code, then rerun it after the smallest passing implementation.

---

### Task 1: Add the manual publication gate to news candidates

**Files:**
- Modify: `src/collections/NewsCandidates.ts`
- Modify: `src/collections/NewsCandidates.test.ts`
- Modify: `src/payload-types.ts` (generated)

**Interfaces:**
- Produces: `NewsCandidate.publiclyVisible?: boolean | null`, defaulting to `false`.
- Consumed by: `getPublicNews` in Task 2.

- [ ] **Step 1: Write the failing collection test**

```ts
it('默认不允许新闻候选公开', () => {
  expect(findField('publiclyVisible')).toMatchObject({
    defaultValue: false,
    name: 'publiclyVisible',
    type: 'checkbox',
  })
})
```

- [ ] **Step 2: Run the focused test and verify the failure**

Run: `pnpm vitest run src/collections/NewsCandidates.test.ts`

Expected: FAIL because `publiclyVisible` is absent.

- [ ] **Step 3: Add the field under the existing 核实管理 tab**

```ts
{
  name: 'publiclyVisible',
  type: 'checkbox',
  label: '允许在公开动态页展示',
  defaultValue: false,
  admin: {
    description: '须先人工核实为“已确认”，再开启此项。关闭后不会在公开页面显示。',
  },
}
```

- [ ] **Step 4: Regenerate Payload types and verify the focused test**

Run: `pnpm generate:types && pnpm vitest run src/collections/NewsCandidates.test.ts`

Expected: generated types include the field and the test passes.

### Task 2: Build and test the server-only safe public-data layer

**Files:**
- Create: `src/publicContent/publicContent.ts`
- Create: `src/publicContent/publicContent.test.ts`

**Interfaces:**
- Produces: `PublicMember`, `PublicNewsItem`, `createPublicContentStore(payload)`, `getPublicMembers()`, `getPublicMemberBySlug(slug)`, `getPublicNews()`.
- Consumes: Payload Local API with `overrideAccess: true` only inside this module.
- Consumed by: Tasks 3 and 4.

- [ ] **Step 1: Write failing mapping tests**

```ts
it('只映射获授权成员的公开字段', async () => {
  const result = await store.getPublicMembers()
  expect(result[0]).toMatchObject({ name: '虚构作家', publicBiography: '公开简介' })
  expect(JSON.stringify(result)).not.toContain('internalNotes')
  expect(JSON.stringify(result)).not.toContain('consentNotes')
  expect(JSON.stringify(result)).not.toContain('searchKeywords')
})

it('只有对应残疾公开开关开启时才返回该字段', async () => {
  expect(await store.getPublicMemberBySlug('fictional-writer')).toMatchObject({
    disabilityCategory: '肢体',
    disabilityLevel: undefined,
  })
})

it('只返回已确认且主动允许公开的新闻', async () => {
  expect(await store.getPublicNews()).toEqual([
    expect.objectContaining({ title: '虚构文学动态' }),
  ])
})
```

- [ ] **Step 2: Run the focused test and verify the failure**

Run: `pnpm vitest run src/publicContent/publicContent.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement allowlisted types and data mapping**

Use Payload `find` queries that filter members on `status`, `consentStatus`, and `publicProfileEnabled`; filter news on `status='confirmed'` and `publiclyVisible=true`. Select only fields named in the spec. Map values into plain objects, with optional disability fields added only when their individual switches are true. For news, discard an associated member unless it itself satisfies the public-member predicate.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `pnpm vitest run src/publicContent/publicContent.test.ts`

Expected: PASS, including negative assertions for private fields.

### Task 3: Add public member list and detail pages

**Files:**
- Create: `src/app/(frontend)/members/page.tsx`
- Create: `src/app/(frontend)/members/[slug]/page.tsx`
- Create: `src/app/(frontend)/members/page.test.tsx`
- Create: `src/app/(frontend)/members/[slug]/page.test.tsx`
- Modify: `src/app/(frontend)/styles.css`

**Interfaces:**
- Consumes: `getPublicMembers()` and `getPublicMemberBySlug()` from Task 2.
- Produces: `/members` and `/members/[slug]`; missing or unapproved member calls Next `notFound()`.

- [ ] **Step 1: Write failing server-render tests**

```tsx
it('成员列表只渲染安全公开资料和详情链接', async () => {
  await expect(renderPage()).resolves.toContain('虚构作家')
  await expect(renderPage()).resolves.toContain('href="/members/fictional-writer"')
})

it('成员详情在记录不存在时调用 notFound', async () => {
  await expect(renderDetail({ slug: 'missing' })).rejects.toThrow('NEXT_NOT_FOUND')
})
```

- [ ] **Step 2: Run focused page tests and verify failure**

Run: `pnpm vitest run 'src/app/(frontend)/members/**/*.test.tsx'`

Expected: FAIL because the pages do not exist.

- [ ] **Step 3: Implement accessible pages**

Render Chinese headings, navigation back to the home page, an empty-state message, public avatar alt text, structured literature information, representative works, and each separately approved disability field. Use semantic `main`, `article`, `nav`, `ul`, and `time`; do not display a disability heading when neither field is public.

- [ ] **Step 4: Run focused page tests and verify pass**

Run: `pnpm vitest run 'src/app/(frontend)/members/**/*.test.tsx'`

Expected: PASS.

### Task 4: Add verified public news page and update the home page

**Files:**
- Create: `src/app/(frontend)/news/page.tsx`
- Create: `src/app/(frontend)/news/page.test.tsx`
- Modify: `src/app/(frontend)/page.tsx`
- Modify: `src/app/(frontend)/page.test.tsx`
- Modify: `src/app/(frontend)/styles.css`

**Interfaces:**
- Consumes: `getPublicNews()` from Task 2.
- Produces: `/news`, and homepage links to `/members`, `/news`, `/submit`.

- [ ] **Step 1: Write failing rendering tests**

```tsx
it('公开动态页展示来源链接但不展示核实记录', async () => {
  const markup = await renderPage()
  expect(markup).toContain('虚构文学动态')
  expect(markup).toContain('查看原文')
  expect(markup).not.toContain('仅内部核实')
})

it('首页提供成员和动态入口', () => {
  const markup = renderToStaticMarkup(<HomePage />)
  expect(markup).toContain('href="/members"')
  expect(markup).toContain('href="/news"')
})
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `pnpm vitest run 'src/app/(frontend)/news/page.test.tsx' 'src/app/(frontend)/page.test.tsx'`

Expected: FAIL because news page and homepage links are missing.

- [ ] **Step 3: Implement the public dynamic list and homepage navigation**

Show title, category, date, optional related public member link, summary, source name and safe external `https?` link. Use `target="_blank"` with `rel="noreferrer"` for sources. Keep the existing submission entry; visually demote the administrative link.

- [ ] **Step 4: Run focused tests and verify pass**

Run: `pnpm vitest run 'src/app/(frontend)/news/page.test.tsx' 'src/app/(frontend)/page.test.tsx'`

Expected: PASS.

### Task 5: Document, run full verification, and publish the backup

**Files:**
- Modify: `README.md`
- Create: `scripts/verify-phase-5.ts`

**Interfaces:**
- Produces: a Chinese maintenance guide and a disposable real-database Phase 5 verifier.

- [ ] **Step 1: Write the verifier’s failing assertion for private-field exclusion**

```ts
assert.equal('internalNotes' in publicMember, false)
assert.equal('consentNotes' in publicMember, false)
assert.equal(publicNews.some((item) => item.title === hiddenTitle), false)
```

- [ ] **Step 2: Run the new verifier and verify it fails before it is implemented**

Run: `pnpm payload run scripts/verify-phase-5.ts`

Expected: FAIL because the script does not exist.

- [ ] **Step 3: Implement disposable verification and update README**

Create fully fictional member/news records, test public/hidden combinations and HTTP responses for `/`, `/members`, `/members/<slug>`, `/news`, then delete all created records in `finally`. Document the exact administrator workflow and state that no API call is made by public pages.

- [ ] **Step 4: Run all final checks**

Run: `pnpm test --run && pnpm lint && pnpm generate:types && pnpm build && pnpm payload run scripts/verify-phase-5.ts`

Expected: all commands exit 0.

- [ ] **Step 5: Commit and push the verified phase**

Run: `git add <phase-5 files> && git commit -m "feat: add safe public showcase" && git push origin main`

Expected: the local `main` branch and the private GitHub backup point to the new commit.
