from typing import Any


class ValidationError(Exception):
    pass


def _require(payload: dict[str, Any], keys: list[str]) -> None:
    missing = [key for key in keys if payload.get(key) in (None, "")]
    if missing:
        raise ValidationError(f"Missing required fields: {', '.join(missing)}")


def build_create_user_payload(payload: dict[str, Any]) -> dict[str, Any]:
    _require(payload, ["email"])
    return payload


def build_update_user_payload(existing: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    if not patch:
        raise ValidationError("Request body required")
    merged = {**existing, **patch}
    _require(merged, ["email"])
    return merged
