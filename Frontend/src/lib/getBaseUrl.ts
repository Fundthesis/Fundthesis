/**
 * Automatically detects the base URL for the application
 * Works in both server-side and client-side contexts
 */

/**
 * Ensures www subdomain is preserved for fundthesis.net domain
 */
function ensureWwwForFundthesis(url: string): string {
  // If the URL is for fundthesis.net and doesn't have www, add it
  if (url.includes('fundthesis.net') && !url.includes('www.')) {
    return url.replace('fundthesis.net', 'www.fundthesis.net');
  }
  return url;
}

export function getBaseUrl(): string {
  // Client-side: use window.location (preserves www if present)
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Server-side: check environment variables first
  // IMPORTANT: To preserve www subdomain, set environment variables with www:
  // NEXT_PUBLIC_APP_URL=https://www.fundthesis.net
  // or
  // BETTER_AUTH_URL=https://www.fundthesis.net
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return ensureWwwForFundthesis(process.env.NEXT_PUBLIC_APP_URL);
  }

  if (process.env.BETTER_AUTH_URL) {
    return ensureWwwForFundthesis(process.env.BETTER_AUTH_URL);
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
  // Handle both Headers object and plain object
  let host: string | null = null;
  let protocol: string = 'https';

  if (request.headers instanceof Headers) {
    host = request.headers.get('host');
    protocol = request.headers.get('x-forwarded-proto') || 'https';
  } else if (typeof request.headers.get === 'function') {
    host = request.headers.get('host');
    protocol = request.headers.get('x-forwarded-proto') || 'https';
  } else {
    // Handle plain object with host property
    const headersObj = request.headers as unknown as Record<string, string | undefined>;
    host = headersObj.host || null;
    protocol = headersObj['x-forwarded-proto'] || 'https';
  }

  if (host) {
    // Azure Static Web Apps uses x-forwarded-proto
    // Use the host header directly to preserve www subdomain if present
    return `${protocol}://${host}`;
  }

  // Fallback to environment-based detection
  return getBaseUrl();
}

