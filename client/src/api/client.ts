export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export class RateLimitError extends ApiError {
  retryAfter: number
  constructor(message: string, retryAfter: number) {
    super(429, message)
    this.retryAfter = retryAfter
  }
}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  if (!res.ok) {
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('Retry-After') ?? '60', 10)
      const body = await res.text()
      throw new RateLimitError(body, retryAfter)
    }
    const body = await res.text()
    throw new ApiError(res.status, body)
  }
  return res.json()
}
