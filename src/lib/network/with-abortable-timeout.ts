export type AbortableTimeoutOptions = {
  label?: string;
  onTimeout?: () => void;
  onAbort?: () => void;
};

export class AbortableTimeoutError extends Error {
  readonly reason: 'timeout' | 'abort';

  constructor(reason: 'timeout' | 'abort', label: string) {
    super(reason === 'timeout' ? `${label}: timeout` : `${label}: aborted`);
    this.name = 'AbortableTimeoutError';
    this.reason = reason;
  }
}

/**
 * Races `fn` against timeout/abort. Clears the timer in `finally` so no orphan timers remain.
 * Server actions cannot be cancelled server-side; aborted results are ignored by callers.
 */
export async function withAbortableTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  ms: number,
  externalSignal?: AbortSignal,
  options?: AbortableTimeoutOptions,
): Promise<T> {
  const label = options?.label ?? 'request';
  const controller = new AbortController();
  let timedOut = false;

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      options?.onAbort?.();
      throw new AbortableTimeoutError('abort', label);
    }
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const timeoutId = setTimeout(() => {
    timedOut = true;
    options?.onTimeout?.();
    controller.abort();
  }, ms);

  try {
    return await fn(controller.signal);
  } catch (err) {
    if (controller.signal.aborted) {
      if (timedOut) {
        throw new AbortableTimeoutError('timeout', label);
      }
      throw new AbortableTimeoutError('abort', label);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}
