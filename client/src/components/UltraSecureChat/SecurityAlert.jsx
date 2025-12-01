// client/src/components/UltraSecureChat/SecurityAlert.jsx
// Alert component for locked USS sessions

import React from 'react';
import './UltraSecureChat.css';

const SecurityAlert = ({ session, onClose }) => {
    return (
        <div className="uss-security-alert">
            <div className="uss-alert-container">
                <div className="uss-alert-header">
                    <div className="uss-alert-icon">🔒</div>
                    <h2>Session Locked</h2>
                </div>

                <div className="uss-alert-body">
                    <div className="uss-alert-message">
                        <p>
                            This Ultra Secure Chat session has been <strong>permanently locked</strong> due to security concerns.
                        </p>
                    </div>

                    <div className="uss-alert-details">
                        <div className="uss-alert-detail-item">
                            <span className="uss-alert-label">Reason:</span>
                            <span className="uss-alert-value">Brute-force attack detected (3 failed passphrase attempts)</span>
                        </div>
                        <div className="uss-alert-detail-item">
                            <span className="uss-alert-label">Session ID:</span>
                            <span className="uss-alert-value">{session.sessionId}</span>
                        </div>
                        <div className="uss-alert-detail-item">
                            <span className="uss-alert-label">Locked At:</span>
                            <span className="uss-alert-value">
                                {session.lockedAt ? new Date(session.lockedAt).toLocaleString() : 'Recently'}
                            </span>
                        </div>
                    </div>

                    <div className="uss-alert-info-box">
                        <strong>🛡️ Security Measures Activated:</strong>
                        <ul>
                            <li>✓ All messages have been wiped from the server</li>
                            <li>✓ Encrypted backup sent to your email</li>
                            <li>✓ Session permanently locked</li>
                            <li>✓ Decoy mode activated for attacker</li>
                        </ul>
                    </div>

                    <div className="uss-alert-warning-box">
                        <strong>⚠️ What to do next:</strong>
                        <ol>
                            <li>Check your email for the encrypted backup ZIP file</li>
                            <li>Extract the ZIP using your original passphrase</li>
                            <li>Review the messages for any suspicious activity</li>
                            <li>Create a new secure chat with a different passphrase</li>
                            <li>Notify your contact through a secure channel</li>
                        </ol>
                    </div>

                    <div className="uss-alert-backup-info">
                        <div className="uss-backup-icon">📦</div>
                        <div className="uss-backup-text">
                            <strong>Encrypted Backup</strong>
                            <p>A ZIP file containing all your messages has been sent to your email address.</p>
                            <p className="uss-backup-password">
                                <strong>ZIP Password:</strong> Your original passphrase
                            </p>
                        </div>
                    </div>
                </div>

                <div className="uss-alert-footer">
                    <button className="uss-btn-primary" onClick={onClose}>
                        Close
                    </button>
                    <a
                        href="https://securechat.app/security-guide"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="uss-btn-secondary"
                    >
                        📖 Security Guide
                    </a>
                </div>
            </div>
        </div>
    );
};

export default SecurityAlert;
