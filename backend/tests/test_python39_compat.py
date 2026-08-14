import ast
from pathlib import Path


def test_backend_modules_with_pep604_annotations_defer_evaluation():
    app_root = Path(__file__).parents[1] / "app"
    offenders = []
    for path in app_root.rglob("*.py"):
        source = path.read_text(encoding="utf-8")
        tree = ast.parse(source)
        uses_union_annotation = any(isinstance(node, ast.BinOp) and isinstance(node.op, ast.BitOr) for node in ast.walk(tree))
        if not uses_union_annotation:
            continue
        future_imports = [
            node for node in tree.body
            if isinstance(node, ast.ImportFrom) and node.module == "__future__"
        ]
        if not any(alias.name == "annotations" for node in future_imports for alias in node.names):
            offenders.append(str(path.relative_to(app_root.parent)))

    assert offenders == []
