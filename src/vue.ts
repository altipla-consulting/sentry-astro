import { addIntegration, vueIntegration } from '@sentry/vue'
import type { App } from 'vue'

export { init } from '@sentry/vue'

export function sentryVue(app: App) {
  addIntegration(vueIntegration({ app }))
}
