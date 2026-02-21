"""
Messaging routes – proxy to Central Messaging Service on port 9011.

Covers: Threads, Messages, Participants, Attachments, Status-Events, Templates.
"""

from flask import Blueprint, request, jsonify

from config import EV_REAL_MESSAGING_API_BASE
from helpers import get_json_body, proxy_json_request, with_query_params

messaging_bp = Blueprint("messaging", __name__)

BASE = EV_REAL_MESSAGING_API_BASE


# ── Threads ──────────────────────────────────────────────────────────────────

@messaging_bp.get("/api/messaging/threads")
def list_threads():
    """List threads – filter by type, status, priority, assignee, related entity."""
    url = with_query_params(
        f"{BASE}/threads",
        threadType=request.args.get("threadType"),
        status=request.args.get("status"),
        priority=request.args.get("priority"),
        assignedToAccountId=request.args.get("assignedToAccountId"),
        relatedEntityType=request.args.get("relatedEntityType"),
        relatedEntityId=request.args.get("relatedEntityId"),
        page=request.args.get("page"),
        pageSize=request.args.get("pageSize"),
        sort=request.args.get("sort"),
        order=request.args.get("order"),
    )
    return proxy_json_request("GET", url, error_message="Failed to fetch threads")


@messaging_bp.post("/api/messaging/threads")
def create_thread():
    """Create a new thread."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request(
        "POST", f"{BASE}/threads", body=data,
        error_message="Failed to create thread",
    )


@messaging_bp.get("/api/messaging/threads/<int:thread_id>")
def get_thread(thread_id):
    """Get a single thread by ID."""
    return proxy_json_request(
        "GET", f"{BASE}/threads/{thread_id}",
        error_message="Failed to fetch thread",
        not_found="Thread not found",
    )


@messaging_bp.patch("/api/messaging/threads/<int:thread_id>")
def update_thread(thread_id):
    """Partially update a thread (subject, priority, status, assignee)."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request(
        "PATCH", f"{BASE}/threads/{thread_id}", body=data,
        error_message="Failed to update thread",
        not_found="Thread not found",
    )


@messaging_bp.delete("/api/messaging/threads/<int:thread_id>")
def delete_thread(thread_id):
    """Delete a thread."""
    return proxy_json_request(
        "DELETE", f"{BASE}/threads/{thread_id}",
        error_message="Failed to delete thread",
        not_found="Thread not found",
        empty_message="Thread deleted",
    )


# ── Messages ─────────────────────────────────────────────────────────────────

@messaging_bp.get("/api/messaging/threads/<int:thread_id>/messages")
def list_messages(thread_id):
    """List messages in a thread – filter by type or since timestamp."""
    url = with_query_params(
        f"{BASE}/threads/{thread_id}/messages",
        messageType=request.args.get("messageType"),
        since=request.args.get("since"),
        page=request.args.get("page"),
        pageSize=request.args.get("pageSize"),
    )
    return proxy_json_request("GET", url, error_message="Failed to fetch messages")


@messaging_bp.post("/api/messaging/threads/<int:thread_id>/messages")
def create_message(thread_id):
    """Post a new message to a thread."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request(
        "POST", f"{BASE}/threads/{thread_id}/messages", body=data,
        error_message="Failed to create message",
    )


@messaging_bp.get("/api/messaging/threads/<int:thread_id>/messages/<int:message_id>")
def get_message(thread_id, message_id):
    """Get a single message."""
    return proxy_json_request(
        "GET", f"{BASE}/threads/{thread_id}/messages/{message_id}",
        error_message="Failed to fetch message",
        not_found="Message not found",
    )


@messaging_bp.patch("/api/messaging/threads/<int:thread_id>/messages/<int:message_id>")
def update_message(thread_id, message_id):
    """Update message body or payload."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request(
        "PATCH", f"{BASE}/threads/{thread_id}/messages/{message_id}", body=data,
        error_message="Failed to update message",
        not_found="Message not found",
    )


@messaging_bp.delete("/api/messaging/threads/<int:thread_id>/messages/<int:message_id>")
def delete_message(thread_id, message_id):
    """Delete a message."""
    return proxy_json_request(
        "DELETE", f"{BASE}/threads/{thread_id}/messages/{message_id}",
        error_message="Failed to delete message",
        not_found="Message not found",
        empty_message="Message deleted",
    )


# ── Participants ─────────────────────────────────────────────────────────────

@messaging_bp.get("/api/messaging/threads/<int:thread_id>/participants")
def list_participants(thread_id):
    """List participants in a thread."""
    return proxy_json_request(
        "GET", f"{BASE}/threads/{thread_id}/participants",
        error_message="Failed to fetch participants",
    )


@messaging_bp.post("/api/messaging/threads/<int:thread_id>/participants")
def add_participant(thread_id):
    """Add a participant to a thread."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request(
        "POST", f"{BASE}/threads/{thread_id}/participants", body=data,
        error_message="Failed to add participant",
    )


@messaging_bp.get("/api/messaging/threads/<int:thread_id>/participants/<int:account_id>")
def get_participant(thread_id, account_id):
    """Get a participant by account ID."""
    return proxy_json_request(
        "GET", f"{BASE}/threads/{thread_id}/participants/{account_id}",
        error_message="Failed to fetch participant",
        not_found="Participant not found",
    )


@messaging_bp.patch("/api/messaging/threads/<int:thread_id>/participants/<int:account_id>")
def update_participant(thread_id, account_id):
    """Update participant settings (role, mute, canPost, lastRead)."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request(
        "PATCH", f"{BASE}/threads/{thread_id}/participants/{account_id}", body=data,
        error_message="Failed to update participant",
        not_found="Participant not found",
    )


