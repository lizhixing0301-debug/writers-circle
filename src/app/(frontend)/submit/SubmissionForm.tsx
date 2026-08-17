'use client'

import Link from 'next/link'
import type { FormEvent } from 'react'
import { useState } from 'react'

import styles from './SubmissionForm.module.css'

type FieldName =
  | 'category'
  | 'contact'
  | 'content'
  | 'notes'
  | 'penName'
  | 'requestToken'
  | 'rightsConfirmed'
  | 'submitterName'
  | 'title'

type FieldErrors = Partial<Record<FieldName, string>>

type ApiResponse = {
  fieldErrors?: FieldErrors
  message?: string
  submissionNumber?: string
}

function ErrorMessage({ error, id }: { error?: string; id: string }) {
  if (!error) return null

  return (
    <p className={styles.fieldError} id={id}>
      错误：{error}
    </p>
  )
}

function describedBy(descriptionId: string, errorId: string, error?: string) {
  return error ? `${descriptionId} ${errorId}` : descriptionId
}

export default function SubmissionForm({ requestToken }: { requestToken: string }) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [message, setMessage] = useState('')
  const [submissionNumber, setSubmissionNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldErrors({})
    setMessage('')
    setSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const payload = {
      category: String(formData.get('category') ?? ''),
      contact: String(formData.get('contact') ?? ''),
      content: String(formData.get('content') ?? ''),
      notes: String(formData.get('notes') ?? ''),
      penName: String(formData.get('penName') ?? ''),
      requestToken,
      rightsConfirmed: formData.get('rightsConfirmed') === 'on',
      submitterName: String(formData.get('submitterName') ?? ''),
      title: String(formData.get('title') ?? ''),
      website: String(formData.get('website') ?? ''),
    }

    try {
      const response = await fetch('/api/public/submissions', {
        body: JSON.stringify(payload),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      })
      const result = (await response.json()) as ApiResponse

      if (!response.ok) {
        setFieldErrors(result.fieldErrors ?? {})
        setMessage(result.message ?? '投稿暂时未成功，请稍后再试。')
        return
      }

      if (!result.submissionNumber) {
        setMessage('投稿暂时未成功，请稍后再试。')
        return
      }

      setSubmissionNumber(result.submissionNumber)
    } catch {
      setMessage('网络连接出现问题，投稿尚未成功，请检查网络后再试。')
    } finally {
      setSubmitting(false)
    }
  }

  if (submissionNumber) {
    return (
      <main className={styles.shell}>
        <section className={styles.successCard} role="status" aria-labelledby="success-title">
          <p className={styles.eyebrow}>投稿已收到</p>
          <h1 id="success-title">请保存投稿编号</h1>
          <p>编辑联系你时，可以使用下面的编号核对稿件。</p>
          <strong className={styles.receipt}>{submissionNumber}</strong>
          <p className={styles.muted}>稿件不会自动公开，编辑将在后台人工审核。</p>
          <Link className={styles.homeLink} href="/">
            返回首页
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.shell}>
      <article className={styles.card}>
        <header className={styles.header}>
          <Link className={styles.backLink} href="/">
            返回 Writers Circle
          </Link>
          <p className={styles.eyebrow}>三十二人文学志</p>
          <h1>提交文学作品</h1>
          <p className={styles.introduction}>
            请直接粘贴文章正文。带“必填”的内容必须填写，笔名和补充说明可以留空。
          </p>
          <p className={styles.privacyNotice}>
            稿件和联系方式仅管理员可见，不会因为提交而自动公开或发布。
          </p>
        </header>

        <form className={styles.form} noValidate onSubmit={handleSubmit}>
          <input name="requestToken" type="hidden" value={requestToken} readOnly />

          <div className={styles.field}>
            <label htmlFor="submitterName">
              投稿人姓名 <span className={styles.required}>必填</span>
            </label>
            <p className={styles.description} id="submitterName-description">
              填写便于编辑核对的真实姓名。
            </p>
            <input
              aria-describedby={describedBy(
                'submitterName-description',
                'submitterName-error',
                fieldErrors.submitterName,
              )}
              aria-invalid={Boolean(fieldErrors.submitterName)}
              autoComplete="name"
              id="submitterName"
              maxLength={100}
              name="submitterName"
              required
              type="text"
            />
            <ErrorMessage error={fieldErrors.submitterName} id="submitterName-error" />
          </div>

          <div className={styles.field}>
            <label htmlFor="penName">笔名</label>
            <p className={styles.description} id="penName-description">
              没有笔名可以不填。
            </p>
            <input
              aria-describedby={describedBy(
                'penName-description',
                'penName-error',
                fieldErrors.penName,
              )}
              aria-invalid={Boolean(fieldErrors.penName)}
              id="penName"
              maxLength={100}
              name="penName"
              type="text"
            />
            <ErrorMessage error={fieldErrors.penName} id="penName-error" />
          </div>

          <div className={styles.field}>
            <label htmlFor="contact">
              联系方式 <span className={styles.required}>必填</span>
            </label>
            <p className={styles.description} id="contact-description">
              填写手机号或微信号，仅供编辑联系。
            </p>
            <input
              aria-describedby={describedBy(
                'contact-description',
                'contact-error',
                fieldErrors.contact,
              )}
              aria-invalid={Boolean(fieldErrors.contact)}
              autoComplete="tel"
              id="contact"
              maxLength={100}
              name="contact"
              required
              type="text"
            />
            <ErrorMessage error={fieldErrors.contact} id="contact-error" />
          </div>

          <div className={styles.field}>
            <label htmlFor="title">
              文章标题 <span className={styles.required}>必填</span>
            </label>
            <p className={styles.description} id="title-description">
              最多填写 200 个字符。
            </p>
            <input
              aria-describedby={describedBy(
                'title-description',
                'title-error',
                fieldErrors.title,
              )}
              aria-invalid={Boolean(fieldErrors.title)}
              id="title"
              maxLength={200}
              name="title"
              required
              type="text"
            />
            <ErrorMessage error={fieldErrors.title} id="title-error" />
          </div>

          <div className={styles.field}>
            <label htmlFor="category">
              作品类别 <span className={styles.required}>必填</span>
            </label>
            <p className={styles.description} id="category-description">
              选择最接近的一项即可。
            </p>
            <select
              aria-describedby={describedBy(
                'category-description',
                'category-error',
                fieldErrors.category,
              )}
              aria-invalid={Boolean(fieldErrors.category)}
              defaultValue=""
              id="category"
              name="category"
              required
            >
              <option disabled value="">
                请选择
              </option>
              <option value="poetry">诗歌</option>
              <option value="fiction">小说</option>
              <option value="prose">散文</option>
              <option value="criticism">评论</option>
              <option value="other">其他</option>
            </select>
            <ErrorMessage error={fieldErrors.category} id="category-error" />
          </div>

          <div className={styles.field}>
            <label htmlFor="content">
              文章正文 <span className={styles.required}>必填</span>
            </label>
            <p className={styles.description} id="content-description">
              直接粘贴纯文字，原有自然分段会被保留。至少 20 个字符。
            </p>
            <textarea
              aria-describedby={describedBy(
                'content-description',
                'content-error',
                fieldErrors.content,
              )}
              aria-invalid={Boolean(fieldErrors.content)}
              id="content"
              maxLength={100000}
              minLength={20}
              name="content"
              required
              rows={18}
            />
            <ErrorMessage error={fieldErrors.content} id="content-error" />
          </div>

          <div className={styles.field}>
            <label htmlFor="notes">补充说明</label>
            <p className={styles.description} id="notes-description">
              可以填写刊发情况、原投稿编号或其他需要编辑了解的内容。
            </p>
            <textarea
              aria-describedby={describedBy(
                'notes-description',
                'notes-error',
                fieldErrors.notes,
              )}
              aria-invalid={Boolean(fieldErrors.notes)}
              id="notes"
              maxLength={2000}
              name="notes"
              rows={5}
            />
            <ErrorMessage error={fieldErrors.notes} id="notes-error" />
          </div>

          <div className={styles.confirmation}>
            <input
              aria-describedby={fieldErrors.rightsConfirmed ? 'rightsConfirmed-error' : undefined}
              aria-invalid={Boolean(fieldErrors.rightsConfirmed)}
              id="rightsConfirmed"
              name="rightsConfirmed"
              required
              type="checkbox"
            />
            <label htmlFor="rightsConfirmed">
              我确认作品为原创或已经获得投稿授权。 <span>必填</span>
            </label>
          </div>
          <ErrorMessage error={fieldErrors.rightsConfirmed} id="rightsConfirmed-error" />

          <div aria-hidden="true" className={styles.honeypot}>
            <label htmlFor="website">请勿填写此项</label>
            <input
              autoComplete="off"
              id="website"
              name="website"
              tabIndex={-1}
              type="text"
            />
          </div>

          {message ? (
            <p className={styles.formError} role="alert">
              {message}
            </p>
          ) : null}

          <button className={styles.submitButton} disabled={submitting} type="submit">
            {submitting ? '正在提交，请稍候…' : '确认投稿'}
          </button>
          <p className={styles.finalNotice}>提交后请保存投稿编号。本页面暂不提供进度查询。</p>
        </form>
      </article>
    </main>
  )
}
