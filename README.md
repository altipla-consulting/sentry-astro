# sentry-astro

Sentry configuration ready to use in our projects with minimal configuration.

## Install

```shell
pnpm add @altipla/sentry-astro
```

## Usage

### Server

Include the Sentry plugin in your `astro.config.ts` file, ensuring it is listed before any other integrations. Update the `sourceMapsProject` value to the correct project name for source map uploads.

```ts
export default defineConfig({
  integrations: [
    sentryAstro({
      sourceMapsProject: 'REPLACE_YOUR_PROJECT_NAME',
    }),
    tailwind(...),
    vue({
      appEntrypoint: 'app.ts',
    }),
  ],
  output: 'server',
  trailingSlash: 'never',
  adapter: node({
    mode: 'standalone',
  }),
  build: {
    format: 'file',
  },
})

```

### Client

To track client-side errors, add the `<SentryClient />` component in the `<head>` section of your layout file (e.g., Layout.astro).

Include it as soon as possible but not before the critical meta tags and title of the page. The component will insert additional meta tags and configurations to initialize Sentry.

Example Layout.astro:

```astro
---
import SentryClient from '@altipla/sentry-astro/SentryClient.astro'
---

<!DOCTYPE html>
<html>
<head>

  <meta http...
  <title>...</title>

  <SentryClient />

  ...

</head>
<body>
  ...
</body>
</html>
```

To capture Vue component errors, configure Sentry in your Vue app. In your `app.ts` (or equivalent, configured in `astro.config.ts`) file, add the following code to integrate Sentry.

```ts
import type { App } from 'vue'
import { sentryVue } from '@sentry/vue'

export default (app: App) => {
  sentryVue(app)
}
```

### tRPC

To capture tRPC errors configure the standard option when declaring the router. In the `[trpc].ts` file or equivalent:

```ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import type { APIRoute } from 'astro'
import { appRouter } from '~/routers'
import { sentryTRPC } from '@altipla/sentry-astro'

export let ALL: APIRoute = async ({ request, locals }) => {
  return await fetchRequestHandler({
    req: request,
    router: appRouter,
    endpoint: '/api/trpc',
    createContext: () => locals,
    onError: sentryTRPC,
  })
}
```
