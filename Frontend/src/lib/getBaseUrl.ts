/**
 * Automatically detects the base URL for the application
 * Works in both server-side and client-side contexts
 */

export function getBaseUrl(): string {
  // Client-side: use window.location
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Server-side: check environment variables first
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL;
  }

  // Azure Static Web Apps - check for Azure-specific env vars
  if (process.env.AZURE_STATIC_WEB_APPS_ENVIRONMENT) {
    // Azure provides the hostname via environment
    const hostname = process.env.AZURE_STATIC_WEB_APPS_HOSTNAME;
    if (hostname) {
      return `https://${hostname}`;
    }
  }

  // Vercel
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Fallback to localhost for development
  return process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';
}

/**
 * Get base URL from request headers (for server-side API routes)
 */
export function getBaseUrlFromRequest(request?: {
  headers: Headers | { get: (key: string) => string | null };
}): string {
  if (!request) {
    return getBaseUrl();
  }

  // Try to get from headers first (most reliable)
  const host = request.headers.get?.('host') || 
                (request.headers as any).host;
  const protocol = request.headers.get?.('x-forwarded-proto') || 
                   (request.headers as any)['x-forwarded-proto'] ||
                   'https';

  if (host) {
    // Azure Static Web Apps uses x-forwarded-proto
    return `${protocol}://${host}`;
  }

  // Fallback to environment-based detection
  return getBaseUrl();
}

