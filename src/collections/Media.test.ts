import { describe, expect, it } from 'vitest'

import { Media } from './Media'

describe('Media 集合', () => {
  it('只接受常用网页图片并禁止网址粘贴上传', () => {
    expect(Media.upload).toMatchObject({
      displayPreview: true,
      mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      pasteURL: false,
    })
  })

  it('使用明确的持久化图片目录', () => {
    expect(Media.upload).toMatchObject({
      staticDir: expect.stringMatching(/\/media$/),
    })
  })

  it('图片替代文字为必填项', () => {
    expect(Media.fields).toContainEqual(
      expect.objectContaining({
        name: 'alt',
        required: true,
        type: 'text',
      }),
    )
  })

  it('未登录用户不能读取图片资源记录', () => {
    expect(Media.access?.read?.({ req: { user: null } } as never)).toBe(false)
  })
})
