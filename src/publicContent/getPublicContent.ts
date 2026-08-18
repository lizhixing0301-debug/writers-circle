import { getPayload } from 'payload'

import config from '../payload.config'

import { createPublicContentStore } from './publicContent'

async function store() {
  return createPublicContentStore(await getPayload({ config }))
}

export async function getPublicMembers() {
  return (await store()).getPublicMembers()
}

export async function getPublicMemberBySlug(slug: string) {
  return (await store()).getPublicMemberBySlug(slug)
}

export async function getPublicNews() {
  return (await store()).getPublicNews()
}

export async function getPublicWorks() {
  return (await store()).getPublicWorks()
}

export async function getPublicWorkBySlug(slug: string) {
  return (await store()).getPublicWorkBySlug(slug)
}
