import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";
import { getBaseUrlFromRequest, getBaseUrl } from "@/lib/getBaseUrl";

const handler = toNextJsHandler(auth);

// Helper to get allowed origins - automatically detects from request
function getAllowedOrigins(request?: NextRequest): string[] {
  const baseURL = request ? getBaseUrlFromRequest(request) : getBaseUrl();

  return [
    baseURL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    // Allow any subdomain
    baseURL.replace(/^https?:\/\/([^.]+)/, 'https://*.$1'),
  ].filter(Boolean) as string[];
}

// Wrap handlers to add CORS headers - better-auth handlers use Request/Response
function withCORS(
  routeHandler: (request: Request) => Promise<Response>
) {
  return async (request: NextRequest) => {
    const origin = request.headers.get("origin");
    const allowedOrigins = getAllowedOrigins(request);

    // Convert NextRequest to Request for better-auth handler
    const response = await routeHandler(request as unknown as Request);

    // Copy response body and status
    const responseBody = await response.text();
    const finalResponse = new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    // Add CORS headers - allow the request origin if it matches our base URL pattern
    if (origin) {
      const baseURL = getBaseUrlFromRequest(request);
      const isAllowed = origin === baseURL ||
        origin.startsWith(baseURL.replace(/^https?:\/\/([^.]+)/, 'https://')) ||
        allowedOrigins.some(allowed => origin.includes(allowed) || allowed === "*");

      if (isAllowed) {
        finalResponse.headers.set("Access-Control-Allow-Origin", origin);
        finalResponse.headers.set("Access-Control-Allow-Credentials", "true");
        finalResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        finalResponse.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      }
    }

    return finalResponse;
  };
}

export const GET = withCORS(handler.GET);
export const POST = withCORS(handler.POST);

// Handle OPTIONS preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  const baseURL = getBaseUrlFromRequest(request);

  const response = new NextResponse(null, { status: 204 });

  if (origin) {
    const isAllowed = origin === baseURL ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes(baseURL.replace(/^https?:\/\//, '').split('.')[0]);

    if (isAllowed) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      response.headers.set("Access-Control-Max-Age", "86400");
    }
  }

  return response;
}
