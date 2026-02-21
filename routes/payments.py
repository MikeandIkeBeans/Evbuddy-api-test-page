"""
User Payments proxy routes (/api/payments/...).
Proxies to the Spring Boot User Payments microservice on port 9002.
"""

from flask import Blueprint

from helpers import get_json_body, ms_url, proxy_json_request, with_query_params

payments_bp = Blueprint("payments", __name__)


@payments_bp.get("/api/payments")
def get_all_payments():
    """Get all payment methods."""
    return proxy_json_request("GET", ms_url("user_payments"),
                              error_message="Failed to fetch payments")


@payments_bp.get("/api/payments/<int:payment_id>")
def get_payment_by_id(payment_id):
    """Get a single payment method by ID."""
    return proxy_json_request("GET", ms_url("user_payments", f"/{payment_id}"),
                              error_message="Failed to fetch payment",
                              not_found="Payment method not found")


@payments_bp.get("/api/users/<int:user_id>/payments")
def get_user_payments(user_id):
    """Get all payment methods belonging to a specific user."""
    return proxy_json_request(
        "GET",
        with_query_params(ms_url("user_payments"), user_id=user_id),
        error_message="Failed to fetch user payments",
    )


@payments_bp.post("/api/payments")
def create_payment():
    """Create a new payment method."""
    data, err = get_json_body()
    if err:
        return err
    return proxy_json_request("POST", ms_url("user_payments"), body=data,
                              error_message="Failed to create payment")


@payments_bp.delete("/api/payments/<int:payment_id>")
def delete_payment(payment_id):
    """Delete a payment method by ID."""
    return proxy_json_request("DELETE", ms_url("user_payments", f"/{payment_id}"),
                              error_message="Failed to delete payment",
                              not_found="Payment method not found",
                              empty_message="Payment method deleted")
