import type { AstroConfig, AstroIntegration } from 'astro'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import type { SentryOptions } from './options.js'
import type { App } from 'vue'
import { addIntegration, vueIntegration } from '@sentry/vue'

export function configureSentry(app: App) {
  addIntegration(vueIntegration({ app }))
}

type VitePlugin = Required<AstroConfig['vite']>['plugins'][number]

export const sentryAstro = (options: SentryOptions): AstroIntegration => {
  const virtualModuleId = 'virtual:@altipla/sentry-astro/config'
  const resolvedVirtualModuleId = '\0' + virtualModuleId

  return {
    name: '@altipla/sentry-astro',
    hooks: {
      'astro:config:setup': async ({ command, updateConfig, injectScript, addMiddleware }) => {
        updateConfig({
          vite: {
            plugins: [
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

        if (command === 'build' && options.sourceMapsProject) {
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

function buildClientSnippet(options: SentryOptions) {
  if (options.tracesSampleRate) {
    return `
      import { init, browserTracingIntegration } from '@sentry/vue'

      if (window.__sentry) {
        init({
          ...window.__sentry,
          integrations: integrations => {
            integrations = integrations.filter(integration => integration.name !== 'Vue')
            integrations.push(browserTracingIntegration())
            return integrations
          },
        })
      }
    `
  }

  return `
    import { init } from '@sentry/vue'

    if (window.__sentry) {
      init({
        ...window.__sentry,
        integrations: integrations => {
          integrations = integrations.filter(integration => integration.name !== 'Vue')
          return integrations
        },
      })
    }
  `
}
