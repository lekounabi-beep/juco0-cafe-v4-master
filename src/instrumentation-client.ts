import * as Sentry from "@sentry/nextjs";
import { buildClientSentryOptions } from "@/lib/sentry/shared-config";

const options = buildClientSentryOptions();
if (options.enabled) {
  Sentry.init(options);
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
