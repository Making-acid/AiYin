# IELTS Speaking Practice — AI  


## 测试者使用

### 打开方式

双击 `IELTS Speaking.exe` ，等待命令行窗口显示启动信息，浏览器会自动打开。

### 配置 API Key

首次使用需要配置 DeepSeek API Key：

1. 打开页面后点击 **Settings** （首页底部或黄色提示横幅）
2. Provider 选择 **DeepSeek V4 Pro**
3. API Key 填入你的 DeepSeek Key
4. 点击 **Save Configuration**

### 功能说明

| 模式 | 说明 |
|------|------|
| **Exam Mode** | 模拟完整雅思口语考试（Part 1 → Part 2 → Part 3 → 评分报告） |
| **Free Chat** | AI 英语自由对话，不评分、无压力 |

### 语音输入

点击 🎤 按钮开始录音，说完后再次点击停止并发送。  
**需要使用 Chrome 或 Edge 浏览器**（Firefox/Safari 暂不支持语音识别）。

### 关闭

关闭命令行窗口即可停止服务。

---

##   FAQ

**Q: 启动后浏览器没有自动打开？**  
A: 手动打开浏览器访问 `http://localhost:8000`

**Q: 端口被占用？**  
A: 检查是否已有其他程序占用 8000 端口，或重复启动了程序

**Q: AI 不回复？**  
A: 检查 Settings 页面中 API Key 是否已配置、账户余额是否充足

---

##   — 以下为开发者文档 —

---

## 

```
IELTS/
├── frontend/                     # React + Vite + TypeScript
│   └── src/
│       ├── api/client.ts         # API  
│       ├── hooks/                # Web Speech API hooks
│       ├── components/           # VoiceInput, ChatBubble, Timer
│       └── pages/                # Home, Exam, FreeChat, Report, Settings
├── backend/                      # Python FastAPI
│   ├── app/
│   │   ├── main.py               #   +   
│   │   ├── api/                  # exam, chat, config  
│   │   ├── services/
│   │   │   ├── llm_service.py    # OpenAI   (DeepSeek/GPT/Groq/)
│   │   │   ├── scoring_service.py #   +    +  
│   │   │   ├── data_loader.py    #    
│   │   │   └── config_service.py #    
│   │   └── core/config.py        #  
│   └── data/
│       ├── exams.json            #    
│       └── exams/
│           ├── ielts/            #    (prompts +   +  )
│           ├── toefl/            #    ()
│           └── _template/        #    
├── docker-compose.yml
├── start.bat                     # Windows  
└── .env                          #   (API Key)
```

##  

###   (bat )

```
 start.bat
```

- Python 3.9+
- Node.js 18+

###   (Docker)

```
cp .env.example .env       
#   .env   DEEPSEEK_API_KEY
docker compose up --build
```

###  

```bash
#  1 — 
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

#  2 — 
cd frontend
npm install
npm run dev
```

-  : `http://localhost:8000` (API +  )
-  : `http://localhost:5173` (Vite  )

##  

###  

1.  `_template/` → `exams/`
2.  `meta.json`  `prompts/*.txt`  `questions/*.json`  `rubrics/*.json`
3.  `exams.json`  

```json
{ "id": "toefl", "name": "TOEFL Speaking", "language": "en", "parts": [...] }
```

###  Prompt /  

 `backend/data/exams/{}/prompts/*.txt`  `backend/data/exams/{}/questions/*.json`  

Docker   `data/`   volume       exe          

###  

```bash
# 1.  
cd frontend && npm run build

# 2.     
Remove-Item -Recurse -Force backend\static -ErrorAction SilentlyContinue
Copy-Item -Recurse frontend\dist\* backend\static\

# 3.  
cd backend
pyinstaller --onedir --name "IELTS Speaking" --add-data "static;static" run.py

# 4.     
Copy-Item -Recurse data "dist\IELTS Speaking\data"
```

## API 

|  |  |  |
|------|------|------|
| `GET /health` |  | `{"status":"ok"}` |
| `GET /config` |  |   API Key   |
| `POST /config` |  | `{"provider":"deepseek-v4-pro","api_key":"sk-...","model":"deepseek-v4-pro"}` |
| `GET /config/providers` |  | DeepSeek/OpenAI/Groq/... |
| `GET /exam/exams` |  |    |
| `POST /exam/start` |  | `{"exam_id":"ielts"}` |
| `POST /exam/answer` |  | `{"session_id":"...","answer":"..."}` |
| `GET /exam/report/{id}` |  |    |
| `POST /chat/start` |  | `{"exam_id":"ielts","mode":"free_chat"}` |
| `POST /chat/send` |  | `{"session_id":"...","text":"..."}` |

##  

|  |  |
|------|------|
|  | React 19 / Vite 8 / TypeScript 5 / React Router 7 |
|  | FastAPI / Uvicorn / OpenAI SDK |
| LLM | DeepSeek V4 / OpenAI / Groq / OpenRouter / Ollama |
|  | Web Speech API (Chrome/Edge) |
|  | PyInstaller (Windows .exe) |
|  | Docker + Docker Compose |
