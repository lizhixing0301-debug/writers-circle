import { randomUUID } from 'node:crypto'
import type { CollectionBeforeValidateHook, CollectionConfig, NumberField } from 'payload'

import { authenticated } from '../access/authenticated'

export function generateWechatSearchRunNumber(
  now = new Date(),
  uuid = randomUUID(),
): string {
  const date = now.toISOString().slice(0, 10).replaceAll('-', '')
  const randomPart = uuid.replaceAll('-', '').slice(0, 8).toUpperCase()

  return `WXSEARCH-${date}-${randomPart}`
}

export const protectWechatSearchRunCreateFields: CollectionBeforeValidateHook = ({
  data,
  operation,
}) => {
  if (operation !== 'create') return data

  return {
    ...data,
    apiCallCount: 0,
    completedAt: null,
    createdCount: 0,
    duplicateCount: 0,
    errorSummary: null,
    failedQueryCount: 0,
    memberCount: 0,
    plannedQueryCount: 0,
    resultCount: 0,
    runNumber: generateWechatSearchRunNumber(),
    startedAt: null,
    status: 'queued',
  }
}

function countField(name: string, label: string): NumberField {
  return {
    name,
    type: 'number',
    label,
    defaultValue: 0,
    min: 0,
    required: true,
    admin: { readOnly: true },
  }
}

export const WechatSearchRuns: CollectionConfig = {
  slug: 'wechat-search-runs',
  labels: {
    plural: '公众号搜索记录',
    singular: '公众号搜索记录',
  },
  access: {
    create: () => false,
    delete: authenticated,
    read: authenticated,
    update: () => false,
  },
  admin: {
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
  },
  defaultSort: '-createdAt',
  hooks: {
    beforeValidate: [protectWechatSearchRunCreateFields],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: '运行信息',
          fields: [
            {
              name: 'runNumber',
              type: 'text',
              label: '搜索编号',
              required: true,
              unique: true,
              index: true,
              admin: { readOnly: true },
            },
            {
              name: 'trigger',
              type: 'select',
              label: '触发方式',
              required: true,
              options: [
                { label: '后台按钮', value: 'admin' },
                { label: '运行验收', value: 'verification' },
              ],
              admin: { readOnly: true },
            },
            {
              name: 'status',
              type: 'select',
              label: '运行状态',
              defaultValue: 'queued',
              required: true,
              index: true,
              options: [
                { label: '排队中', value: 'queued' },
                { label: '运行中', value: 'running' },
                { label: '成功', value: 'succeeded' },
                { label: '部分成功', value: 'partial' },
                { label: '失败', value: 'failed' },
              ],
              admin: {
                description: '搜索结果只是待核实线索，不能直接对外发布。',
                readOnly: true,
              },
            },
            {
              name: 'startedAt',
              type: 'date',
              label: '开始时间',
              admin: {
                date: { displayFormat: 'yyyy-MM-dd HH:mm', pickerAppearance: 'dayAndTime' },
                readOnly: true,
              },
            },
            {
              name: 'completedAt',
              type: 'date',
              label: '完成时间',
              admin: {
                date: { displayFormat: 'yyyy-MM-dd HH:mm', pickerAppearance: 'dayAndTime' },
                readOnly: true,
              },
            },
          ],
        },
        {
          label: '统计和错误',
          fields: [
            countField('memberCount', '在册成员数'),
            countField('plannedQueryCount', '计划搜索词数'),
            countField('apiCallCount', '实际接口调用数'),
            countField('resultCount', '返回结果数'),
            countField('createdCount', '新增候选数'),
            countField('duplicateCount', '跳过重复数'),
            countField('failedQueryCount', '失败搜索词数'),
            {
              name: 'errorSummary',
              type: 'textarea',
              label: '错误摘要',
              maxLength: 5000,
              admin: {
                description: '只记录通俗错误，不保存密钥或第三方完整响应。',
                readOnly: true,
              },
            },
          ],
        },
      ],
    },
  ],
}
