import { logger } from '@altipla/logging'
import { captureException } from '@sentry/node'

export function captureError(error: unknown, log?: object) {
  let it: any = prepareError(error)
  logger.error(it)
  while (it.cause) {
    it = it.cause
    logger.error(it)
  }

  if (process.env.SENTRY_DSN) {
    logger.info({
      ...(log ?? {}),
      msg: 'Sentry error captured',
      id: captureException(prepareError(error)),
    })
  }
}

function prepareError(error: unknown): Error {
  let err: Error
  if (error instanceof Error) {
    err = error
  } else if (typeof error === 'string') {
    err = new Error(error)
  } else {
    err = new Error(JSON.stringify(error))
  }
  return err
}
