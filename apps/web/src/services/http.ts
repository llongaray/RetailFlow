export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem('rf_token');
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (response.status === 401 && !path.includes('/auth/login')) {
    sessionStorage.removeItem('rf_token');
    sessionStorage.removeItem('rf_user');
    if (!location.pathname.startsWith('/login')) location.assign('/login');
  }
  const text = await response.text();
  const data = text ? (JSON.parse(text) as { message?: string; code?: string }) : {};
  if (!response.ok) throw new ApiError(data.message ?? 'Falha na operação.', response.status, data.code);
  return data as T;
}
