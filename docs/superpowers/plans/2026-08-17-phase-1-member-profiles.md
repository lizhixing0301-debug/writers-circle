# Writers Circle Phase 1 Member Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Payload CMS 后台增加安全、易维护的成员档案和头像管理，并用一条虚构资料完成验收。

**Architecture:** 保持现有单体 Next.js + Payload CMS + PostgreSQL 结构。新增 `members` 与 `media` 两个集合，共用一个“已登录管理员”访问控制；成员授权规则由独立的纯函数和 Payload 保存前钩子统一执行，未来公开页面只能另建安全数据层读取明确获准公开的字段。

**Tech Stack:** Next.js 16.3.1、Payload CMS 3.88.0、PostgreSQL 18.6、TypeScript 5.9.3、Vitest 4.1.10、pnpm 11.22.0

## Global Constraints

- 只实现 Payload 后台成员档案和图片资源，不实现公开成员页面或公共成员 API。
- 不实现投稿、新闻搜索、AI、微信公众号、批量导入或任何后续阶段功能。
- 残疾类别和残疾等级默认仅后台可见，公开开关默认关闭。
- 未获得本人同意时，个人主页和残疾信息公开开关必须保持关闭。
- 不收集身份证号、残疾人证号码或其他证件信息。
- 图片资源不得上传证件、授权书扫描件或其他敏感证明材料。
- 所有字段标签和管理员说明使用通俗中文。
- 真实密码、Secret、真实成员资料和其他隐私信息不得进入 Git。
- 只使用一条明确标注为虚构的测试成员资料进行验收，验收后删除。
- 修改 Next.js 相关代码前必须先阅读项目 `AGENTS.md` 指定的本地 Next.js 文档；本计划不需要修改公开前端页面。

---

## File Structure

### 新建文件

- `src/access/authenticated.ts`：唯一的后台登录访问判断。
- `src/access/authenticated.test.ts`：验证登录和未登录两种访问结果。
- `src/collections/members/consent.ts`：成员公开授权的自动纠正规则与 Payload 钩子。
- `src/collections/members/consent.test.ts`：验证未授权时公开开关自动关闭。
- `src/collections/Members.ts`：成员档案集合、中文字段、默认值和后台分组。
- `src/collections/Members.test.ts`：验证成员集合的关键结构和隐私默认值。
- `src/collections/Media.ts`：头像图片资源集合和上传限制。
- `src/collections/Media.test.ts`：验证图片类型、必填替代文字和访问控制。

### 修改文件

- `src/payload.config.ts`：注册 `Members`、`Media`，并设置 5 MiB 上传大小上限。
- `src/payload-types.ts`：由 Payload 命令自动重新生成。
- `src/app/(payload)/admin/importMap.js`：仅在 Payload 生成命令确实产生变化时提交。
- `README.md`：增加成员档案的中文使用说明和隐私提醒。

### 不修改文件

- `src/app/(frontend)/page.tsx`：Phase 1 不制作公开成员页面。
- `.env`：继续只保存在本机且被 Git 忽略。
- 公众号、投稿、搜索或 AI 相关文件：本阶段不创建。

---

### Task 1: 统一后台登录访问控制

**Files:**
- Create: `src/access/authenticated.ts`
- Create: `src/access/authenticated.test.ts`

**Interfaces:**
- Consumes: Payload `Access` 类型及 `req.user`。
- Produces: `authenticated: Access`，供 `Members` 和 `Media` 的 create/read/update/delete 复用。

- [ ] **Step 1: 写访问控制失败测试**

```ts
import { describe, expect, it } from 'vitest'

import { authenticated } from './authenticated'

describe('authenticated', () => {
  it('未登录时拒绝访问', () => {
    expect(authenticated({ req: { user: null } } as never)).toBe(false)
  })

  it('存在登录用户时允许访问', () => {
    expect(
      authenticated({ req: { user: { id: 1, collection: 'users' } } } as never),
    ).toBe(true)
  })
})
```

- [ ] **Step 2: 运行测试并确认先失败**

Run:

```bash
pnpm test --run src/access/authenticated.test.ts
```

