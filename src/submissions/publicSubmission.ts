export const submissionCategories = [
  'poetry',
  'fiction',
  'prose',
  'criticism',
  'other',
] as const

export type SubmissionCategory = (typeof submissionCategories)[number]

type PublicFieldName =
  | 'category'
  | 'contact'
  | 'content'
  | 'notes'
  | 'penName'
  | 'requestToken'
  | 'rightsConfirmed'
  | 'submitterName'
  | 'title'

export type SubmissionFieldErrors = Partial<Record<PublicFieldName, string>>

export type ValidSubmission = {
  category: SubmissionCategory
  contact: string
  content: string
  notes: string
  penName: string
  requestToken: string
  rightsConfirmed: true
  submitterName: string
  title: string
}

export type ValidationResult =
  | { data: ValidSubmission; ok: true }
  | {
      fieldErrors: SubmissionFieldErrors
      message: string
      ok: false
    }

export interface SubmissionStore {
  findByRequestToken(token: string): Promise<{ submissionNumber: string } | null>
  create(data: ValidSubmission): Promise<{ submissionNumber: string }>
}

export type ProcessResult =
  | {
      duplicate: boolean
      kind: 'created'
      submissionNumber: string
    }
  | {
      fieldErrors: SubmissionFieldErrors
      kind: 'invalid'
      message: string
    }
  | { kind: 'rateLimited' }

const allowedKeys = new Set([
  'category',
  'contact',
  'content',
  'notes',
  'penName',
  'requestToken',
  'rightsConfirmed',
  'submitterName',
  'title',
  'website',
])

const categorySet = new Set<string>(submissionCategories)

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function trimmedString(
  record: Record<string, unknown>,
  field: PublicFieldName,
  fieldErrors: SubmissionFieldErrors,
): string {
  const value = record[field]

  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') {
    fieldErrors[field] = '填写格式不正确。'
    return ''
  }

  return value.trim()
}

function requireText(
  value: string,
  field: PublicFieldName,
  fieldErrors: SubmissionFieldErrors,
  message: string,
) {
  if (!value && !fieldErrors[field]) fieldErrors[field] = message
}

function limitText(
  value: string,
  field: PublicFieldName,
  fieldErrors: SubmissionFieldErrors,
  maximum: number,
) {
  if (value.length > maximum) {
    fieldErrors[field] = `最多填写 ${maximum} 个字符。`
  }
}

export function validatePublicSubmission(raw: unknown): ValidationResult {
  if (!isPlainRecord(raw)) {
    return {
      fieldErrors: {},
      message: '投稿内容格式不正确，请刷新页面后重试。',
      ok: false,
    }
  }

  const unknownKeys = Object.keys(raw).filter((key) => !allowedKeys.has(key))
  if (unknownKeys.length > 0) {
    return {
      fieldErrors: {},
      message: '投稿内容包含不允许的字段，请刷新页面后重试。',
      ok: false,
    }
  }

  if (typeof raw.website !== 'string' || raw.website.trim() !== '') {
    return {
      fieldErrors: {},
      message: '投稿未能通过验证，请返回后重试。',
      ok: false,
    }
  }

  const fieldErrors: SubmissionFieldErrors = {}
  const submitterName = trimmedString(raw, 'submitterName', fieldErrors)
  const penName = trimmedString(raw, 'penName', fieldErrors)
  const contact = trimmedString(raw, 'contact', fieldErrors)
  const title = trimmedString(raw, 'title', fieldErrors)
  const category = trimmedString(raw, 'category', fieldErrors)
  const content = trimmedString(raw, 'content', fieldErrors)
  const notes = trimmedString(raw, 'notes', fieldErrors)
  const requestToken = trimmedString(raw, 'requestToken', fieldErrors)

  requireText(submitterName, 'submitterName', fieldErrors, '请填写投稿人姓名。')
  requireText(contact, 'contact', fieldErrors, '请填写手机号或微信号。')
  requireText(title, 'title', fieldErrors, '请填写文章标题。')
  requireText(category, 'category', fieldErrors, '请选择作品类别。')
  requireText(content, 'content', fieldErrors, '请粘贴文章正文。')
  requireText(requestToken, 'requestToken', fieldErrors, '页面信息已失效，请刷新后重试。')

  limitText(submitterName, 'submitterName', fieldErrors, 100)
  limitText(penName, 'penName', fieldErrors, 100)
  limitText(contact, 'contact', fieldErrors, 100)
  limitText(title, 'title', fieldErrors, 200)
  limitText(notes, 'notes', fieldErrors, 2_000)

  if (content && content.length < 20) {
    fieldErrors.content = '文章正文至少填写 20 个字符。'
  } else if (content.length > 100_000) {
    fieldErrors.content = '文章正文最多填写 100000 个字符。'
  }

  if (category && !categorySet.has(category)) {
    fieldErrors.category = '请选择列表中的作品类别。'
  }

  if (requestToken && !uuidPattern.test(requestToken)) {
    fieldErrors.requestToken = '页面信息已失效，请刷新后重试。'
  }

  if (raw.rightsConfirmed !== true) {
    fieldErrors.rightsConfirmed = '请确认作品原创或已经获得投稿授权。'
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      fieldErrors,
      message: '请检查标出的内容后再提交。',
      ok: false,
    }
  }

  return {
    data: {
      category: category as SubmissionCategory,
      contact,
      content,
      notes,
      penName,
      requestToken,
      rightsConfirmed: true,
      submitterName,
      title,
    },
    ok: true,
  }
}

export class SubmissionRateLimiter {
  private readonly attempts = new Map<string, number[]>()

  constructor(
    private readonly limit = 5,
    private readonly windowMs = 10 * 60 * 1000,
  ) {}

  consume(source: string, now = Date.now()): boolean {
    const recent = (this.attempts.get(source) ?? []).filter(
      (timestamp) => now - timestamp < this.windowMs,
    )

    if (recent.length >= this.limit) return false

    recent.push(now)
    this.attempts.set(source, recent)
    return true
  }
}

type ProcessDependencies = {
  limiter: SubmissionRateLimiter
  store: SubmissionStore
}

export async function processPublicSubmission(
  raw: unknown,
  source: string,
  { limiter, store }: ProcessDependencies,
): Promise<ProcessResult> {
  const validation = validatePublicSubmission(raw)

  if (!validation.ok) {
    return {
      fieldErrors: validation.fieldErrors,
      kind: 'invalid',
      message: validation.message,
    }
  }

  const existing = await store.findByRequestToken(validation.data.requestToken)
  if (existing) {
    return {
      duplicate: true,
      kind: 'created',
      submissionNumber: existing.submissionNumber,
    }
  }

  if (!limiter.consume(source)) return { kind: 'rateLimited' }

  const created = await store.create(validation.data)

  return {
    duplicate: false,
    kind: 'created',
    submissionNumber: created.submissionNumber,
  }
}
