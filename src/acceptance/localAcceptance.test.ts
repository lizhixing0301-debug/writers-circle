import { describe, expect, it } from 'vitest'

describe('local acceptance runner', () => {
  it('stops with a clear Chinese message when the local website is unavailable', async () => {
    const { runLocalAcceptance } = await import('../../scripts/local-acceptance-core.mjs')
    const executed: string[] = []

    await expect(
      runLocalAcceptance({
        fetchHealth: async () => false,
        runPhase: async (script: string) => {
          executed.push(script)
          return 0
        },
        writeLine: () => undefined,
      }),
    ).rejects.toThrow('本地网站尚未就绪，请先启动数据库和网站')

    expect(executed).toEqual([])
  })

  it('checks the default health URL and runs Phase 2 through Phase 6 in order', async () => {
    const { runLocalAcceptance } = await import('../../scripts/local-acceptance-core.mjs')
    const healthURLs: string[] = []
    const executed: string[] = []

    await runLocalAcceptance({
      fetchHealth: async (url: string) => {
        healthURLs.push(url)
        return true
      },
      runPhase: async (script: string) => {
        executed.push(script)
        return 0
      },
      writeLine: () => undefined,
    })

    expect(healthURLs).toEqual(['http://127.0.0.1:3000/api/health'])
    expect(executed).toEqual([
      'scripts/verify-phase-2.ts',
      'scripts/verify-phase-3.ts',
      'scripts/verify-phase-4.ts',
      'scripts/verify-phase-5.ts',
      'scripts/verify-phase-6.ts',
    ])
  })

  it('stops after the first failed phase and reports which phase failed', async () => {
    const { runLocalAcceptance } = await import('../../scripts/local-acceptance-core.mjs')
    const executed: string[] = []

    await expect(
      runLocalAcceptance({
        fetchHealth: async () => true,
        runPhase: async (script: string) => {
          executed.push(script)
          return script.endsWith('verify-phase-4.ts') ? 1 : 0
        },
        writeLine: () => undefined,
      }),
    ).rejects.toThrow('Phase 4 验收失败')

    expect(executed).toEqual([
      'scripts/verify-phase-2.ts',
      'scripts/verify-phase-3.ts',
      'scripts/verify-phase-4.ts',
    ])
  })
})

