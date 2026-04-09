import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INVENTORY_PATH = ROOT / "ROUTE_INVENTORY.json"
OUT_PATH = ROOT / "API_CONTRACT_NORMALIZED.md"


def main():
    if not INVENTORY_PATH.exists():
        raise SystemExit("ROUTE_INVENTORY.json not found. Run scripts/route_inventory.py first.")

    routes = json.loads(INVENTORY_PATH.read_text(encoding="utf-8"))
    lines = [
        "# API Contract Normalization Report",
        "",
        "This report tracks contract-normalized routes that should return the canonical envelope:",
        "",
        "```json",
        '{"ok": true, "data": {...}}',
        "```",
        "",
        "Error envelope:",
        "",
        "```json",
        '{"ok": false, "error": {"code": "...", "message": "..."}}',
        "```",
        "",
        "## Legacy Route Inventory",
        "",
        f"Total discovered route handlers: {len(routes)}",
        "",
        "| Method | Path | Normalized Ready |",
        "|---|---|---|",
    ]

    for row in routes:
        normalized = "yes" if row["path"].startswith("/api/platform/") else "no"
        lines.append(f"| {row['method']} | {row['path']} | {normalized} |")

    OUT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
