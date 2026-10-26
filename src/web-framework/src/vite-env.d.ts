/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_THEME?: string
  readonly VITE_SOCIAL_AUTH_ENABLED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
