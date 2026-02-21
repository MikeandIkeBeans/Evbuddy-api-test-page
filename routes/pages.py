"""
Page-serving routes: index, guest flow, static proxy.
"""

import base64
import io
import os

import qrcode
from flask import Blueprint, current_app, render_template, request, send_file

from config import EV_BASE_DIR

pages_bp = Blueprint("pages", __name__)

FEATURES = [
    {"title": "Rent a Charger", "icon": "battery-charging", "desc": "On-demand mobile charging when you need it."},
    {"title": "Installation Services", "icon": "zap", "desc": "Professional setup for home and business clusters."},
    {"title": "EV Buddy Network", "icon": "landmark", "desc": "Join our massive market infrastructure opportunity."},
]

STEPS = [
    {"step": "01", "title": "Connect Donor"},
    {"step": "02", "title": "Power Transfer"},
    {"step": "03", "title": "Vehicle Ready"},
    {"step": "04", "title": "Back on Road"},
]

SPECS = [
    '32" Multimedia Touch Screen',
    "Smart Cable Management",
    "Streaming Revenue Integration",
]


@pages_bp.get("/")
def index():
    """Serve built React app if present; otherwise server-rendered fallback."""
    static_index = os.path.join(current_app.static_folder, "index.html")
    if os.path.exists(static_index):
        return current_app.send_static_file("index.html")
    return render_template("index.html", features=FEATURES, steps=STEPS, specs=SPECS)


@pages_bp.get("/guest")
@pages_bp.get("/test-page.html")
def guest_page():
    return send_file(EV_BASE_DIR / "test-page.html")


@pages_bp.get("/guest/qr")
def guest_qr():
    guest_url = f"{request.url_root.rstrip('/')}/guest"

    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(guest_url)
    qr.make(fit=True)
    image = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    qr_data_url = f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode()}"

    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EV Buddy Demo - Guest QR</title>
</head>
<body style="font-family: system-ui; display:flex; min-height:100vh; align-items:center; justify-content:center; background:#0f172a; color:white; margin:0;">
    <div style="background:white; color:#111; border-radius:16px; padding:24px; width:min(420px, 92vw); text-align:center;">
        <h2 style="margin:0 0 8px;">EV Buddy Guest Flow</h2>
        <p style="margin:0 0 16px; color:#444;">Scan to open the guest charging flow</p>
        <img src="{qr_data_url}" alt="QR" width="280" height="280" />
        <div style="margin-top:16px;">
            <a href="{guest_url}" style="display:inline-block; background:#2563eb; color:white; padding:10px 14px; border-radius:10px; text-decoration:none; font-weight:600;">
                Open Guest Flow
            </a>
        </div>
    </div>
</body>
</html>
"""


@pages_bp.get("/<path:path>")
def static_proxy(path):
    """Serve static assets, or fallback to SPA index if it exists."""
    static_path = os.path.join(current_app.static_folder, path)
    if os.path.exists(static_path):
        return current_app.send_static_file(path)

    static_index = os.path.join(current_app.static_folder, "index.html")
    if os.path.exists(static_index):
        return current_app.send_static_file("index.html")

    return render_template("index.html")
