import type { ErrorEvent } from "@sentry/nextjs";

type MonitoringContext = Record<string, unknown>;

const SENSITIVE_KEY_PATTERN =
  /password|secret|token|authorization|cookie|session|checkout|payment|viva|supabase|api[_-]?key|credential|bearer|dsn|service[_-]?role|jwt|webhook|payload|body|email|phone|address/i;

const SUPPORTED_ENVIRONMENTS = new Set(["development", "staging", "production"]);

export function resolveClientSentryDsn(): string | undefined {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  return dsn || undefined;
}

export function resolveServerSentryDsn(): string | undefined {
  const dsn = process.env.SENTRY_DSN?.trim();
  return dsn || undefined;
}

export function resolveSentryRelease(): string | undefined {
  const release =
    process.env.GIT_COMMIT?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.GITHUB_SHA?.trim();
  return release || undefined;
}

export function resolveSentryEnvironment(): string {
  const configured = process.env.SENTRY_ENVIRONMENT?.trim();
  if (configured && SUPPORTED_ENVIRONMENTS.has(configured)) {
    return configured;
  }
  return process.env.NODE_ENV || "development";
}

export function sanitizeMonitoringContext(
  context?: MonitoringContext,
): MonitoringContext | undefined {
  if (!context) return undefined;

  const clean: MonitoringContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      clean[key] = "[Filtered]";
      continue;
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      clean[key] = sanitizeMonitoringContext(value as MonitoringContext);
      continue;
    }

    clean[key] = value;
  }

  return clean;
}

function scrubRequest(event: ErrorEvent): void {
  if (!event.request) return;

  delete event.request.data;

  if (event.request.query_string) {
    event.request.query_string = "[Filtered]";
  }

  if (event.request.headers) {
    event.request.headers = {};
  }

  if (event.request.cookies) {
    event.request.cookies = "[Filtered]" as unknown as Record<string, string>;
  }
}

function scrubBreadcrumbs(event: ErrorEvent): void {
  if (!event.breadcrumbs?.length) return;

  event.breadcrumbs = event.breadcrumbs.map((crumb) => {
    if (!crumb.data || typeof crumb.data !== "object") return crumb;
    return {
      ...crumb,
      data: sanitizeMonitoringContext(crumb.data as MonitoringContext),
    };
  });
}

export function sentryBeforeSend(event: ErrorEvent): ErrorEvent | null {
  scrubRequest(event);
  scrubBreadcrumbs(event);

  if (event.user) {
    delete event.user;
  }

  if (event.extra) {
    event.extra = sanitizeMonitoringContext(event.extra as MonitoringContext);
  }

  if (event.contexts) {
    for (const [name, value] of Object.entries(event.contexts)) {
      if (value && typeof value === "object") {
        event.contexts[name] = sanitizeMonitoringContext(value as MonitoringContext) as Record<
          string,
          unknown
        >;
      }
    }
  }

  return event;
}

function baseSentryOptions(dsn: string | undefined) {
  return {
    dsn,
    enabled: Boolean(dsn),
    environment: resolveSentryEnvironment(),
    release: resolveSentryRelease(),
    tracesSampleRate: 0,
    sendDefaultPii: false,
    includeLocalVariables: false,
    enableLogs: false,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: {
        request: false,
        response: false,
      },
      httpBodies: [],
      queryParams: false,
      stackFrameVariables: false,
    },
    beforeSend: sentryBeforeSend,
  };
}

export function buildClientSentryOptions() {
  return baseSentryOptions(resolveClientSentryDsn());
}

export function buildServerSentryOptions() {
  return baseSentryOptions(resolveServerSentryDsn());
}
