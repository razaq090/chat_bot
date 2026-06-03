// Frontend with server-side conversation storage
const ta = document.querySelector('.msg-input');
const sendBtn = document.querySelector('.send-btn');
const msgs = document.querySelector('#messages');
const newChatBtn = document.querySelector('.new-chat-btn');
const sidebar = document.querySelector('.sidebar');

let currentConversationId = null;

function autoSize(el) { 
  el.style.height = 'auto'; 
  el.style.height = Math.min(el.scrollHeight, 100) + 'px'; 
}
ta.addEventListener('input', () => autoSize(ta));

function createUserNode(text) {
  const node = document.createElement('div'); 
  node.className = 'msg user'; 
  node.style.animationDelay = '0s';
  const avatar = document.createElement('div'); 
  avatar.className='msg-avatar user'; 
  avatar.textContent='AR';
  const bubble = document.createElement('div'); 
  bubble.className='bubble user'; 
  bubble.textContent = text;
  node.appendChild(avatar); 
  node.appendChild(bubble); 
  return node;
}

function createBotNode(htmlContent) {
  const node = document.createElement('div'); 
  node.className = 'msg'; 
  node.style.animationDelay = '0.1s';
  const avatar = document.createElement('div'); 
  avatar.className='msg-avatar ai'; 
  avatar.innerHTML = '<i class="ti ti-robot" aria-hidden="true"></i>';
  const bubble = document.createElement('div'); 
  bubble.className='bubble ai'; 
  bubble.innerHTML = htmlContent;
  node.appendChild(avatar); 
  node.appendChild(bubble); 
  return node;
}

function createTypingNode() {
  const node = document.createElement('div'); 
  node.className = 'msg'; 
  node.style.animationDelay = '0.3s';
  const avatar = document.createElement('div'); 
  avatar.className='msg-avatar ai'; 
  avatar.innerHTML = '<i class="ti ti-robot" aria-hidden="true"></i>';
  const bubble = document.createElement('div'); 
  bubble.className='bubble ai';
  bubble.innerHTML = '<div class="typing-bar"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>';
  node.appendChild(avatar); 
  node.appendChild(bubble); 
  return node;
}

async function sendMessage(prompt) {
  const userNode = createUserNode(prompt); 
  msgs.appendChild(userNode); 
  msgs.scrollTop = msgs.scrollHeight;
  const typingNode = createTypingNode(); 
  msgs.appendChild(typingNode); 
  msgs.scrollTop = msgs.scrollHeight;
  try {
    const res = await fetch('/chat', { 
      method: 'POST', 
      headers: {'Content-Type':'application/json'}, 
      body: JSON.stringify({ message: prompt, conversation_id: currentConversationId }) 
    });
    if (!res.ok) throw new Error(`Server ${res.status}`);
    const data = await res.json();
    typingNode.remove();
    currentConversationId = data.conversation_id;
    const botNode = createBotNode(escapeHtml(data.message || ''));
    msgs.appendChild(botNode); 
    msgs.scrollTop = msgs.scrollHeight;
  } catch(err) {
    typingNode.remove();
    const botNode = createBotNode('<span style="color:#f87171;">Error: ' + escapeHtml(err.message) + '</span>');
    msgs.appendChild(botNode); 
    msgs.scrollTop = msgs.scrollHeight;
  }
}

function escapeHtml(str) { 
  if(!str) return ''; 
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); 
}

ta.addEventListener('keydown', e => { 
  if (e.key === 'Enter' && !e.shiftKey) { 
    e.preventDefault(); 
    const v = ta.value.trim(); 
    if (v) { sendMessage(v); ta.value=''; autoSize(ta); } 
  } 
});

sendBtn.addEventListener('click', () => { 
  const v = ta.value.trim(); 
  if (v) { sendMessage(v); ta.value=''; autoSize(ta); } 
});

if (newChatBtn) {
  newChatBtn.addEventListener('click', async () => {
    try {
      const res = await fetch('/conversations', { method: 'POST', headers: {'Content-Type':'application/json'} });
      if (!res.ok) throw new Error(`Failed to create conversation`);
      const conv = await res.json();
      currentConversationId = conv.id;
      
      document.querySelectorAll('.chat-item.active').forEach(n => n.classList.remove('active'));
      
      const item = document.createElement('div');
      item.className = 'chat-item active';
      item.textContent = 'New chat';
      item.dataset.conversationId = conv.id;
      
      const close = document.createElement('button');
      close.className = 'close';
      close.type = 'button';
      close.textContent = '×';
      item.appendChild(close);
      
      const sidebarTop = sidebar.querySelector('.sidebar-top');
      if (sidebarTop && sidebarTop.nextSibling) {
        sidebar.insertBefore(item, sidebarTop.nextSibling);
      } else {
        sidebar.appendChild(item);
      }
      
      msgs.innerHTML = '';
      ta.value = '';
      ta.focus();
    } catch(err) {
      console.error('Error creating conversation:', err);
    }
  });
}