@messaging_bp.delete("/api/messaging/threads/<int:thread_id>/participants/<int:account_id>")
def remove_participant(thread_id, account_id):
    """Remove a participant from a thread."""
    return proxy_json_request(
        "DELETE", f"{BASE}/threads/{thread_id}/participants/{account_id}",
        error_message="Failed to remove participant",
        not_found="Participant not found",
        empty_message="Participant removed",
    )


# ── Attachments ──────────────────────────────────────────────────────────────

@messaging_bp.get(
    "/api/messaging/threads/<int:thread_id>/messages/<int:message_id>/attachments"
)
def list_attachments(thread_id, message_id):
    """List attachments for a message."""
    return proxy_json_request(
        "GET",
        f"{BASE}/threads/{thread_id}/messages/{message_id}/attachments",
        error_message="Failed to fetch attachments",
    )


@messaging_bp.post(
    "/api/messaging/threads/<int:thread_id>/messages/<int:message_id>/attachments"
)
def create_attachment(thread_id, message_id):
    """Register an attachment record."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request(
        "POST",
        f"{BASE}/threads/{thread_id}/messages/{message_id}/attachments",
        body=data,
        error_message="Failed to create attachment",
    )


@messaging_bp.get(
    "/api/messaging/threads/<int:thread_id>/messages/<int:message_id>/attachments/<int:attachment_id>"
)
def get_attachment(thread_id, message_id, attachment_id):
    """Get attachment metadata with resolved download URL."""
    return proxy_json_request(
        "GET",
        f"{BASE}/threads/{thread_id}/messages/{message_id}/attachments/{attachment_id}",
        error_message="Failed to fetch attachment",
        not_found="Attachment not found",
    )


@messaging_bp.delete(
    "/api/messaging/threads/<int:thread_id>/messages/<int:message_id>/attachments/<int:attachment_id>"
)
def delete_attachment(thread_id, message_id, attachment_id):
    """Delete an attachment record."""
    return proxy_json_request(
        "DELETE",
        f"{BASE}/threads/{thread_id}/messages/{message_id}/attachments/{attachment_id}",
        error_message="Failed to delete attachment",
        not_found="Attachment not found",
        empty_message="Attachment deleted",
    )


# ── Status Events ────────────────────────────────────────────────────────────

@messaging_bp.get("/api/messaging/threads/<int:thread_id>/status-events")
def list_status_events(thread_id):
    """List status transition history for a thread."""
    url = with_query_params(
        f"{BASE}/threads/{thread_id}/status-events",
        page=request.args.get("page"),
        pageSize=request.args.get("pageSize"),
    )
    return proxy_json_request("GET", url, error_message="Failed to fetch status events")


@messaging_bp.post("/api/messaging/threads/<int:thread_id>/status-events")
def create_status_event(thread_id):
    """Record a status transition (validates state machine, updates thread.status)."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request(
        "POST", f"{BASE}/threads/{thread_id}/status-events", body=data,
        error_message="Failed to create status event",
    )


@messaging_bp.get("/api/messaging/threads/<int:thread_id>/status-events/<int:event_id>")
def get_status_event(thread_id, event_id):
    """Get a single status event."""
    return proxy_json_request(
        "GET", f"{BASE}/threads/{thread_id}/status-events/{event_id}",
        error_message="Failed to fetch status event",
        not_found="Status event not found",
    )


# ── Templates ────────────────────────────────────────────────────────────────

@messaging_bp.get("/api/messaging/templates")
def list_templates():
    """List templates – filter by category or active flag."""
    url = with_query_params(
        f"{BASE}/templates",
        category=request.args.get("category"),
        isActive=request.args.get("isActive"),
        page=request.args.get("page"),
        pageSize=request.args.get("pageSize"),
    )
    return proxy_json_request("GET", url, error_message="Failed to fetch templates")


@messaging_bp.post("/api/messaging/templates")
def create_template():
    """Create a message template."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request(
        "POST", f"{BASE}/templates", body=data,
        error_message="Failed to create template",
    )


@messaging_bp.get("/api/messaging/templates/<int:template_id>")
def get_template(template_id):
    """Get a template by ID."""
    return proxy_json_request(
        "GET", f"{BASE}/templates/{template_id}",
        error_message="Failed to fetch template",
        not_found="Template not found",
    )


@messaging_bp.patch("/api/messaging/templates/<int:template_id>")
def update_template(template_id):
    """Update a template."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request(
        "PATCH", f"{BASE}/templates/{template_id}", body=data,
        error_message="Failed to update template",
        not_found="Template not found",
    )


@messaging_bp.delete("/api/messaging/templates/<int:template_id>")
def delete_template(template_id):
    """Delete a template."""
    return proxy_json_request(
        "DELETE", f"{BASE}/templates/{template_id}",
        error_message="Failed to delete template",
        not_found="Template not found",
        empty_message="Template deleted",
    )


@messaging_bp.get("/api/messaging/templates/key/<key>")
def get_template_by_key(key):
    """Look up a template by unique key."""
    return proxy_json_request(
        "GET", f"{BASE}/templates/key/{key}",
        error_message="Failed to fetch template",
        not_found="Template not found",
    )
