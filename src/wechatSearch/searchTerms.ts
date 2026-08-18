export type WechatSearchMember = {
  aliases?: Array<{ value?: null | string }> | null
  id: number | string
  name: string
  penName?: null | string
  searchKeywords?: Array<{ value?: null | string }> | null
}

export type WechatSearchJob = {
  memberId: number | string
  memberName: string
  query: string
}

const DEFAULT_MAXIMUM_QUERIES = 64

function cleanTerm(value: null | string | undefined): string {
  return typeof value === 'string' ? value.trim().replaceAll(/\s+/g, ' ') : ''
}

function memberTerms(member: WechatSearchMember): string[] {
  const values = [
    member.name,
    member.penName,
    ...(member.aliases ?? []).map((alias) => alias.value),
    ...(member.searchKeywords ?? []).map((keyword) => keyword.value),
  ]
  const seen = new Set<string>()
  const terms: string[] = []

  for (const value of values) {
    const term = cleanTerm(value)
    const identity = term.toLocaleLowerCase('zh-CN')

    if (!term || seen.has(identity)) continue
    seen.add(identity)
    terms.push(term)
  }

  return terms
}

export function buildWechatSearchJobs(
  members: WechatSearchMember[],
  maximumQueries = DEFAULT_MAXIMUM_QUERIES,
): WechatSearchJob[] {
  const maximum = Math.max(0, Math.floor(maximumQueries))
  if (maximum === 0) return []

  const prepared = members.flatMap((member) => {
    const terms = memberTerms(member)
    const memberName = terms[0]

    return memberName ? [{ member, memberName, terms }] : []
  })
  const jobs: WechatSearchJob[] = []
  const greatestTermCount = Math.max(0, ...prepared.map(({ terms }) => terms.length))

  for (let termIndex = 0; termIndex < greatestTermCount; termIndex += 1) {
    for (const { member, memberName, terms } of prepared) {
      const query = terms[termIndex]
      if (!query) continue

      jobs.push({ memberId: member.id, memberName, query })
      if (jobs.length === maximum) return jobs
    }
  }

  return jobs
}
