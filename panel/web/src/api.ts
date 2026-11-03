/** Cliente de la API. Las mutaciones llevan X-Panel: 1 (protección CSRF del servidor). */
export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly errores?: string[]) {
    super(message);
  }
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...(method !== "GET" ? { "x-panel": "1" } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    if (res.status === 401 && path.startsWith("/api/v1/")) window.dispatchEvent(new Event("panel:sesion"));
    throw new ApiError(json.error ?? (json.errores ? json.errores.join(" · ") : `Error ${res.status}`), res.status, json.errores);
  }
  return json as T;
}

export const api = {
  get: <T>(p: string) => req<T>("GET", p),
  post: <T>(p: string, b?: unknown) => req<T>("POST", p, b ?? {}),
  put: <T>(p: string, b: unknown) => req<T>("PUT", p, b),
  del: <T>(p: string) => req<T>("DELETE", p),
};

export interface Metric<T = number | null> {
  value: T;
  source: string;
  updatedAt: string | null;
  partial?: boolean;
  estimated?: boolean;
  note?: string;
}
