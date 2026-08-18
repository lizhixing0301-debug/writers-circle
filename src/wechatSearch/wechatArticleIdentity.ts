import { createHash } from 'node:crypto'

const trackingParameters = new Set([
  'clicktime',
  'enterid',
  'exportkey',
  'fontScale',
  'from',
  'isappinstalled',
  'lang',
  'nettype',
  'pass_ticket',
  'scene',
  'sessionid',
  'share',
  'sharer_shareinfo',
  'sharer_shareinfo_first',
  'srcid',
  'subscene',
  'version',
  'wx_header',
])

export function normalizeWechatArticleUrl(raw: string): string | null {
  if (!raw.trim()) return null

  try {
    const url = new URL(raw.trim())

    if (!['http:', 'https:'].includes(url.protocol)) return null
    if (url.hostname !== 'mp.weixin.qq.com') return null
    if (url.username || url.password) return null
    if (url.pathname !== '/s' && !url.pathname.startsWith('/s/')) return null

    url.protocol = 'https:'
    url.hash = ''

    for (const parameter of [...url.searchParams.keys()]) {
      if (trackingParameters.has(parameter)) url.searchParams.delete(parameter)
    }

    url.searchParams.sort()

    return url.toString()
  } catch {
    return null
  }
}

export function createWechatArticleReference(raw: string): string | null {
  const normalized = normalizeWechatArticleUrl(raw)
  if (!normalized) return null

  const url = new URL(normalized)
  const biz = url.searchParams.get('__biz')
  const mid = url.searchParams.get('mid')
  const idx = url.searchParams.get('idx')
  let identity: string

  if (biz && mid && idx) {
    identity = `legacy:${biz}:${mid}:${idx}`
  } else if (url.pathname.startsWith('/s/')) {
    identity = `short:${url.pathname}`
  } else {
    identity = `url:${normalized}`
  }

  return `wechat:${createHash('sha256').update(identity).digest('hex')}`
}
