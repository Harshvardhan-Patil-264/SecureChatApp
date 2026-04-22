import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, Sparkles, Bot } from 'lucide-react';
import { API_URL } from '../config';
import './AIAssistant.css';

const SUGGESTIONS = [
  '🔐 How does encryption work here?',
  '💬 What is Ultra Secure Chat?',
  '⏱️ How do ephemeral messages work?',
  '👨‍💻 Who built SecureChatApp?',
];

const AI_INTRO = {
  role: 'assistant',
  content: "Hi! I'm CipherAI ⚡ — your AI assistant built into SecureChatApp, developed by Harsh Patil.\n\nI know everything about this app — encryption, features, how it all works. Or ask me anything general. What's up?",
};

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([AI_INTRO]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  /* Listen for global 'open-ai-panel' custom event — fired by nav buttons */
  useEffect(() => {
    const openHandler = () => setOpen(true);
    // Close AI panel when user opens a chat (mobile UX)
    const closeHandler = () => setOpen(false);

    window.addEventListener('open-ai-panel', openHandler);
    window.addEventListener('chat-selected', closeHandler);
    return () => {
      window.removeEventListener('open-ai-panel', openHandler);
      window.removeEventListener('chat-selected', closeHandler);
    };
  }, []);

  /* Auto-scroll whenever messages change */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /* Focus input when panel opens */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  /* Scroll to bottom when mobile keyboard opens/closes (visualViewport resize) */
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      // Small delay so layout reflow completes before scrolling
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, [open]);

  const sendMessage = useCallback(async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;

    setInput('');
    setError('');
    const userMsg = { role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      /* Build history excluding the AI_INTRO greeting */
      const history = [...messages.slice(1), userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => setMessages([AI_INTRO]);

  return (
    <>
      {/* FAB hidden — CipherAI is accessible via the nav rail (desktop) and mobile header (mobile) */}

      {/* Panel overlay */}
      {open && (
        <div className="ai-panel-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="ai-panel" role="dialog" aria-label="AI Assistant">
            {/* Header */}
            <div className="ai-panel-header">
              <div className="ai-panel-title">
                  <div className="ai-panel-icon"><Bot size={20} color="#fff" /></div>
                  <div>
                    <div className="ai-panel-name">CipherAI</div>
                    <div className="ai-panel-subtitle">by Harsh Patil · Powered by Groq</div>
                  </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="ai-panel-close"
                  onClick={clearChat}
                  title="Clear conversation"
                  style={{ fontSize: 11, width: 'auto', padding: '0 8px', gap: 4, display: 'flex' }}
                >
                  <Sparkles size={12} /> New
                </button>
                <button className="ai-panel-close" onClick={() => setOpen(false)} title="Close">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="ai-messages" id="ai-messages-container">
              {messages.length === 1 && (
                <div className="ai-welcome">
                  <div className="ai-welcome-icon"><Bot size={48} color="var(--accent-primary)" /></div>
                  <h3>CipherAI</h3>
                  <p>Built into SecureChatApp by Harsh Patil. I know this app inside-out — ask me about features, encryption, or anything else.</p>
                  <div className="ai-suggestions">
                    {SUGGESTIONS.map(s => (
                      <button
                        key={s}
                        className="ai-suggestion-chip"
                        onClick={() => sendMessage(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`ai-bubble-row ${msg.role === 'user' ? 'user-row' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="ai-avatar"><Bot size={16} color="#fff" /></div>
                  )}
                  <div className={`ai-bubble ${msg.role === 'assistant' ? 'assistant-bubble' : 'user-bubble'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="ai-bubble-row">
                  <div className="ai-avatar"><Bot size={16} color="#fff" /></div>
                  <div className="ai-bubble assistant-bubble">
                    <div className="ai-typing">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              )}

              {error && <div className="ai-error">{error}</div>}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="ai-input-area">
              <textarea
                ref={inputRef}
                id="ai-chat-input"
                className="ai-input"
                placeholder="Ask anything…"
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  // Auto-grow
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
                onFocus={() => {
                  // When keyboard pops up on mobile, scroll last message into view
                  setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }, 320);
                }}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                id="ai-send-btn"
                className="ai-send-btn"
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                title="Send message"
              >
                <Send size={16} />
              </button>
            </div>

            <div className="ai-footer">⚡ CipherAI by Harsh Patil · Groq · Llama 3.3 70B</div>
          </div>
        </div>
      )}
    </>
  );
}
