// Session/backend boundaries abort query-managed and standalone requests.
// Cancellation cannot undo a write already accepted by the server.
let scope = new AbortController();
const listeners = new Set<() => void>();

export function sessionRequestSignal(): AbortSignal {
  return scope.signal;
}

export function cancelSessionRequests(): void {
  const previous = scope;
  scope = new AbortController();
  previous.abort();
}

export function onUnauthorized(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function reportUnauthorized(signal: AbortSignal): void {
  if (signal !== scope.signal || signal.aborted) return;
  for (const listener of listeners) listener();
}
