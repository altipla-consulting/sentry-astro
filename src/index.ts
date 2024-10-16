import type { AstroConfig, AstroIntegration } from 'astro'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import type { SentryOptions } from './options.js'

type VitePlugin = Required<AstroConfig['vite']>['plugins'][number]

export const sentryAstro = (options: SentryOptions): AstroIntegration => {
  const virtualModuleId = 'virtual:@altipla/astro-sentry/config'
  const resolvedVirtualModuleId = '\0' + virtualModuleId

  return {
    name: '@altipla/sentry-astro',
    hooks: {
      'astro:config:setup': async ({ command, updateConfig, injectScript, addMiddleware }) => {
        if (command === 'build') {
          updateConfig({
            vite: {
              build: {
                sourcemap: true,
              },
              plugins: [
                sentryVitePlugin({
                  authToken: process.env.SENTRY_AUTH_TOKEN,
                  project: options.sourceMapsProject,
                  telemetry: false,
                  sourcemaps: {
                    assets: ['dist/**/*'],
                  },
                }),
                {
                  name: 'vite-plugin-sentry-astro',
                  resolveId(id) {
                    if (id === virtualModuleId) {
                      return resolvedVirtualModuleId
                    }
                  },
                  load(id) {
                    if (id === resolvedVirtualModuleId) {
                      return `export const sentryOptions = ${JSON.stringify(options)};`
                    }
                  },
                } satisfies VitePlugin,
              ],
            },
          })
        }

        injectScript('page', buildClientSnippet(options))

        addMiddleware({
          order: 'pre',
          entrypoint: '@altipla/sentry-astro/middleware',
        })
      },
    },
  }
}

function buildClientSnippet(_options: SentryOptions) {
  return `
    import { init, browserTracingIntegration } from '@sentry/vue'

    if (window.__sentry) {
      init({
        ...window.__sentry,
        integrations: [
          browserTracingIntegration(),
        ],
      })
    }
  `
}