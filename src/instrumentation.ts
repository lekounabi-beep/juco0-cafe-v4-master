export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateProductionEnv } = await import("@/lib/server/env");
    validateProductionEnv();
  }
}
