import type { Field } from 'payload'
import { describe, expect, it } from 'vitest'

import {
  generateWechatSearchRunNumber,
  protectWechatSearchRunCreateFields,
  WechatSearchRuns,
} from './WechatSearchRuns'

function flattenFields(fields: Field[]): Field[] {
  return fields.flatMap((field) => {
    if (field.type === 'tabs') {
      return field.tabs.flatMap((tab) => flattenFields(tab.fields))
    }

    return [field]
  })
}

function findField(name: string) {
  return flattenFields(WechatSearchRuns.fields).find(
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

describe('公众号搜索记录集合', () => {
  it('生成便于人工沟通的非连续搜索编号', () => {
    expect(
      generateWechatSearchRunNumber(
        new Date('2026-08-18T00:00:00.000Z'),
        '12345678-abcd-4abc-8def-1234567890ab',
      ),
    ).toBe('WXSEARCH-20260818-12345678')
  })

  it('使用清楚的中文后台名称和列表字段', () => {
    expect(WechatSearchRuns.slug).toBe('wechat-search-runs')
    expect(WechatSearchRuns.labels).toEqual({
      plural: '公众号搜索记录',
      singular: '公众号搜索记录',
    })
    expect(WechatSearchRuns.admin).toMatchObject({
      defaultColumns: [
        'runNumber',
        'status',
        'createdCount',
        'duplicateCount',
        'failedQueryCount',
        'startedAt',
      ],
      group: '内容管理',
      useAsTitle: 'runNumber',
    })
    expect(WechatSearchRuns.defaultSort).toBe('-createdAt')
  })

  it('使用确认的触发方式和运行状态', () => {
    expect(optionValues('trigger')).toEqual(['admin', 'verification'])
    expect(optionValues('status')).toEqual([
      'queued',
      'running',
      'succeeded',
      'partial',
      'failed',
    ])
    expect(findField('runNumber')).toMatchObject({
      admin: { readOnly: true },
      index: true,
      required: true,
      type: 'text',
      unique: true,
    })
  })

  it.each([
    'status',
    'startedAt',
    'completedAt',
    'memberCount',
    'plannedQueryCount',
    'apiCallCount',
    'resultCount',
    'createdCount',
    'duplicateCount',
    'failedQueryCount',
    'errorSummary',
  ])('%s 只能由服务器更新', (name) => {
    expect(findField(name)).toMatchObject({ admin: { readOnly: true } })
  })

  it('公众和普通后台请求不能伪造或修改搜索记录', () => {
    const create = WechatSearchRuns.access?.create
    const update = WechatSearchRuns.access?.update

    expect(typeof create).toBe('function')
    expect(typeof update).toBe('function')
    expect((create as () => boolean)()).toBe(false)
    expect((update as () => boolean)()).toBe(false)
  })

  it.each(['read', 'delete'] as const)('%s 只允许已登录管理员', (operation) => {
    const access = WechatSearchRuns.access?.[operation]
    expect(typeof access).toBe('function')
    expect(
      (access as (args: { req: { user: null | { id: number } } }) => boolean)({
        req: { user: null },
      }),
    ).toBe(false)
    expect(
      (access as (args: { req: { user: null | { id: number } } }) => boolean)({
        req: { user: { id: 1 } },
      }),
    ).toBe(true)
  })

  it('创建时覆盖调用者不能控制的状态、统计和错误信息', async () => {
    const data = await protectWechatSearchRunCreateFields({
      data: {
        apiCallCount: 99,
        completedAt: '2000-01-01T00:00:00.000Z',
        createdCount: 99,
        duplicateCount: 99,
        errorSummary: '不应保留的错误',
        failedQueryCount: 99,
        memberCount: 99,
        plannedQueryCount: 99,
        resultCount: 99,
        runNumber: 'CALLER-CONTROLLED',
        startedAt: '2000-01-01T00:00:00.000Z',
        status: 'succeeded',
        trigger: 'admin',
      },
      operation: 'create',
    } as never)

    expect(data).toMatchObject({
      apiCallCount: 0,
      completedAt: null,
      createdCount: 0,
      duplicateCount: 0,
      errorSummary: null,
      failedQueryCount: 0,
      memberCount: 0,
      plannedQueryCount: 0,
      resultCount: 0,
      startedAt: null,
      status: 'queued',
      trigger: 'admin',
    })
    expect(data?.runNumber).toMatch(/^WXSEARCH-\d{8}-[A-F0-9]{8}$/)
  })

  it('服务器更新时保留新的状态和统计', () => {
    const update = { apiCallCount: 3, status: 'running' }

    expect(
      protectWechatSearchRunCreateFields({ data: update, operation: 'update' } as never),
    ).toEqual(update)
  })
})
