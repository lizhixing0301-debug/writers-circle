import type { Field, TextField } from 'payload'
import { describe, expect, it } from 'vitest'

import {
  NewsCandidates,
  protectNewsCandidateCreateFields,
} from './NewsCandidates'

function flattenFields(fields: Field[]): Field[] {
  return fields.flatMap((field) => {
    if (field.type === 'tabs') {
      return field.tabs.flatMap((tab) => flattenFields(tab.fields))
    }

    return [field]
  })
}

function findField(name: string) {
  return flattenFields(NewsCandidates.fields).find(
    (field) => 'name' in field && field.name === name,
  )
}

function optionValues(name: string): string[] {
  const field = findField(name)

  if (!field || field.type !== 'select' || !Array.isArray(field.options)) return []

  return field.options.map((option) =>
    typeof option === 'string' ? option : String(option.value),
  )
}

describe('NewsCandidates 集合', () => {
  it('在后台使用标题和清楚的列表字段', () => {
    expect(NewsCandidates.slug).toBe('news-candidates')
    expect(NewsCandidates.labels).toEqual({
      plural: '新闻候选',
      singular: '新闻候选',
    })
    expect(NewsCandidates.admin).toMatchObject({
      defaultColumns: [
        'candidateNumber',
        'title',
        'relatedMember',
        'category',
        'status',
        'discoveredAt',
      ],
      group: '内容管理',
      useAsTitle: 'title',
    })
    expect(NewsCandidates.defaultSort).toBe('-discoveredAt')
  })

  it('候选编号由唯一字段保存，并可关联成员档案', () => {
    expect(findField('candidateNumber')).toMatchObject({
      index: true,
      required: true,
      type: 'text',
      unique: true,
    })
    expect(findField('relatedMember')).toMatchObject({
      relationTo: 'members',
      type: 'relationship',
    })
  })

  it('使用确认的类别、来源方式和核实状态', () => {
    expect(optionValues('category')).toEqual([
      'creation',
      'award',
      'activity',
      'media',
      'personal',
      'other',
    ])
    expect(optionValues('sourceType')).toEqual([
      'manual',
      'publicTip',
      'automaticSearch',
    ])
    expect(optionValues('status')).toEqual([
      'pending',
      'verifying',
      'confirmed',
      'rejected',
      'duplicate',
    ])
    expect(findField('sourceType')).toMatchObject({
      admin: { readOnly: true },
      defaultValue: 'manual',
      required: true,
      type: 'select',
    })
    expect(findField('status')).toMatchObject({
      defaultValue: 'pending',
      required: true,
      type: 'select',
    })
  })

  it('来源链接只接受 http 和 https', () => {
    const sourceUrl = findField('sourceUrl') as TextField | undefined

    expect(sourceUrl?.hasMany).not.toBe(true)
    if (!sourceUrl || sourceUrl.hasMany) throw new Error('来源网址字段必须是单个文本。')

    const validate = sourceUrl.validate

    expect(typeof validate).toBe('function')
    expect(validate?.('', {} as never)).toBe(true)
    expect(validate?.('https://example.com/news', {} as never)).toBe(true)
    expect(validate?.('http://example.com/news', {} as never)).toBe(true)
    expect(validate?.('javascript:alert(1)', {} as never)).toContain('http')
    expect(validate?.('不是网址', {} as never)).toContain('网址')
  })

  it.each(['create', 'read', 'update', 'delete'] as const)(
    '未登录时拒绝 %s 权限',
    (operation) => {
      const access = NewsCandidates.access?.[operation]

      expect(typeof access).toBe('function')
      expect(
        (access as (args: { req: { user: null } }) => boolean)({
          req: { user: null },
        }),
      ).toBe(false)
    },
  )

  it('创建时覆盖不能由录入者决定的核实字段', async () => {
    const data = await protectNewsCandidateCreateFields({
      data: {
        candidateNumber: 'USER-CONTROLLED',
        discoveredAt: '2000-01-01T00:00:00.000Z',
        status: 'confirmed',
        title: '虚构新闻候选',
        verificationNotes: '不应保留的核实意见',
        verifiedAt: '2000-01-01T00:00:00.000Z',
      },
      operation: 'create',
    } as never)

    expect(data).toMatchObject({
      status: 'pending',
      title: '虚构新闻候选',
      verificationNotes: null,
      verifiedAt: null,
    })
    expect(data?.candidateNumber).toMatch(/^NEWS-\d{8}-[A-F0-9]{8}$/)
    expect(data?.discoveredAt).not.toBe('2000-01-01T00:00:00.000Z')
    expect(Number.isNaN(Date.parse(String(data?.discoveredAt)))).toBe(false)
  })

  it('后台更新时保留管理员填写的核实字段', () => {
    const update = {
      status: 'verifying',
      verificationNotes: '虚构核实意见',
      verifiedAt: '2026-08-17T00:00:00.000Z',
    }

    expect(
      protectNewsCandidateCreateFields({ data: update, operation: 'update' } as never),
    ).toEqual(update)
  })
})
