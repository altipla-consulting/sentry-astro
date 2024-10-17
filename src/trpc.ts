import { captureException, setContext } from '@sentry/node'
import { prepareError } from './prepare.js'
import { logger } from '@altipla/logging'

export function sentryTRPC({ error, input, path }: any) {
  setContext('trpc', { input })
  logger.info({
    msg: 'Sentry error captured',
    id: captureException(prepareError(error)),
    path,
  })
}
