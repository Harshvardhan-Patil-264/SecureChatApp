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
  encryptFile,
  decryptFile,
} from "../lib/crypto";
import { API_URL } from "../config";
import CreateUSSModal from './UltraSecureChat/CreateUSSModal';
import PassphraseEntry from './UltraSecureChat/PassphraseEntry';
import SecurityAlert from './UltraSecureChat/SecurityAlert';
import USSChatView from './UltraSecureChat/USSChatView';
import Profile from './Profile';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Settings, LogOut, Search, Plus, MessageSquare, ShieldCheck, ShieldAlert, Lock, MoreVertical, Paperclip, Send, Sun, Moon, User, Check, CheckCheck, UserPlus, Users, Bell, Image, Video, Music, X, Download, FileText } from 'lucide-react';
import Requests from './Requests';
import MediaBubble from './MediaBubble';

export default function Chat({ username, onLogout, theme, toggleTheme }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sessionKey, setSessionKey] = useState(null);

  // Session key cache — avoid recomputing ECDH on every message
  const sessionKeyCache = useRef(new Map());
  const [signingPrivateKey, setSigningPrivateKey] = useState(null);

  const [showUSSModal, setShowUSSModal] = useState(false);
  const [ussSession, setUssSession] = useState(null);
  const [showPassphraseEntry, setShowPassphraseEntry] = useState(false);
  const [showSecurityAlert, setShowSecurityAlert] = useState(false);
  const [ussSessionKey, setUssSessionKey] = useState(null);
  const [inUSSMode, setInUSSMode] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [myName, setMyName] = useState('');
  const [sidebarTab, setSidebarTab] = useState('all'); // 'all' | 'requests' | 'unread'
  const [pendingCount, setPendingCount] = useState(0);
  const [discoverUsers, setDiscoverUsers] = useState([]); // search-discovered users
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const discoverTimeout = useRef(null);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll: instant via container scrollTop — never gets cancelled by re-renders
  const scrollToBottom = (force = false) => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (force || isNearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom(true);
  }, [messages]);

  // Also scroll when container height grows (e.g. image/video finishes loading)
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => scrollToBottom(true));
    observer.observe(el);
    return () => observer.disconnect();
  }, [messagesContainerRef.current]);

  useEffect(() => {
    if (!username) return;

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    ensureSigningKeyPair().then(({ privateKeyJwk }) => {
      importSigningPrivateKey(privateKeyJwk).then(setSigningPrivateKey);
    });

    // Fetch own profile and pending request count
    api.get(`/users/profile/${username}`).then(res => {
      if (res.data?.name) setMyName(res.data.name);
    }).catch(() => { });

    fetch(`${API_URL}/api/requests/pending?username=${encodeURIComponent(username)}`)
      .then(r => r.json())
      .then(d => setPendingCount((d.requests || []).length))
      .catch(() => { });

    socketRef.current = io(API_URL, {
      transports: ['websocket'],
      reconnectionDelay: 500,
      reconnectionDelayMax: 2000,
    });

    socketRef.current.on("connect", () => {
      socketRef.current.emit("register", { username });
    });

    // Real-time: someone sent us a request
    socketRef.current.on('connection_request', ({ sender }) => {
      setPendingCount(prev => prev + 1);
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`New chat request from ${sender}`, {
          body: 'Open SecureChat to accept or decline',
          icon: '/favicon.ico'
        });
      }
    });

    // Real-time: our request was accepted — refresh users list
    socketRef.current.on('request_accepted', () => {
      // Trigger a users refresh by clearing search so new contact appears
      fetch(`${API_URL}/api/users/all?username=${encodeURIComponent(username)}`)
        .then(r => r.json())
        .then(d => {
          const list = Array.isArray(d) ? d : d?.users || [];
          setUsers(list);
        }).catch(() => { });
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

      // Only update messages if this conversation is open
      setUsers((prevUsers) => {
        return prevUsers.map((u) => {
          const isSender = u.username === msg.sender;   // the other person sent to us
          const isReceiver = u.username === msg.receiver; // we sent to them

          if (isSender || isReceiver) {
            let newUnread = u.unreadCount || 0;
            // Only increment unread if WE are the receiver and this chat is not open
            if (isSender && msg.receiver === username && (!selectedUser || selectedUser.username !== u.username)) {
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

      // Desktop notification when we receive a message and chat is in background or different chat is open
      if (msg.receiver === username && (!selectedUser || selectedUser.username !== msg.sender)) {
        document.title = `(New) SecureChat`;
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`New message from ${msg.sender}`, {
            body: '🔒 Encrypted message',
            icon: '/favicon.ico'
          });
        }
      }
    };

    socketRef.current.on("message", handleMessage);

    // When our messages are seen by the other person, update local state
    const handleSeen = ({ sender, receiver }) => {
      if (sender === username) {
        // Our messages to `receiver` were seen
        setMessages(prev => prev.map(m =>
          m.sender === username && m.receiver === receiver ? { ...m, seen: 1 } : m
        ));
      }
    };
    socketRef.current.on('messages_seen', handleSeen);

    return () => {
      socketRef.current.off("message", handleMessage);
      socketRef.current.off('messages_seen', handleSeen);
    };
  }, [selectedUser, sessionKey]);

  useEffect(() => {
    if (!username) return;

    const fetchUsers = async () => {
      try {
        const url = `${API_URL}/api/users/all?username=${encodeURIComponent(username)}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        const usersList = Array.isArray(data) ? data : data?.users || [];

        // Lightweight: no expensive per-user decrypt on every poll.
        // Socket real-time updates handle live state; this is just unread-count sync.
        setUsers(prev => {
          // Only update users that have changed unread counts or a new lastMessage
          const prevMap = new Map(prev.map(u => [u.username, u]));
          return usersList.map(u => {
            const existing = prevMap.get(u.username);
            if (existing) {
              return {
                ...existing,
                unreadCount: u.unreadCount,
                name: u.name ?? existing.name,
                lastMessage: u.lastMessage?.timestamp !== existing.lastMessage?.timestamp
                  ? u.lastMessage : existing.lastMessage
              };
            }
            return { ...u };
          });
        });
      } catch (err) { }
    };

    fetchUsers();
    // 90s fallback poll — real-time socket handles live updates
    const interval = setInterval(fetchUsers, 90000);
    return () => {
      clearInterval(interval);
      document.title = 'SecureChat';
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
          // You might still want to show alert, or wait for button click.
          // Let's wait for button click for locked too, or maybe show an icon.
          // For now, doing nothing automatically is what user requested.
        } else if (session.status === 'ACTIVE') {
          // Removed setShowPassphraseEntry(true)
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

    // Instantly clear unread badge in local state — no reload needed
    setUsers(prev => prev.map(u =>
      u.username === user.username ? { ...u, unreadCount: 0 } : u
    ));

    // Clear tab title if nothing else is unread
    setTimeout(() => {
      setUsers(prev => {
        const remaining = prev.reduce((acc, u) => acc + (u.unreadCount || 0), 0);
        if (remaining === 0) document.title = 'SecureChat';
        return prev;
      });
    }, 0);

    // Mark as seen on the server (fire-and-forget)
    fetch(`${API_URL}/api/messages/seen`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: user.username, receiver: username })
    }).catch(() => { });

    // Force scroll to bottom after messages render
    setTimeout(() => scrollToBottom(true), 80);
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

  // ─── Encrypted media upload ───────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !sessionKey || !selectedUser) return;

    const MAX = 50 * 1024 * 1024;
    if (file.size > MAX) { alert('File too large (max 50 MB)'); return; }

    const allowed = ['image/', 'video/', 'audio/'];
    if (!allowed.some(t => file.type.startsWith(t))) {
      alert('Only image, video, and audio files are supported'); return;
    }

    setMediaUploading(true);
    try {
      // 1. Encrypt file client-side
      const { encryptedBlob } = await encryptFile(sessionKey, file);

      // 2. Upload encrypted blob
      const form = new FormData();
      form.append('file', encryptedBlob, 'encrypted.enc');
      const uploadRes = await fetch(`${API_URL}/api/media/upload`, { method: 'POST', body: form });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const { url } = await uploadRes.json();

      // 3. Pack metadata as the message text (JSON, then encrypt it)
      const meta = JSON.stringify({
        _media: true,
        url,
        mimeType: file.type,
        name: file.name,
        size: file.size,
      });
      const msgNo = Date.now();
      const encryptedContent = await encryptMessage(sessionKey, msgNo, meta);

      // 4. Send via existing messages API
      const res = await fetch(`${API_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: username, receiver: selectedUser.username, message: encryptedContent, msgNo, signature: null }),
      });
      if (!res.ok) throw new Error('Send failed');
      const data = await res.json();

      // 5. Show locally as media bubble immediately
      setMessages(prev => [...prev, {
        ...data,
        content: meta,        // raw JSON — MediaBubble will parse it
        _media: true,
        timestamp: data.timestamp || new Date().toISOString(),
      }]);
    } catch (err) {
      console.error('Media send error', err);
      alert('Failed to send media: ' + err.message);
    }
    setMediaUploading(false);
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
      const displayed = { ...data, content: newMessage.trim(), verified: signature ? true : null, timestamp: data.timestamp || new Date().toISOString() };
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

  // Debounced discover search — fires when user types in search bar
  const handleSearchChange = (q) => {
    setSearchQuery(q);
    clearTimeout(discoverTimeout.current);
    if (!q.trim()) { setDiscoverUsers([]); return; }
    setDiscoverLoading(true);
    discoverTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/users/discover?username=${encodeURIComponent(username)}&q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setDiscoverUsers(data.users || []);
      } catch (e) { }
      setDiscoverLoading(false);
    }, 280);
  };

  const sendRequest = async (toUser) => {
    await fetch(`${API_URL}/api/requests/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: username, receiver: toUser })
    });
    // Optimistically update discover list
    setDiscoverUsers(prev => prev.map(u =>
      u.username === toUser ? { ...u, connectionStatus: 'pending', isSender: true } : u
    ));
  };

  const filteredUsers = users
    .filter((u) => {
      const matchesSearch = u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = sidebarTab === 'unread' ? u.unreadCount > 0 : true;
      return matchesSearch && matchesTab;
    })
    .sort((a, b) => {
      const tA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
      const tB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
      return tB - tA;
    });

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
      {/* LEFT: NAV RAIL + SIDEBAR PANEL */}
      <div className="sidebar-wrapper">
        {/* Vertical Nav Rail */}
        <motion.div
          className="nav-rail"
          initial={{ x: -80 }}
          animate={{ x: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        >
          {/* Brand logo at top */}
          <div className="nav-rail-brand">
            <Shield size={22} color="#3A86FF" strokeWidth={2} />
            {totalUnread > 0 && <span className="nav-unread-dot" />}
          </div>

          {/* Top actions */}
          <div className="nav-rail-top">
            <button className="nav-btn" title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'} onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="nav-btn uss-nav-btn" title="Ultra Secure Room" onClick={() => setShowUSSModal(true)}>
              <ShieldAlert size={20} />
            </button>
            <button
              className={`nav-btn${sidebarTab === 'requests' ? ' nav-btn-active' : ''}`}
              title="Requests"
              onClick={() => setSidebarTab(sidebarTab === 'requests' ? 'all' : 'requests')}
            >
              <Bell size={20} />
              {pendingCount > 0 && <span className="nav-badge">{pendingCount}</span>}
            </button>
            <button
              className={`nav-btn${sidebarTab === 'unread' ? ' nav-btn-active' : ''}`}
              title="Unread"
              onClick={() => setSidebarTab(sidebarTab === 'unread' ? 'all' : 'unread')}
            >
              <MessageSquare size={20} />
              {totalUnread > 0 && <span className="nav-badge">{totalUnread}</span>}
            </button>
          </div>

          {/* Bottom: Profile + Logout */}
          <div className="nav-rail-bottom">
            <button className="nav-btn" title="Logout" onClick={onLogout}>
              <LogOut size={20} />
            </button>
            <button
              className="nav-avatar-btn"
              title="My Profile"
              onClick={() => setShowProfile(true)}
              style={{ backgroundColor: getAvatarColor(username) }}
            >
              {getInitials(myName || username)}
            </button>
          </div>
        </motion.div>

        {/* Main sidebar panel */}
        <motion.div
          className="secure-sidebar"
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          {/* Header */}
          <div className="secure-sidebar-header">
            <div className="secure-brand">
              <div className="secure-brand-text">
                <h2>
                  SecureChat
                  {totalUnread > 0 && <span className="header-unread-badge">{totalUnread}</span>}
                </h2>
                <span>AES-256 Encrypted</span>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="search-container">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Search or find people…"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Tabs */}
          <div className="sidebar-tabs">
            <button className={`sidebar-tab${sidebarTab === 'all' ? ' active' : ''}`} onClick={() => { setSidebarTab('all'); setDiscoverUsers([]); setSearchQuery(''); }}>
              <Users size={14} /> All
            </button>
            <button className={`sidebar-tab${sidebarTab === 'requests' ? ' active' : ''}`} onClick={() => setSidebarTab('requests')}>
              <Bell size={14} /> Requests {pendingCount > 0 && <span className="tab-badge">{pendingCount}</span>}
            </button>
            <button className={`sidebar-tab${sidebarTab === 'unread' ? ' active' : ''}`} onClick={() => setSidebarTab('unread')}>
              <MessageSquare size={14} /> Unread {totalUnread > 0 && <span className="tab-badge">{totalUnread}</span>}
            </button>
          </div>

          {/* Content area */}
          {sidebarTab === 'requests' ? (
            <div className="users-list">
              <Requests
                username={username}
                onAccepted={(sender) => {
                  setPendingCount(prev => Math.max(0, prev - 1));
                  fetch(`${API_URL}/api/users/all?username=${encodeURIComponent(username)}`)
                    .then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : d?.users || [])).catch(() => { });
                }}
              />
            </div>
          ) : (
            <div className="users-list">
              {/* Discover search results */}
              {searchQuery && (
                <div className="discover-section">
                  <div className="discover-label">People</div>
                  {discoverLoading ? (
                    <div className="discover-loading">Searching…</div>
                  ) : discoverUsers.length === 0 ? (
                    <div className="discover-loading">No users found</div>
                  ) : (
                    <AnimatePresence>
                      {discoverUsers.map((u) => {
                        const isConnected = u.connectionStatus === 'accepted';
                        const isPending = u.connectionStatus === 'pending';
                        return (
                          <motion.div
                            key={u.username}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`user-item discover-item${isConnected ? ' connected' : ''}`}
                            onClick={isConnected ? () => openChat({ username: u.username, name: u.name }) : undefined}
                            style={{ cursor: isConnected ? 'pointer' : 'default' }}
                          >
                            <div className="user-avatar-container">
                              <div className="user-avatar" style={{ backgroundColor: getAvatarColor(u.username) }}>
                                {getInitials(u.name || u.username)}
                              </div>
                            </div>
                            <div className="user-info">
                              <div className="user-header">
                                <span className="user-name">{u.name || u.username}</span>
                              </div>
                              <div className="user-preview">
                                <span className="preview-text">@{u.username}</span>
                              </div>
                            </div>
                            <div className="discover-action">
                              {isConnected ? (
                                <span className="conn-badge conn-accepted">✓ Connected</span>
                              ) : isPending && u.isSender ? (
                                <span className="conn-badge conn-pending">Pending</span>
                              ) : isPending && !u.isSender ? (
                                <span className="conn-badge conn-pending">Requested you</span>
                              ) : (
                                <button className="send-req-btn" onClick={(e) => { e.stopPropagation(); sendRequest(u.username); }}>
                                  <UserPlus size={14} /> Add
                                </button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  )}
                </div>
              )}

              {!searchQuery && filteredUsers.length === 0 && (
                <div className="no-chats-hint">
                  <UserPlus size={32} opacity={0.3} />
                  <p>Search for people to start chatting</p>
                </div>
              )}

              <AnimatePresence>
                {filteredUsers.map((u, i) => (
                  <motion.div
                    key={u.username}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`user-item ${selectedUser?.username === u.username ? "active" : ""}`}
                    onClick={() => openChat(u)}
                  >
                    <div className="user-avatar-container">
                      <div className="user-avatar" style={{ backgroundColor: getAvatarColor(u.username) }}>
                        {getInitials(u.name || u.username)}
                      </div>
                      <div className="online-indicator"></div>
                      {u.unreadCount > 0 && <div className="unread-badge">{u.unreadCount}</div>}
                    </div>
                    <div className="user-info">
                      <div className="user-header">
                        <span className="user-name">{u.name || u.username}</span>
                        <span className="message-time">
                          {u.lastMessage?.timestamp ? formatTime(u.lastMessage.timestamp) : ""}
                        </span>
                      </div>
                      <div className="user-preview">
                        <span className="preview-text">{u.lastMessage?.content ? '🔒 Encrypted message' : 'No messages yet'}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>

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
            style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}
          >
            <div className="chat-header">
              <div className="chat-header-user">
                <div className="user-avatar" style={{ backgroundColor: getAvatarColor(selectedUser.username) }}>
                  {getInitials(selectedUser.name || selectedUser.username)}
                </div>
                <div className="chat-header-info">
                  <h3>{selectedUser.name || selectedUser.username}</h3>
                  {selectedUser.name && (
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px' }}>@{selectedUser.username}</div>
                  )}
                  <div className="encryption-status">
                    <Lock size={12} />
                    <span>End-to-end encrypted</span>
                  </div>
                </div>
              </div>
              <div className="chat-header-actions">
                {ussSession && ussSession.status === 'ACTIVE' && (
                  <button
                    className="header-action-btn uss-unlock-btn"
                    title="Unlock Ultra Secure Chat"
                    onClick={async () => {
                      if (showPassphraseEntry) {
                        setShowPassphraseEntry(false);
                      } else {
                        await checkUSSSession(selectedUser);
                        setShowPassphraseEntry(true);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'var(--accent-glow)',
                      color: 'var(--accent-primary)',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      border: '1px solid var(--accent-primary)'
                    }}
                  >
                    <ShieldAlert size={16} /> Unlock Secure Chat
                  </button>
                )}
                <button className="header-action-btn" title="More options">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            <div className="encryption-banner">
              <Lock size={14} />
              <span>Messages are end-to-end encrypted. No one outside of this chat can read them.</span>
            </div>

            <div className="messages-container" ref={messagesContainerRef}>
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`message-wrapper ${msg.sender === username ? "sent" : "received"}`}
                  >
                    <div className="message-bubble">
                      {/* Media message or regular text */}
                      {(() => {
                        const raw = msg.content || msg.message || '';
                        let isMedia = false;
                        try { const p = JSON.parse(raw); if (p._media) isMedia = true; } catch (_) { }
                        return isMedia
                          ? <MediaBubble message={{ ...msg, content: raw }} sessionKey={sessionKey} />
                          : <span className="message-text">{raw}</span>;
                      })()}

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

                      <span className="message-footer">
                        <span className="message-timestamp">{formatTime(msg.timestamp)}</span>
                        {msg.sender === username && (
                          <span className={`msg-ticks ${msg.seen ? 'ticks-seen' : msg.delivered ? 'ticks-delivered' : 'ticks-sent'}`}>
                            {msg.seen || msg.delivered
                              ? <CheckCheck size={14} strokeWidth={2.5} />
                              : <Check size={14} strokeWidth={2.5} />
                            }
                          </span>
                        )}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            <div className="message-input-container">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,audio/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <button
                className="input-action-btn"
                title="Attach image / video / audio (encrypted)"
                onClick={() => fileInputRef.current?.click()}
                disabled={mediaUploading || !sessionKey}
                style={{ position: 'relative' }}
              >
                {mediaUploading
                  ? <span style={{ width: 18, height: 18, border: '2px solid rgba(58,134,255,0.3)', borderTopColor: '#3A86FF', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.75s linear infinite' }} />
                  : <Paperclip size={20} />}
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

            {showPassphraseEntry && ussSession && (
              <PassphraseEntry
                session={ussSession}
                currentUser={username}
                onAccessGranted={handlePassphraseVerified}
                onAccessDenied={handleAccessDenied}
                onCancel={() => setShowPassphraseEntry(false)}
              />
            )}
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

      {showSecurityAlert && ussSession && (
        <SecurityAlert
          session={ussSession}
          onClose={() => {
            setShowSecurityAlert(false);
            setUssSession(null);
          }}
        />
      )}

      {showProfile && (
        <Profile
          username={username}
          onClose={() => setShowProfile(false)}
          onProfileUpdate={(updated) => {
            if (updated.name) setMyName(updated.name);
          }}
        />
      )}
    </div>
  );
}
