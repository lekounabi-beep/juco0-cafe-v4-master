import * as Sentry from "@sentry/nextjs";
import { buildServerSentryOptions } from "./src/lib/sentry/shared-config";

const options = buildServerSentryOptions();
if (options.enabled) {
  Sentry.init(options);
}
