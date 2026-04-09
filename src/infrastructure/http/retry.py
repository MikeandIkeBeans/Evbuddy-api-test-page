import random
import time
from dataclasses import dataclass


@dataclass(frozen=True)
class RetryPolicy:
    max_attempts: int = 3
    base_delay_seconds: float = 0.15
    max_delay_seconds: float = 1.5
    jitter_seconds: float = 0.1
    retryable_statuses: tuple[int, ...] = (408, 429, 500, 502, 503, 504)


def compute_backoff_seconds(policy: RetryPolicy, attempt: int) -> float:
    delay = min(policy.max_delay_seconds, policy.base_delay_seconds * (2 ** max(attempt - 1, 0)))
    jitter = random.uniform(0, policy.jitter_seconds)
    return delay + jitter


def sleep_before_retry(policy: RetryPolicy, attempt: int) -> None:
    time.sleep(compute_backoff_seconds(policy, attempt))
