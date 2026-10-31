import threading
import time
from collections import defaultdict, deque

from app.core.errors import TooManyRequests


class SlidingWindowLimiter:
    """In-process limiter (see decisions.md D-008: per-process, not shared)."""

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def hit(self, key: str, limit: int, window_seconds: int) -> None:
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and hits[0] <= now - window_seconds:
                hits.popleft()
            if len(hits) >= limit:
                retry_after = int(hits[0] + window_seconds - now) + 1
                raise TooManyRequests(
                    "Too many attempts. Please wait and try again.",
                    details={"retry_after_seconds": retry_after},
                )
            hits.append(now)

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


limiter = SlidingWindowLimiter()
