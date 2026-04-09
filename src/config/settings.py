import os
from dataclasses import dataclass


@dataclass(frozen=True)
class AppSettings:
    flask_host: str
    flask_port: int
    flask_debug: bool
    api_require_key: bool
    rate_limit_enabled: bool
    rate_limit_requests: int
    rate_limit_window_seconds: int

    @staticmethod
    def from_env() -> "AppSettings":
        host = os.environ.get("FLASK_HOST", "127.0.0.1")
        port_raw = os.environ.get("FLASK_PORT", "5000")
        debug_raw = os.environ.get("FLASK_DEBUG", "true")

        try:
            port = int(port_raw)
        except ValueError as exc:
            raise ValueError(f"Invalid FLASK_PORT: {port_raw}") from exc

        debug = debug_raw.strip().lower() in {"1", "true", "yes", "on"}
        api_require_key = os.environ.get("API_REQUIRE_KEY", "false").strip().lower() in {"1", "true", "yes", "on"}
        rate_limit_enabled = os.environ.get("RATE_LIMIT_ENABLED", "true").strip().lower() in {"1", "true", "yes", "on"}
        rate_limit_requests = int(os.environ.get("RATE_LIMIT_REQUESTS", "240"))
        rate_limit_window_seconds = int(os.environ.get("RATE_LIMIT_WINDOW_SECONDS", "60"))

        return AppSettings(
            flask_host=host,
            flask_port=port,
            flask_debug=debug,
            api_require_key=api_require_key,
            rate_limit_enabled=rate_limit_enabled,
            rate_limit_requests=rate_limit_requests,
            rate_limit_window_seconds=rate_limit_window_seconds,
        )
