/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_MEDIA_BASE_URL?: string
  readonly VITE_AUTH_BASE_URL?: string
  readonly VITE_DEV_API_TARGET?: string
  readonly VITE_DEV_MEDIA_TARGET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface RuntimeSbConfig {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_MEDIA_BASE_URL?: string
  readonly VITE_AUTH_BASE_URL?: string
}

interface Window {
  __SB_CONFIG__?: RuntimeSbConfig
}

declare module "*.module.scss" {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module "*.module.css" {
  const classes: { readonly [key: string]: string }
  export default classes
}
