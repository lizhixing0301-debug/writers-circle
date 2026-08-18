type RequiredEnvironmentName = 'DATABASE_URI' | 'PAYLOAD_SECRET'
type OptionalEnvironmentName =
  | 'WECHAT_SEARCH_API_BASE_URL'
  | 'WECHAT_SEARCH_API_TOKEN'

export function requireEnvironment(name: RequiredEnvironmentName): string {
  const value = process.env[name]

  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export function optionalEnvironment(
  name: OptionalEnvironmentName,
): string | undefined {
  const value = process.env[name]?.trim()

  return value || undefined
}
