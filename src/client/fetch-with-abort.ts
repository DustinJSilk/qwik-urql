export function fetchWithAbort(ctrl: AbortController): typeof fetch {
  return (input: RequestInfo | URL, opts?: RequestInit) =>
    fetch(input, {
      ...opts,
      signal: ctrl.signal,
    });
}
