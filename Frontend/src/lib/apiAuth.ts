import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

interface Session {
  user: {
    id: string;
    email: string;
    name?: string;
  };
}

interface AuthResult {
  session: Session | null;
  error: NextResponse | null;
}

/**
 * Checks authentication for API routes.
 * Returns the session if authenticated, or an error response if not.
 */
export async function requireAuth(): Promise<AuthResult> {
  let retries = 3;
  const requestHeaders = await headers();
  
  while (retries > 0) {
    try {
      const session = await auth.api.getSession({
        headers: requestHeaders
      });

      if (!session) {
        return {
          session: null,
          error: NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          )
        };
      }

      return { session: session as Session, error: null };
    } catch (error: unknown) {
      retries--;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if it's a connection error (Better Auth wraps DB errors)
      if ((errorMessage.includes('Connection terminated') || 
           errorMessage.includes('Connection closed') ||
           errorMessage.includes('ECONNRESET') ||
           (errorMessage.includes('INTERNAL_SERVER_ERROR') && errorMessage.includes('Connection'))) && retries > 0) {
        console.warn(`[Auth] Database connection error, retrying... (${retries} attempts left)`);
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      // If it's not a connection error or we're out of retries, log and return error
      console.error('Authentication error:', error);
      return {
        session: null,
        error: NextResponse.json(
          { error: 'Authentication failed' },
          { status: 500 }
        )
      };
    }
  }
  
  // Should never reach here, but TypeScript needs it
  return {
    session: null,
    error: NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  };
}

/**
 * Optional auth check - returns session if available, null otherwise.
 * Does not return an error response.
 */
export async function getOptionalSession(): Promise<Session | null> {
  let retries = 3;
  const requestHeaders = await headers();
  
  while (retries > 0) {
    try {
      const session = await auth.api.getSession({
        headers: requestHeaders
      });
      return session as Session | null;
    } catch (error: unknown) {
      retries--;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if it's a connection error (Better Auth wraps DB errors)
      if ((errorMessage.includes('Connection terminated') || 
           errorMessage.includes('Connection closed') ||
           errorMessage.includes('ECONNRESET') ||
           (errorMessage.includes('INTERNAL_SERVER_ERROR') && errorMessage.includes('Connection'))) && retries > 0) {
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      // For optional auth, just return null on any error
      return null;
    }
  }
  
  return null;
}
