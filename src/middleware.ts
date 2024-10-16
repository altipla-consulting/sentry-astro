import {
  captureException,
  getCurrentScope,
  init,
  SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN,
  SEMANTIC_ATTRIBUTE_SENTRY_SOURCE,
  setHttpStatus,
  startSpan,
  withIsolationScope,
} from '@sentry/node'
import type { APIContext, MiddlewareHandler } from 'astro'
import { continueTrace } from '@sentry/node'
import { stripUrlQueryAndFragment, winterCGRequestToRequestData } from '@sentry/utils'
import type { SpanAttributes } from '@sentry/types'
import { sentryOptions } from 'virtual:@altipla/astro-sentry/config'
import { commonOptions } from './options.js'

if (process.env.SENTRY_DSN) {
  init(commonOptions(sentryOptions))
}

export const onRequest: MiddlewareHandler = (ctx, next) => {
  return withIsolationScope(() => {
    let ssr = isSSR(ctx)
    let headers = ssr ? ctx.request.headers : new Map()

    return continueTrace(
      {
        sentryTrace: headers.get('sentry-trace'),
        baggage: headers.get('baggage'),
      },
      async () => {
        let scope = getCurrentScope()
        scope.setSDKProcessingMetadata({
          request: ssr ? winterCGRequestToRequestData(ctx.request) : { method: ctx.request.method, url: ctx.request.url },
        })
        if (ssr) {
          scope.setUser({ ip_address: ctx.clientAddress })
        }

        try {
          let interpolatedRoute = guessRouteName(ctx.url.pathname, ctx.params)

          scope.setTransactionName(`${ctx.request.method} ${interpolatedRoute || ctx.url.pathname}`)

          let attributes: SpanAttributes = {
            [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'auto.http.astro',
            [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: interpolatedRoute ? 'route' : 'url',
            method: ctx.request.method,
            url: stripUrlQueryAndFragment(ctx.url.href),
          }
          if (ctx.url.search) {
            attributes['http.query'] = ctx.url.search
          }
          if (ctx.url.hash) {
            attributes['http.fragment'] = ctx.url.hash
          }
          return await startSpan(
            {
              attributes,
              name: `${ctx.request.method} ${interpolatedRoute || ctx.url.pathname}`,
              op: 'http.server',
            },
            async (span) => {
              ctx.locals.sentry = commonOptions(sentryOptions)

              let response = await next()
              if (response.status) {
                setHttpStatus(span, response.status)
              }
              return response
            }
          )
        } catch (e) {
          sendErrorToSentry(e)
          throw e
        }
      }
    )
  })
}

function sendErrorToSentry(e: unknown) {
  captureException(e, {
    mechanism: {
      type: 'astro',
      handled: false,
      data: {
        function: 'astroMiddlware',
      },
    },
  })
}

/**
 * Interpolates the route from the URL and the passed params.
 * Best we can do to get a route name instead of a raw URL.
 *
 * exported for testing
 *
 * @param rawUrlPathname - The raw URL pathname, e.g. '/users/123/details'
 * @param params - The params object, e.g. `{ userId: '123' }`
 *
 * @returns The interpolated route, e.g. '/users/[userId]/details'
 */
export function guessRouteName(rawUrlPathname: string, params: APIContext['params']): string | undefined {
  const decodedUrlPathname = tryDecodeUrl(rawUrlPathname)
  if (!decodedUrlPathname) {
    return undefined
  }

  // Invert params map so that the param values are the keys
  // differentiate between rest params spanning multiple url segments
  // and normal, single-segment params.
  const valuesToMultiSegmentParams: Record<string, string> = {}
  const valuesToParams: Record<string, string> = {}
  Object.entries(params).forEach(([key, value]) => {
    if (!value) {
      return
    }
    if (value.includes('/')) {
      valuesToMultiSegmentParams[value] = key
      return
    }
    valuesToParams[value] = key
  })

  function replaceWithParamName(segment: string): string {
    const param = valuesToParams[segment]
    if (param) {
      return `[${param}]`
    }
    return segment
  }

  // before we match single-segment params, we first replace multi-segment params
  const urlWithReplacedMultiSegmentParams = Object.keys(valuesToMultiSegmentParams).reduce((acc, key) => {
    return acc.replace(key, `[${valuesToMultiSegmentParams[key]}]`)
  }, decodedUrlPathname)

  return urlWithReplacedMultiSegmentParams
    .split('/')
    .map((segment) => {
      if (!segment) {
        return ''
      }

      if (valuesToParams[segment]) {
        return replaceWithParamName(segment)
      }

      // astro permits multiple params in a single path segment, e.g. /[foo]-[bar]/
      const segmentParts = segment.split('-')
      if (segmentParts.length > 1) {
        return segmentParts.map((part) => replaceWithParamName(part)).join('-')
      }

      return segment
    })
    .join('/')
}

function tryDecodeUrl(url: string): string | undefined {
  try {
    return decodeURI(url)
  } catch {
    return undefined
  }
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
