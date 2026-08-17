import type { Field } from 'payload'
import { describe, expect, it } from 'vitest'

import { Members } from './Members'

function flattenTopLevelFields(fields: Field[]): Field[] {
  return fields.flatMap((field) => {
    if (field.type === 'tabs') {
      return field.tabs.flatMap((tab) => flattenTopLevelFields(tab.fields))
    }

    return [field]
  })
}

function findField(name: string) {
  return flattenTopLevelFields(Members.fields).find(
    (field) => 'name' in field && field.name === name,
  )
}

describe('Members 集合', () => {
  it('使用正确的集合名称和后台标题', () => {
    expect(Members.slug).toBe('members')
    expect(Members.admin?.useAsTitle).toBe('name')
  })

  it('姓名和网址标识为必填，网址标识不可重复', () => {
    expect(findField('name')).toMatchObject({ required: true, type: 'text' })
    expect(findField('slug')).toMatchObject({
      index: true,
      required: true,
      type: 'text',
      unique: true,
    })
  })

  it('所有公开开关默认关闭', () => {
    expect(findField('publicProfileEnabled')).toMatchObject({
      defaultValue: false,
      type: 'checkbox',
    })
    expect(findField('showDisabilityCategory')).toMatchObject({
      defaultValue: false,
      type: 'checkbox',
    })
    expect(findField('showDisabilityLevel')).toMatchObject({
      defaultValue: false,
      type: 'checkbox',
    })
  })

  it('授权状态默认未征求', () => {
    expect(findField('consentStatus')).toMatchObject({
      defaultValue: 'notRequested',
      type: 'select',
    })
  })

  it('头像关联图片资源集合', () => {
    expect(findField('profileImage')).toMatchObject({
      relationTo: 'media',
      type: 'upload',
    })
  })
})
