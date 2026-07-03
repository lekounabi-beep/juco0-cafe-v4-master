/** Dev-only logging — silent in production builds. */

const isDev = process.env.NODE_ENV === "development";

export const devLog = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
};
