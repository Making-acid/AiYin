================================================================================
  Whisper 模型下载指南
================================================================================

每个模型需要从 HuggingFace 下载指定文件，放到对应目录。

国内镜像（推荐）：hf-mirror.com
官方源：huggingface.co

================================================================================

一、9 个模型

  tiny       tiny.en    base       base.en    small
  small.en   medium     medium.en  large-v3

  推荐默认：small（~460MB，精度和速度平衡）

================================================================================

二、每个模型需要哪些文件

  模型 1-8（tiny ~ medium.en）— 各 4 个文件：
    model.bin
    config.json
    tokenizer.json
    vocabulary.txt

  模型 9（large-v3）— 5 个文件：
    model.bin
    config.json
    tokenizer.json
    vocabulary.json             <-- 注意：是 .json 不是 .txt
    preprocessor_config.json     <-- 只有 large-v3 有这个文件

================================================================================

三、下载直链（以 small 为例，把模型名换掉即可）

  https://hf-mirror.com/Systran/faster-whisper-small/resolve/main/model.bin
  https://hf-mirror.com/Systran/faster-whisper-small/resolve/main/config.json
  https://hf-mirror.com/Systran/faster-whisper-small/resolve/main/tokenizer.json
  https://hf-mirror.com/Systran/faster-whisper-small/resolve/main/vocabulary.txt

  模型名替换规则：
    前 8 个：tiny, tiny.en, base, base.en, small, small.en, medium, medium.en
    最后 1 个：large-v3 （注意 vocabulary.json + 多一个 preprocessor_config.json）

================================================================================

四、复制到哪里

  backend\models\whisper\{模型名}\

  例：small 模型
    backend\models\whisper\small\
    ├── model.bin
    ├── config.json
    ├── tokenizer.json
    └── vocabulary.txt

  目录已经建好，所有 9 个模型目录已就位。

================================================================================

五、当前状态

  tiny:        ✓ 已下载 4 文件
  tiny.en:     ✓ 已下载 4 文件
  base:        ✓ 已下载 4 文件
  base.en:     ✓ 已下载 4 文件
  small:       ✓ 已下载 4 文件
  small.en:    ✓ 已下载 4 文件
  medium:      ✓ 已下载 4 文件
  medium.en:   ✓ 已下载 4 文件
  large-v3:    ⚠ 缺 vocabulary.json（需单独下载）

  还差 1 个文件：
    https://hf-mirror.com/Systran/faster-whisper-large-v3/resolve/main/vocabulary.json
    → 放到 backend\models\whisper\large-v3\vocabulary.json

================================================================================

六、Python 包

  还需离线安装 3 个 .whl（pypi.org 搜索下载）：
    ctranslate2-4.8.1-cp39-cp39-win_amd64.whl  (~19MB)
    av-15.1.0-cp39-cp39-win_amd64.whl          (~31MB)
    faster_whisper-1.2.1-py3-none-any.whl      (~1MB)

  放到 backend\ 目录，执行：
    cd backend
    venv\Scripts\pip.exe install *.whl

================================================================================
