import type { ApiErrorPayload, ErrorCode } from "../../shared/types";

export class ApiClientError extends Error {
  constructor(public readonly code: ErrorCode | "NETWORK") {
    super(code);
  }
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new ApiClientError("NETWORK");
  }
  if (!response.ok) {
    const payload = (await response
      .json()
      .catch(() => null)) as ApiErrorPayload | null;
    throw new ApiClientError(payload?.error.code ?? "INTERNAL_ERROR");
  }
  return response.json() as Promise<T>;
}
