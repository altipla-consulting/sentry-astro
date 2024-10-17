import type { Options } from '@sentry/types'

export type SentryOptions = {
  forceEnabled?: boolean
  sourceMapsProject?: string
  debug?: boolean
}

export function generateOptions(options: SentryOptions): Options {
  return {
    enabled: options.forceEnabled || process.env.NODE_ENV === 'production',
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.VERSION || 'dev',
    debug: options.debug,
  }
}
