export const WEBHOOK_BASE =
  import.meta.env.VITE_APP_ENV === 'prod'
    ? 'https://retz8.app.n8n.cloud/webhook'
    : 'https://retz8.app.n8n.cloud/webhook-test';
