from typing import Protocol, Any


class UsersPort(Protocol):
    def create(self, payload: dict[str, Any]):
        ...

    def update(self, user_id: int, payload: dict[str, Any]):
        ...

    def fetch(self, user_id: int):
        ...
