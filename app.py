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


def _env_bool(name, default=False):
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def create_app():
    app = Flask(__name__, static_folder="client/dist", static_url_path="")
    CORS(app)

    for blueprint in ALL_BLUEPRINTS:
        app.register_blueprint(blueprint)

    return app


app = create_app()


if __name__ == "__main__":
    host = os.environ.get("FLASK_HOST", "127.0.0.1")
    port = int(os.environ.get("FLASK_PORT", "5000"))
    debug = _env_bool("FLASK_DEBUG", default=True)
    static_index = os.path.join(app.static_folder, "index.html")

    print(
        f"Starting Flask app. Serving static files from: {app.static_folder} "
        f"(exists: {os.path.exists(app.static_folder)})"
    )
    print(f"index.html present: {os.path.exists(static_index)}")
    app.run(host=host, port=port, debug=debug)
