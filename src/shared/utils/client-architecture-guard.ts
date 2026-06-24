/**
 * Runtime guard — server action modules must never execute in the browser.
 */

export const SERVER_ACTION_CLIENT_ERROR =
  'SERVER ACTION USED IN CLIENT CONTEXT - INVALID ARCHITECTURE';

export function assertNotClientContext(moduleName: string): void {
  if (typeof window !== 'undefined') {
    throw new Error(`${SERVER_ACTION_CLIENT_ERROR} (${moduleName})`);
  }
}
