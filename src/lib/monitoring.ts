import * as Sentry from '@sentry/react';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN?.trim();

export const isErrorMonitoringEnabled = import.meta.env.PROD && Boolean(sentryDsn);

export const initErrorMonitoring = () => {
  if (!isErrorMonitoringEnabled) return;

  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
};

export const captureException = (
  error: unknown,
  extra?: Record<string, unknown>
) => {
  if (!isErrorMonitoringEnabled) return;

  Sentry.captureException(error, {
    extra,
  });
};
