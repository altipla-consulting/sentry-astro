export function prepareError(error: unknown): Error {
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
