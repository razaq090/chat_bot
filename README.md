# AI Chatbot FastAPI

A small FastAPI project scaffold with a simple frontend for chatting with a local AI chatbot stub.

## Project structure

- `app/main.py` - FastAPI application entrypoint
- `app/chatbot.py` - chatbot logic implementation
- `app/models.py` - request and response Pydantic models
- `app/utils.py` - utility helpers and environment helpers
- `static/style.css` - frontend styles
- `static/script.js` - frontend chat client logic
- `templates/index.html` - HTML page for the chat UI
- `.env` - environment variables
- `requirements.txt` - Python dependencies

## Quickstart

1. Create and activate a virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install dependencies:

```powershell
pip install -r requirements.txt
```

3. Run the app:

```powershell
uvicorn app.main:app --reload
```

4. Open http://127.0.0.1:8000 in your browser.
