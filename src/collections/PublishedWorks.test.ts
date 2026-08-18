import type { Field, TextField } from 'payload'
import { describe, expect, it } from 'vitest'

import {
  normalizePublishedWork,
  PublishedWorks,
  validatePublishedWorkSlug,
} from './PublishedWorks'

function flattenFields(fields: Field[]): Field[] {
  return fields.flatMap((field) =>
    field.type === 'tabs'
      ? field.tabs.flatMap((tab) => flattenFields(tab.fields))
      : [field],
  )
}

function findField(name: string) {
  return flattenFields(PublishedWorks.fields).find(
    (field) => 'name' in field && field.name === name,
  )
}

describe('公开作品集合', () => {
  it('未获公开授权时自动保持为草稿', () => {
    expect(
      normalizePublishedWork({
        publicationAuthorized: false,
        publishedAt: '2000-01-01T00:00:00.000Z',
        status: 'published',
      }),
    ).toMatchObject({
      publicationAuthorized: false,
      publishedAt: null,
      status: 'draft',
    })
  })

  it('首次发布时忽略填写的日期并由服务器生成发布时间', () => {
    const result = normalizePublishedWork(
      {
        publicationAuthorized: true,
        publishedAt: '2000-01-01T00:00:00.000Z',
        status: 'published',
      },
      {},
      '2026-08-18T12:00:00.000Z',
    )

    expect(result.publishedAt).toBe('2026-08-18T12:00:00.000Z')
  })

  it('撤销已发布作品授权时转回草稿并保留历史发布时间', () => {
    expect(
      normalizePublishedWork(
        { publicationAuthorized: false },
        {
          publicationAuthorized: true,
          publishedAt: '2026-08-18T12:00:00.000Z',
          status: 'published',
        },
      ),
    ).toMatchObject({
      publishedAt: '2026-08-18T12:00:00.000Z',
      status: 'draft',
    })
  })

  it('网址标识只接受小写字母、数字和短横线', () => {
    expect(validatePublishedWorkSlug('a-poem-2026')).toBe(true)
    expect(validatePublishedWorkSlug('A Poem')).toContain('小写')
    expect(validatePublishedWorkSlug('中文标题')).toContain('小写')
  })

  it('包含人工发布所需字段且正文为纯文本', () => {
    expect(PublishedWorks.slug).toBe('published-works')
    expect(findField('publicationAuthorized')).toMatchObject({
      defaultValue: false,
      type: 'checkbox',
    })
    expect(findField('content')).toMatchObject({
      maxLength: 100000,
      minLength: 20,
      required: true,
      type: 'textarea',
    })
    expect(findField('sourceSubmission')).toMatchObject({
      relationTo: 'submissions',
      type: 'relationship',
    })
    expect((findField('slug') as TextField | undefined)?.unique).toBe(true)
  })

  it.each(['create', 'read', 'update', 'delete'] as const)(
    '未登录时拒绝 %s 权限',
    (operation) => {
      const access = PublishedWorks.access?.[operation]
      expect(typeof access).toBe('function')
      expect(
        (access as (args: { req: { user: null } }) => boolean)({ req: { user: null } }),
      ).toBe(false)
    },
  )
})
