/**
 * services/zipService.js
 * Create encrypted ZIP backups for Ultra Secure Chat
 */

const archiver = require('archiver');
const crypto = require('crypto');

/**
 * Create encrypted ZIP file with messages
 * @param {Array} messages - Array of message objects
 * @param {number} sessionId - Session ID
 * @param {string} passphrase - Passphrase for ZIP encryption
 * @returns {Promise<Buffer>} ZIP file buffer
 */
async function createEncryptedZip(messages, sessionId, passphrase) {
    return new Promise((resolve, reject) => {
        const archive = archiver('zip-encrypted', {
            zlib: { level: 9 }, // Maximum compression
            encryptionMethod: 'aes256',
            password: passphrase
        });

        const buffers = [];

        archive.on('data', (chunk) => buffers.push(chunk));
        archive.on('end', () => resolve(Buffer.concat(buffers)));
        archive.on('error', reject);

        // Add messages.json
        const messagesJson = JSON.stringify(messages, null, 2);
        archive.append(messagesJson, { name: 'messages.json' });

        // Add metadata.json
        const metadata = {
            sessionId,
            exportDate: new Date().toISOString(),
            totalMessages: messages.length,
            exportReason: 'Security lockdown - brute-force detected',
            userA: messages[0]?.sender || 'unknown',
            userB: messages[0]?.receiver || 'unknown'
        };
        archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

        // Add README.txt
        const readme = `
Ultra Secure Chat Backup
========================

This ZIP contains your encrypted chat messages.

Session ID: ${sessionId}
Export Date: ${new Date().toISOString()}
Total Messages: ${messages.length}

IMPORTANT:
- This ZIP is encrypted with AES-256
- Password: Your original passphrase
- Keep this backup secure
- Do not share the passphrase

For security questions: security@securechat.app

Files included:
- messages.json: All your messages in JSON format
- metadata.json: Session information
- README.txt: This file
        `.trim();
        archive.append(readme, { name: 'README.txt' });

        archive.finalize();
    });
}

/**
 * Create unencrypted ZIP (for testing or when passphrase unavailable)
 * @param {Array} messages - Array of message objects
 * @param {number} sessionId - Session ID
 * @returns {Promise<Buffer>} ZIP file buffer
 */
async function createUnencryptedZip(messages, sessionId) {
    return new Promise((resolve, reject) => {
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        const buffers = [];

        archive.on('data', (chunk) => buffers.push(chunk));
        archive.on('end', () => resolve(Buffer.concat(buffers)));
        archive.on('error', reject);

        // Add messages.json
        archive.append(JSON.stringify(messages, null, 2), { name: 'messages.json' });

        // Add metadata
        const metadata = {
            sessionId,
            exportDate: new Date().toISOString(),
            totalMessages: messages.length,
            note: 'This is an unencrypted backup. Keep secure.'
        };
        archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

        archive.finalize();
    });
}

module.exports = {
    createEncryptedZip,
    createUnencryptedZip
};
