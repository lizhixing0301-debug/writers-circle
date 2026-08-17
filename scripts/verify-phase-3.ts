import { randomUUID } from 'node:crypto'

import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

import { ingestNewsCandidate } from '../src/newsCandidates/ingestNewsCandidate'
import { createPayloadNewsCandidateStore } from '../src/newsCandidates/payloadNewsCandidateStore'

const baseUrl = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3000'
const runId = randomUUID().slice(0, 8)
const memberSlug = `phase-3-fictional-${runId}`
const sourceReference = `phase-3-fictional-source-${runId}`

function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function removeFictionalData(payload: Payload) {
  const candidates = await payload.find({
    collection: 'news-candidates',
    depth: 0,
    limit: 100,
    overrideAccess: true,
    where: { sourceReference: { equals: sourceReference } },
  })

  for (const candidate of candidates.docs) {
    await payload.delete({
      collection: 'news-candidates',
      id: candidate.id,
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

  const remainingCandidates = await payload.find({
    collection: 'news-candidates',
    limit: 1,
    overrideAccess: true,
    where: { sourceReference: { equals: sourceReference } },
  })
  const remainingMembers = await payload.find({
    collection: 'members',
    limit: 1,
    overrideAccess: true,
    where: { slug: { equals: memberSlug } },
  })

  requireCondition(
    remainingCandidates.totalDocs === 0,
    '虚构新闻候选验收数据没有清理干净。',
  )
  requireCondition(
    remainingMembers.totalDocs === 0,
    '虚构成员验收数据没有清理干净。',
  )

  console.log('PASS：虚构新闻候选和虚构成员均已删除，剩余数量为 0。')
}

async function requireHttpOk(pathname: string) {
  const response = await fetch(`${baseUrl}${pathname}`)
  requireCondition(response.status === 200, `${pathname} 没有返回 HTTP 200。`)
}

async function main() {
  const payload = await getPayload({ config })

  try {
    const result = await ingestNewsCandidate(
      {
        category: 'activity',
        publishedAt: '2026-08-16T00:00:00.000Z',
        relatedPersonName: 'Phase 3 虚构验收成员',
        sourceName: 'Phase 3 虚构文学机构',
        sourceReference,
        sourceType: 'manual',
        sourceUrl: 'https://example.com/phase-3-fictional-news',
        summary: '这是一条完全虚构、只用于 Phase 3 运行验收的新闻候选摘要。',
        title: 'Phase 3 虚构运行验收新闻候选',
      },
      createPayloadNewsCandidateStore(payload),
    )

    requireCondition(result.kind === 'created', '内部录入接口没有创建新闻候选。')
    requireCondition(
      /^NEWS-\d{8}-[A-F0-9]{8}$/.test(result.candidateNumber),
      '内部录入接口没有返回有效的候选编号。',
    )
    console.log(`PASS：内部录入成功，候选编号 ${result.candidateNumber}。`)

    const stored = await payload.find({
      collection: 'news-candidates',
      depth: 0,
      limit: 10,
      overrideAccess: true,
      where: { sourceReference: { equals: sourceReference } },
    })

    requireCondition(stored.totalDocs === 1, '数据库中的虚构新闻候选数量不是 1。')
    const candidate = stored.docs[0]
    requireCondition(candidate.status === 'pending', '新候选不是“待核实”状态。')
    requireCondition(!candidate.relatedMember, '新候选错误关联了成员。')
    requireCondition(!candidate.verificationNotes, '新候选错误写入了核实记录。')
    requireCondition(!candidate.verifiedAt, '新候选错误写入了核实完成时间。')
    console.log('PASS：数据库只保存了一条待核实的虚构新闻候选。')

    const member = await payload.create({
      collection: 'members',
      data: {
        consentStatus: 'notRequested',
        name: 'Phase 3 虚构验收成员',
        slug: memberSlug,
        status: 'active',
      },
      overrideAccess: true,
    })

    const updated = await payload.update({
      collection: 'news-candidates',
      id: candidate.id,
      data: {
        relatedMember: member.id,
        status: 'verifying',
        verificationNotes: '完全虚构的内部核实记录',
      },
      overrideAccess: true,
    })
    const relatedMemberId =
      typeof updated.relatedMember === 'object' && updated.relatedMember
        ? updated.relatedMember.id
        : updated.relatedMember

    requireCondition(updated.status === 'verifying', '管理员未能修改核实状态。')
    requireCondition(
      String(relatedMemberId) === String(member.id),
      '管理员未能关联虚构成员。',
    )
    requireCondition(
      updated.verificationNotes === '完全虚构的内部核实记录',
      '管理员未能保存内部核实记录。',
    )
    console.log('PASS：管理员可以核实候选、关联成员并填写内部记录。')

    const privateResponse = await fetch(`${baseUrl}/api/news-candidates?limit=1`)
    requireCondition(
      privateResponse.status === 403,
      '未登录请求没有被新闻候选接口拒绝。',
    )
    console.log('PASS：未登录用户读取新闻候选时返回 HTTP 403。')

    await requireHttpOk('/')
    await requireHttpOk('/submit')
    await requireHttpOk('/admin')
    console.log('PASS：首页、投稿页和 Payload 后台均返回 HTTP 200。')
  } finally {
    await removeFictionalData(payload)
  }
}

await main()
