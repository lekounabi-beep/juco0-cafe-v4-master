import type { Page } from "@playwright/test";

const IGNORED_CONSOLE_PATTERNS = [
  /Failed to load resource/i,
  /favicon/i,
  /Download the React DevTools/i,
  /Failed to load data from database/i,
  /ci-placeholder\.supabase\.co/i,
  /NetworkError/i,
  /webpack-hmr/i,
  /ERR_INVALID_HTTP_RESPONSE/i,
  /fetch failed/i,
];

export function attachConsoleGuard(page: Page): string[] {
  const errors: string[] = [];

  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (IGNORED_CONSOLE_PATTERNS.some((pattern) => pattern.test(text))) return;
    errors.push(`console.error: ${text}`);
  });

  return errors;
}

export function assertNoRuntimeErrors(errors: string[]): void {
  if (errors.length > 0) {
    throw new Error(`Runtime errors detected:\n${errors.join("\n")}`);
  }
}
