import React from 'react';
import { motion } from 'framer-motion';
import { X, ArrowDown } from 'lucide-react';
import './FlowAnalyzerModal.css';

export default function FlowAnalyzerModal({ message, onClose }) {
  if (!message) return null;

  return (
    <div className="flow-modal-overlay">
      <motion.div
        className="flow-modal-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
      >
        <div className="flow-modal-header">
          <h3>Encryption Flow Analyzer</h3>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>

        <div className="flow-modal-content">
          <p className="flow-intro">
            See exactly how this message was transformed from simple text into an encrypted payload, and decrypted on the other side.
          </p>

          <div className="flow-card sender-side">
            <h4>Sender Side</h4>
            
            <div className="flow-step">
              <span className="step-label">1. Original Plaintext</span>
              <div className="code-box">{message.plaintext || message.content}</div>
            </div>
            
            <div className="flow-arrow"><ArrowDown size={16} /></div>
            
            <div className="flow-step">
              <span className="step-label">2. Converted to Morse Code</span>
              <div className="code-box">{message.morseText || 'N/A'}</div>
            </div>

            <div className="flow-arrow"><ArrowDown size={16} /></div>
            
            <div className="flow-step">
              <span className="step-label">3. AES-256-GCM Encrypted Payload</span>
              <div className="code-box encrypted-text">{message.encryptedRaw || 'N/A'}</div>
            </div>
          </div>

          <div className="flow-card receiver-side">
            <h4>Receiver Side</h4>
            
            <div className="flow-step">
              <span className="step-label">4. Received Encrypted Payload</span>
              <div className="code-box encrypted-text">{message.encryptedRaw || 'N/A'}</div>
            </div>
            
            <div className="flow-arrow"><ArrowDown size={16} /></div>
            
            <div className="flow-step">
              <span className="step-label">5. AES-256-GCM Decrypted (Morse Code)</span>
              <div className="code-box">{message.morseText || 'N/A'}</div>
            </div>

            <div className="flow-arrow"><ArrowDown size={16} /></div>
            
            <div className="flow-step">
              <span className="step-label">6. Restored Plaintext</span>
              <div className="code-box restored-text">{message.content}</div>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
