import type { Metadata } from 'next'

import config from '@payload-config'
import { generatePageMetadata, RootPage } from '@payloadcms/next/views'

import { importMap } from '../importMap.js'

type PageArguments = {
  params: Promise<{
    segments: string[]
  }>
  searchParams: Promise<Record<string, string | string[]>>
}

export const generateMetadata = ({
  params,
  searchParams,
}: PageArguments): Promise<Metadata> => generatePageMetadata({ config, params, searchParams })

export default function AdminPage({ params, searchParams }: PageArguments) {
  return RootPage({ config, importMap, params, searchParams })
}

