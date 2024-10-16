# sentry-astro

Sentry configuration ready to use in our projects with minimal configuration.

## Install

```shell
pnpm add @altipla/sentry-astro
```

## Usage

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
import { configureSentryVue } from '@sentry/vue'

export default (app: App) => {
  configureSentryVue(app)
}
```
