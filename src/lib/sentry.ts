export function initSentry() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  if (!dsn) {
    console.info('Sentry DSN not configured');
    return;
  }
  // Placeholder: prefer using @sentry/nextjs in real project
  console.info('Sentry initialized (placeholder)');
}