Expected: FAIL，提示找不到 `./authenticated`。

- [ ] **Step 3: 实现最小访问控制**

```ts
import type { Access } from 'payload'

export const authenticated: Access = ({ req }) => Boolean(req.user)
```

- [ ] **Step 4: 再次运行测试并确认通过**

Run:

```bash
pnpm test --run src/access/authenticated.test.ts
```

Expected: 2 tests passed。

- [ ] **Step 5: 提交这一独立改动**

```bash
git add src/access/authenticated.ts src/access/authenticated.test.ts
git commit -m "feat: add authenticated collection access"
```

---

### Task 2: 实现成员授权自动保护

**Files:**
- Create: `src/collections/members/consent.ts`
- Create: `src/collections/members/consent.test.ts`

**Interfaces:**
- Consumes: 当前提交数据和修改前成员数据中的 `consentStatus`。
- Produces: `normalizeMemberConsent(data, originalDoc)` 和 `enforceMemberConsent` 保存前钩子。

- [ ] **Step 1: 写授权规则失败测试**

```ts
import { describe, expect, it } from 'vitest'

import { normalizeMemberConsent } from './consent'

describe('normalizeMemberConsent', () => {
  it('未征求意见时自动关闭所有公开开关', () => {
    expect(
      normalizeMemberConsent({
        consentStatus: 'notRequested',
        publicProfileEnabled: true,
        showDisabilityCategory: true,
        showDisabilityLevel: true,
      }),
    ).toMatchObject({
      publicProfileEnabled: false,
      showDisabilityCategory: false,
      showDisabilityLevel: false,
    })
  })

  it('不同意公开时自动关闭所有公开开关', () => {
    expect(
      normalizeMemberConsent({
        consentStatus: 'denied',
        publicProfileEnabled: true,
        showDisabilityCategory: true,
        showDisabilityLevel: true,
      }),
    ).toMatchObject({
      publicProfileEnabled: false,
      showDisabilityCategory: false,
      showDisabilityLevel: false,
    })
  })

  it('已经同意时保留管理员选择', () => {
    expect(
      normalizeMemberConsent({
        consentStatus: 'granted',
        publicProfileEnabled: true,
        showDisabilityCategory: true,
        showDisabilityLevel: false,
      }),
    ).toMatchObject({
      publicProfileEnabled: true,
      showDisabilityCategory: true,
      showDisabilityLevel: false,
    })
  })

  it('更新时使用修改前的授权状态', () => {
    expect(
      normalizeMemberConsent(
        { publicProfileEnabled: true },
        { consentStatus: 'notRequested' },
      ),
    ).toMatchObject({ publicProfileEnabled: false })
  })

  it('撤销同意时自动关闭原有公开开关', () => {
    expect(
      normalizeMemberConsent(
        { consentStatus: 'denied' },
        {
          consentStatus: 'granted',
          publicProfileEnabled: true,
          showDisabilityCategory: true,
          showDisabilityLevel: true,
        },
      ),
    ).toMatchObject({
      publicProfileEnabled: false,
      showDisabilityCategory: false,
      showDisabilityLevel: false,
    })
  })
})
```

- [ ] **Step 2: 运行测试并确认先失败**

```bash
pnpm test --run src/collections/members/consent.test.ts
```

Expected: FAIL，提示找不到 `./consent`。

- [ ] **Step 3: 实现授权纠正函数和 Payload 钩子**

```ts
import type { CollectionBeforeValidateHook } from 'payload'

export type ConsentStatus = 'denied' | 'granted' | 'notRequested'

export type MemberConsentData = {
  consentStatus?: ConsentStatus | null
  publicProfileEnabled?: boolean | null
  showDisabilityCategory?: boolean | null
  showDisabilityLevel?: boolean | null
  [key: string]: unknown
}

export function normalizeMemberConsent(
  data: MemberConsentData,
  originalDoc: MemberConsentData = {},
): MemberConsentData {
  const consentStatus =
    data.consentStatus ?? originalDoc.consentStatus ?? 'notRequested'

  if (consentStatus === 'granted') {
    return data
  }

  return {
    ...data,
    publicProfileEnabled: false,
    showDisabilityCategory: false,
    showDisabilityLevel: false,
  }
}

export const enforceMemberConsent: CollectionBeforeValidateHook = ({
  data,
  originalDoc,
}) => normalizeMemberConsent(data ?? {}, originalDoc ?? {})
```

