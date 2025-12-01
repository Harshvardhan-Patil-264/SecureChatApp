import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { api } from "../lib/api";
import "./Chat.css";
import {
  ensureKeyPair,
  importPublicKeyFromPem,
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

export default function Chat({ username, onLogout }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  // Holds the derived session key (Uint8Array) for the current chat
  const [sessionKey, setSessionKey] = useState(null);
  // Holds the signing private key for this user
  const [signingPrivateKey, setSigningPrivateKey] = useState(null);

  // Ultra Secure Chat states
  const [showUSSModal, setShowUSSModal] = useState(false);
  const [ussSession, setUssSession] = useState(null);
  const [showPassphraseEntry, setShowPassphraseEntry] = useState(false);
  const [showSecurityAlert, setShowSecurityAlert] = useState(false);
  const [ussSessionKey, setUssSessionKey] = useState(null);
  const [inUSSMode, setInUSSMode] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Socket.IO and request notification permission
  useEffect(() => {
    if (!username) return;

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Load signing private key
    ensureSigningKeyPair().then(({ privateKeyJwk }) => {
      importSigningPrivateKey(privateKeyJwk).then(setSigningPrivateKey);
    });

    // Initialize Socket.IO
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

  // Derive a deterministic session key whenever a chat partner is selected
  // Derive a deterministic session key whenever a chat partner is selected
  useEffect(() => {
    if (!selectedUser) return;
    setMessages([]); // Clear previous messages
    setSessionKey(null); // Reset session key

    getSessionKey(username, selectedUser.username).then((key) => {
      setSessionKey(key);
      loadMessages(selectedUser, key);
    });
  }, [selectedUser, username]);

  // Listen for messages
  useEffect(() => {
    if (!socketRef.current) return;

    const handleMessage = async (msg) => {
      // 1. If chat is open with this user, add to messages list
      if (selectedUser && (msg.sender === selectedUser.username || msg.receiver === selectedUser.username)) {
        // Get the encrypted content (backend sends as 'content', socket might send as 'message')
        const encryptedContent = msg.content || msg.message;

        if (!encryptedContent) {
          console.error('No message content found:', msg);
          return;
        }

        // Verify signature if present (optional for backward compatibility)
        let verified = null; // null = no signature, true = valid, false = invalid
        if (msg.signature && encryptedContent) {
          try {
            // Fetch sender's signing public key
            const keyRes = await api.get(`/signatures/${msg.sender}`);
            if (keyRes.data && keyRes.data.publicKey) {
              const senderPublicKeyPem = keyRes.data.publicKey;
              const senderPublicKey = await importSigningPublicKey(senderPublicKeyPem);

              // Verify signature against encrypted content
              verified = await verifySignature(senderPublicKey, encryptedContent, msg.signature);
              console.log(`Signature verification for ${msg.sender}: ${verified ? '✓ VALID' : '✗ INVALID'}`);
            } else {
              console.log(`No signing key found for ${msg.sender}, skipping verification`);
            }
          } catch (e) {
            // If 404 or other error, just skip verification (backward compatibility)
            console.log(`Signature verification skipped for ${msg.sender}:`, e.message);
            verified = null;
          }
        }

        // Decrypt incoming payload if we have the session key
        if (sessionKey && msg.msgNo !== undefined && encryptedContent) {
          try {
            const plain = await decryptMessage(sessionKey, msg.msgNo, encryptedContent);
            msg = { ...msg, content: plain, message: plain, verified };
          } catch (e) {
            console.error('Decryption failed for incoming message', e);
            // Keep original encrypted content if decryption fails
            msg = { ...msg, content: encryptedContent, message: encryptedContent, verified };
          }
        } else {
          msg = { ...msg, content: encryptedContent, message: encryptedContent, verified };
        }

        setMessages((prev) => [...prev, msg]);
      }

      // 2. Update the users list (last message preview & unread count)
      setUsers((prevUsers) => {
        return prevUsers.map((u) => {
          // If the message is from this user (or to this user, if we sent it from another device?)
          // Usually we care about incoming messages from 'msg.sender' updating 'msg.sender' row in our list.
          // Or if we sent a message, we update 'msg.receiver' row.

          const isSender = u.username === msg.sender;
          const isReceiver = u.username === msg.receiver;

          if (isSender || isReceiver) {
            // Calculate new unread count
            // If we are the receiver and the message is from 'u', and we are NOT currently chatting with 'u', increment unread.
            let newUnread = u.unreadCount || 0;
            if (isSender && (!selectedUser || selectedUser.username !== u.username)) {
              newUnread += 1;
            }

            // For preview, we use the decrypted content if available (msg.content was updated above if decrypted)
            // But wait, if we didn't decrypt it above (because not selected), we might need to decrypt it here?
            // We can't easily decrypt here without the session key for *that* user.
            // If it's the selected user, 'msg.content' is already decrypted.
            // If not, it's encrypted. We might show "Encrypted message" or try to decrypt if we have the key cached.
            // For simplicity, if it's encrypted, show "Encrypted message".

            let previewText = msg.content;
            // If it looks like ciphertext (base64) and we haven't decrypted it...
            // Actually, let's just show "New Message" or the content if it's plain.
            // If we are the sender, we know the content (it's in msg.content, which might be encrypted if we received it from our own send? No, socket.on('message') is usually incoming).

            return {
              ...u,
              unreadCount: newUnread,
              lastMessage: {
                content: msg.content,
                timestamp: msg.timestamp || new Date(),
                msgNo: msg.msgNo
              },
              preview: (msg.msgNo && !selectedUser) ? "Encrypted message" : msg.content // Simplified preview update
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

  // Fetch all users and handle unread notifications
  useEffect(() => {
    if (!username) return;

    const fetchUsers = async () => {
      try {
        const url = `${API_URL}/api/users/all?username=${encodeURIComponent(username)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();

        const usersList = Array.isArray(data) ? data : data?.users || [];
        // usersList items: { username, unreadCount, lastMessage: { content, timestamp, msgNo } }

        // Decrypt last messages for preview
        const usersWithDecryptedPreviews = await Promise.all(
          usersList.map(async (u) => {
            let preview = "Encrypted message";
            if (u.lastMessage && u.lastMessage.content && u.lastMessage.msgNo) {
              try {
                // We need the session key for this specific user to decrypt the preview
                // This is expensive if we do it for everyone every time, but necessary for the preview
                const key = await getSessionKey(username, u.username);
                if (key) {
                  preview = await decryptMessage(key, u.lastMessage.msgNo, u.lastMessage.content);
                }
              } catch (e) {
                // console.warn("Failed to decrypt preview for", u.username);
              }
            } else if (u.lastMessage && u.lastMessage.content) {
              // Fallback if msgNo is missing (old messages) or plain text
              preview = u.lastMessage.content;
            } else {
              preview = "No messages yet";
            }

            return { ...u, preview };
          })
        );

        setUsers(usersWithDecryptedPreviews);

        // Update browser tab title with unread count (WhatsApp style)
        const totalUnread = usersList.reduce((acc, u) => acc + (u.unreadCount || 0), 0);
        if (totalUnread > 0) {
          document.title = `(${totalUnread}) SecureChat`;
          // Optional: Show browser notification for first load
          if (Notification.permission === "granted") {
            new Notification("SecureChat", {
              body: `You have ${totalUnread} unread message${totalUnread > 1 ? 's' : ''}`,
              icon: "/favicon.ico"
            });
          }
        } else {
          document.title = "SecureChat";
        }
      } catch (err) {
        console.error("Users fetch failed", err);
      }
    };

    fetchUsers();

    // Poll for updates every 30 seconds (simple "comes online" check)
    const interval = setInterval(fetchUsers, 30000);
    return () => {
      clearInterval(interval);
      document.title = "SecureChat"; // Reset title on unmount
    };
  }, [username]);

  // USC Helper Functions
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
      console.log('No USS session found');
      setUssSession(null);
    }
  };

  const handleUSSSessionCreated = (sessionId) => {
    console.log('USS Session created:', sessionId);
    if (selectedUser) {
      checkUSSSession(selectedUser);
    }
  };

  const handlePassphraseVerified = (sessionKey) => {
    console.log('Passphrase verified, session key obtained');
    setUssSessionKey(sessionKey);
    setShowPassphraseEntry(false);
    setInUSSMode(true); // Enter USS mode
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

  // Open chat with user
  const openChat = async (user) => {
    setSelectedUser(user);
    await checkUSSSession(user);
  };

  // Load messages
  // Load messages
  const loadMessages = async (user, key) => {
    try {
      const res = await fetch(`${API_URL}/api/messages/${username}/${user.username}`);
      if (!res.ok) throw new Error("Failed to load messages");
      const data = await res.json();

      // Handle new response format
      const messagesList = data.messages || data;

      // Decrypt each message if we have the session key
      if (key) {
        const decrypted = await Promise.all(
          messagesList.map(async (msg) => {
            // Note: backend returns content as 'message', and msg_no as 'msgNo'
            // We need to check both fields.
            const content = msg.message || msg.content;
            if (msg.msgNo !== undefined && content) {
              try {
                const plain = await decryptMessage(key, msg.msgNo, content);
                return { ...msg, message: plain, content: plain };
              } catch (e) {
                // console.warn('Decryption failed', e);
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
    } catch (err) {
      console.error("Messages fetch failed", err);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    if (!sessionKey) {
      console.warn('Session key not ready – cannot encrypt message');
      return;
    }

    const msgNo = Date.now(); // simple monotonic identifier for HMAC derivation
    let encryptedContent;
    try {
      encryptedContent = await encryptMessage(sessionKey, msgNo, newMessage.trim());
    } catch (e) {
      console.error('Encryption failed', e);
      return;
    }

    // Sign the encrypted message (optional if signing key not available)
    let signature = null;
    if (signingPrivateKey) {
      try {
        signature = await signMessage(signingPrivateKey, encryptedContent);
      } catch (e) {
        console.error('Signing failed', e);
        // Continue without signature for backward compatibility
      }
    } else {
      console.log('Signing key not available, sending without signature');
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
      // Decrypt locally for immediate UI update (we already have plaintext)
      const displayed = { ...data, content: newMessage.trim(), verified: signature ? true : null };
      setMessages((prev) => [...prev, displayed]);
      setNewMessage("");
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  // Generate avatar initials
  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate avatar color based on username
  const getAvatarColor = (name) => {
    const colors = [
      "#14ff9d",
      "#256eff",
      "#ff6b9d",
      "#ffd93d",
      "#6bcf7f",
      "#9d7ff5",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  // Filter users based on search
  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate total unread messages
  const totalUnread = users.reduce((acc, u) => acc + (u.unreadCount || 0), 0);

  // If in USS mode, show dedicated USS chat view
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
      <div className="secure-sidebar">
        <div className="secure-sidebar-header">
          <div className="secure-brand">
            <div className="secure-brand-icon">
              <svg width="24" height="24" viewBox="0 0 36 36">
                <path
                  d="M18 30c5.523 0 10-4.477 10-10V9l-10-3-10 3v11c0 5.523 4.477 10 10 10Z"
                  stroke="#00c676"
                  strokeWidth="1.4"
                  fill="none"
                />
                <path
                  d="M13.5 18l3.333 3.333L22.5 15.5"
                  stroke="#14ff9d"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="secure-brand-text">
              <h2>
                SecureChat
                {totalUnread > 0 && (
                  <span className="header-unread-badge">{totalUnread}</span>
                )}
              </h2>
              <span>Encrypted</span>
            </div>
          </div>
          <div className="sidebar-actions" style={{ display: 'flex', gap: '8px' }}>
            <button
              className="settings-btn"
              title="Create Ultra Secure Chat"
              onClick={() => setShowUSSModal(true)}
              style={{
                background: 'linear-gradient(135deg, #00d4ff, #00ff88)',
                border: 'none'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  d="M7 11V8a5 5 0 0110 0v3m-9 0h8a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2v-6a2 2 0 012-2Z"
                  stroke="#0a0a0a"
                  strokeWidth="1.5"
                  fill="none"
                />
              </svg>
            </button>
            <button className="settings-btn" title="Logout" onClick={onLogout}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="search-container">
          <svg width="16" height="16" viewBox="0 0 24 24" className="search-icon">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search secure chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="users-list">
          {filteredUsers.map((u) => (
            <div
              key={u.username}
              className={`user-item ${selectedUser?.username === u.username ? "active" : ""}`}
              onClick={() => openChat(u)}
            >
              <div className="user-avatar-container">
                <div
                  className="user-avatar"
                  style={{ backgroundColor: getAvatarColor(u.username) }}
                >
                  {getInitials(u.username)}
                </div>
                <div className="online-indicator"></div>
                {u.unreadCount > 0 && (
                  <div className="unread-badge">{u.unreadCount}</div>
                )}
              </div>
              <div className="user-info">
                <div className="user-header">
                  <span className="user-name">{u.username}</span>
                  <span className="message-time">
                    {u.lastMessage?.timestamp ? formatTime(u.lastMessage.timestamp) : ""}
                  </span>
                </div>
                <div className="user-preview">
                  <span className="preview-text">
                    {u.preview || "No messages yet"}
                  </span>
                  {/* <span className="encryption-badge">E2E</span> */}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button className="new-chat-btn">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New Secure Chat
        </button>
      </div>

      {/* RIGHT CHAT AREA */}
      <div className="secure-chat-area">
        {!selectedUser ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="80" height="80" viewBox="0 0 36 36">
                <defs>
                  <linearGradient id="shieldGrad" x1="27%" y1="0%" x2="73%" y2="100%">
                    <stop offset="0%" stopColor="#14ff9d" />
                    <stop offset="100%" stopColor="#00c566" />
                  </linearGradient>
                </defs>
                <path
                  d="M18 33c6.627 0 12-5.373 12-12V7.5L18 3 6 7.5V21c0 6.627 5.373 12 12 12Z"
                  fill="url(#shieldGrad)"
                  opacity="0.2"
                />
                <path
                  d="M18 30c5.523 0 10-4.477 10-10V9l-10-3-10 3v11c0 5.523 4.477 10 10 10Z"
                  stroke="#00c676"
                  strokeWidth="1.4"
                  fill="none"
                />
                <path
                  d="M13.5 18l3.333 3.333L22.5 15.5"
                  stroke="#14ff9d"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2>SecureChat</h2>
            <p>Select a conversation to start secure messaging</p>
            <ul className="security-features">
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path d="M9 11l3 3L22 4" stroke="#14ff9d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
                End-to-end encrypted
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path d="M9 11l3 3L22 4" stroke="#ff9d14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
                Self-destructing messages
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path d="M9 11l3 3L22 4" stroke="#256eff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
                Zero-knowledge architecture
              </li>
            </ul>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <div className="chat-header-user">
                <div
                  className="user-avatar"
                  style={{ backgroundColor: getAvatarColor(selectedUser.username) }}
                >
                  {getInitials(selectedUser.username)}
                </div>
                <div className="chat-header-info">
                  <h3>{selectedUser.username}</h3>
                  <div className="encryption-status">
                    <svg width="12" height="12" viewBox="0 0 24 24">
                      <path
                        d="M7 11V8a5 5 0 0110 0v3m-9 0h8a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2v-6a2 2 0 012-2Z"
                        stroke="#14ff9d"
                        strokeWidth="1.4"
                        fill="none"
                      />
                    </svg>
                    <span>End-to-end encrypted</span>
                  </div>
                </div>
              </div>
              <div className="chat-header-actions">
                <button className="header-action-btn" title="More options">
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <circle cx="12" cy="5" r="1.5" fill="currentColor" />
                    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                    <circle cx="12" cy="19" r="1.5" fill="currentColor" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="encryption-banner">
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path
                  d="M7 11V8a5 5 0 0110 0v3m-9 0h8a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2v-6a2 2 0 012-2Z"
                  stroke="#14ff9d"
                  strokeWidth="1.4"
                  fill="none"
                />
              </svg>
              <span>Messages are end-to-end encrypted. No one can read them.</span>
            </div>

            <div className="messages-container">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`message-wrapper ${msg.sender === username ? "sent" : "received"}`}
                >
                  <div className="message-bubble">
                    <span className="message-text">{msg.message || msg.content}</span>
                    {msg.verified === true && (
                      <span className="verified-badge" title="Message signature verified">
                        <svg width="12" height="12" viewBox="0 0 24 24">
                          <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </svg>
                        Verified
                      </span>
                    )}
                    {msg.verified === false && (
                      <span className="unverified-badge" title="Signature verification failed - message may be tampered">
                        <svg width="12" height="12" viewBox="0 0 24 24">
                          <path d="M12 9v4m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </svg>
                        Unverified
                      </span>
                    )}
                    <span className="message-timestamp">{formatTime(msg.timestamp)}</span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="message-input-container">
              <button className="input-action-btn" title="Attach file">
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
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
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </button>
            </div>

            <div className="encryption-footer">
              <svg width="12" height="12" viewBox="0 0 24 24">
                <path
                  d="M7 11V8a5 5 0 0110 0v3m-9 0h8a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2v-6a2 2 0 012-2Z"
                  stroke="#6b7280"
                  strokeWidth="1.4"
                  fill="none"
                />
              </svg>
              <span>All messages are encrypted with 256-bit AES encryption</span>
            </div>
          </>
        )}
      </div>

      {/* Ultra Secure Chat Modals */}
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
