import { normalizeWechatArticleUrl } from './wechatArticleIdentity'

export type WechatArticleSearchItem = {
  publishedAt?: string
  sourceName?: string
  summary?: string
  title: string
  url: string
}

export type WechatArticleSearchProvider = {
  search(query: string): Promise<WechatArticleSearchItem[]>
}

type ProviderOptions = {
  baseUrl?: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
  token: string
}

const titleFields = ['title', 'articleTitle', 'article_title'] as const
const urlFields = [
  'url',
  'link',
  'articleUrl',
  'article_url',
  'contentUrl',
  'content_url',
  'doc_url',
] as const
const sourceFields = [
  'nickname',
  'sourceName',
  'source_name',
  'accountName',
  'account_name',
  'author',
  'source',
] as const
const summaryFields = ['digest', 'summary', 'description', 'desc'] as const
const dateFields = [
  'publishedAt',
  'publishTime',
  'publish_time',
  'createTime',
  'create_time',
  'date',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function decodeEntities(value: string): string {
  return value
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&#160;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
}

function cleanText(value: unknown, maximum: number): string {
  if (typeof value !== 'string') return ''

  return decodeEntities(value)
    .replaceAll(/<[^>]*>/g, '')
    .replaceAll(/\s+/g, ' ')
    .trim()
    .slice(0, maximum)
}

function firstText(
  record: Record<string, unknown>,
  fields: readonly string[],
  maximum: number,
): string {
  for (const field of fields) {
    const value = cleanText(record[field], maximum)
    if (value) return value
  }

  return ''
}

function normalizeDate(value: unknown): string | undefined {
  let date: Date

  if (typeof value === 'number' && Number.isFinite(value)) {
    date = new Date(value < 10_000_000_000 ? value * 1000 : value)
  } else if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim()
    const numeric = Number(trimmed)
    date = /^\d{10,13}$/.test(trimmed)
      ? new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric)
      : new Date(trimmed)
  } else {
    return undefined
  }

  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function firstDate(record: Record<string, unknown>): string | undefined {
  for (const field of dateFields) {
    const value = normalizeDate(record[field])
    if (value) return value
  }

  return undefined
}

function collectArticles(value: unknown): WechatArticleSearchItem[] {
  const articles = new Map<string, WechatArticleSearchItem>()

  function visit(node: unknown) {
    if (Array.isArray(node)) {
      for (const item of node) visit(item)
      return
    }

    if (!isRecord(node)) return

    const title = firstText(node, titleFields, 300)
    const rawUrl = firstText(node, urlFields, 3000)
    const url = rawUrl ? normalizeWechatArticleUrl(rawUrl) : null

    if (title && url && !articles.has(url)) {
      const publishedAt = firstDate(node)
      const sourceName = firstText(node, sourceFields, 200)
      const summary = firstText(node, summaryFields, 2000)

      articles.set(url, {
        ...(publishedAt ? { publishedAt } : {}),
        ...(sourceName ? { sourceName } : {}),
        ...(summary ? { summary } : {}),
        title,
        url,
      })
    }

    for (const child of Object.values(node)) visit(child)
  }

  visit(value)

  return [...articles.values()]
}

function providerError(code: number): Error {
  const messages: Record<number, string> = {
    100: '公众号搜索服务 Token 无效或尚未激活。',
    302: '公众号搜索服务调用过于频繁，请稍后再试。',
    303: '公众号搜索服务今日调用额度已用完。',
    600: '当前账号没有使用权限，无法调用公众号搜索接口。',
    601: '公众号搜索服务账户余额不足。',
    602: '公众号搜索服务 Token 调用上限已达到。',
  }

  return new Error(messages[code] ?? `公众号搜索服务返回错误（代码 ${code}）。`)
}

function parseEnvelope(text: string): { code: number; data: unknown } {
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('公众号搜索服务返回格式不正确。')
  }

  if (!isRecord(parsed)) {
    throw new Error('公众号搜索服务返回格式不正确。')
  }

  const code = typeof parsed.code === 'string' ? Number(parsed.code) : parsed.code
  if (typeof code !== 'number' || !Number.isInteger(code)) {
    throw new Error('公众号搜索服务返回格式不正确。')
  }

  return { code, data: parsed.data }
}

export function createJustOneApiWechatProvider({
  baseUrl = 'https://api.justoneapi.com',
  fetchImpl = fetch,
  timeoutMs = 60_000,
  token,
}: ProviderOptions): WechatArticleSearchProvider {
  const safeToken = token.trim()
  if (!safeToken) throw new Error('未配置公众号搜索服务 Token。')

  let endpoint: URL

  try {
    const base = new URL(baseUrl)
    if (base.protocol !== 'https:') {
      throw new Error('公众号搜索服务地址必须使用 HTTPS。')
    }
    endpoint = new URL('/api/weixin/search-article/v1', base)
  } catch (error) {
    if (error instanceof Error && error.message.includes('HTTPS')) throw error
    throw new Error('公众号搜索服务地址格式不正确，且必须使用 HTTPS。')
  }

  return {
    async search(rawQuery) {
      const query = rawQuery.trim().replaceAll(/\s+/g, ' ')
      if (!query) throw new Error('公众号搜索词不能为空。')

      const body = new URLSearchParams({
        cookies_buffer: '',
        currentPage: '1',
        keyword: query,
        offset: '0',
        publishTimeType: 'SEVEN_DAYS',
        sortType: 'LATEST',
        token: safeToken,
      })
      let response: Response

      try {
        response = await fetchImpl(endpoint, {
          body,
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          method: 'POST',
          signal: AbortSignal.timeout(timeoutMs),
        })
      } catch {
        throw new Error('暂时无法连接公众号搜索服务，请稍后再试。')
      }

      const text = await response.text()

      if (!response.ok) {
        try {
          const envelope = parseEnvelope(text)
          if (envelope.code !== 0) throw providerError(envelope.code)
        } catch (error) {
          if (error instanceof Error && !error.message.includes('返回格式')) throw error
        }

        throw new Error(`公众号搜索服务暂时不可用（HTTP ${response.status}）。`)
      }

      const envelope = parseEnvelope(text)
      if (envelope.code !== 0) throw providerError(envelope.code)

      return collectArticles(envelope.data)
    },
  }
}
