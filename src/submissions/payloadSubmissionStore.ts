import type { Payload } from 'payload'

import type { SubmissionStore, ValidSubmission } from './publicSubmission'
import { generateSubmissionNumber } from './submissionNumber'

export function createPayloadSubmissionStore(payload: Payload): SubmissionStore {
  return {
    async findByRequestToken(token) {
      const result = await payload.find({
        collection: 'submissions',
        depth: 0,
        limit: 1,
        overrideAccess: true,
        where: {
          requestToken: {
            equals: token,
          },
        },
      })
      const existing = result.docs[0]

      return existing ? { submissionNumber: existing.submissionNumber } : null
    },

    async create(data: ValidSubmission) {
      const created = await payload.create({
        collection: 'submissions',
        data: {
          ...data,
          status: 'submitted',
          submissionNumber: generateSubmissionNumber(),
          submittedAt: new Date().toISOString(),
        },
        overrideAccess: true,
      })

      return { submissionNumber: created.submissionNumber }
    },
  }
}
