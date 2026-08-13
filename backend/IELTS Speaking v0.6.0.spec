# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['run.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('../../IELTS-Speaking-v0.6.0-Release/StaticStage', 'static'),
        ('data', 'data'),
    ],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    # WhisperX is deliberately installed separately. Excluding its ML stack
    # keeps the desktop build small and prevents it from affecting live exams.
    excludes=[
        'whisperx', 'torch', 'torchaudio', 'torchvision', 'transformers',
        'lightning', 'pytorch_lightning', 'pandas', 'scipy', 'sklearn',
        'nltk', 'numba', 'matplotlib', 'onnxruntime', 'sqlalchemy',
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
    name='IELTS Speaking v0.6.0',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    icon='../frontend/public/icons/app-icon.ico',
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='IELTS Speaking v0.6.0',
)
