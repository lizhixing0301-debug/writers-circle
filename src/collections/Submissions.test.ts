import type { Field } from 'payload'
import { describe, expect, it } from 'vitest'

import { protectSubmissionCreateFields, Submissions } from './Submissions'

function flattenFields(fields: Field[]): Field[] {
  return fields.flatMap((field) => {
    if (field.type === 'tabs') {
      return field.tabs.flatMap((tab) => flattenFields(tab.fields))
    }

    return [field]
  })
}

function findField(name: string) {
  return flattenFields(Submissions.fields).find(
    (field) => 'name' in field && field.name === name,
  )
}

describe('Submissions 集合', () => {
  it('在后台使用投稿标题和清楚的列表字段', () => {
    expect(Submissions.slug).toBe('submissions')
    expect(Submissions.admin).toMatchObject({
      defaultColumns: [
        'submissionNumber',
        'title',
        'submitterName',
        'category',
        'status',
        'submittedAt',
      ],
      group: '内容管理',
      useAsTitle: 'title',
    })
  })

  it('投稿编号和请求标识都由唯一字段保存', () => {
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
  })

  it('新稿默认待审核，并可关联成员档案', () => {
    expect(findField('status')).toMatchObject({
      defaultValue: 'submitted',
      required: true,
      type: 'select',
    })
    expect(findField('relatedMember')).toMatchObject({
      relationTo: 'members',
      type: 'relationship',
    })
  })

  it('要求记录原创或投稿授权确认', () => {
    expect(findField('rightsConfirmed')).toMatchObject({
      required: true,
      type: 'checkbox',
    })
  })

  it.each(['create', 'read', 'update', 'delete'] as const)(
    '未登录时拒绝 %s 权限',
    (operation) => {
      const access = Submissions.access?.[operation]
      expect(typeof access).toBe('function')
      expect((access as Function)({ req: { user: null } })).toBe(false)
    },
  )

  it('创建时覆盖不能由投稿人决定的审核字段', async () => {
    const data = await protectSubmissionCreateFields({
      data: {
        relatedMember: 99,
        requestToken: '12345678-abcd-4abc-8def-1234567890ab',
        reviewNotes: '不应保留的审核意见',
        status: 'accepted',
        submissionNumber: 'USER-CONTROLLED',
        submittedAt: '2000-01-01T00:00:00.000Z',
        title: '虚构测试稿件',
      },
      operation: 'create',
    } as never)

    expect(data).toMatchObject({
      relatedMember: null,
      requestToken: '12345678-abcd-4abc-8def-1234567890ab',
      reviewNotes: null,
      status: 'submitted',
      title: '虚构测试稿件',
    })
    expect(data?.submissionNumber).toMatch(/^WC-\d{8}-[A-F0-9]{8}$/)
    expect(data?.submittedAt).not.toBe('2000-01-01T00:00:00.000Z')
    expect(Number.isNaN(Date.parse(String(data?.submittedAt)))).toBe(false)
  })

  it('后台更新时保留管理员填写的审核字段', async () => {
    const update = {
      reviewNotes: '虚构审核意见',
      status: 'reviewing',
    }

    await expect(
      protectSubmissionCreateFields({ data: update, operation: 'update' } as never),
    ).resolves.toEqual(update)
  })
})
