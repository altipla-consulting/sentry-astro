import { captureException, init, withIsolationScope } from '@sentry/node'
import type { APIContext, MiddlewareHandler } from 'astro'
import { winterCGRequestToRequestData } from '@sentry/utils'
import { sentryOptions } from 'virtual:@altipla/sentry-astro/config'
import { generateOptions } from './options.js'
import { logger } from '@altipla/logging'
import { prepareError } from './prepare.js'

if (process.env.SENTRY_DSN) {
  logger.info({
    msg: 'Sentry enabled',
    dsn: process.env.SENTRY_DSN,
  })
  init(generateOptions(sentryOptions))
}

export const onRequest: MiddlewareHandler = (ctx, next) => {
  if (!isSSR(ctx) || !process.env.SENTRY_DSN) {
    return next()
  }

  return withIsolationScope(async (scope) => {
    scope.setSDKProcessingMetadata({
      request: winterCGRequestToRequestData(ctx.request),
    })
    scope.setUser({ ip_address: ctx.clientAddress })

    try {
      let response = await next()

      // Trigger any Astro errors rendering the template in streaming node.
      await response.clone().arrayBuffer()

      return response
    } catch (err) {
      if (err instanceof Response) {
        logger.warn({ message: 'error page', status: err.status })
        return err
      }

      if (process.env.SENTRY_DSN) {
        logger.info({
          msg: 'Sentry error captured',
          id: captureException(prepareError(err)),
        })
      }
      throw err
    }
  })
}

/**
 * Checks if the incoming request is a request for a dynamic (server-side rendered) page.
 * We can check this by looking at the middleware's `clientAddress` context property because accessing
 * this prop in a static route will throw an error which we can conveniently catch.
 */
function isSSR(context: APIContext): boolean {
  try {
    return context.clientAddress != null
  } catch {
    return false
  }
}
