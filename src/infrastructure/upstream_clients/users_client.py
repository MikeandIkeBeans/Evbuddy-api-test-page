from helpers import ms_url, proxy_json_request, ev_http


class UsersClient:
    def list_users(self, *, limit=None, offset=None):
        params = {}
        if limit is not None:
            params["limit"] = limit
        if offset is not None:
            params["offset"] = offset
        return proxy_json_request("GET", ms_url("users"), params=params, error_message="Failed to fetch users")

    def get_user_raw(self, user_id: int):
        return ev_http("GET", ms_url("users", f"/{user_id}"), timeout=10)

    def update_user(self, user_id: int, payload: dict):
        return proxy_json_request("PUT", ms_url("users", f"/{user_id}"), body=payload, error_message="Failed to patch user")
