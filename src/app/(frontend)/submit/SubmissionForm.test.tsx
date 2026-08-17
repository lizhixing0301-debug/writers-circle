import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import SubmissionForm from './SubmissionForm'

describe('公开投稿表单', () => {
  const markup = renderToStaticMarkup(
    <SubmissionForm requestToken="12345678-abcd-4abc-8def-1234567890ab" />,
  )

  it('展示全部投稿字段和明确标签', () => {
    expect(markup).toContain('<form')
    expect(markup).toContain('提交文学作品')
    expect(markup).toContain('投稿人姓名')
    expect(markup).toContain('笔名')
    expect(markup).toContain('联系方式')
    expect(markup).toContain('文章标题')
    expect(markup).toContain('作品类别')
    expect(markup).toContain('文章正文')
    expect(markup).toContain('补充说明')
    expect(markup).toContain('确认投稿')
  })

  it('要求确认原创或已获授权', () => {
    expect(markup).toContain('name="rightsConfirmed"')
    expect(markup).toContain('type="checkbox"')
    expect(markup).toContain('原创或已经获得投稿授权')
  })

  it('包含一次性请求标识和不可聚焦的反垃圾字段', () => {
    expect(markup).toContain('name="requestToken"')
    expect(markup).toContain('value="12345678-abcd-4abc-8def-1234567890ab"')
    expect(markup).toContain('name="website"')
    expect(markup).toContain('tabindex="-1"')
  })

  it('说明隐私边界且不收集本阶段以外内容', () => {
    expect(markup).toContain('稿件和联系方式仅管理员可见')
    expect(markup).not.toContain('残疾类别')
    expect(markup).not.toContain('残疾等级')
    expect(markup).not.toContain('type="file"')
    expect(markup).not.toContain('登录投稿')
    expect(markup).not.toContain('AI')
    expect(markup).not.toContain('AppSecret')
  })
})
