/**
 * Backend API client for making authenticated requests to the Python backend.
 *
 * This module handles:
 * - Extracting session tokens from Better Auth
 * - Passing tokens as Bearer headers to the backend
 * - Error handling and response parsing
 */

import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export interface BackendRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  params?: Record<string, string | number | undefined>;
  timeout?: number;
}

export class BackendError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "BackendError";
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Build URL with query parameters.
 */
function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(path, BACKEND_URL);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

/**
 * Get the session token from Better Auth.
 * Returns the token string or null if not authenticated.
 */
async function getSessionToken(): Promise<string | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    // Better Auth session structure: { session: { token: string, ... }, user: { ... } }
    if (session?.session?.token) {
      return session.session.token;
    }

    return null;
  } catch (error) {
    console.error("Failed to get session token:", error);
    return null;
  }
}

/**
 * Make an authenticated request to the Python backend.
 *
 * @param path - API path (e.g., "/api/stocks" or "/api/stock/AAPL")
 * @param options - Request options
 * @returns Parsed JSON response
 * @throws BackendError if the request fails
 *
 * @example
 * // GET request
 * const stocks = await backendFetch<Stock[]>("/api/stocks", { params: { limit: 10 } });
 *
 * @example
 * // POST request
 * const result = await backendFetch("/api/education/explain", {
 *   method: "POST",
 *   body: { concept: "P/E ratio" }
 * });
 */
export async function backendFetch<T>(
  path: string,
  options: BackendRequestOptions = {}
): Promise<T> {
  const { method = "GET", body, params, timeout = 30000 } = options;

  // Get session token
  const token = await getSessionToken();

  // Build request headers
  const requestHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };

  // Add Bearer token if authenticated
  if (token) {
    requestHeaders["Authorization"] = `Bearer ${token}`;
  }

  // Build URL with params
  const url = buildUrl(path, params);

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Parse error response
    if (!response.ok) {
      let detail = response.statusText;

      try {
        const errorBody = await response.json();
        detail = errorBody.detail || errorBody.message || detail;
      } catch {
        // Ignore JSON parse errors for error responses
      }

      throw new BackendError(response.status, detail);
    }

    // Parse successful response
    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof BackendError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new BackendError(408, "Request timeout");
    }

    throw new BackendError(
      500,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

/**
 * Check if the backend is available and optionally verify auth status.
 * Useful for health checks and debugging.
 */
export async function checkBackendStatus(): Promise<{
  available: boolean;
  authenticated: boolean;
  user?: { id: string; email: string; name?: string };
  error?: string;
}> {
  try {
    const response = await backendFetch<{
      authenticated: boolean;
      user?: { id: string; email: string; name?: string };
    }>("/api/auth/status");

    return {
      available: true,
      authenticated: response.authenticated,
      user: response.user,
    };
  } catch (error) {
    return {
      available: false,
      authenticated: false,
      error: error instanceof BackendError ? error.detail : "Backend unavailable",
    };
  }
}
