import { randomUUID } from 'node:crypto'
import type { CollectionBeforeValidateHook, CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import { generateSubmissionNumber } from '../submissions/submissionNumber'

const protectedAccess = {
  create: authenticated,
  delete: authenticated,
  read: authenticated,
  update: authenticated,
}

export const protectSubmissionCreateFields: CollectionBeforeValidateHook = async ({
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

export const Submissions: CollectionConfig = {
  slug: 'submissions',
  labels: {
    plural: '投稿管理',
    singular: '投稿',
  },
  access: protectedAccess,
  admin: {
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
  },
  defaultSort: '-submittedAt',
  hooks: {
    beforeValidate: [protectSubmissionCreateFields],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: '稿件内容',
          fields: [
            {
              name: 'submissionNumber',
              type: 'text',
              label: '投稿编号',
              required: true,
              unique: true,
              index: true,
              admin: {
                readOnly: true,
              },
            },
            {
              name: 'submittedAt',
              type: 'date',
              label: '投稿时间',
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
            {
              name: 'submitterName',
              type: 'text',
              label: '投稿人姓名',
              required: true,
              maxLength: 100,
            },
            {
              name: 'penName',
              type: 'text',
              label: '笔名',
              maxLength: 100,
            },
            {
              name: 'contact',
              type: 'text',
              label: '联系方式',
              required: true,
              maxLength: 100,
              admin: {
                description: '仅供编辑联系投稿人，不得公开。',
              },
            },
            {
              name: 'title',
              type: 'text',
              label: '文章标题',
              required: true,
              maxLength: 200,
            },
            {
              name: 'category',
              type: 'select',
              label: '作品类别',
              required: true,
              options: [
                { label: '诗歌', value: 'poetry' },
                { label: '小说', value: 'fiction' },
                { label: '散文', value: 'prose' },
                { label: '评论', value: 'criticism' },
                { label: '其他', value: 'other' },
              ],
            },
            {
              name: 'content',
              type: 'textarea',
              label: '文章正文',
              required: true,
              minLength: 20,
              maxLength: 100000,
            },
            {
              name: 'notes',
              type: 'textarea',
              label: '补充说明',
              maxLength: 2000,
            },
            {
              name: 'rightsConfirmed',
              type: 'checkbox',
              label: '已确认作品原创或已经获得投稿授权',
              required: true,
            },
          ],
        },
        {
          label: '审核管理',
          fields: [
            {
              name: 'status',
              type: 'select',
              label: '审核状态',
              defaultValue: 'submitted',
              required: true,
              index: true,
              options: [
                { label: '待审核', value: 'submitted' },
                { label: '审核中', value: 'reviewing' },
                { label: '退回修改', value: 'revisionRequested' },
                { label: '已采用', value: 'accepted' },
                { label: '不采用', value: 'rejected' },
              ],
            },
            {
              name: 'relatedMember',
              type: 'relationship',
              label: '关联成员档案',
              relationTo: 'members',
              admin: {
                description: '由管理员审核后选择，公开投稿页不会显示成员名单。',
              },
            },
            {
              name: 'reviewNotes',
              type: 'textarea',
              label: '内部审核意见',
              maxLength: 5000,
              admin: {
                description: '仅后台可见，不会向投稿人或公开页面展示。',
              },
            },
            {
              name: 'requestToken',
              type: 'text',
              label: '防重复请求标识',
              required: true,
              unique: true,
              index: true,
              admin: {
                hidden: true,
                readOnly: true,
              },
            },
          ],
        },
      ],
    },
  ],
}
