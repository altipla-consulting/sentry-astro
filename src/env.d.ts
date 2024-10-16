declare namespace App {
  interface Locals {
    sentry: import('@sentry/types').Options
  }
}

declare module 'virtual:@altipla/sentry-astro/config' {
  export const sentryOptions: import('./options.ts').SentryOptions
}
