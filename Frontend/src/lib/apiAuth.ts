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
  try {
    const session = await auth.api.getSession({
      headers: await headers()
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
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      session: null,
      error: NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    };
  }
}

/**
 * Optional auth check - returns session if available, null otherwise.
 * Does not return an error response.
 */
export async function getOptionalSession(): Promise<Session | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });
    return session as Session | null;
  } catch {
    return null;
  }
}
