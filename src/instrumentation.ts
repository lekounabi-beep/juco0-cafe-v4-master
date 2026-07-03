export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateRuntimeEnv } = await import("@/lib/server/env");
    validateRuntimeEnv();

    await import("../sentry.server.config");

    const { initMonitoring } = await import("@/lib/server/monitoring.server");
    initMonitoring();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export { captureRequestError as onRequestError } from "@sentry/nextjs";
