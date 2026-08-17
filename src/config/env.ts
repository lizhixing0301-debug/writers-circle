type RequiredEnvironmentName = 'DATABASE_URI' | 'PAYLOAD_SECRET'

export function requireEnvironment(name: RequiredEnvironmentName): string {
  const value = process.env[name]

  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}
