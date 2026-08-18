import type { Payload } from 'payload'

import type { StartWechatSearchResult } from '../../../../../../wechatSearch/startWechatSearch'

type RouteDependencies = {
  getPayload: () => Promise<Payload>
  start: (payload: Payload) => Promise<StartWechatSearchResult>
}

export function createWechatSearchRoute({ getPayload, start }: RouteDependencies) {
  return async function POST(request: Request): Promise<Response> {
    try {
      const payload = await getPayload()
      const authentication = await payload.auth({ headers: request.headers })

      if (!authentication.user) {
        return Response.json(
          { message: '请先登录后台再启动搜索。' },
          { status: 401 },
        )
      }

      const result = await start(payload)

      if (result.kind === 'alreadyRunning') {
        return Response.json(
          {
            message: '已有搜索任务正在运行，请勿重复点击。',
            runNumber: result.runNumber,
          },
          { status: 200 },
        )
      }

      return Response.json(
        {
          message: '搜索任务已经开始，请稍后查看“公众号搜索记录”。',
          runNumber: result.runNumber,
        },
        { status: 202 },
      )
    } catch {
      return Response.json(
        { message: '搜索任务暂时无法启动，请稍后再试。' },
        { status: 500 },
      )
    }
  }
}