采用自动关闭而不是抛出技术错误：管理员误开开关时，保存后的状态仍然安全，也更适合非程序员维护。

- [ ] **Step 4: 运行测试并确认通过**

```bash
pnpm test --run src/collections/members/consent.test.ts
```

Expected: 5 tests passed。

- [ ] **Step 5: 提交授权保护**

```bash
git add src/collections/members/consent.ts src/collections/members/consent.test.ts
git commit -m "feat: protect member consent fields"
```

---

### Task 3: 建立成员档案集合

**Files:**
- Create: `src/collections/Members.ts`
- Create: `src/collections/Members.test.ts`

**Interfaces:**
- Consumes: `authenticated` 访问控制、`enforceMemberConsent` 保存前钩子、未来的 `media` 集合。
- Produces: `Members: CollectionConfig`，集合 slug 为 `members`。

- [ ] **Step 1: 写成员集合关键结构测试**

```ts
import type { Field } from 'payload'
import { describe, expect, it } from 'vitest'

import { Members } from './Members'

function flattenTopLevelFields(fields: Field[]): Field[] {
  return fields.flatMap((field) => {
    if (field.type === 'tabs') {
      return field.tabs.flatMap((tab) => flattenTopLevelFields(tab.fields))
    }

    return [field]
  })
}

function findField(name: string) {
  return flattenTopLevelFields(Members.fields).find(
    (field) => 'name' in field && field.name === name,
  )
}

describe('Members 集合', () => {
  it('使用正确的集合名称和后台标题', () => {
    expect(Members.slug).toBe('members')
    expect(Members.admin?.useAsTitle).toBe('name')
  })

  it('姓名和网址标识为必填，网址标识不可重复', () => {
    expect(findField('name')).toMatchObject({ required: true, type: 'text' })
    expect(findField('slug')).toMatchObject({
      index: true,
      required: true,
      type: 'text',
      unique: true,
    })
  })

  it('所有公开开关默认关闭', () => {
    expect(findField('publicProfileEnabled')).toMatchObject({
      defaultValue: false,
      type: 'checkbox',
    })
    expect(findField('showDisabilityCategory')).toMatchObject({
      defaultValue: false,
      type: 'checkbox',
    })
    expect(findField('showDisabilityLevel')).toMatchObject({
      defaultValue: false,
      type: 'checkbox',
    })
  })

  it('授权状态默认未征求', () => {
    expect(findField('consentStatus')).toMatchObject({
      defaultValue: 'notRequested',
      type: 'select',
    })
  })

  it('头像关联图片资源集合', () => {
    expect(findField('profileImage')).toMatchObject({
      relationTo: 'media',
      type: 'upload',
    })
  })
})
```

- [ ] **Step 2: 运行测试并确认先失败**

```bash
pnpm test --run src/collections/Members.test.ts
```

Expected: FAIL，提示找不到 `./Members`。

- [ ] **Step 3: 实现成员集合**

创建 `src/collections/Members.ts`，使用下面的完整配置。所有数据字段保持顶层结构，`tabs` 仅用于后台分组，不产生额外的数据嵌套。

