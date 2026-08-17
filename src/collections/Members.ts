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
                {
                  name: 'name',
                  type: 'text',
                  label: '公众号名称',
                  required: true,
                },
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
