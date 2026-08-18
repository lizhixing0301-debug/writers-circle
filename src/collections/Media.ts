import type { CollectionConfig } from 'payload'
import path from 'node:path'

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
    staticDir: process.env.PAYLOAD_MEDIA_DIR || path.resolve(process.cwd(), 'media'),
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
