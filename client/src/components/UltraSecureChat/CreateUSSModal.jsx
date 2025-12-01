// client/src/components/UltraSecureChat/CreateUSSModal.jsx
// Modal for creating Ultra Secure Chat sessions

import React, { useState, useEffect } from 'react';
import {
    validatePassphraseStrength,
    generateRandomSessionKey,
    encryptSessionKeyWithRSA,
    encryptWithPassphrase,
    hashPassphrase
} from '../../lib/crypto';
import { toast } from 'react-toastify';
import ModalDialog from './ModalDialog';
import { API_URL } from '../../config';
import './UltraSecureChat.css';

const CreateUSSModal = ({ isOpen, onClose, users, currentUser, onSessionCreated }) => {
    const [selectedUser, setSelectedUser] = useState('');
    const [passphrase, setPassphrase] = useState('');
    const [confirmPassphrase, setConfirmPassphrase] = useState('');
    const [strength, setStrength] = useState(null);
    const [errors, setErrors] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [showPassphrase, setShowPassphrase] = useState(false);
    const [dialogState, setDialogState] = useState({ isOpen: false, type: 'info', title: '', message: '' });

    const closeDialog = () => setDialogState({ ...dialogState, isOpen: false });

    // Reset form when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setSelectedUser('');
            setPassphrase('');
            setConfirmPassphrase('');
            setStrength(null);
            setErrors([]);
        }
    }, [isOpen]);

    // Validate passphrase strength in real-time
    useEffect(() => {
        if (passphrase) {
            const result = validatePassphraseStrength(passphrase);
            setStrength(result);
            setErrors(result.errors);
        } else {
            setStrength(null);
            setErrors([]);
        }
    }, [passphrase]);

    const handleCreateSession = async () => {
        // Validation
        if (!selectedUser) {
            setDialogState({ isOpen: true, type: 'warning', title: 'Validation Error', message: 'Please select a user' });
            return;
        }

        if (!passphrase || !confirmPassphrase) {
            setDialogState({ isOpen: true, type: 'warning', title: 'Validation Error', message: 'Please enter and confirm your passphrase' });
            return;
        }

        if (passphrase !== confirmPassphrase) {
            setDialogState({ isOpen: true, type: 'warning', title: 'Validation Error', message: 'Passphrases do not match' });
            return;
        }

        if (!strength || !strength.valid) {
            setDialogState({ isOpen: true, type: 'warning', title: 'Weak Passphrase', message: 'Please create a stronger passphrase' });
            return;
        }

        setIsCreating(true);

        try {
            // 1. Generate random 256-bit session key
            const sessionKey = generateRandomSessionKey();

            // 2. Get both users' RSA public keys
            const currentUserRsaKey = localStorage.getItem('chatapp_public_key_pem');

            if (!currentUserRsaKey) {
                throw new Error('Your RSA key not found. Please logout and login again.');
            }

            // Fetch recipient's RSA public key from database
            const recipientKeyRes = await fetch(`${API_URL}/api/users/${selectedUser}`);
            const recipientData = await recipientKeyRes.json();

            if (!recipientData.rsa_public_key) {
                throw new Error('Recipient RSA public key not found. User may need to login first.');
            }

            // 3. Encrypt session key with both RSA public keys (Layer 2)
            const rsaEncryptedKeyA = await encryptSessionKeyWithRSA(
                sessionKey,
                currentUserRsaKey
            );
            const rsaEncryptedKeyB = await encryptSessionKeyWithRSA(
                sessionKey,
                recipientData.rsa_public_key
            );

            // 4. Generate salt for passphrase derivation
            const salt = crypto.getRandomValues(new Uint8Array(32));

            // Helper: Convert base64 to Uint8Array
            const base64ToBytes = (base64) => {
                const binary = atob(base64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                return bytes;
            };

            // 5. Encrypt RSA-encrypted keys with passphrase (Layer 3)
            // Convert base64 RSA-encrypted keys to bytes first
            const { encrypted: doubleEncryptedKeyA, iv: ivA } = await encryptWithPassphrase(
                base64ToBytes(rsaEncryptedKeyA),
                passphrase,
                salt
            );

            const { encrypted: doubleEncryptedKeyB, iv: ivB } = await encryptWithPassphrase(
                base64ToBytes(rsaEncryptedKeyB),
                passphrase,
                salt
            );

            // 6. Hash passphrase for server verification
            const passphraseHash = await hashPassphrase(passphrase, salt);

            // 7. Get user emails (for now, use username@example.com)
            const userAEmail = `${currentUser}@example.com`;
            const userBEmail = `${selectedUser}@example.com`;

            // 8. Create USS session on server
            const response = await fetch(`${API_URL}/api/uss/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userA: currentUser,
                    userB: selectedUser,
                    userAEmail,
                    userBEmail,
                    doubleEncryptedKeyA,
                    doubleEncryptedKeyB,
                    passphraseHash,
                    salt: arrayBufferToBase64(salt.buffer),
                    ivA,
                    ivB
                })
            });

            const result = await response.json();

            if (result.success) {
                setDialogState({
                    isOpen: true,
                    type: 'success',
                    title: 'Session Created Successfully',
                    message: `✅ Ultra Secure Session created!\nSession ID: ${result.sessionId}\n\n⚠️ IMPORTANT: Share the passphrase with ${selectedUser} securely (in person or encrypted channel).`,
                    onConfirm: () => {
                        closeDialog();
                        onSessionCreated(result.sessionId);
                        onClose();
                    }
                });
            } else {
                throw new Error(result.error || 'Failed to create session');
            }

        } catch (error) {
            console.error('USS creation error:', error);
            setDialogState({ isOpen: true, type: 'error', title: 'Creation Failed', message: error.message });
        } finally {
            setIsCreating(false);
        }
    };

    // Helper function
    const arrayBufferToBase64 = (buffer) => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    };

    if (!isOpen) return null;

    return (
        <div className="uss-modal-overlay" onClick={onClose}>
            <div className="uss-modal" onClick={(e) => e.stopPropagation()}>
                <div className="uss-modal-header">
                    <h2>🔐 Create Ultra Secure Chat</h2>
                    <button className="uss-close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="uss-modal-body">


                    {/* User Selection */}
                    <div className="uss-form-group">
                        <label>Select Recipient</label>
                        <select
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            className="uss-select"
                        >
                            <option value="">Choose a user...</option>
                            {users.filter(u => u.username !== currentUser).map(user => (
                                <option key={user.username} value={user.username}>
                                    {user.username}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Passphrase Input */}
                    <div className="uss-form-group">
                        <label>Secure Passphrase</label>
                        <div className="uss-password-input">
                            <input
                                type={showPassphrase ? 'text' : 'password'}
                                value={passphrase}
                                onChange={(e) => setPassphrase(e.target.value)}
                                placeholder="Enter a strong passphrase..."
                                className="uss-input"
                            />
                            <button
                                className="uss-toggle-visibility"
                                onClick={() => setShowPassphrase(!showPassphrase)}
                            >
                                {showPassphrase ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>

                        {/* Strength Meter */}
                        {strength && (
                            <div className="uss-strength-meter">
                                <div className="uss-strength-bar-container">
                                    <div
                                        className={`uss-strength-bar uss-strength-${strength.strength}`}
                                        style={{ width: `${strength.score}%` }}
                                    ></div>
                                </div>
                                <span className={`uss-strength-label uss-strength-${strength.strength}`}>
                                    {strength.strength.toUpperCase()}
                                </span>
                            </div>
                        )}

                        {/* Requirements */}
                        <div className="uss-requirements">
                            <div className={passphrase.length >= 10 ? 'uss-req-met' : 'uss-req-unmet'}>
                                {passphrase.length >= 10 ? '✓' : '○'} At least 10 characters
                            </div>
                            <div className={/[0-9]/.test(passphrase) ? 'uss-req-met' : 'uss-req-unmet'}>
                                {/[0-9]/.test(passphrase) ? '✓' : '○'} Contains numbers
                            </div>
                            <div className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passphrase) ? 'uss-req-met' : 'uss-req-unmet'}>
                                {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passphrase) ? '✓' : '○'} Contains special characters
                            </div>
                            <div className={/[A-Z]/.test(passphrase) && /[a-z]/.test(passphrase) ? 'uss-req-met' : 'uss-req-unmet'}>
                                {/[A-Z]/.test(passphrase) && /[a-z]/.test(passphrase) ? '✓' : '○'} Mixed case letters
                            </div>
                        </div>
                    </div>

                    {/* Confirm Passphrase */}
                    <div className="uss-form-group">
                        <label>Confirm Passphrase</label>
                        <input
                            type={showPassphrase ? 'text' : 'password'}
                            value={confirmPassphrase}
                            onChange={(e) => setConfirmPassphrase(e.target.value)}
                            placeholder="Re-enter passphrase..."
                            className="uss-input"
                        />
                        {confirmPassphrase && (
                            <div className={passphrase === confirmPassphrase ? 'uss-match-success' : 'uss-match-error'}>
                                {passphrase === confirmPassphrase ? '✓ Passphrases match' : '✗ Passphrases do not match'}
                            </div>
                        )}
                    </div>

                    {/* Warning */}

                </div>

                <div className="uss-modal-footer">
                    <button className="uss-btn-cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="uss-btn-create"
                        onClick={handleCreateSession}
                        disabled={isCreating || !strength?.valid || passphrase !== confirmPassphrase}
                    >
                        {isCreating ? 'Creating...' : '🔐 Create Secure Session'}
                    </button>
                </div>
            </div>

            <ModalDialog
                isOpen={dialogState.isOpen}
                type={dialogState.type}
                title={dialogState.title}
                message={dialogState.message}
                onConfirm={dialogState.onConfirm || closeDialog}
            />
        </div >
    );
};

export default CreateUSSModal;
