/**
 * User interaction tracking utility
 * Tracks user interactions with content for personalized RAG context
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:8000';

/**
 * Track a user interaction with content
 * @param userId - User ID (optional, will be fetched if not provided)
 * @param contentType - Type of content ('article', 'module', 'coach_query')
 * @param contentId - Content identifier (article ID, module name, etc.)
 * @param metadata - Additional context (headline, title, etc.)
 */
export async function trackInteraction(
  contentType: 'article' | 'module' | 'coach_query',
  contentId: string | null,
  metadata?: Record<string, any>,
  userId?: string
): Promise<void> {
  try {
    // If userId not provided, try to get it from session (client-side only)
    if (!userId && typeof window !== 'undefined') {
      try {
        // For client-side, we'll need to get userId from the auth context
        // This is a simplified approach - in production you might want to pass userId explicitly
        const authResponse = await fetch('/api/auth/status');
        if (authResponse.ok) {
          const authData = await authResponse.json();
          if (authData.authenticated && authData.user?.id) {
            userId = authData.user.id;
          }
        }
      } catch (error) {
        // If we can't get userId, skip tracking (non-blocking)
        console.log('[Tracking] Could not get user session, skipping tracking');
        return;
      }
    }

    if (!userId) {
      // No user ID available, skip tracking
      return;
    }

    // Call backend API to track interaction
    await fetch(`${BACKEND_URL}/api/tracking/interaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        contentType,
        contentId,
        metadata,
      }),
    });
  } catch (error) {
    // Non-blocking: log error but don't throw
    console.error('[Tracking] Error tracking interaction:', error);
  }
}

/**
 * Track article view
 */
export async function trackArticleView(
  articleId: string,
  headline?: string,
  source?: string,
  userId?: string
): Promise<void> {
  await trackInteraction(
    'article',
    articleId,
    {
      headline: headline || 'Unknown Article',
      source: source || 'Unknown Source',
    },
    userId
  );
}

/**
 * Track module access
 */
export async function trackModuleAccess(
  moduleName: string,
  moduleNumber?: number,
  userId?: string
): Promise<void> {
  await trackInteraction(
    'module',
    moduleName,
    {
      moduleName,
      moduleNumber,
    },
    userId
  );
}

