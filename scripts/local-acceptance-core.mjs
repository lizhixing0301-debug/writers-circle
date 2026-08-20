export const ACCEPTANCE_PHASES = [
  { label: 'Phase 2', script: 'scripts/verify-phase-2.ts' },
  { label: 'Phase 3', script: 'scripts/verify-phase-3.ts' },
  { label: 'Phase 4', script: 'scripts/verify-phase-4.ts' },
  { label: 'Phase 5', script: 'scripts/verify-phase-5.ts' },
  { label: 'Phase 6', script: 'scripts/verify-phase-6.ts' },
]

const DEFAULT_BASE_URL = 'http://127.0.0.1:3000'

async function defaultFetchHealth(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(5_000),
  })

  if (!response.ok) {
    return false
  }

  const body = await response.json().catch(() => null)
  return body?.ok === true
}

export async function runLocalAcceptance({
  baseUrl = process.env.VERIFY_BASE_URL || DEFAULT_BASE_URL,
  fetchHealth = defaultFetchHealth,
  runPhase,
  writeLine = console.log,
}) {
  const normalizedBaseURL = baseUrl.replace(/\/$/, '')
  let isHealthy = false

  try {
    isHealthy = await fetchHealth(`${normalizedBaseURL}/api/health`)
  } catch {
    isHealthy = false
  }

  if (!isHealthy) {
    throw new Error('本地网站尚未就绪，请先启动数据库和网站，再重新运行验收。')
  }

  if (typeof runPhase !== 'function') {
    throw new Error('验收运行器缺少阶段执行方法。')
  }

  for (const phase of ACCEPTANCE_PHASES) {
    writeLine(`开始 ${phase.label} 虚构数据验收……`)
    const status = await runPhase(phase.script, normalizedBaseURL)

    if (status !== 0) {
      throw new Error(`${phase.label} 验收失败，后续阶段已停止。`)
    }
  }

  writeLine('本地自动验收完成：Phase 2 至 Phase 6 全部通过。')
}

