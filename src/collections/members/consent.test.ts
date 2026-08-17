import { describe, expect, it } from 'vitest'

import { normalizeMemberConsent } from './consent'

describe('normalizeMemberConsent', () => {
  it('未征求意见时自动关闭所有公开开关', () => {
    expect(
      normalizeMemberConsent({
        consentStatus: 'notRequested',
        publicProfileEnabled: true,
        showDisabilityCategory: true,
        showDisabilityLevel: true,
      }),
    ).toMatchObject({
      publicProfileEnabled: false,
      showDisabilityCategory: false,
      showDisabilityLevel: false,
    })
  })

  it('不同意公开时自动关闭所有公开开关', () => {
    expect(
      normalizeMemberConsent({
        consentStatus: 'denied',
        publicProfileEnabled: true,
        showDisabilityCategory: true,
        showDisabilityLevel: true,
      }),
    ).toMatchObject({
      publicProfileEnabled: false,
      showDisabilityCategory: false,
      showDisabilityLevel: false,
    })
  })

  it('已经同意时保留管理员选择', () => {
    expect(
      normalizeMemberConsent({
        consentStatus: 'granted',
        publicProfileEnabled: true,
        showDisabilityCategory: true,
        showDisabilityLevel: false,
      }),
    ).toMatchObject({
      publicProfileEnabled: true,
      showDisabilityCategory: true,
      showDisabilityLevel: false,
    })
  })

  it('更新时使用修改前的授权状态', () => {
    expect(
      normalizeMemberConsent(
        { publicProfileEnabled: true },
        { consentStatus: 'notRequested' },
      ),
    ).toMatchObject({ publicProfileEnabled: false })
  })

  it('撤销同意时自动关闭原有公开开关', () => {
    expect(
      normalizeMemberConsent(
        { consentStatus: 'denied' },
        {
          consentStatus: 'granted',
          publicProfileEnabled: true,
          showDisabilityCategory: true,
          showDisabilityLevel: true,
        },
      ),
    ).toMatchObject({
      publicProfileEnabled: false,
      showDisabilityCategory: false,
      showDisabilityLevel: false,
    })
  })
})
