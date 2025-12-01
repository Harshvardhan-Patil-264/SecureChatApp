/**
 * services/signatureService.js
 * Handles ECDSA signature verification and public key management
 */

const db = require('../config/db');
const crypto = require('crypto');

/**
 * Store user's ECDSA signing public key
 * @param {string} username - Username
 * @param {string} publicKeyPem - PEM-encoded ECDSA public key
 */
async function storeSigningKey(username, publicKeyPem) {
    await db.query(
        'UPDATE users SET signature_key_public = ? WHERE username = ?',
        [publicKeyPem, username]
    );
}

/**
 * Retrieve user's ECDSA signing public key
 * @param {string} username - Username
 * @returns {Promise<string|null>} PEM-encoded public key or null
 */
async function getSigningKey(username) {
    const [rows] = await db.query(
        'SELECT signature_key_public FROM users WHERE username = ?',
        [username]
    );
    return rows[0]?.signature_key_public || null;
}

/**
 * Verify message signature using sender's public key
 * @param {string} senderUsername - Sender's username
 * @param {string} message - Message content (encrypted)
 * @param {string} signatureBase64 - Base64-encoded signature
 * @returns {Promise<boolean>} True if signature is valid
 */
async function verifyMessageSignature(senderUsername, message, signatureBase64) {
    try {
        // Get sender's public key
        const publicKeyPem = await getSigningKey(senderUsername);
        if (!publicKeyPem) {
            console.warn(`No signing key found for user: ${senderUsername}`);
            return false;
        }

        // Import public key - ECDSA requires specific format
        const publicKey = crypto.createPublicKey({
            key: publicKeyPem,
            format: 'pem',
            type: 'spki'
        });

        // Convert base64 signature to buffer
        const signatureBuffer = Buffer.from(signatureBase64, 'base64');

        // Verify signature using ECDSA with SHA-256
        // Note: Web Crypto API produces IEEE P1363 format, Node.js expects DER format
        // We need to convert or use the raw format
        const verify = crypto.createVerify('SHA256');
        verify.update(message);
        verify.end();

        // Try verification - this might fail due to format mismatch
        // Web Crypto uses raw format (r || s), Node.js crypto expects DER
        let isValid = false;
        try {
            isValid = verify.verify(
                {
                    key: publicKey,
                    dsaEncoding: 'ieee-p1363' // Match Web Crypto API format
                },
                signatureBuffer
            );
        } catch (err) {
            // If ieee-p1363 fails, signature might be in DER format
            console.log('Trying DER format verification');
            const verify2 = crypto.createVerify('SHA256');
            verify2.update(message);
            verify2.end();
            isValid = verify2.verify(publicKey, signatureBuffer);
        }

        return isValid;
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

module.exports = {
    storeSigningKey,
    getSigningKey,
    verifyMessageSignature
};
