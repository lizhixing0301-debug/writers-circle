export const newsCategories = [
  'creation',
  'award',
  'activity',
  'media',
  'personal',
  'other',
] as const

export const newsSourceTypes = ['manual', 'publicTip', 'automaticSearch'] as const

export type NewsCategory = (typeof newsCategories)[number]
export type NewsSourceType = (typeof newsSourceTypes)[number]

type NewsCandidateInputField =
  | 'category'
  | 'publishedAt'
  | 'relatedMember'
  | 'relatedPersonName'
  | 'sourceName'
  | 'sourceReference'
  | 'sourceType'
  | 'sourceUrl'
  | 'summary'
  | 'title'

export type NewsCandidateFieldErrors = Partial<
  Record<NewsCandidateInputField, string>
>

export type ValidNewsCandidateInput = {
  category: NewsCategory
  publishedAt: string
  relatedMember?: number
  relatedPersonName: string
  sourceName: string
  sourceReference: string
  sourceType: NewsSourceType
  sourceUrl: string
  summary: string
  title: string
}

export type NewsCandidateValidationResult =
  | { data: ValidNewsCandidateInput; ok: true }
  | {
      fieldErrors: NewsCandidateFieldErrors
      message: string
      ok: false
    }

export interface NewsCandidateStore {
  create(data: ValidNewsCandidateInput): Promise<{ candidateNumber: string }>
}

export type NewsCandidateIngestionResult =
  | { candidateNumber: string; kind: 'created' }
  | {
      fieldErrors: NewsCandidateFieldErrors
      kind: 'invalid'
      message: string
    }

const allowedKeys = new Set<NewsCandidateInputField>([
  'category',
  'publishedAt',
  'relatedMember',
  'relatedPersonName',
  'sourceName',
  'sourceReference',
  'sourceType',
  'sourceUrl',
  'summary',
  'title',
])

const categorySet = new Set<string>(newsCategories)
const sourceTypeSet = new Set<string>(newsSourceTypes)

const maximumLengths: Partial<Record<NewsCandidateInputField, number>> = {
  relatedPersonName: 100,
  sourceName: 200,
  sourceReference: 500,
  sourceUrl: 2000,
  summary: 3000,
  title: 300,
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function trimmedString(
  record: Record<string, unknown>,
  field: Exclude<NewsCandidateInputField, 'relatedMember'>,
  fieldErrors: NewsCandidateFieldErrors,
): string {
  const value = record[field]

  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') {
    fieldErrors[field] = '填写格式不正确。'
    return ''
  }

  return value.trim()
}

function limitText(
  field: NewsCandidateInputField,
  value: string,
  fieldErrors: NewsCandidateFieldErrors,
) {
  const maximum = maximumLengths[field]

  if (maximum !== undefined && value.length > maximum) {
    fieldErrors[field] = `最多填写 ${maximum} 个字符。`
  }
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function validateNewsCandidateInput(raw: unknown): NewsCandidateValidationResult {
  if (!isPlainRecord(raw)) {
    return {
      fieldErrors: {},
      message: '新闻候选内容格式不正确。',
      ok: false,
    }
  }

  const unknownKeys = Object.keys(raw).filter(
    (key) => !allowedKeys.has(key as NewsCandidateInputField),
  )

  if (unknownKeys.length > 0) {
    return {
      fieldErrors: {},
      message: '新闻候选包含不允许的字段。',
      ok: false,
    }
  }

  const fieldErrors: NewsCandidateFieldErrors = {}
  const category = trimmedString(raw, 'category', fieldErrors)
  const publishedAt = trimmedString(raw, 'publishedAt', fieldErrors)
  const relatedPersonName = trimmedString(raw, 'relatedPersonName', fieldErrors)
  const sourceName = trimmedString(raw, 'sourceName', fieldErrors)
  const sourceReference = trimmedString(raw, 'sourceReference', fieldErrors)
  const sourceType = trimmedString(raw, 'sourceType', fieldErrors)
  const sourceUrl = trimmedString(raw, 'sourceUrl', fieldErrors)
  const summary = trimmedString(raw, 'summary', fieldErrors)
  const title = trimmedString(raw, 'title', fieldErrors)

  if (!title && !fieldErrors.title) fieldErrors.title = '请填写候选标题。'
  if (!category && !fieldErrors.category) fieldErrors.category = '请选择新闻类别。'
  if (!sourceType && !fieldErrors.sourceType) {
    fieldErrors.sourceType = '请选择来源方式。'
  }

  limitText('title', title, fieldErrors)
  limitText('relatedPersonName', relatedPersonName, fieldErrors)
  limitText('sourceName', sourceName, fieldErrors)
  limitText('sourceReference', sourceReference, fieldErrors)
  limitText('sourceUrl', sourceUrl, fieldErrors)
  limitText('summary', summary, fieldErrors)

  if (category && !categorySet.has(category)) {
    fieldErrors.category = '请选择列表中的新闻类别。'
  }

  if (sourceType && !sourceTypeSet.has(sourceType)) {
    fieldErrors.sourceType = '请选择列表中的来源方式。'
  }

  if (publishedAt && Number.isNaN(Date.parse(publishedAt))) {
    fieldErrors.publishedAt = '请填写有效的日期。'
  }

  if (sourceUrl && !fieldErrors.sourceUrl && !isSafeHttpUrl(sourceUrl)) {
    fieldErrors.sourceUrl = '来源网址必须以 http:// 或 https:// 开头。'
  }

  let relatedMember: number | undefined

  if (Object.hasOwn(raw, 'relatedMember')) {
    const value = raw.relatedMember

    if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
      relatedMember = value
    } else {
      fieldErrors.relatedMember = '关联成员格式不正确。'
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      fieldErrors,
      message: '请检查新闻候选内容后重试。',
      ok: false,
    }
  }

  return {
    data: {
      category: category as NewsCategory,
      publishedAt,
      ...(relatedMember === undefined ? {} : { relatedMember }),
      relatedPersonName,
      sourceName,
      sourceReference,
      sourceType: sourceType as NewsSourceType,
      sourceUrl,
      summary,
      title,
    },
    ok: true,
  }
}

export async function ingestNewsCandidate(
  raw: unknown,
  store: NewsCandidateStore,
): Promise<NewsCandidateIngestionResult> {
  const validation = validateNewsCandidateInput(raw)

  if (!validation.ok) {
    return {
      fieldErrors: validation.fieldErrors,
      kind: 'invalid',
      message: validation.message,
    }
  }

  const created = await store.create(validation.data)

  return {
    candidateNumber: created.candidateNumber,
    kind: 'created',
  }
}
