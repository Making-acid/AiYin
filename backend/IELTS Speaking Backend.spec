# -*- mode: python ; coding: utf-8 -*-

from pathlib import Path


project_root = Path(SPECPATH).parent
backend_root = project_root / "backend"
backend_data_root = backend_root / "data"
private_data_files = {"config.json", "whisper_config.json"}
backend_data_files = [
    (
        str(path),
        str(Path("data") / path.relative_to(backend_data_root).parent),
    )
    for path in backend_data_root.rglob("*")
    if path.is_file() and path.name not in private_data_files
]

a = Analysis(
    [str(backend_root / "run.py")],
    pathex=[str(backend_root)],
    binaries=[],
    datas=[
        (str(project_root / "frontend" / "dist"), "static"),
        *backend_data_files,
    ],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        "whisperx", "torch", "torchaudio", "torchvision", "transformers",
        "lightning", "pytorch_lightning", "pandas", "scipy", "sklearn",
        "nltk", "numba", "matplotlib", "onnxruntime", "sqlalchemy",
    ],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="IELTS Speaking Backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    icon=str(project_root / "frontend" / "public" / "icons" / "app-icon.ico"),
    disable_windowed_traceback=False,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="IELTS Speaking Backend",
)
