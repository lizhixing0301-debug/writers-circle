import type { CollectionBeforeValidateHook, CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import { generateNewsCandidateNumber } from '../newsCandidates/newsCandidateNumber'

const protectedAccess = {
  create: authenticated,
  delete: authenticated,
  read: authenticated,
  update: authenticated,
}

export function validateOptionalHttpUrl(value: unknown): true | string {
  if (value === undefined || value === null || value === '') return true
  if (typeof value !== 'string') return '请填写有效的网址。'

  try {
    const url = new URL(value)

    return url.protocol === 'http:' || url.protocol === 'https:'
      ? true
      : '来源网址必须以 http:// 或 https:// 开头。'
  } catch {
    return '请填写有效的网址。'
  }
}

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

export const NewsCandidates: CollectionConfig = {
  slug: 'news-candidates',
  labels: {
    plural: '新闻候选',
    singular: '新闻候选',
  },
  access: protectedAccess,
  admin: {
    components: {
      beforeListTable: ['/components/admin/WechatSearchAction'],
    },
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
  },
  defaultSort: '-discoveredAt',
  hooks: {
    beforeValidate: [protectNewsCandidateCreateFields],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: '候选信息',
          fields: [
            {
              name: 'candidateNumber',
              type: 'text',
              label: '候选编号',
              required: true,
              unique: true,
              index: true,
              admin: {
                readOnly: true,
              },
            },
            {
              name: 'title',
              type: 'text',
              label: '候选标题',
              required: true,
              maxLength: 300,
            },
            {
              name: 'relatedMember',
              type: 'relationship',
              label: '关联成员档案',
              relationTo: 'members',
              admin: {
                description: '请核对身份后再关联，不能只凭姓名相同判断。',
              },
            },
            {
              name: 'relatedPersonName',
              type: 'text',
              label: '来源中出现的姓名',
              maxLength: 100,
              admin: {
                description: '尚未确认对应成员时，可以先记录来源中的姓名。',
              },
            },
            {
              name: 'category',
              type: 'select',
              label: '新闻类别',
              required: true,
              options: [
                { label: '创作动态', value: 'creation' },
                { label: '获奖荣誉', value: 'award' },
                { label: '活动动态', value: 'activity' },
                { label: '媒体报道', value: 'media' },
                { label: '个人动态', value: 'personal' },
                { label: '其他', value: 'other' },
              ],
            },
            {
              name: 'summary',
              type: 'textarea',
              label: '候选摘要或核实要点',
              maxLength: 3000,
              admin: {
                description: '只保存必要的核实信息，不要复制整篇来源文章或无关隐私。',
              },
            },
            {
              name: 'publishedAt',
              type: 'date',
              label: '原来源发表或事件日期',
              admin: {
                date: {
                  displayFormat: 'yyyy-MM-dd',
                  pickerAppearance: 'dayOnly',
                },
              },
            },
          ],
        },
        {
          label: '来源信息',
          fields: [
            {
              name: 'sourceType',
              type: 'select',
              label: '来源方式',
              defaultValue: 'manual',
              required: true,
              options: [
                { label: '管理员手工录入', value: 'manual' },
                { label: '未来公开线索', value: 'publicTip' },
                { label: '微信公众号自动搜索', value: 'automaticSearch' },
              ],
              admin: {
                description: '自动搜索结果由服务器写入；管理员手工新增时保持“管理员手工录入”。',
                readOnly: true,
              },
            },
            {
              name: 'sourceName',
              type: 'text',
              label: '来源名称',
              maxLength: 200,
            },
            {
              name: 'sourceUrl',
              type: 'text',
              label: '公开来源网址',
              maxLength: 2000,
              validate: validateOptionalHttpUrl,
              admin: {
                description: '只填写以 http:// 或 https:// 开头的公开来源网址。',
              },
            },
            {
              name: 'sourceReference',
              type: 'text',
              label: '外部来源标识（未来预留）',
              maxLength: 500,
              admin: {
                description: '供后续线索或自动搜索程序使用，当前手工录入可以留空。',
              },
            },
            {
              name: 'discoveredAt',
              type: 'date',
              label: '进入系统时间',
              required: true,
              index: true,
              admin: {
                date: {
                  displayFormat: 'yyyy-MM-dd HH:mm',
                  pickerAppearance: 'dayAndTime',
                },
                readOnly: true,
              },
            },
          ],
        },
        {
          label: '核实管理',
          fields: [
            {
              name: 'status',
              type: 'select',
              label: '核实状态',
              defaultValue: 'pending',
              required: true,
              index: true,
              options: [
                { label: '待核实', value: 'pending' },
                { label: '核实中', value: 'verifying' },
                { label: '已确认', value: 'confirmed' },
                { label: '不采用', value: 'rejected' },
                { label: '重复线索', value: 'duplicate' },
              ],
              admin: {
                description:
                  '新闻候选未经人工核实不得发布；“已确认”不代表已经对外发布。',
              },
            },
            {
              name: 'verificationNotes',
              type: 'textarea',
              label: '内部核实记录',
              maxLength: 5000,
              admin: {
                description: '仅后台可见，请记录来源核对过程和需要注意的问题。',
              },
            },
            {
              name: 'verifiedAt',
              type: 'date',
              label: '完成核实时间',
              admin: {
                date: {
                  displayFormat: 'yyyy-MM-dd HH:mm',
                  pickerAppearance: 'dayAndTime',
                },
              },
            },
          ],
        },
      ],
    },
  ],
}
