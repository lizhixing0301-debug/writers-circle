import { randomUUID } from 'node:crypto'

import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

const baseUrl = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3000'
const requestToken = randomUUID()
const memberSlug = `phase-2-fictional-${requestToken.slice(0, 8)}`

const fictionalSubmission = {
  category: 'prose',
  contact: 'fictional-runtime-contact',
  content: '这是一篇完全虚构、只用于 Phase 2 运行验收的文学作品正文。',
  notes: '完全虚构的运行验收说明',
  penName: '虚构验收笔名',
  requestToken,
  rightsConfirmed: true,
  submitterName: '虚构验收投稿人',
  title: 'Phase 2 虚构运行验收稿件',
  website: '',
}

function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function removeFictionalData(payload: Payload) {
  const submissions = await payload.find({
    collection: 'submissions',
    depth: 0,
    limit: 100,
    overrideAccess: true,
    where: { requestToken: { equals: requestToken } },
  })

  for (const submission of submissions.docs) {
    await payload.delete({
      collection: 'submissions',
      id: submission.id,
      overrideAccess: true,
    })
  }

  const members = await payload.find({
    collection: 'members',
    depth: 0,
    limit: 100,
    overrideAccess: true,
    where: { slug: { equals: memberSlug } },
  })

  for (const member of members.docs) {
    await payload.delete({
      collection: 'members',
      id: member.id,
      overrideAccess: true,
    })
  }

  const remainingSubmissions = await payload.find({
    collection: 'submissions',
    limit: 1,
    overrideAccess: true,
    where: { requestToken: { equals: requestToken } },
  })
  const remainingMembers = await payload.find({
    collection: 'members',
    limit: 1,
    overrideAccess: true,
    where: { slug: { equals: memberSlug } },
  })

  requireCondition(
    remainingSubmissions.totalDocs === 0,
    '虚构投稿验收数据没有清理干净。',
  )
  requireCondition(remainingMembers.totalDocs === 0, '虚构成员验收数据没有清理干净。')

  console.log('PASS：虚构投稿和虚构成员均已删除，剩余数量为 0。')
}

async function main() {
  const payload = await getPayload({ config })

  try {
    const firstResponse = await fetch(`${baseUrl}/api/public/submissions`, {
      body: JSON.stringify(fictionalSubmission),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })
    const firstBody = (await firstResponse.json()) as {
      message?: string
      submissionNumber?: string
    }

    requireCondition(firstResponse.status === 201, '公开投稿没有返回 HTTP 201。')
    requireCondition(
      typeof firstBody.submissionNumber === 'string' &&
        /^WC-\d{8}-[A-F0-9]{8}$/.test(firstBody.submissionNumber),
      '公开投稿没有返回有效投稿编号。',
    )
    requireCondition(
      Object.keys(firstBody).length === 1,
      '公开投稿响应返回了投稿编号以外的数据。',
    )
    console.log(`PASS：公开投稿成功，投稿编号 ${firstBody.submissionNumber}。`)

    const repeatedResponse = await fetch(`${baseUrl}/api/public/submissions`, {
      body: JSON.stringify(fictionalSubmission),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })
    const repeatedBody = (await repeatedResponse.json()) as {
      submissionNumber?: string
    }

    requireCondition(repeatedResponse.status === 201, '重复请求没有安全返回原投稿结果。')
    requireCondition(
      repeatedBody.submissionNumber === firstBody.submissionNumber,
      '重复请求返回了不同的投稿编号。',
    )
    console.log('PASS：相同请求不会重复建立稿件。')

    const stored = await payload.find({
      collection: 'submissions',
      depth: 0,
      limit: 10,
      overrideAccess: true,
      where: { requestToken: { equals: requestToken } },
    })

    requireCondition(stored.totalDocs === 1, '数据库中的虚构稿件数量不是 1。')
    const submission = stored.docs[0]
    requireCondition(submission.status === 'submitted', '新稿件不是“待审核”状态。')
    requireCondition(!submission.relatedMember, '公开投稿错误关联了成员。')
    requireCondition(!submission.reviewNotes, '公开投稿错误写入了审核意见。')
    requireCondition(
      submission.submitterName === fictionalSubmission.submitterName &&
        submission.title === fictionalSubmission.title &&
        submission.content === fictionalSubmission.content,
      '数据库保存的公开投稿字段不一致。',
    )
    console.log('PASS：数据库只保存了一条待审核虚构稿件。')

    const member = await payload.create({
      collection: 'members',
      data: {
        consentStatus: 'notRequested',
        name: 'Phase 2 虚构验收成员',
        slug: memberSlug,
        status: 'active',
      },
      overrideAccess: true,
    })

    const updated = await payload.update({
      collection: 'submissions',
      id: submission.id,
      data: {
        relatedMember: member.id,
        reviewNotes: '完全虚构的内部审核意见',
        status: 'reviewing',
      },
      overrideAccess: true,
    })
    const relatedMemberId =
      typeof updated.relatedMember === 'object' && updated.relatedMember
        ? updated.relatedMember.id
        : updated.relatedMember

    requireCondition(updated.status === 'reviewing', '管理员未能修改审核状态。')
    requireCondition(
      String(relatedMemberId) === String(member.id),
      '管理员未能关联虚构成员。',
    )
    requireCondition(
      updated.reviewNotes === '完全虚构的内部审核意见',
      '管理员未能保存内部审核意见。',
    )
    console.log('PASS：管理员可以审核、关联成员并填写内部意见。')

    const privateResponse = await fetch(`${baseUrl}/api/submissions?limit=1`)
    requireCondition(privateResponse.status === 403, '未登录请求没有被投稿接口拒绝。')
    console.log('PASS：未登录用户读取投稿时返回 HTTP 403。')
  } finally {
    await removeFictionalData(payload)
  }
}

await main()
