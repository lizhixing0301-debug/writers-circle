import config from '@payload-config'
import { getPayload } from 'payload'

import { startWechatSearch } from '../../../../../../wechatSearch/startWechatSearch'

import { createWechatSearchRoute } from './wechatSearchRoute'

export const POST = createWechatSearchRoute({
  getPayload: () => getPayload({ config }),
  start: startWechatSearch,
})
