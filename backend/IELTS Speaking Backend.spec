# -*- mode: python ; coding: utf-8 -*-

from pathlib import Path
from PyInstaller.utils.hooks import collect_all, collect_data_files


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
sherpa_datas, sherpa_binaries, sherpa_hiddenimports = collect_all("sherpa_onnx")
whisperx_datas = collect_data_files("whisperx")
whisperx_hiddenimports = [
    "whisperx",
    "whisperx.alignment",
    "whisperx.audio",
    "whisperx.log_utils",
    "whisperx.schema",
    "whisperx.utils",
]

a = Analysis(
    [str(backend_root / "run.py")],
    pathex=[str(backend_root)],
    binaries=sherpa_binaries,
    datas=[
        (str(project_root / "frontend" / "dist"), "static"),
        *backend_data_files,
        *sherpa_datas,
        *whisperx_datas,
    ],
    hiddenimports=[*sherpa_hiddenimports, *whisperx_hiddenimports],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        "torchvision", "lightning", "pytorch_lightning", "sklearn",
        "numba", "matplotlib", "sqlalchemy", "pyannote",
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