```ts
import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import { enforceMemberConsent } from './members/consent'

const protectedAccess = {
  create: authenticated,
  delete: authenticated,
  read: authenticated,
  update: authenticated,
}

export const Members: CollectionConfig = {
  slug: 'members',
  labels: {
    plural: '成员档案',
    singular: '成员档案',
  },
  access: protectedAccess,
  admin: {
    defaultColumns: ['name', 'penName', 'status', 'consentStatus', 'updatedAt'],
    group: '内容管理',
    useAsTitle: 'name',
  },
  defaultSort: 'displayOrder',
  hooks: {
    beforeValidate: [enforceMemberConsent],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: '基本身份',
          fields: [
            {
              name: 'name',
              type: 'text',
              label: '姓名',
              required: true,
            },
            {
              name: 'penName',
              type: 'text',
              label: '笔名',
            },
            {
              name: 'aliases',
              type: 'array',
              label: '其他署名',
              fields: [
                {
                  name: 'value',
                  type: 'text',
                  label: '署名',
                  required: true,
                },
              ],
            },
            {
              name: 'slug',
              type: 'text',
              label: '网址标识',
              required: true,
              unique: true,
              index: true,
              admin: {
                description: '用于未来个人页面网址，只使用小写英文字母、数字和短横线。',
              },
            },
            {
              name: 'status',
              type: 'select',
              label: '成员状态',
              defaultValue: 'active',
              required: true,
              options: [
                { label: '在册', value: 'active' },
                { label: '暂停', value: 'paused' },
                { label: '归档', value: 'archived' },
              ],
            },
          ],
        },
        {
          label: '文学资料',
          fields: [
            { name: 'region', type: 'text', label: '所在地区' },
            {
              name: 'literaryIdentities',
              type: 'array',
              label: '文学身份',
              fields: [
                {
                  name: 'value',
                  type: 'text',
                  label: '身份',
                  required: true,
                },
              ],
            },
            {
              name: 'organizations',
              type: 'array',
              label: '所属机构',
              fields: [
                {
                  name: 'value',
                  type: 'text',
                  label: '机构',
                  required: true,
                },
              ],
            },
            {
              name: 'biography',
              type: 'textarea',
              label: '完整简介（后台）',
            },
            {
              name: 'publicBiography',
              type: 'textarea',
              label: '公开简介（未来展示）',
              admin: {
                description: '这里只是预留内容；本阶段不会公开显示。',
              },
            },
            {
              name: 'representativeWorks',
              type: 'array',
              label: '代表作品',
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  label: '作品名',
                  required: true,
                },
                { name: 'type', type: 'text', label: '作品类型' },
                {
                  name: 'year',
                  type: 'number',
                  label: '出版或发表年份',
                  min: 1000,
                  max: 9999,
                },
                { name: 'notes', type: 'textarea', label: '备注' },
              ],
            },
          ],
        },
        {
          label: '搜索资料',
          fields: [
            {
              name: 'searchKeywords',
              type: 'array',
              label: '搜索关键词',
              admin: {
                description: '供未来新闻搜索使用，本阶段不会自动搜索。',
              },
              fields: [
                {
                  name: 'value',
                  type: 'text',
                  label: '关键词',
                  required: true,
                },
              ],
            },
            {
              name: 'websites',
              type: 'array',
              label: '个人网站或公开主页',
              fields: [
                { name: 'label', type: 'text', label: '名称', required: true },
                { name: 'url', type: 'text', label: '网址', required: true },
              ],
            },
            {
              name: 'knownWeChatAccounts',
              type: 'array',
              label: '已知公众号',
              fields: [
                { name: 'name', type: 'text', label: '公众号名称', required: true },
                { name: 'notes', type: 'textarea', label: '说明' },
              ],
            },
          ],
        },
        {
          label: '展示预留',
          fields: [
            {
              name: 'profileImage',
              type: 'upload',
              label: '头像',
              relationTo: 'media',
            },
            {
              name: 'displayOrder',
              type: 'number',
              label: '展示顺序',
              defaultValue: 0,
              min: 0,
            },
            {
              name: 'publicProfileEnabled',
              type: 'checkbox',
              label: '允许未来展示个人主页',
              defaultValue: false,
              admin: {
                description: '只有本人同意后才能开启；本阶段仍不会生成公开页面。',
              },
            },
          ],
        },
        {
          label: '残疾信息',
          fields: [
            {
              name: 'disabilityCategory',
              type: 'select',
              label: '残疾类别',
              defaultValue: 'notProvided',
              options: [
                { label: '肢体', value: 'physical' },
                { label: '视力', value: 'visual' },
                { label: '听力', value: 'hearing' },
                { label: '言语', value: 'speech' },
                { label: '智力', value: 'intellectual' },
                { label: '精神', value: 'mental' },
                { label: '多重', value: 'multiple' },
                { label: '其他', value: 'other' },
                { label: '未提供', value: 'notProvided' },
              ],
            },
            {
              name: 'disabilityLevel',
              type: 'select',
              label: '残疾等级',
              defaultValue: 'notProvided',
              options: [
                { label: '一级', value: 'level1' },
                { label: '二级', value: 'level2' },
                { label: '三级', value: 'level3' },
                { label: '四级', value: 'level4' },
                { label: '未提供', value: 'notProvided' },
              ],
            },
            {
              name: 'showDisabilityCategory',
              type: 'checkbox',
              label: '允许未来公开残疾类别',
              defaultValue: false,
            },
            {
              name: 'showDisabilityLevel',
              type: 'checkbox',
              label: '允许未来公开残疾等级',
              defaultValue: false,
            },
          ],
        },
        {
          label: '授权记录',
          fields: [
            {
              name: 'consentStatus',
              type: 'select',
              label: '公开授权状态',
              defaultValue: 'notRequested',
              required: true,
              options: [
                { label: '未征求', value: 'notRequested' },
                { label: '已同意', value: 'granted' },
                { label: '不同意', value: 'denied' },
              ],
            },
            { name: 'consentDate', type: 'date', label: '征求意见或授权日期' },
            { name: 'consentNotes', type: 'textarea', label: '授权范围和备注' },
          ],
        },
        {
          label: '内部备注',
          fields: [
            {
              name: 'internalNotes',
              type: 'textarea',
              label: '内部备注',
              admin: {
                description: '仅供后台使用，未来公开页面不得读取。',
              },
            },
          ],
        },
      ],
    },
  ],
}
```

