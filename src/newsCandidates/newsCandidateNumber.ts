import { randomUUID } from 'node:crypto'

export function generateNewsCandidateNumber(
  now = new Date(),
  uuid = randomUUID(),
): string {
  const date = now.toISOString().slice(0, 10).replaceAll('-', '')
  const randomPart = uuid.replaceAll('-', '').slice(0, 8).toUpperCase()

  return `NEWS-${date}-${randomPart}`
}
