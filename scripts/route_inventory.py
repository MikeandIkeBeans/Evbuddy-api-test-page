import ast
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ROUTES_DIR = ROOT / "routes"
OUT_JSON = ROOT / "ROUTE_INVENTORY.json"
OUT_MD = ROOT / "ROUTE_INVENTORY.md"


def extract_routes(py_file: Path):
    source = py_file.read_text(encoding="utf-8")
    tree = ast.parse(source)
    rows = []
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            for deco in node.decorator_list:
                if isinstance(deco, ast.Call) and isinstance(deco.func, ast.Attribute):
                    method = deco.func.attr.upper()
                    if method in {"GET", "POST", "PUT", "PATCH", "DELETE", "ROUTE"} and deco.args:
                        arg0 = deco.args[0]
                        if isinstance(arg0, ast.Constant) and isinstance(arg0.value, str):
                            rows.append({
                                "file": str(py_file.relative_to(ROOT)).replace("\\", "/"),
                                "handler": node.name,
                                "method": method,
                                "path": arg0.value,
                            })
    return rows


def main():
    inventory = []
    for py_file in sorted(ROUTES_DIR.glob("*.py")):
        if py_file.name == "__init__.py":
            continue
        inventory.extend(extract_routes(py_file))

    inventory.sort(key=lambda item: (item["path"], item["method"], item["file"]))
    OUT_JSON.write_text(json.dumps(inventory, indent=2), encoding="utf-8")

    lines = ["# Route Inventory", "", f"Total routes: {len(inventory)}", "", "| Method | Path | Handler | File |", "|---|---|---|---|"]
    for item in inventory:
        lines.append(f"| {item['method']} | {item['path']} | {item['handler']} | {item['file']} |")
    OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