- [ ] **Step 4: 运行成员集合测试**

```bash
pnpm test --run src/collections/Members.test.ts
```

Expected: 5 tests passed。

- [ ] **Step 5: 提交成员集合**

```bash
git add src/collections/Members.ts src/collections/Members.test.ts
git commit -m "feat: add member profiles collection"
```

---

### Task 4: 建立图片资源并注册两个集合

**Files:**
- Create: `src/collections/Media.ts`
- Create: `src/collections/Media.test.ts`
- Modify: `src/payload.config.ts`

**Interfaces:**
- Consumes: `authenticated` 访问控制、`Members` 集合中的 `profileImage` 关联。
- Produces: `Media: CollectionConfig`，集合 slug 为 `media`；Payload 配置正式注册 `Members` 和 `Media`。

- [ ] **Step 1: 写图片资源配置失败测试**

```ts
import { describe, expect, it } from 'vitest'

import { Media } from './Media'

describe('Media 集合', () => {
  it('只接受常用网页图片并禁止网址粘贴上传', () => {
    expect(Media.upload).toMatchObject({
      displayPreview: true,
      mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      pasteURL: false,
    })
  })

  it('图片替代文字为必填项', () => {
    expect(Media.fields).toContainEqual(
      expect.objectContaining({
        name: 'alt',
        required: true,
        type: 'text',
      }),
    )
  })

  it('未登录用户不能读取图片资源记录', () => {
    expect(Media.access?.read?.({ req: { user: null } } as never)).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试并确认先失败**

```bash
pnpm test --run src/collections/Media.test.ts
```

Expected: FAIL，提示找不到 `./Media`。

- [ ] **Step 3: 实现图片资源集合**

```ts
import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    plural: '图片资源',
    singular: '图片资源',
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    group: '内容管理',
    useAsTitle: 'alt',
  },
  upload: {
    displayPreview: true,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    pasteURL: false,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: '图片替代文字',
      required: true,
      admin: {
        description: '简要描述图片内容，方便使用读屏软件的读者理解。',
      },
    },
    {
      name: 'internalNotes',
      type: 'textarea',
      label: '内部说明',
      admin: {
        description: '请勿上传证件、授权书扫描件或其他敏感证明材料。',
      },
    },
  ],
}
```

- [ ] **Step 4: 运行图片资源测试并确认通过**

```bash
pnpm test --run src/collections/Media.test.ts
```

Expected: 3 tests passed。

- [ ] **Step 5: 修改 Payload 配置并限制上传大小**

将 `src/payload.config.ts` 的集合导入和核心配置调整为：

```ts
import { Media } from './collections/Media'
import { Members } from './collections/Members'
import { Users } from './collections/Users'
```

```ts
export default buildConfig({
  admin: {
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
  },
  bodyParser: {
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  },
  collections: [Users, Members, Media],
  db: postgresAdapter({
    pool: {
      connectionString: requireEnvironment('DATABASE_URI'),
    },
  }),
  secret: requireEnvironment('PAYLOAD_SECRET'),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
```

保留文件顶部已有的 `path`、`fileURLToPath`、`buildConfig`、`postgresAdapter` 和环境变量导入，不复制或改写真实环境变量。

- [ ] **Step 6: 运行全部单元测试和代码检查**

```bash
pnpm test --run
pnpm lint
```

Expected: 所有测试通过，ESLint 退出码为 0。

- [ ] **Step 7: 提交图片资源与集合注册**

```bash
git add src/collections/Media.ts src/collections/Media.test.ts src/payload.config.ts
git commit -m "feat: add protected member media"
```

---

### Task 5: 生成类型并验证编译

**Files:**
- Modify: `src/payload-types.ts`
- Modify if generated: `src/app/(payload)/admin/importMap.js`

**Interfaces:**
- Consumes: 已注册的 `members` 与 `media` 集合。
- Produces: 与当前 Payload 配置一致的 TypeScript 类型和后台导入映射。

- [ ] **Step 1: 生成 Payload 类型**

```bash
pnpm generate:types
```

Expected: 命令成功，`src/payload-types.ts` 包含 `Member`、`Media` 和相应集合映射。

- [ ] **Step 2: 生成后台导入映射**

```bash
pnpm generate:importmap
```

Expected: 命令成功；如果没有自定义后台组件，import map 可以保持不变。

- [ ] **Step 3: 检查生成结果中没有真实资料或 Secret**

```bash
rg -n "DATABASE_URI|PAYLOAD_SECRET|test-member-fictional|测试成员" src/payload-types.ts 'src/app/(payload)/admin/importMap.js'
```

Expected: 不出现真实连接值、Secret 或测试成员数据。类型名称中的普通字段名不构成敏感信息。

- [ ] **Step 4: 运行完整自动化验证**

```bash
pnpm test --run
pnpm lint
pnpm generate:types
pnpm build
```

Expected: 测试、代码检查、类型生成和生产构建全部以退出码 0 完成。

- [ ] **Step 5: 提交生成文件**

```bash
git add src/payload-types.ts 'src/app/(payload)/admin/importMap.js'
git commit -m "chore: generate phase 1 payload types"
```

如果 import map 没有变化，只提交 `src/payload-types.ts`。

---

### Task 6: 运行后台并完成虚构资料验收

**Files:**
- No source file changes required.
- Temporary database record: 创建后删除 `测试成员（虚构）`。

**Interfaces:**
- Consumes: 本地 PostgreSQL、Next.js 开发服务、Payload 管理后台。
- Produces: 首页、后台、权限、保存规则和虚构成员增改流程的运行证据。

- [ ] **Step 1: 确认 PostgreSQL 和项目服务运行**

```bash
/Applications/Postgres.app/Contents/Versions/latest/bin/pg_isready -h 127.0.0.1 -p 5432
pnpm dev
```

Expected: PostgreSQL 接受连接；若已有开发服务占用 3000 端口，复用该服务，不重复启动。

- [ ] **Step 2: 检查首页和后台 HTTP 响应**

```bash
curl -sS -o /private/tmp/writers-phase1-home.html -w '%{http_code}\n' http://127.0.0.1:3000/
curl -sS -o /private/tmp/writers-phase1-admin.html -w '%{http_code}\n' http://127.0.0.1:3000/admin
```

Expected: 两个地址都返回 HTTP 200；首页仍包含 Writers Circle，后台包含 Payload 管理界面内容。

- [ ] **Step 3: 检查未登录成员接口被拒绝**

```bash
curl -sS -o /private/tmp/writers-phase1-members-unauthorized.json -w '%{http_code}\n' http://127.0.0.1:3000/api/members
```

Expected: 返回 401 或 403，不得返回成员列表。

- [ ] **Step 4: 在 Payload 后台创建虚构测试成员**

使用本地后台登录状态创建以下资料：

```text
姓名：测试成员（虚构）
网址标识：test-member-fictional
成员状态：在册
所在地区：测试地区
文学身份：测试作者
代表作品：《测试作品》；类型：测试；年份：2026
公开授权状态：未征求
允许未来展示个人主页：开启后保存
允许未来公开残疾类别：开启后保存
允许未来公开残疾等级：开启后保存
```

Expected: 保存成功后，三个公开开关都被系统自动恢复为关闭；其他资料正常保存。

- [ ] **Step 5: 编辑并再次保存测试成员**

把授权状态改为“已同意”，开启个人主页开关但仍保持两个残疾信息开关关闭；保存后再把状态改为“不同意”。

Expected: “已同意”时保留管理员选择；改为“不同意”后所有公开开关自动关闭。

- [ ] **Step 6: 验证网址标识唯一性**

尝试新建第二条同样使用 `test-member-fictional` 的虚构资料。

Expected: Payload 拒绝重复网址标识，不产生第二条有效记录。

- [ ] **Step 7: 删除所有虚构测试记录**

删除 `测试成员（虚构）` 以及唯一性测试过程中可能留下的草稿或失败记录。

Expected: 成员列表中不再存在测试成员，不保留任何真实人物资料。

---

### Task 7: 补充中文说明、最终验证并备份 GitHub

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: 已通过运行验收的 Phase 1 功能。
- Produces: 非程序员可使用的后台说明、干净的 Git 状态和 GitHub 私有备份。

- [ ] **Step 1: 在 README 增加成员档案说明**

在本地地址之后增加以下内容：

```markdown
## 成员档案

登录 Payload 后台后，可以在“内容管理”中看到：

- “成员档案”：录入姓名、笔名、文学资料、作品、搜索关键词和授权情况。
- “图片资源”：上传成员头像，并填写方便读屏软件理解的图片说明。

成员资料默认不会公开。只有本人已经同意，并且管理员主动打开对应开关后，相关字段才具备未来公开展示的条件。当前 Phase 1 没有公开成员页面。

请勿在项目中保存身份证号、残疾人证号码、证件扫描件、授权书扫描件或其他不必要的敏感材料。
```

- [ ] **Step 2: 运行交付前完整验证**

```bash
pnpm test --run
pnpm lint
pnpm generate:types
pnpm build
```

Expected: 全部命令退出码为 0，测试结果中没有失败项。

- [ ] **Step 3: 再次检查本地服务**

```bash
curl -sS -o /private/tmp/writers-phase1-final-home.html -w '%{http_code}\n' http://127.0.0.1:3000/
curl -sS -o /private/tmp/writers-phase1-final-admin.html -w '%{http_code}\n' http://127.0.0.1:3000/admin
```

Expected: 首页和后台均返回 HTTP 200。

- [ ] **Step 4: 检查 Git 安全状态**

```bash
git status --short
git ls-files .env .env.local .postgres
git diff --check
```

Expected: `.env`、`.env.local`、`.postgres` 没有被 Git 跟踪；没有空白错误；只存在预期的 README 修改。

- [ ] **Step 5: 提交使用说明**

```bash
git add README.md
git commit -m "docs: explain member profile management"
```

- [ ] **Step 6: 核对本阶段提交并推送私有仓库**

```bash
git status -sb
git log --oneline origin/main..HEAD
git push origin main
```

Expected: 本地 `main` 推送到 `origin/main`，工作区干净，GitHub 仓库仍为 Private。

- [ ] **Step 7: 停止在 Phase 1 边界**

最终报告只说明成员档案、图片资源、测试结果、本地地址和 GitHub 备份。不得继续开发投稿、新闻搜索、AI、微信公众号、批量导入或公开成员页面。
