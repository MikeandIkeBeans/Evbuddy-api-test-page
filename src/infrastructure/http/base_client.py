from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import requests

from .retry import RetryPolicy, sleep_before_retry


@dataclass
class HttpClientConfig:
    timeout_seconds: int = 10
    retry_policy: RetryPolicy = RetryPolicy()


class BaseHttpClient:
    def __init__(self, config: HttpClientConfig | None = None):
        self._config = config or HttpClientConfig()
        self._session = requests.Session()

    def request(self, method: str, url: str, *, params: dict[str, Any] | None = None, json: dict[str, Any] | None = None, headers: dict[str, str] | None = None, timeout: int | None = None):
        last_exc = None
        effective_timeout = timeout or self._config.timeout_seconds

        for attempt in range(1, self._config.retry_policy.max_attempts + 1):
            try:
                resp = self._session.request(
                    method=method,
                    url=url,
                    params=params,
                    json=json,
                    headers=headers,
                    timeout=effective_timeout,
                )
                if resp.status_code in self._config.retry_policy.retryable_statuses and attempt < self._config.retry_policy.max_attempts:
                    sleep_before_retry(self._config.retry_policy, attempt)
                    continue
                return resp
            except requests.RequestException as exc:
                last_exc = exc
                if attempt >= self._config.retry_policy.max_attempts:
                    raise
                sleep_before_retry(self._config.retry_policy, attempt)

        if last_exc:
            raise last_exc
        raise RuntimeError("request failed without response")
