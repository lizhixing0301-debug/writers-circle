import { describe, expect, it } from 'vitest'

import { generateNewsCandidateNumber } from './newsCandidateNumber'

describe('新闻候选编号', () => {
  it('包含日期和随机片段', () => {
    expect(
      generateNewsCandidateNumber(
        new Date('2026-08-17T09:00:00.000Z'),
        '12345678-abcd-4abc-8def-1234567890ab',
      ),
    ).toBe('NEWS-20260817-12345678')
  })

  it('随机片段统一使用大写', () => {
    expect(
      generateNewsCandidateNumber(
        new Date('2026-01-02T00:00:00.000Z'),
        'abcdef12-3456-4789-8abc-def123456789',
      ),
    ).toBe('NEWS-20260102-ABCDEF12')
  })
})
