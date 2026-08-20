import { spawnSync } from 'node:child_process'

import { runLocalAcceptance } from './local-acceptance-core.mjs'

const packageManagerPath = process.env.npm_execpath

if (!packageManagerPath) {
  console.error('无法找到 pnpm。请在项目目录中使用 pnpm verify:acceptance 运行验收。')
  process.exitCode = 1
} else {
  try {
    await runLocalAcceptance({
      runPhase: (script, baseUrl) => {
        const result = spawnSync(
          process.execPath,
          [packageManagerPath, 'payload', 'run', script],
          {
            env: {
              ...process.env,
              VERIFY_BASE_URL: baseUrl,
            },
            stdio: 'inherit',
          },
        )

        return result.status ?? 1
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`验收未完成：${message}`)
    process.exitCode = 1
  }
}

