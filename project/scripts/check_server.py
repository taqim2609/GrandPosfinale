#!/usr/bin/env python3
"""Pemeriksa kesehatan backend/server.py — menangkap kelas bug yang sudah pernah terjadi:
 1) decorator route "nyangkut" (menempel ke pernyataan non-def, mis. _hash_cost / variabel)
 2) handler kehilangan decorator (fungsi mirip route tanpa @api.*)
 3) path+method ganda
 4) anotasi menunjuk nama yang belum terdefinisi (NameError saat import → backend mati)
 5) sintaks dasar (compile)
Jalankan: python3 scripts/check_server.py  (dari folder backend)
"""
import ast
import builtins
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "backend" / "server.py"
METHODS = {"get", "post", "put", "patch", "delete"}


def main() -> int:
    text = SRC.read_text(encoding="utf-8")
    problems = []

    # ---- 5) compile ----
    try:
        compile(text, str(SRC), "exec")
    except SyntaxError as e:
        print(f"FATAL sintaks: line {e.lineno}: {e.msg}")
        return 1

    tree = ast.parse(text)
    routes, seen = [], {}

    for node in tree.body:
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            continue
        decos = []
        for d in node.decorator_list:
            if isinstance(d, ast.Call) and isinstance(d.func, ast.Attribute) and d.func.attr in METHODS:
                if d.args and isinstance(d.args[0], ast.Constant) and isinstance(d.args[0].value, str):
                    decos.append((d.func.attr.upper(), d.args[0].value))
        if decos:
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                problems.append(f"line {node.lineno}: decorator @api.* menempel ke NON-fungsi ({type(node).__name__}) — ROUTE MATI")
                continue
            for m, p in decos:
                routes.append((p, node.name, m))
                seen.setdefault((m, p), []).append(node.name)

    # ---- 1/2) fungsi mirip handler tapi tanpa route ----
    for node in tree.body:
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        has_route = any(
            isinstance(d, ast.Call) and isinstance(d.func, ast.Attribute) and d.func.attr in METHODS
            for d in node.decorator_list
        )
        if has_route or node.name.startswith(("_", "get_", "require_", "run_", "seed")):
            continue
        sig = ast.unparse(node.args)
        looks_route = "Depends(" in sig or "Request" in sig
        if looks_route and node.name not in ("startup",):
            problems.append(f"line {node.lineno}: '{node.name}({sig[:60]})' mirip handler tapi TANPA decorator route — cek decorator nyangkut")

    # ---- 3) duplikat ----
    for (m, p), names in seen.items():
        if len(names) > 1:
            problems.append(f"route ganda {m} {p}: {names}")

    # ---- 4) anotasi menunjuk nama belum terdefinisi ----
    defined = set(dir(builtins))
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            anns = [(a.arg, ast.unparse(a.annotation)) for a in node.args.args + node.args.kwonlyargs if a.annotation]
            for nm, ann in anns:
                base = ann.split("[")[0].split(".")[0].strip()
                if base[:1].isupper() and base not in defined and base not in ("List", "Optional", "Literal", "Dict", "Any"):
                    problems.append(f"line {node.lineno}: '{node.name}' anotasi '{nm}: {ann}' menunjuk nama belum terdefinisi (NameError saat import)")
            defined.add(node.name)
        elif isinstance(node, ast.ClassDef):
            defined.add(node.name)
        elif isinstance(node, ast.Assign):
            for t in node.targets:
                if isinstance(t, ast.Name):
                    defined.add(t.id)
        elif isinstance(node, (ast.Import, ast.ImportFrom)):
            for a in node.names:
                defined.add((a.asname or a.name).split(".")[0])

    print(f"route terdaftar: {len(routes)}")
    if problems:
        print("MASALAH DITEMUKAN:")
        for p in problems:
            print("  -", p)
        return 2
    print("OK — tidak ada masalah struktural")
    return 0


if __name__ == "__main__":
    sys.exit(main())
