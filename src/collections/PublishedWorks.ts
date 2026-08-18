import type { CollectionBeforeValidateHook, CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'

type PublishedWorkState = 'archived' | 'draft' | 'published'

export type PublishedWorkSafetyData = {
  publicationAuthorized?: boolean | null
  publishedAt?: null | string
  status?: PublishedWorkState | null
  [key: string]: unknown
}

export function normalizePublishedWork(
  data: PublishedWorkSafetyData,
  originalDoc: PublishedWorkSafetyData = {},
  now = new Date().toISOString(),
): PublishedWorkSafetyData {
  const publicationAuthorized =
    data.publicationAuthorized ?? originalDoc.publicationAuthorized ?? false
  const requestedStatus = data.status ?? originalDoc.status ?? 'draft'
  const previousPublishedAt = originalDoc.publishedAt ?? null

  if (!publicationAuthorized) {
    return {
      ...data,
      publicationAuthorized: false,
      publishedAt: previousPublishedAt,
      status: 'draft',
    }
  }

  return {
    ...data,
    publicationAuthorized: true,
    publishedAt:
      requestedStatus === 'published'
        ? previousPublishedAt || now
        : previousPublishedAt,
    status: requestedStatus,
  }
}

export const enforcePublishedWorkSafety: CollectionBeforeValidateHook = ({
  data,
  originalDoc,
}) => normalizePublishedWork(data ?? {}, originalDoc ?? {})

export function validatePublishedWorkSlug(value: unknown): true | string {
  return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
    ? true
    : '网址标识只能使用小写英文字母、数字和短横线。'
}

const protectedAccess = {
  create: authenticated,
  delete: authenticated,
  read: authenticated,
  update: authenticated,
}

export const PublishedWorks: CollectionConfig = {
  slug: 'published-works',
  labels: {
    plural: '公开作品',
    singular: '公开作品',
  },
  access: protectedAccess,
  admin: {
    defaultColumns: ['title', 'authorName', 'category', 'status', 'publishedAt'],
    group: '内容管理',
    useAsTitle: 'title',
  },
  defaultSort: '-publishedAt',
  hooks: {
    beforeValidate: [enforcePublishedWorkSafety],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: '公开内容',
          fields: [
            {
              name: 'title',
              type: 'text',
              label: '公开标题',
              required: true,
              maxLength: 200,
            },
            {
              name: 'slug',
              type: 'text',
              label: '网址标识',
              required: true,
              unique: true,
              index: true,
              validate: validatePublishedWorkSlug,
              admin: {
                description: '只使用小写英文字母、数字和短横线，例如 spring-poem。',
              },
            },
            {
              name: 'authorName',
              type: 'text',
              label: '公开署名',
              required: true,
              maxLength: 100,
              admin: {
                description: '请按作者同意公开的姓名或笔名填写，不要自动复制投稿人真实姓名。',
              },
            },
            {
              name: 'relatedMember',
              type: 'relationship',
              label: '关联公开成员（选填）',
              relationTo: 'members',
              admin: {
                description: '成员本人未开启公开主页时，作品页只显示上面的公开署名。',
              },
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
              name: 'excerpt',
              type: 'textarea',
              label: '列表导语（选填）',
              maxLength: 500,
            },
            {
              name: 'content',
              type: 'textarea',
              label: '公开正文',
              required: true,
              minLength: 20,
              maxLength: 100000,
              admin: {
                description: '使用纯文本；段落之间空一行。不要粘贴网页代码。',
              },
            },
          ],
        },
        {
          label: '发布管理',
          fields: [
            {
              name: 'sourceSubmission',
              type: 'relationship',
              label: '来源投稿（仅后台追溯）',
              relationTo: 'submissions',
              admin: {
                description: '可选。投稿编号、联系方式和审核意见不会进入公开页面。',
              },
            },
            {
              name: 'publicationAuthorized',
              type: 'checkbox',
              label: '已确认作者同意在网站公开',
              defaultValue: false,
              admin: {
                description: '只有确认授权后才能发布；撤销此项会自动转回草稿。',
              },
            },
            {
              name: 'authorizationNotes',
              type: 'textarea',
              label: '授权范围和核对说明（仅后台）',
              maxLength: 3000,
            },
            {
              name: 'status',
              type: 'select',
              label: '发布状态',
              defaultValue: 'draft',
              required: true,
              index: true,
              options: [
                { label: '草稿', value: 'draft' },
                { label: '已发布', value: 'published' },
                { label: '已归档', value: 'archived' },
              ],
            },
            {
              name: 'publishedAt',
              type: 'date',
              label: '首次发布时间',
              index: true,
              admin: {
                readOnly: true,
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
