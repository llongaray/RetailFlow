export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem('rf_admin_token');
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(path, { ...options, headers });
  if (response.status === 401 && !path.endsWith('/login')) {
    sessionStorage.removeItem('rf_admin_token');
    if (!location.pathname.startsWith('/login')) location.assign('/login');
  }
  const text = await response.text();
  const data = text ? (JSON.parse(text) as { message?: string }) : {};
  if (!response.ok) throw new ApiError(data.message ?? 'Falha na operação.', response.status);
  return data as T;
}
