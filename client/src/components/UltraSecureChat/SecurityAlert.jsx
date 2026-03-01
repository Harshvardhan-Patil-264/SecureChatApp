// client/src/components/UltraSecureChat/SecurityAlert.jsx
// Alert component for locked USS sessions

import React from 'react';
import './UltraSecureChat.css';

const SecurityAlert = ({ session, onClose }) => {
    return (
        <div className="uss-security-alert" onClick={onClose}>
            <div className="uss-alert-container" onClick={(e) => e.stopPropagation()}>
                <div className="uss-alert-header">
                    <button className="uss-close-btn" style={{ position: 'absolute', top: '20px', right: '20px' }} onClick={onClose}>✕</button>
                    <div className="uss-alert-icon">🔒</div>
                    <h2>Session Locked</h2>
                </div>

                <div className="uss-alert-body">
                    <div className="uss-alert-message">
                        <p>This session has been <strong>permanently locked</strong> after 3 failed passphrase attempts.</p>
                    </div>

                    <div className="uss-alert-details">
                        <div className="uss-alert-detail-item">
                            <span className="uss-alert-label">Session ID</span>
                            <span className="uss-alert-value">{session.sessionId}</span>
                        </div>
                        <div className="uss-alert-detail-item">
                            <span className="uss-alert-label">Locked At</span>
                            <span className="uss-alert-value">
                                {session.lockedAt ? new Date(session.lockedAt).toLocaleString() : 'Recently'}
                            </span>
                        </div>
                        <div className="uss-alert-detail-item">
                            <span className="uss-alert-label">Action Taken</span>
                            <span className="uss-alert-value" style={{ color: 'var(--accent-success)' }}>Messages wiped • Backup emailed</span>
                        </div>
                    </div>

                    <div className="uss-alert-info-box" style={{ marginTop: '16px' }}>
                        <strong>📦 Encrypted backup sent to your email</strong>
                        <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                            Unzip using your original passphrase. Create a new secure session to continue chatting.
                        </p>
                    </div>
                </div>

                <div className="uss-alert-footer">
                    <button className="uss-btn-primary" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SecurityAlert;
