"""Rate limiting middleware with differentiated limits for guests vs authenticated users."""
import time
import asyncio
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, Optional, Tuple


@dataclass
class RateLimitState:
    """Tracks request count and window for rate limiting."""
    requests: int = 0
    window_start: float = field(default_factory=time.time)


class RateLimiter:
    """
    Token bucket rate limiter with different limits for guests vs authenticated users.

    Configuration:
    - Guests: 30 requests per minute (configurable)
    - Authenticated: Unlimited (no rate limiting)
    """

    def __init__(
        self,
        guest_limit: int = 30,
        window_seconds: int = 60
    ):
        self.guest_limit = guest_limit
        self.window_seconds = window_seconds
        self._guest_buckets: Dict[str, RateLimitState] = defaultdict(RateLimitState)
        self._lock = asyncio.Lock()

    async def check_rate_limit(
        self,
        client_ip: str,
        is_authenticated: bool
    ) -> Tuple[bool, Optional[int], int, int]:
        """
        Check if request should be allowed.

        Returns:
            (allowed, retry_after_seconds, limit, remaining)
        """
        # Authenticated users have no rate limit
        if is_authenticated:
            return (True, None, -1, -1)

        async with self._lock:
            now = time.time()
            state = self._guest_buckets[client_ip]

            # Reset window if expired
            if now - state.window_start >= self.window_seconds:
                state.requests = 0
                state.window_start = now

            remaining = max(0, self.guest_limit - state.requests)

            # Check limit
            if state.requests >= self.guest_limit:
                retry_after = int(self.window_seconds - (now - state.window_start))
                return (False, max(1, retry_after), self.guest_limit, 0)

            # Increment counter
            state.requests += 1
            remaining = max(0, self.guest_limit - state.requests)

            return (True, None, self.guest_limit, remaining)

    def cleanup_old_entries(self, max_age_seconds: int = 300):
        """Remove stale entries to prevent memory growth."""
        now = time.time()
        stale_keys = [
            ip for ip, state in self._guest_buckets.items()
            if now - state.window_start > max_age_seconds
        ]
        for key in stale_keys:
            del self._guest_buckets[key]


# Global singleton instance
rate_limiter = RateLimiter(guest_limit=30, window_seconds=60)
