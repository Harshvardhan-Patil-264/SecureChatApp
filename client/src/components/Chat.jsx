import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { api } from "../lib/api";
import "./Chat.css";
import {
  ensureKeyPair,
  getSessionKey,
  encryptMessage,
  decryptMessage,
  ensureSigningKeyPair,
  importSigningPrivateKey,
  importSigningPublicKey,
  signMessage,
  verifySignature,
} from "../lib/crypto";
import { API_URL } from "../config";
import CreateUSSModal from './UltraSecureChat/CreateUSSModal';
import PassphraseEntry from './UltraSecureChat/PassphraseEntry';
import SecurityAlert from './UltraSecureChat/SecurityAlert';
import USSChatView from './UltraSecureChat/USSChatView';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Settings, LogOut, Search, Plus, MessageSquare, ShieldCheck, ShieldAlert, Lock, MoreVertical, Paperclip, Send, Sun, Moon } from 'lucide-react';

export default function Chat({ username, onLogout, theme, toggleTheme }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sessionKey, setSessionKey] = useState(null);
  const [signingPrivateKey, setSigningPrivateKey] = useState(null);

  const [showUSSModal, setShowUSSModal] = useState(false);
  const [ussSession, setUssSession] = useState(null);
  const [showPassphraseEntry, setShowPassphraseEntry] = useState(false);
  const [showSecurityAlert, setShowSecurityAlert] = useState(false);
  const [ussSessionKey, setUssSessionKey] = useState(null);
  const [inUSSMode, setInUSSMode] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!username) return;

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    ensureSigningKeyPair().then(({ privateKeyJwk }) => {
      importSigningPrivateKey(privateKeyJwk).then(setSigningPrivateKey);
    });

    socketRef.current = io(API_URL);

    socketRef.current.on("connect", () => {
      socketRef.current.emit("register", { username });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [username]);

  useEffect(() => {
    if (!selectedUser) return;
    setMessages([]);
    setSessionKey(null);

    getSessionKey(username, selectedUser.username).then((key) => {
      setSessionKey(key);
      loadMessages(selectedUser, key);
    });
  }, [selectedUser, username]);

  useEffect(() => {
    if (!socketRef.current) return;

    const handleMessage = async (msg) => {
      if (selectedUser && (msg.sender === selectedUser.username || msg.receiver === selectedUser.username)) {
        const encryptedContent = msg.content || msg.message;

        if (!encryptedContent) return;

        let verified = null;
        if (msg.signature && encryptedContent) {
          try {
            const keyRes = await api.get(`/signatures/${msg.sender}`);
            if (keyRes.data && keyRes.data.publicKey) {
              const senderPublicKeyPem = keyRes.data.publicKey;
              const senderPublicKey = await importSigningPublicKey(senderPublicKeyPem);
              verified = await verifySignature(senderPublicKey, encryptedContent, msg.signature);
            }
          } catch (e) {
            verified = null;
          }
        }

        if (sessionKey && msg.msgNo !== undefined && encryptedContent) {
          try {
            const plain = await decryptMessage(sessionKey, msg.msgNo, encryptedContent);
            msg = { ...msg, content: plain, message: plain, verified };
          } catch (e) {
            msg = { ...msg, content: encryptedContent, message: encryptedContent, verified };
          }
        } else {
          msg = { ...msg, content: encryptedContent, message: encryptedContent, verified };
        }

        setMessages((prev) => [...prev, msg]);
      }

      setUsers((prevUsers) => {
        return prevUsers.map((u) => {
          const isSender = u.username === msg.sender;
          const isReceiver = u.username === msg.receiver;

          if (isSender || isReceiver) {
            let newUnread = u.unreadCount || 0;
            if (isSender && (!selectedUser || selectedUser.username !== u.username)) {
              newUnread += 1;
            }

            return {
              ...u,
              unreadCount: newUnread,
              lastMessage: {
                content: msg.content,
                timestamp: msg.timestamp || new Date(),
                msgNo: msg.msgNo
              },
              preview: (msg.msgNo && !selectedUser) ? "Encrypted message" : msg.content
            };
          }
          return u;
        });
      });
    };

    socketRef.current.on("message", handleMessage);

    return () => {
      socketRef.current.off("message", handleMessage);
    };
  }, [selectedUser, sessionKey]);

  useEffect(() => {
    if (!username) return;

    const fetchUsers = async () => {
      try {
        const url = `${API_URL}/api/users/all?username=${encodeURIComponent(username)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();

        const usersList = Array.isArray(data) ? data : data?.users || [];

        const usersWithDecryptedPreviews = await Promise.all(
          usersList.map(async (u) => {
            let preview = "Encrypted message";
            if (u.lastMessage && u.lastMessage.content && u.lastMessage.msgNo) {
              try {
                const key = await getSessionKey(username, u.username);
                if (key) {
                  preview = await decryptMessage(key, u.lastMessage.msgNo, u.lastMessage.content);
                }
              } catch (e) { }
            } else if (u.lastMessage && u.lastMessage.content) {
              preview = u.lastMessage.content;
            } else {
              preview = "No messages yet";
            }
            return { ...u, preview };
          })
        );

        setUsers(usersWithDecryptedPreviews);

        const totalUnread = usersList.reduce((acc, u) => acc + (u.unreadCount || 0), 0);
        if (totalUnread > 0) {
          document.title = `(${totalUnread}) SecureChat`;
          if (Notification.permission === "granted") {
            new Notification("SecureChat", {
              body: `You have ${totalUnread} unread message${totalUnread > 1 ? 's' : ''}`,
              icon: "/favicon.ico"
            });
          }
        } else {
          document.title = "SecureChat";
        }
      } catch (err) { }
    };

    fetchUsers();
    const interval = setInterval(fetchUsers, 30000);
    return () => {
      clearInterval(interval);
      document.title = "SecureChat";
    };
  }, [username]);

  const checkUSSSession = async (user) => {
    try {
      const response = await fetch(
        `${API_URL}/api/uss/users/${username}/${user.username}?requestingUser=${username}`
      );
      if (response.ok) {
        const session = await response.json();
        setUssSession(session);

        if (session.status === 'LOCKED') {
          setShowSecurityAlert(true);
        } else if (session.status === 'ACTIVE') {
          setShowPassphraseEntry(true);
        }
      } else {
        setUssSession(null);
      }
    } catch (error) {
      setUssSession(null);
    }
  };

  const handleUSSSessionCreated = (sessionId) => {
    if (selectedUser) checkUSSSession(selectedUser);
  };

  const handlePassphraseVerified = (sessionKey) => {
    setUssSessionKey(sessionKey);
    setShowPassphraseEntry(false);
    setInUSSMode(true);
  };

  const handleAccessDenied = () => {
    setShowPassphraseEntry(false);
    setShowSecurityAlert(true);
  };

  const handleExitUSSMode = () => {
    setInUSSMode(false);
    setUssSessionKey(null);
    setUssSession(null);
  };

  const openChat = async (user) => {
    setSelectedUser(user);
    await checkUSSSession(user);
  };

  const loadMessages = async (user, key) => {
    try {
      const res = await fetch(`${API_URL}/api/messages/${username}/${user.username}`);
      if (!res.ok) throw new Error("Failed to load messages");
      const data = await res.json();

      const messagesList = data.messages || data;

      if (key) {
        const decrypted = await Promise.all(
          messagesList.map(async (msg) => {
            const content = msg.message || msg.content;
            if (msg.msgNo !== undefined && content) {
              try {
                const plain = await decryptMessage(key, msg.msgNo, content);
                return { ...msg, message: plain, content: plain };
              } catch (e) {
                return msg;
              }
            }
            return msg;
          })
        );
        setMessages(decrypted);
      } else {
        setMessages(messagesList);
      }
    } catch (err) { }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    if (!sessionKey) return;

    const msgNo = Date.now();
    let encryptedContent;
    try {
      encryptedContent = await encryptMessage(sessionKey, msgNo, newMessage.trim());
    } catch (e) { return; }

    let signature = null;
    if (signingPrivateKey) {
      try {
        signature = await signMessage(signingPrivateKey, encryptedContent);
      } catch (e) { }
    }

    const messageData = {
      sender: username,
      receiver: selectedUser.username,
      message: encryptedContent,
      msgNo,
      signature,
    };

    try {
      const res = await fetch(`${API_URL}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageData),
      });
      if (!res.ok) throw new Error("Failed to send message");
      const data = await res.json();
      const displayed = { ...data, content: newMessage.trim(), verified: signature ? true : null };
      setMessages((prev) => [...prev, displayed]);
      setNewMessage("");
    } catch (err) { }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  const getInitials = (name) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (name) => {
    // Deep Navy theme colors: Teals, Blues, Crypto Greens
    const colors = ["#3A86FF", "#00E676", "#3b82f6", "#06b6d4", "#8b5cf6", "#1C2541"];
    return colors[name.charCodeAt(0) % colors.length];
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = users.reduce((acc, u) => acc + (u.unreadCount || 0), 0);

  if (inUSSMode && ussSession && ussSessionKey && selectedUser) {
    return (
      <USSChatView
        session={ussSession}
        currentUser={username}
        otherUser={selectedUser.username}
        sessionKey={ussSessionKey}
        onExit={handleExitUSSMode}
      />
    );
  }

  return (
    <div className="secure-chat-container">
      {/* LEFT SIDEBAR */}
      <motion.div
        className="secure-sidebar"
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <div className="secure-sidebar-header">
          <div className="secure-brand">
            <div className="secure-brand-icon">
              <Shield size={24} color="#3A86FF" strokeWidth={2} />
            </div>
            <div className="secure-brand-text">
              <h2>
                SecureChat
                {totalUnread > 0 && <span className="header-unread-badge">{totalUnread}</span>}
              </h2>
              <span>AES-256 Encrypted</span>
            </div>
          </div>
          <div className="sidebar-actions">
            <button className="settings-btn theme-toggle-sidebar" title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'} onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="settings-btn uss-btn" title="Create Ultra Secure Chat" onClick={() => setShowUSSModal(true)}>
              <ShieldAlert size={18} />
            </button>
            <button className="settings-btn" title="Logout" onClick={onLogout}>
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <div className="search-container">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search secure chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="users-list">
          <AnimatePresence>
            {filteredUsers.map((u, i) => (
              <motion.div
                key={u.username}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`user-item ${selectedUser?.username === u.username ? "active" : ""}`}
                onClick={() => openChat(u)}
              >
                <div className="user-avatar-container">
                  <div className="user-avatar" style={{ backgroundColor: getAvatarColor(u.username) }}>
                    {getInitials(u.username)}
                  </div>
                  <div className="online-indicator"></div>
                  {u.unreadCount > 0 && <div className="unread-badge">{u.unreadCount}</div>}
                </div>
                <div className="user-info">
                  <div className="user-header">
                    <span className="user-name">{u.username}</span>
                    <span className="message-time">
                      {u.lastMessage?.timestamp ? formatTime(u.lastMessage.timestamp) : ""}
                    </span>
                  </div>
                  <div className="user-preview">
                    <span className="preview-text">{u.preview || "No messages yet"}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <button className="new-chat-btn">
          <Plus size={18} />
          New Secure Chat
        </button>
      </motion.div>

      {/* RIGHT CHAT AREA */}
      <div className="secure-chat-area">
        {!selectedUser ? (
          <motion.div
            className="empty-state"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div
              className="empty-state-icon"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Shield size={64} className="glow-icon" color="#3A86FF" strokeWidth={1.5} />
            </motion.div>
            <h2>SecureChat Workspace</h2>
            <p>Select a conversation to start secure messaging</p>
            <ul className="security-features">
              <li><ShieldCheck size={16} color="#00E676" /> End-to-end encrypted</li>
              <li><Lock size={16} color="#3A86FF" /> Zero-knowledge architecture</li>
            </ul>
          </motion.div>
        ) : (
          <motion.div
            className="chat-workspace-inner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
          >
            <div className="chat-header">
              <div className="chat-header-user">
                <div className="user-avatar" style={{ backgroundColor: getAvatarColor(selectedUser.username) }}>
                  {getInitials(selectedUser.username)}
                </div>
                <div className="chat-header-info">
                  <h3>{selectedUser.username}</h3>
                  <div className="encryption-status">
                    <Lock size={12} />
                    <span>End-to-end encrypted</span>
                  </div>
                </div>
              </div>
              <div className="chat-header-actions">
                <button className="header-action-btn" title="More options">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            <div className="encryption-banner">
              <Lock size={14} />
              <span>Messages are end-to-end encrypted. No one outside of this chat can read them.</span>
            </div>

            <div className="messages-container">
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`message-wrapper ${msg.sender === username ? "sent" : "received"}`}
                  >
                    <div className="message-bubble">
                      <span className="message-text">{msg.message || msg.content}</span>

                      {msg.verified === true && (
                        <span className="verified-badge" title="Message signature verified">
                          <ShieldCheck size={12} /> Verified
                        </span>
                      )}
                      {msg.verified === false && (
                        <span className="unverified-badge" title="Signature verification failed">
                          <ShieldAlert size={12} /> Unverified
                        </span>
                      )}

                      <span className="message-timestamp">{formatTime(msg.timestamp)}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            <div className="message-input-container">
              <button className="input-action-btn" title="Attach file">
                <Paperclip size={20} />
              </button>
              <input
                type="text"
                placeholder="Type an encrypted message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                className="message-input"
              />
              <button className="send-btn" onClick={sendMessage} disabled={!newMessage.trim()}>
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {showUSSModal && (
        <CreateUSSModal
          isOpen={showUSSModal}
          onClose={() => setShowUSSModal(false)}
          users={users}
          currentUser={username}
          onSessionCreated={handleUSSSessionCreated}
        />
      )}

      {showPassphraseEntry && ussSession && (
        <PassphraseEntry
          session={ussSession}
          currentUser={username}
          onAccessGranted={handlePassphraseVerified}
          onAccessDenied={handleAccessDenied}
        />
      )}

      {showSecurityAlert && ussSession && (
        <SecurityAlert
          session={ussSession}
          onClose={() => {
            setShowSecurityAlert(false);
            setUssSession(null);
          }}
        />
      )}
    </div>
  );
}
