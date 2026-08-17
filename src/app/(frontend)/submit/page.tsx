import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'

import SubmissionForm from './SubmissionForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  description: '向三十二人文学志提交文学作品',
  title: '我要投稿｜Writers Circle',
}

export default function SubmitPage() {
  return <SubmissionForm requestToken={randomUUID()} />
}
