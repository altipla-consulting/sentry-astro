import { setContext } from '@sentry/node'
import { getHTTPStatusCodeFromError } from '@trpc/server/http'
import { TRPCError } from '@trpc/server'
import { captureError } from './capture.js'
import { logger } from '@altipla/logging'

export function sentryTRPC({ error, input, path }: any) {
  setContext('trpc', { input })

  // Silence client code validation errors.
  if (error instanceof TRPCError) {
    let code = getHTTPStatusCodeFromError(error)
    if (code === 404 || code === 400) {
      logger.error(error)
      return
    }
  }

  captureError(error, { path })
}