if (sidebar) {
  sidebar.addEventListener('click', async (e) => {
    const btn = e.target.closest('.close');
    if (!btn) return;
    const item = btn.closest('.chat-item');
    if (!item) return;
    const conversationId = item.dataset.conversationId;
    const wasActive = item.classList.contains('active');
    try {
      await deleteConversation(conversationId);
    } catch (err) {
      console.error('Error deleting conversation:', err);
      return;
    }
    item.remove();
    if (wasActive) {
      msgs.innerHTML = '';
      const first = sidebar.querySelector('.chat-item');
      if (first) {
        first.classList.add('active');
        currentConversationId = first.dataset.conversationId;
        loadConversation(currentConversationId);
      } else {
        await loadConversations();
      }
    }
  });
  
  sidebar.addEventListener('click', (e) => {
    const item = e.target.closest('.chat-item');
    if (!item) return;
    if (e.target.closest('.close')) return;
    
    document.querySelectorAll('.chat-item.active').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    currentConversationId = item.dataset.conversationId;
    loadConversation(currentConversationId);
  });
}

function ensureCloseButtons() {
  document.querySelectorAll('.chat-item').forEach((item, idx) => {
    if (!item.querySelector('.close')) {
      const b = document.createElement('button');
      b.className = 'close'; 
      b.type = 'button'; 
      b.textContent = '×';
      item.appendChild(b);
    }
    if (!item.dataset.conversationId) {
      item.dataset.conversationId = idx;
    }
  });
}

async function deleteConversation(convId) {
  const res = await fetch(`/conversations/${convId}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to delete conversation ${convId}`);
  }
}

async function loadConversation(convId) {
  try {
    const res = await fetch(`/conversations/${convId}`);
    if (!res.ok) throw new Error('Failed to load conversation');
    const conv = await res.json();
    msgs.innerHTML = '';
    if (conv.messages && conv.messages.length > 0) {
      conv.messages.forEach(msg => {
        if (msg.role === 'user') {
          msgs.appendChild(createUserNode(msg.content));
        } else {
          msgs.appendChild(createBotNode(escapeHtml(msg.content)));
        }
      });
    }
    msgs.scrollTop = msgs.scrollHeight;
  } catch(err) {
    console.error('Error loading conversation:', err);
    msgs.innerHTML = '';
  }
}

async function loadConversations() {
  try {
    const res = await fetch('/conversations');
    if (!res.ok) throw new Error(`Failed to load conversations: ${res.status}`);
    const convs = await res.json();
    
    // Remove all existing chat items
    document.querySelectorAll('.chat-item').forEach(item => {
      item.remove();
    });
    
    if (convs && convs.length > 0) {
      const sidebarTop = sidebar.querySelector('.sidebar-top');
      let insertPoint = sidebarTop ? sidebarTop.nextSibling : sidebar.firstChild;
      
      convs.forEach((conv, idx) => {
        const item = document.createElement('div');
        item.className = 'chat-item';
        if (idx === 0) item.classList.add('active');
        item.textContent = conv.title;
        item.dataset.conversationId = conv.id;
        
        const close = document.createElement('button');
        close.className = 'close'; 
        close.type = 'button'; 
        close.textContent = '×';
        item.appendChild(close);
        
        sidebar.insertBefore(item, insertPoint);
        
        if (idx === 0) {
          currentConversationId = conv.id;
          loadConversation(conv.id);
        }
      });
    } else {
      // No conversations, create one
      const res = await fetch('/conversations', { method: 'POST' });
      if (res.ok) {
        const conv = await res.json();
        currentConversationId = conv.id;
        loadConversations();
      } else {
        console.error('Failed to create initial conversation');
      }
    }
  } catch(err) {
    console.error('Error loading conversations:', err);
    msgs.innerHTML = '<div style="padding: 20px; color: #f87171;">Failed to load conversations. Check console for details.</div>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadConversations();
});
