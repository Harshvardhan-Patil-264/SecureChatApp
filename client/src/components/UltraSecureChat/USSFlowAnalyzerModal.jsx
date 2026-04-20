// client/src/components/UltraSecureChat/USSFlowAnalyzerModal.jsx
// Encryption Flow Analyzer for Ultra Secure Chat — shows all 4 layers

import React, { useMemo } from 'react';
import { X, ArrowDown, Lock, Key, Shield, Zap } from 'lucide-react';
import { toMorse } from '../../lib/morse';
import './UltraSecureChat.css';
import '../FlowAnalyzerModal.css';

export default function USSFlowAnalyzerModal({ message, onClose }) {
  if (!message) return null;

  const morseText = useMemo(() => {
    try { return toMorse(message.plaintext || ''); }
    catch { return 'N/A'; }
  }, [message.plaintext]);

  const truncate = (s, n = 80) => s && s.length > n ? s.slice(0, n) + '…' : s;

  return (
    <div className="flow-modal-overlay" onClick={onClose}>
      <div
        className="flow-modal-container uss-flow-modal"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flow-modal-header">
          <h3>
            <Shield size={16} style={{ marginRight: 8, color: '#FF6B6B', verticalAlign: 'middle' }} />
            USS Encryption Flow Analyzer
          </h3>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>

        <div className="flow-modal-content">
          <p className="flow-intro">
            Every USS message is wrapped in <strong>4 distinct security layers</strong> before transmission.
            Regular chat uses 2 layers. Ultra Secure Chat adds PBKDF2-SHA512 + RSA-2048 on top.
          </p>

          {/* SENDER SIDE */}
          <div className="flow-card sender-side">
            <h4>🔐 Sender: 4-Layer Encryption</h4>

            <div className="flow-step">
              <span className="step-label">① Original Plaintext</span>
              <div className="code-box">{message.plaintext}</div>
            </div>
            <div className="flow-arrow"><ArrowDown size={16} /></div>

            <div className="flow-step">
              <span className="step-label">② Converted to Morse Code (obfuscation layer)</span>
              <div className="code-box" style={{ color: '#f59e0b', fontSize: '0.8rem' }}>
                {truncate(morseText)}
              </div>
            </div>
            <div className="flow-arrow"><ArrowDown size={16} /></div>

            <div className="flow-step">
              <span className="step-label">
                <Key size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                ③ AES-256-GCM Encrypted with Session Key (Layer 1)
              </span>
              <div className="code-box encrypted-text" style={{ fontSize: '0.78rem' }}>
                {truncate(message.encryptedRaw, 100)}
              </div>
            </div>
            <div className="flow-arrow"><ArrowDown size={16} /></div>

            <div className="flow-step">
              <span className="step-label">
                <Lock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                ④ Session Key wrapped with RSA-2048 (Layer 2)
              </span>
              <div className="code-box" style={{ color: '#a78bfa', fontSize: '0.78rem' }}>
                RSA-OAEP/SHA-256 encrypted session key — only recipient's private key can unwrap
              </div>
            </div>
            <div className="flow-arrow"><ArrowDown size={16} /></div>

            <div className="flow-step">
              <span className="step-label">
                <Shield size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                ⑤ RSA key further locked with PBKDF2-SHA512 passphrase (Layer 3)
              </span>
              <div className="code-box" style={{ color: '#f43f5e', fontSize: '0.78rem' }}>
                310,000 iterations · shared passphrase known only to session participants
              </div>
            </div>
            <div className="flow-arrow"><ArrowDown size={16} /></div>

            <div className="flow-step">
              <span className="step-label">
                <Zap size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                ⑥ Signed with ECDSA P-256 (Authenticity Proof)
              </span>
              <div className="code-box" style={{ color: '#34d399', fontSize: '0.78rem' }}>
                {message.signature ? truncate(message.signature, 80) : 'Signature attached to payload'}
              </div>
            </div>
          </div>

          {/* RECEIVER SIDE */}
          <div className="flow-card receiver-side">
            <h4>🔓 Receiver: 4-Layer Decryption</h4>

            <div className="flow-step">
              <span className="step-label">① Verify ECDSA Signature</span>
              <div className="code-box" style={{ color: '#34d399' }}>
                {message.verified ? '✓ VALID — message is authentic and untampered' : '⚠ Signature not checked in this view'}
              </div>
            </div>
            <div className="flow-arrow"><ArrowDown size={16} /></div>

            <div className="flow-step">
              <span className="step-label">② Unlock session key with PBKDF2-SHA512 passphrase</span>
              <div className="code-box" style={{ color: '#a78bfa' }}>
                Passphrase + 32-byte salt → 310k PBKDF2 iterations → AES key to unwrap RSA block
              </div>
            </div>
            <div className="flow-arrow"><ArrowDown size={16} /></div>

            <div className="flow-step">
              <span className="step-label">③ Decrypt RSA-2048 wrapper with private key</span>
              <div className="code-box" style={{ color: '#60a5fa' }}>
                RSA-OAEP/SHA-256 → recovers the 256-bit AES session key
              </div>
            </div>
            <div className="flow-arrow"><ArrowDown size={16} /></div>

            <div className="flow-step">
              <span className="step-label">④ AES-256-GCM Decrypted → Morse → Plaintext</span>
              <div className="code-box" style={{ color: '#f59e0b', fontSize: '0.8rem', marginBottom: 8 }}>
                {truncate(morseText)}
              </div>
              <div className="code-box restored-text">
                {message.plaintext}
              </div>
            </div>
          </div>

          {/* Comparison panel */}
          <div className="flow-card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,107,107,0.2)' }}>
            <h4 style={{ color: '#FF6B6B' }}>🔍 Regular Chat vs Ultra Secure Chat</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
              <div>
                <p style={{ color: '#3A86FF', fontWeight: 700, marginBottom: 6 }}>Regular Chat (2 Layers)</p>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Text → Morse → AES-256-GCM → Signed
                </p>
              </div>
              <div>
                <p style={{ color: '#FF6B6B', fontWeight: 700, marginBottom: 6 }}>Ultra Secure Chat (4 Layers)</p>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Text → Morse → AES-256-GCM → RSA-2048 → PBKDF2-SHA512 → Signed
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
