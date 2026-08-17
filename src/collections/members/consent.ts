import type { CollectionBeforeValidateHook } from 'payload'

export type ConsentStatus = 'denied' | 'granted' | 'notRequested'

export type MemberConsentData = {
  consentStatus?: ConsentStatus | null
  publicProfileEnabled?: boolean | null
  showDisabilityCategory?: boolean | null
  showDisabilityLevel?: boolean | null
  [key: string]: unknown
}

export function normalizeMemberConsent(
  data: MemberConsentData,
  originalDoc: MemberConsentData = {},
): MemberConsentData {
  const consentStatus =
    data.consentStatus ?? originalDoc.consentStatus ?? 'notRequested'

  if (consentStatus === 'granted') {
    return data
  }

  return {
    ...data,
    publicProfileEnabled: false,
    showDisabilityCategory: false,
    showDisabilityLevel: false,
  }
}

export const enforceMemberConsent: CollectionBeforeValidateHook = ({
  data,
  originalDoc,
}) => normalizeMemberConsent(data ?? {}, originalDoc ?? {})
