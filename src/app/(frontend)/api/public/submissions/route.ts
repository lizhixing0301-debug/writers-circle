import config from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import {
  processPublicSubmission,
  SubmissionRateLimiter,
} from '../../../../../submissions/publicSubmission'
import { createPayloadSubmissionStore } from '../../../../../submissions/payloadSubmissionStore'

const limiter = new SubmissionRateLimiter()

function requestSource(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const source = forwarded || request.headers.get('x-real-ip')?.trim() || 'local'

  return source.slice(0, 100)
}

export async function POST(request: Request) {
  let raw: unknown

  try {
    raw = await request.json()
  } catch {
    return NextResponse.json(
      { message: '投稿内容格式不正确，请刷新页面后重试。' },
      { status: 400 },
    )
  }

  try {
    const payload = await getPayload({ config })
    const result = await processPublicSubmission(raw, requestSource(request), {
      limiter,
      store: createPayloadSubmissionStore(payload),
    })

    if (result.kind === 'invalid') {
      return NextResponse.json(
        {
          fieldErrors: result.fieldErrors,
          message: result.message,
        },
        { status: 400 },
      )
    }

    if (result.kind === 'rateLimited') {
      return NextResponse.json(
        { message: '提交次数较多，请十分钟后再试。' },
        { status: 429 },
      )
    }

    return NextResponse.json(
      { submissionNumber: result.submissionNumber },
      { status: 201 },
    )
  } catch {
    return NextResponse.json(
      { message: '投稿暂时未成功，请稍后再试。' },
      { status: 500 },
    )
  }
}
