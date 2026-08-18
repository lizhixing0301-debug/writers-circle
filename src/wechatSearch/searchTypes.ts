import type { WechatArticleSearchItem } from './justOneApiProvider'
import type { WechatSearchMember } from './searchTerms'

export type WechatSearchTrigger = 'admin' | 'verification'
export type WechatSearchRunStatus =
  | 'failed'
  | 'partial'
  | 'queued'
  | 'running'
  | 'succeeded'

export type WechatSearchRun = {
  id: number | string
  runNumber: string
}

export type WechatSearchRunUpdate = {
  apiCallCount?: number
  completedAt?: null | string
  createdCount?: number
  duplicateCount?: number
  errorSummary?: null | string
  failedQueryCount?: number
  memberCount?: number
  plannedQueryCount?: number
  resultCount?: number
  startedAt?: null | string
  status?: WechatSearchRunStatus
}

export type WechatCandidateInput = {
  item: WechatArticleSearchItem
  query: string
  sourceReference: string
}

export type WechatSearchStore = {
  candidateExists(sourceReference: string): Promise<boolean>
  createCandidate(input: WechatCandidateInput): Promise<{ candidateNumber: string }>
  createRun(trigger: WechatSearchTrigger): Promise<WechatSearchRun>
  getActiveMembers(): Promise<WechatSearchMember[]>
  updateRun(id: number | string, data: WechatSearchRunUpdate): Promise<void>
}
