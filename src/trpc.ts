import { captureException, setContext } from '@sentry/node'
import { prepareError } from './prepare.js'
import { logger } from '@altipla/logging'
import { getHTTPStatusCodeFromError } from '@trpc/server/http'
import { TRPCError } from '@trpc/server'

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

    let it: any = prepareError(error)
    logger.error(it)
    while (it.cause) {
      it = it.cause
      logger.error(it)
    }

    logger.info({
      msg: 'Sentry error captured',
      id: captureException(prepareError(error)),
      path,
    })
  }
}
