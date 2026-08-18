import { describe, expect, it } from 'vitest'

import { buildWechatSearchJobs, type WechatSearchMember } from './searchTerms'

const fictionalMembers: WechatSearchMember[] = [
  {
    aliases: [{ value: '林槐' }, { value: ' lin huai ' }],
    id: 1,
    name: '林淮',
    penName: 'Lin Huai',
    searchKeywords: [{ value: '林淮 散文' }],
  },
  {
    aliases: [{ value: '周棠旧名' }],
    id: 2,
    name: '周棠',
    penName: '棠舟',
    searchKeywords: [{ value: '周棠 诗歌' }],
  },
]

describe('微信公众号搜索词', () => {
  it('先保证每名成员的姓名，再按成员轮流加入其他搜索词', () => {
    expect(buildWechatSearchJobs(fictionalMembers)).toEqual([
      { memberId: 1, memberName: '林淮', query: '林淮' },
      { memberId: 2, memberName: '周棠', query: '周棠' },
      { memberId: 1, memberName: '林淮', query: 'Lin Huai' },
      { memberId: 2, memberName: '周棠', query: '棠舟' },
      { memberId: 1, memberName: '林淮', query: '林槐' },
      { memberId: 2, memberName: '周棠', query: '周棠旧名' },
      { memberId: 1, memberName: '林淮', query: '林淮 散文' },
      { memberId: 2, memberName: '周棠', query: '周棠 诗歌' },
    ])
  })

  it('整理空白并按不区分英文大小写的方式去重', () => {
    expect(
      buildWechatSearchJobs([
        {
          aliases: [{ value: ' river moon ' }, { value: '' }],
          id: 'member-1',
          name: '  River Moon  ',
          penName: 'RIVER MOON',
          searchKeywords: [{ value: ' River   Moon ' }, { value: null }],
        },
      ]),
    ).toEqual([
      { memberId: 'member-1', memberName: 'River Moon', query: 'River Moon' },
    ])
  })

  it('只读取明确允许的检索字段，不使用残疾信息或内部备注', () => {
    const member = {
      disabilityCategory: 'physical',
      disabilityLevel: 'level1',
      id: 9,
      internalNotes: '不得成为搜索词的内部内容',
      name: '许澄',
    } as WechatSearchMember & Record<string, unknown>

    expect(buildWechatSearchJobs([member])).toEqual([
      { memberId: 9, memberName: '许澄', query: '许澄' },
    ])
  })

  it('默认最多生成64次查询，并优先覆盖所有成员姓名', () => {
    const members: WechatSearchMember[] = Array.from({ length: 40 }, (_, index) => ({
      id: index + 1,
      name: `虚构成员${String(index + 1).padStart(2, '0')}`,
      penName: `虚构笔名${String(index + 1).padStart(2, '0')}`,
    }))

    const jobs = buildWechatSearchJobs(members)

    expect(jobs).toHaveLength(64)
    expect(jobs.slice(0, 40).map((job) => job.query)).toEqual(
      members.map((member) => member.name),
    )
    expect(jobs[40]).toEqual({
      memberId: 1,
      memberName: '虚构成员01',
      query: '虚构笔名01',
    })
    expect(jobs[63].query).toBe('虚构笔名24')
  })

  it('空姓名或非正数上限不会生成查询', () => {
    expect(buildWechatSearchJobs([{ id: 1, name: '   ' }])).toEqual([])
    expect(buildWechatSearchJobs(fictionalMembers, 0)).toEqual([])
  })
})
