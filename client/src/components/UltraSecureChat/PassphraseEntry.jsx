// client/src/components/UltraSecureChat/PassphraseEntry.jsx
// Passphrase verification screen for accessing Ultra Secure Chat

import React, { useState, useEffect } from 'react';
import { decryptWithPassphrase, decryptSessionKeyWithRSA } from '../../lib/crypto';
import { toast } from 'react-toastify';
import ModalDialog from './ModalDialog';
import { API_URL } from '../../config';
import './UltraSecureChat.css';

const PassphraseEntry = ({ session, currentUser, onAccessGranted, onAccessDenied }) => {
    const [passphrase, setPassphrase] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [showPassphrase, setShowPassphrase] = useState(false);
    const [attemptsRemaining, setAttemptsRemaining] = useState(3);
    const [dialogState, setDialogState] = useState({ isOpen: false, type: 'info', title: '', message: '' });

    const closeDialog = () => setDialogState({ ...dialogState, isOpen: false });

    useEffect(() => {
        if (session) {
            setAttemptsRemaining(Math.max(0, 3 - session.wrongAttempts));
        }
    }, [session]);

    const handleVerify = async () => {
        if (!passphrase) {
            setDialogState({ isOpen: true, type: 'warning', title: 'Input Required', message: 'Please enter the passphrase' });
            return;
        }

        setIsVerifying(true);

        try {
            // 1. Try to decrypt the double-encrypted session key
            const salt = base64ToUint8Array(session.salt);
            const iv = session.iv;
            const doubleEncryptedKey = session.doubleEncryptedKey;

            // 2. Decrypt with passphrase (Layer 3)
            const rsaEncryptedKeyBytes = await decryptWithPassphrase(
                doubleEncryptedKey,
                iv,
                passphrase,
                salt
            );

            // 3. Convert to base64 for RSA decryption
            const rsaEncryptedKey = arrayBufferToBase64(rsaEncryptedKeyBytes.buffer);

            // 4. Decrypt with RSA private key (Layer 2)
            const privateKeyJwk = JSON.parse(localStorage.getItem('chatapp_private_key_jwk'));
            const sessionKey = await decryptSessionKeyWithRSA(rsaEncryptedKey, privateKeyJwk);

            // 5. Notify server of successful verification
            await fetch(`${API_URL}/api/uss/${session.sessionId}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ success: true })
            });

            // 6. Grant access
            onAccessGranted(sessionKey);

        } catch (error) {
            console.error('Passphrase verification failed:', error);

            // Notify server of failed attempt
            try {
                const response = await fetch(`${API_URL}/api/uss/${session.sessionId}/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ success: false })
                });

                const result = await response.json();

                if (result.locked) {
                    setDialogState({
                        isOpen: true,
                        type: 'lockdown',
                        title: 'SESSION LOCKED',
                        message: 'Session locked due to too many failed attempts.\n\nThe chat has been wiped and an encrypted backup has been sent to your email.',
                        onConfirm: () => {
                            closeDialog();
                            onAccessDenied();
                        }
                    });
                } else {
                    setAttemptsRemaining(result.attemptsRemaining);
                    setDialogState({
                        isOpen: true,
                        type: 'error',
                        title: 'Access Denied',
                        message: `❌ Incorrect passphrase.\n\n${result.attemptsRemaining} attempt${result.attemptsRemaining !== 1 ? 's' : ''} remaining.`
                    });
                }
            } catch (serverError) {
                console.error('Server verification error:', serverError);
                setDialogState({ isOpen: true, type: 'error', title: 'Verification Error', message: '❌ Incorrect passphrase.' });
            }

            setPassphrase('');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !isVerifying) {
            handleVerify();
        }
    };

    // Helper functions
    const base64ToUint8Array = (base64) => {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    };

    const arrayBufferToBase64 = (buffer) => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    };

    return (
        <div className="uss-passphrase-entry">
            <div className="uss-passphrase-container">
                <div className="uss-passphrase-header">
                    <div className="uss-lock-icon">🔐</div>
                    <h2>Ultra Secure Chat</h2>
                    <p className="uss-session-info">
                        Session with <strong>{session.userA === currentUser ? session.userB : session.userA}</strong>
                    </p>
                </div>

                <div className="uss-passphrase-body">
                    {/* Attempts Counter */}
                    <div className={`uss-attempts-counter ${attemptsRemaining <= 1 ? 'uss-attempts-critical' : ''}`}>
                        <div className="uss-attempts-label">Attempts Remaining</div>
                        <div className="uss-attempts-value">{attemptsRemaining} / 3</div>
                        {attemptsRemaining <= 1 && (
                            <div className="uss-attempts-warning">
                                ⚠️ Last attempt! Chat will be locked and wiped after this.
                            </div>
                        )}
                    </div>

                    {/* Passphrase Input */}
                    <div className="uss-form-group">
                        <label>Enter Passphrase</label>
                        <div className="uss-password-input">
                            <input
                                type={showPassphrase ? 'text' : 'password'}
                                value={passphrase}
                                onChange={(e) => setPassphrase(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Enter your secure passphrase..."
                                className="uss-input uss-input-large"
                                autoFocus
                                disabled={isVerifying}
                            />
                            <button
                                className="uss-toggle-visibility"
                                onClick={() => setShowPassphrase(!showPassphrase)}
                            >
                                {showPassphrase ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                    </div>

                    {/* Info Box */}


                    {/* Warning for low attempts */}

                </div>

                <div className="uss-passphrase-footer">
                    <button
                        className="uss-btn-verify"
                        onClick={handleVerify}
                        disabled={isVerifying || !passphrase}
                    >
                        {isVerifying ? (
                            <>
                                <span className="uss-spinner"></span>
                                Verifying...
                            </>
                        ) : (
                            <>🔓 Unlock Session</>
                        )}
                    </button>
                </div>

                {/* Session Details */}
                <div className="uss-session-details">
                    <div className="uss-detail-item">
                        <span className="uss-detail-label">Session ID:</span>
                        <span className="uss-detail-value">{session.sessionId}</span>
                    </div>
                    <div className="uss-detail-item">
                        <span className="uss-detail-label">Created:</span>
                        <span className="uss-detail-value">
                            {new Date(session.createdAt).toLocaleString()}
                        </span>
                    </div>
                    <div className="uss-detail-item">
                        <span className="uss-detail-label">Status:</span>
                        <span className="uss-detail-value uss-status-active">
                            🟢 {session.status}
                        </span>
                    </div>
                </div>
            </div>

            <ModalDialog
                isOpen={dialogState.isOpen}
                type={dialogState.type}
                title={dialogState.title}
                message={dialogState.message}
                onConfirm={dialogState.onConfirm || closeDialog}
            />
        </div>
    );
};

export default PassphraseEntry;
