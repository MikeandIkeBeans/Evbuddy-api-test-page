"""
Flask app entry point for EVBuddy.

Run (PowerShell):
  .venv/Scripts/Activate.ps1
  $env:FLASK_APP = "app.py"
  python -m flask run
"""

import os

from flask import Flask
from flask_cors import CORS

from routes import ALL_BLUEPRINTS
from src.api.middleware import (
    register_auth_middleware,
    register_error_handlers,
    register_rate_limit_middleware,
    register_request_id_middleware,
    register_security_headers,
)
from src.config import AppSettings


def create_app():
    app = Flask(__name__, static_folder="client/dist", static_url_path="")
    CORS(app)

    register_request_id_middleware(app)
    register_security_headers(app)
    register_rate_limit_middleware(app)
    register_auth_middleware(app)
    register_error_handlers(app)

    for blueprint in ALL_BLUEPRINTS:
        app.register_blueprint(blueprint)

    return app


app = create_app()


if __name__ == "__main__":
    settings = AppSettings.from_env()
    static_index = os.path.join(app.static_folder, "index.html")

    print(
        f"Starting Flask app. Serving static files from: {app.static_folder} "
        f"(exists: {os.path.exists(app.static_folder)})"
    )
    print(f"index.html present: {os.path.exists(static_index)}")
    app.run(host=settings.flask_host, port=settings.flask_port, debug=settings.flask_debug, threaded=True)
