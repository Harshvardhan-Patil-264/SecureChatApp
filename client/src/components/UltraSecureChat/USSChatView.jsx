
// client/src/components/UltraSecureChat/USSChatView.jsx
// Dedicated Ultra Secure Chat interface

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import ModalDialog from './ModalDialog';
import USSFlowAnalyzerModal from './USSFlowAnalyzerModal';
import { io } from 'socket.io-client';
import { Check, CheckCheck, ShieldCheck, Activity } from 'lucide-react';
import { encryptMessage, signMessage, decryptMessage, verifySignature, importSigningPublicKey } from '../../lib/crypto';
import { API_URL } from '../../config';
import './UltraSecureChat.css';

const USSChatView = ({ session, currentUser, otherUser, sessionKey, onExit }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [signingPrivateKey, setSigningPrivateKey] = useState(null);
    const [analyzerMsg, setAnalyzerMsg] = useState(null);
    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);
    const [dialogState, setDialogState] = useState({ isOpen: false, type: 'info', title: '', message: '' });

    const closeDialog = () => setDialogState({ ...dialogState, isOpen: false });

    // Load signing key
    useEffect(() => {
        const loadSigningKey = async () => {
            const privateKeyJwk = JSON.parse(localStorage.getItem('chatapp_signing_private_key_jwk'));
            const { importSigningPrivateKey } = await import('../../lib/crypto');
            const key = await importSigningPrivateKey(privateKeyJwk);
            setSigningPrivateKey(key);
        };
        loadSigningKey();
    }, []);

    // Setup Socket.IO
    useEffect(() => {
        // Connect to socket
        console.log('🔌 Connecting to Socket.IO...');
        socketRef.current = io(API_URL, {
            transports: ['websocket'],
            reconnectionDelay: 500,
            reconnectionDelayMax: 2000,
        });

        socketRef.current.on('connect', () => {
            console.log('✅ Socket connected:', socketRef.current.id);
            socketRef.current.emit('register', { username: currentUser });
            console.log('📝 Registered as:', currentUser);
        });

        // Listen for incoming USS messages
        socketRef.current.on('uss_message', async (msg) => {
            console.log('📨 Received USS message via socket:', msg);

            // Only process if it's for this session
            if (msg.uss_session_id === session.sessionId) {
                console.log('✅ Message is for this session');
                
                // Automatically mark as seen if the chat is open
                markMessagesAsSeen();

                try {
                    const plaintext = await decryptMessage(sessionKey, msg.msgNo, msg.content);
                    console.log('🔓 Decrypted message:', plaintext);
                    
                    // Verify signature logic...
                    // (keeping original logic for brevity)
                    let verified = false;
                    if (msg.signature) {
                        const keyRes = await fetch(`${API_URL}/api/signatures/${msg.sender}`);
                        const keyData = await keyRes.json();
                        if (keyData.publicKey) {
                            const senderPublicKey = await importSigningPublicKey(keyData.publicKey);
                            verified = await verifySignature(senderPublicKey, msg.content, msg.signature);
                        }
                    }

                    const decryptedMsg = { ...msg, decryptedContent: plaintext, verified };

                    setMessages(prev => {
                        const exists = prev.find(m => m.id === msg.id);
                        if (exists) return prev;
                        return [...prev, decryptedMsg];
                    });
                } catch (err) {
                    console.error('Failed to decrypt incoming message:', err);
                }
            }
        });

        // Listen for seen status updates
        socketRef.current.on('uss_messages_seen', ({ sender, receiver }) => {
            if (sender === currentUser && receiver === otherUser) {
                setMessages(prev => prev.map(m => 
                    m.sender === currentUser ? { ...m, seen: 1 } : m
                ));
            }
        });

        return () => {
            if (socketRef.current) {
                console.log('🔌 Disconnecting socket...');
                socketRef.current.disconnect();
            }
        };
    }, [session.sessionId, sessionKey, currentUser]);

    // Load messages
    useEffect(() => {
        loadMessages();
    }, [session.sessionId]);

    // Mark as seen when opening
    useEffect(() => {
        if (messages.length > 0) {
            markMessagesAsSeen();
        }
    }, [messages.length]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const markMessagesAsSeen = async () => {
        try {
            await fetch(`${API_URL}/api/uss/messages/seen`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: session.sessionId,
                    sender: otherUser,
                    receiver: currentUser
                })
            });
        } catch (err) { }
    };

    const loadMessages = async () => {
        try {
            const res = await fetch(`${API_URL}/api/uss/messages/session/${session.sessionId}`);
            const data = await res.json();

            // Decrypt messages
            const decrypted = await Promise.all(data.messages.map(async (msg) => {
                try {
                    const plaintext = await decryptMessage(sessionKey, msg.msgNo, msg.content);

                    // Verify signature
                    let verified = false;
                    if (msg.signature) {
                        const keyRes = await fetch(`${API_URL}/api/signatures/${msg.sender}`);
                        const keyData = await keyRes.json();
                        if (keyData.publicKey) {
                            const senderPublicKey = await importSigningPublicKey(keyData.publicKey);
                            verified = await verifySignature(senderPublicKey, msg.content, msg.signature);
                        }
                    }

                    return {
                        ...msg,
                        decryptedContent: plaintext,
                        verified
                    };
                } catch (err) {
                    console.error('Failed to decrypt message:', err);
                    return {
                        ...msg,
                        decryptedContent: '[Decryption failed]',
                        verified: false
                    };
                }
            }));

            setMessages(decrypted);
        } catch (err) {
            console.error('Failed to load messages:', err);
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim() || !signingPrivateKey || !socketRef.current) return;

        setIsSending(true);
        const msgNo = Date.now();
        const messageText = newMessage.trim();

        try {
            // Encrypt with USS session key
            const encrypted = await encryptMessage(sessionKey, msgNo, messageText);

            // Sign
            const signature = await signMessage(signingPrivateKey, encrypted);

            // Save to database first
            const response = await fetch(`${API_URL}/api/uss/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ussSessionId: session.sessionId,
                    sender: currentUser,
                    receiver: otherUser,
                    message: encrypted,
                    msgNo,
                    signature
                })
            });

            const result = await response.json();
            console.log('💾 Database save result:', result);

            if (result.success) {
                // Emit via Socket.IO for real-time delivery
                const messageObj = {
                    id: result.message.id,
                    uss_session_id: session.sessionId,
                    sender: currentUser,
                    receiver: otherUser,
                    content: encrypted,
                    msgNo,
                    signature,
                    verified: result.message.verified,
                    timestamp: result.message.timestamp
                };

                console.log('📤 Emitting USS message via socket:', messageObj);
                socketRef.current.emit('uss_message', messageObj);
                console.log('✅ Message emitted');

                // Add to local state immediately (optimistic update)
                const decryptedMsg = {
                    ...messageObj,
                    decryptedContent: messageText,
                    verified: true
                };

                setMessages(prev => [...prev, decryptedMsg]);
                setNewMessage('');
            }
        } catch (err) {
            console.error('Failed to send message:', err);
            setDialogState({ isOpen: true, type: 'error', title: 'Send Failed', message: 'Failed to send message' });
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="uss-chat-view">
            {/* Premium Header */}
            <div className="uss-chat-header">
                <div className="uss-chat-header-left">
                    <div className="uss-shield-icon">🛡️</div>
                    <div className="uss-chat-header-info">
                        <h2>Ultra Secure Chat</h2>
                        <div className="uss-chat-participant">
                            <span className="uss-lock-badge">🔐</span>
                            <span>{otherUser}</span>
                        </div>
                    </div>
                </div>
                <div className="uss-chat-header-right">
                    <div className="uss-security-badge">
                        <div className="uss-security-dot"></div>
                        <span>Triple-Layer Encrypted</span>
                    </div>
                    <button className="uss-exit-btn" onClick={onExit} title="Exit Secure Chat">
                        ✕
                    </button>
                </div>
            </div>

            {/* Security Banner */}
            <div className="uss-security-banner">
                <div className="uss-banner-item">
                    <span className="uss-banner-icon">🔒</span>
                    <span>AES-256-GCM</span>
                </div>
                <div className="uss-banner-item">
                    <span className="uss-banner-icon">🔑</span>
                    <span>RSA-2048</span>
                </div>
                <div className="uss-banner-item">
                    <span className="uss-banner-icon">🛡️</span>
                    <span>PBKDF2-SHA512</span>
                </div>
                <div className="uss-banner-item">
                    <span className="uss-banner-icon">⚡</span>
                    <span>Session #{session.sessionId}</span>
                </div>
            </div>

            {/* Messages Area */}
            <div className="uss-messages-area">
                {messages.length === 0 ? (
                    <div className="uss-empty-state">
                        <div className="uss-empty-icon">🔐</div>
                        <h3>Ultra Secure Chat Initialized</h3>
                        <p>All messages in this session are protected with triple-layer encryption</p>
                        <div className="uss-empty-features">
                            <div className="uss-feature-item">✓ Zero-knowledge architecture</div>
                            <div className="uss-feature-item">✓ Auto-wipe on breach</div>
                            <div className="uss-feature-item">✓ Encrypted backups</div>
                        </div>
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`uss-message ${msg.sender === currentUser ? 'uss-message-sent' : 'uss-message-received'}`}
                        >
                            <div className="uss-message-content">
                                <div className="uss-message-text">{msg.decryptedContent}</div>
                                <div className="uss-message-meta">
                                    {/* Flow Analyzer button */}
                                    <button
                                        onClick={() => setAnalyzerMsg({
                                            plaintext: msg.decryptedContent,
                                            content: msg.decryptedContent,
                                            encryptedRaw: msg.content,
                                            signature: msg.signature,
                                            verified: msg.verified,
                                            morseText: null // computed inside USSFlowAnalyzerModal
                                        })}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center', opacity: 0.55, color: 'inherit' }}
                                        title="Analyze Encryption Flow"
                                    >
                                        <Activity size={11} />
                                    </button>
                                    <span className="uss-message-time">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {msg.sender === currentUser && (
                                        <span className={`uss-msg-ticks ${msg.seen ? 'ticks-seen' : msg.delivered ? 'ticks-delivered' : 'ticks-sent'}`}>
                                            {msg.seen || msg.delivered
                                                ? <CheckCheck size={14} strokeWidth={2.5} />
                                                : <Check size={14} strokeWidth={2.5} />
                                            }
                                        </span>
                                    )}
                                    {msg.verified && (
                                        <span className="uss-verified-badge" title="Signature verified">
                                            <ShieldCheck size={11} />
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="uss-input-area">
                <div className="uss-input-container">
                    <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your secure message..."
                        className="uss-message-input"
                        rows="1"
                        disabled={isSending}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isSending || !newMessage.trim()}
                        className="uss-send-btn"
                    >
                        {isSending ? (
                            <span className="uss-spinner"></span>
                        ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24">
                                <path
                                    d="M2 21l21-9L2 3v7l15 2-15 2v7z"
                                    fill="currentColor"
                                />
                            </svg>
                        )}
                    </button>
                </div>
                <div className="uss-input-footer">
                    <span className="uss-encryption-indicator">
                        🔐 End-to-end encrypted with passphrase protection
                    </span>
                </div>
            </div>
            <ModalDialog
                isOpen={dialogState.isOpen}
                type={dialogState.type}
                title={dialogState.title}
                message={dialogState.message}
                onConfirm={dialogState.onConfirm || closeDialog}
            />
            {analyzerMsg && (
                <USSFlowAnalyzerModal
                    message={analyzerMsg}
                    onClose={() => setAnalyzerMsg(null)}
                />
            )}
        </div>
    );
};

export default USSChatView;
