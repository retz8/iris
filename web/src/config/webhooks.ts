export const WEBHOOK_BASE =
  import.meta.env.VITE_APP_ENV === 'prod'
    ? import.meta.env.VITE_WEBHOOK_BASE_PROD
    : import.meta.env.VITE_WEBHOOK_BASE_DEV;
`