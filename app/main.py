from fastapi import FastAPI, Request, Depends, Response
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from datetime import datetime

from .chatbot import Chatbot
from .models import ChatRequest, ChatResponse, ConversationSchema, ConversationListSchema
from .database import init_db, get_db, Conversation, Message

app = FastAPI(title="AI Chatbot FastAPI")
app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")
chatbot = Chatbot()

# Initialize database on startup
init_db()


@app.get("/", response_class=HTMLResponse)
async def get_home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/conversations", response_model=ConversationSchema)
async def create_conversation(db: Session = Depends(get_db)):
    """Create a new conversation."""
    conv = Conversation(title="New chat")
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


@app.get("/conversations", response_model=list[ConversationListSchema])
async def list_conversations(db: Session = Depends(get_db)):
    """Get all conversations (ordered by most recent first)."""
    convs = db.query(Conversation).order_by(Conversation.updated_at.desc()).all()
    return convs


@app.get("/conversations/{conversation_id}", response_model=ConversationSchema)
async def get_conversation(conversation_id: int, db: Session = Depends(get_db)):
    """Get a specific conversation with all its messages."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        conv = Conversation(title="New chat")
        db.add(conv)
        db.commit()
        db.refresh(conv)
    return conv


@app.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(conversation_id: int, db: Session = Depends(get_db)):
    """Delete a conversation and its messages."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conv:
        db.delete(conv)
        db.commit()
    return Response(status_code=204)


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """Send a message and get a response, with database persistence."""
    # Get or create conversation
    if request.conversation_id:
        conv = db.query(Conversation).filter(Conversation.id == request.conversation_id).first()
        if not conv:
            conv = Conversation(title="New chat")
            db.add(conv)
            db.commit()
            db.refresh(conv)
    else:
        conv = Conversation(title="New chat")
        db.add(conv)
        db.commit()
        db.refresh(conv)

    # Save user message
    user_msg = Message(conversation_id=conv.id, role="user", content=request.message)
    db.add(user_msg)
    db.commit()

    # Get bot response
    answer = chatbot.get_response(request.message)

    # Save bot response
    bot_msg = Message(conversation_id=conv.id, role="assistant", content=answer)
    db.add(bot_msg)
    db.commit()

    # Update conversation timestamp
    conv.updated_at = datetime.utcnow()
    db.commit()

    return ChatResponse(message=answer, conversation_id=conv.id)
