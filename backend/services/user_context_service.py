"""User Content Interaction Tracking Service.

Tracks user interactions (articles, modules, coach queries) and provides
context for RAG/LLM personalization.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional, Any
from prisma import Prisma, Json

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


class UserContextService:
    """Service for tracking and retrieving user content interactions."""
    
    def __init__(self):
        """Initialize Prisma client."""
        self.db = Prisma()
        self._connected = False
    
    async def connect(self):
        """Connect to database."""
        if not self._connected:
            await self.db.connect()
            self._connected = True
    
    async def disconnect(self):
        """Disconnect from database."""
        if self._connected:
            await self.db.disconnect()
            self._connected = False
    
    async def track_interaction(
        self,
        user_id: str,
        content_type: str,
        content_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Track a user interaction with content.
        
        Args:
            user_id: User ID
            content_type: Type of content ('article', 'module', 'coach_query')
            content_id: Optional content identifier (article ID, module name, etc.)
            metadata: Optional additional context (headline, title, etc.)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            await self.connect()
            
            # Prepare metadata as Json type for Prisma
            metadata_json = Json(metadata) if metadata else None
            
            await self.db.usercontentinteraction.create(
                data={
                    'userId': user_id,
                    'contentType': content_type,
                    'contentId': content_id,
                    'metadata': metadata_json,
                    'interactedAt': datetime.now(timezone.utc)
                }
            )
            logging.info(f"[UserContext] Tracked {content_type} interaction for user {user_id[:8]}...")
            return True
        except Exception as e:
            logging.error(f"[UserContext] Error tracking interaction: {e}")
            return False
    
    async def get_recent_context(
        self,
        user_id: str,
        days: int = 7,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get user's recent interactions for context.
        
        Args:
            user_id: User ID
            days: Number of days to look back (default: 7)
            limit: Maximum number of interactions to return (default: 50)
            
        Returns:
            List of interaction dictionaries
        """
        try:
            await self.connect()
            
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
            
            interactions = await self.db.usercontentinteraction.find_many(
                where={
                    'userId': user_id,
                    'interactedAt': {
                        'gte': cutoff_date
                    }
                },
                order={
                    'interactedAt': 'desc'
                },
                take=limit
            )
            
            return [
                {
                    'id': str(interaction.id),
                    'contentType': interaction.contentType,
                    'contentId': interaction.contentId,
                    'metadata': interaction.metadata if interaction.metadata else {},
                    'interactedAt': interaction.interactedAt.isoformat() if interaction.interactedAt else None
                }
                for interaction in interactions
            ]
        except Exception as e:
            logging.error(f"[UserContext] Error retrieving recent context: {e}")
            return []
    
    async def format_context_for_prompt(
        self,
        user_id: str,
        days: int = 7,
        limit: int = 50
    ) -> str:
        """
        Format user's recent interactions as a context string for LLM prompts.
        
        Args:
            user_id: User ID
            days: Number of days to look back (default: 7)
            limit: Maximum number of interactions to include (default: 50)
            
        Returns:
            Formatted context string
        """
        interactions = await self.get_recent_context(user_id, days=days, limit=limit)
        
        if not interactions:
            return "No recent activity to reference."
        
        # Group by content type
        articles = []
        modules = []
        queries = []
        
        for interaction in interactions:
            content_type = interaction['contentType']
            metadata = interaction.get('metadata', {})
            
            if content_type == 'article':
                headline = metadata.get('headline', 'Unknown Article')
                source = metadata.get('source', 'Unknown Source')
                articles.append(f"- {headline} ({source})")
            elif content_type == 'module':
                module_name = metadata.get('moduleName', interaction.get('contentId', 'Unknown Module'))
                modules.append(f"- {module_name}")
            elif content_type == 'coach_query':
                query = metadata.get('query', interaction.get('contentId', 'Unknown Query'))
                # Truncate long queries
                if len(query) > 100:
                    query = query[:97] + "..."
                queries.append(f"- {query}")
        
        # Build context string
        context_parts = []
        
        if articles:
            context_parts.append(f"**Recent Articles Viewed ({len(articles)}):**")
            context_parts.extend(articles[:10])  # Limit to 10 most recent
        
        if modules:
            context_parts.append(f"\n**Recent Modules Accessed ({len(modules)}):**")
            context_parts.extend(modules[:10])  # Limit to 10 most recent
        
        if queries:
            context_parts.append(f"\n**Recent Questions Asked ({len(queries)}):**")
            context_parts.extend(queries[:10])  # Limit to 10 most recent
        
        if not context_parts:
            return "No recent activity to reference."
        
        return "\n".join(context_parts)
    
    async def cleanup_old_interactions(self, days: int = 7) -> int:
        """
        Clean up interactions older than specified days.
        
        Args:
            days: Number of days to keep (default: 7)
            
        Returns:
            Number of interactions deleted
        """
        try:
            await self.connect()
            
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
            
            result = await self.db.usercontentinteraction.delete_many(
                where={
                    'interactedAt': {
                        'lt': cutoff_date
                    }
                }
            )

            logging.info(f"[UserContext] Cleaned up {result} old interactions")
            return result
        except Exception as e:
            logging.error(f"[UserContext] Error cleaning up old interactions: {e}")
            return 0

    async def health_check(self) -> Dict[str, Any]:
        """
        Check if the user context tracking service is working.

        Returns:
            Dict with status and details
        """
        try:
            await self.connect()

            # Try to count interactions (simple query to verify connectivity)
            count = await self.db.usercontentinteraction.count()

            return {
                'status': 'healthy',
                'connected': True,
                'interaction_count': count,
                'message': 'User context tracking service is operational'
            }
        except Exception as e:
            logging.error(f"[UserContext] Health check failed: {e}")
            return {
                'status': 'unhealthy',
                'connected': False,
                'error': str(e),
                'message': 'Failed to connect to database or query interactions'
            }


# Singleton instance
_user_context_service: Optional[UserContextService] = None


def get_user_context_service() -> UserContextService:
    """Get or create the user context service singleton."""
    global _user_context_service
    if _user_context_service is None:
        _user_context_service = UserContextService()
    return _user_context_service

