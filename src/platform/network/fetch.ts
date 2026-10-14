type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function getFetch(): FetchLike | null {
  const candidate = (globalThis as Record<string, unknown>)['fetch'];
  return typeof candidate === 'function' ? (candidate as FetchLike) : null;
}
