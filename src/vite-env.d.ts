/// <reference types="vite/client" />

/** The version from package.json, replaced at build time. See vite.config.ts. */
declare const __APP_VERSION__: string

/** The short commit this build was made from, or empty when it could not be told. See vite.config.ts. */
declare const __APP_BUILD__: string
