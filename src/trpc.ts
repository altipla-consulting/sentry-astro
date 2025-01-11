import { setContext } from '@sentry/node'
import { getHTTPStatusCodeFromError } from '@trpc/server/http'
import { TRPCError } from '@trpc/server'
import { captureError } from './capture.js'

export function sentryTRPC({ error, input, path }: any) {
  setContext('trpc', { input })

  if (process.env.SENTRY_DSN) {
    // Silence client code validation errors.
    if (error instanceof TRPCError) {
      let code = getHTTPStatusCodeFromError(error)
      if (code === 404 || code === 400) {
        throw error
      }
    }

    captureError(error, { path })
  }
}
