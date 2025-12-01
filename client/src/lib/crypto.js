// client/src/lib/crypto.js
// Utility functions for end-to-end encryption in the chat app.
// Uses Web Crypto API (available in modern browsers).

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

// ---------------------------------------------------------------------------
// 1️⃣ Key pair handling (RSA-OAEP, 2048-bit)
// ---------------------------------------------------------------------------
export async function ensureKeyPair() {
    // Check if keys are already stored in localStorage.
    const storedPub = localStorage.getItem('chatapp_public_key_pem');
    const storedPriv = localStorage.getItem('chatapp_private_key_jwk');
    if (storedPub && storedPriv) {
        return { publicKeyPem: storedPub, privateKeyJwk: JSON.parse(storedPriv) };
    }
    // Generate a fresh RSA-OAEP key pair.
    const keyPair = await crypto.subtle.generateKey(
        {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256'
        },
        true,
        ['encrypt', 'decrypt']
    );
    // Export public key as PEM for sending to the server.
    const spki = await crypto.subtle.exportKey('spki', keyPair.publicKey);
    const publicPem = spkiToPem(new Uint8Array(spki));
    // Export private key as JWK for local storage.
    const privateJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
    localStorage.setItem('chatapp_public_key_pem', publicPem);
    localStorage.setItem('chatapp_private_key_jwk', JSON.stringify(privateJwk));
    return { publicKeyPem: publicPem, privateKeyJwk: privateJwk };
}

export async function importPublicKeyFromPem(pem) {
    const b64 = pem.replace('-----BEGIN PUBLIC KEY-----', '')
        .replace('-----END PUBLIC KEY-----', '')
        .replace(/\s+/g, '');
    const der = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
    return await crypto.subtle.importKey('spki', der, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['encrypt']);
}

export async function importPrivateKeyFromJwk(jwk) {
    return await crypto.subtle.importKey('jwk', jwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
}

// ---------------------------------------------------------------------------
// 2️⃣ Session key derivation (deterministic, based on both usernames)
// ---------------------------------------------------------------------------
export async function getSessionKey(userA, userB) {
    // Create a deterministic 256-bit key from the two usernames (order-independent).
    const sorted = [userA, userB].sort().join(':');
    const hashBuf = await crypto.subtle.digest('SHA-256', TEXT_ENCODER.encode(sorted));
    return new Uint8Array(hashBuf); // 32-byte raw key material
}

// ---------------------------------------------------------------------------
// 3️⃣ Per-message key derivation (HMAC-SHA-256) and AES-GCM helpers
// ---------------------------------------------------------------------------
export async function deriveMessageKey(sessionKeyRaw, msgNo) {
    // HMAC-SHA-256 over the message number (as string) using the session key.
    const msgNoBytes = TEXT_ENCODER.encode(String(msgNo));
    const hmacKey = await crypto.subtle.importKey(
        'raw',
        sessionKeyRaw,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', hmacKey, msgNoBytes);
    // Use the first 32 bytes as an AES-GCM key.
    const aesKey = await crypto.subtle.importKey(
        'raw',
        signature.slice(0, 32),
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
    return aesKey;
}

export async function encryptMessage(sessionKeyRaw, msgNo, plaintext) {
    const aesKey = await deriveMessageKey(sessionKeyRaw, msgNo);
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
    const data = TEXT_ENCODER.encode(plaintext);
    const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, data);
    // Concatenate IV + ciphertext and base64-encode for transport.
    const combined = new Uint8Array(iv.length + cipherBuf.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(cipherBuf), iv.length);
    return arrayBufferToBase64(combined.buffer);
}

export async function decryptMessage(sessionKeyRaw, msgNo, base64Cipher) {
    const aesKey = await deriveMessageKey(sessionKeyRaw, msgNo);
    const combined = base64ToUint8Array(base64Cipher);
    const iv = combined.slice(0, 12);
    const cipher = combined.slice(12);
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, cipher);
    return TEXT_DECODER.decode(plainBuf);
}

// ---------------------------------------------------------------------------
// Helper utilities (PEM conversion, base64 helpers)
// ---------------------------------------------------------------------------
function spkiToPem(spkiBytes) {
    const b64 = btoa(String.fromCharCode(...spkiBytes));
    const wrapped = b64.match(/.{1,64}/g).join('\n');
    return `-----BEGIN PUBLIC KEY-----\n${wrapped}\n-----END PUBLIC KEY-----`;
}

function arrayBufferToBase64(buf) {
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

function base64ToUint8Array(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

// ---------------------------------------------------------------------------
// 4️⃣ ECDSA Digital Signatures (P-256 curve) for Message Verification
// ---------------------------------------------------------------------------

/**
 * Generate ECDSA P-256 key pair for signing messages.
 * Separate from encryption keys for security best practices.
 * @returns {Promise<{publicKey: CryptoKey, privateKey: CryptoKey}>}
 */
export async function generateSigningKeyPair() {
    const keyPair = await crypto.subtle.generateKey(
        {
            name: 'ECDSA',
            namedCurve: 'P-256' // NIST P-256 curve (secp256r1)
        },
        true, // extractable
        ['sign', 'verify']
    );
    return keyPair;
}

/**
 * Export ECDSA public key to PEM format for server storage.
 * @param {CryptoKey} publicKey - ECDSA public key
 * @returns {Promise<string>} PEM-encoded public key
 */
export async function exportSigningPublicKey(publicKey) {
    const spki = await crypto.subtle.exportKey('spki', publicKey);
    return spkiToPem(new Uint8Array(spki));
}

/**
 * Export ECDSA private key to JWK for local storage.
 * @param {CryptoKey} privateKey - ECDSA private key
 * @returns {Promise<object>} JWK object
 */
export async function exportSigningPrivateKey(privateKey) {
    return await crypto.subtle.exportKey('jwk', privateKey);
}

/**
 * Import ECDSA public key from PEM format.
 * @param {string} pem - PEM-encoded public key
 * @returns {Promise<CryptoKey>} ECDSA public key
 */
export async function importSigningPublicKey(pem) {
    const b64 = pem.replace('-----BEGIN PUBLIC KEY-----', '')
        .replace('-----END PUBLIC KEY-----', '')
        .replace(/\s+/g, '');
    const der = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
    return await crypto.subtle.importKey(
        'spki',
        der,
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['verify']
    );
}

/**
 * Import ECDSA private key from JWK.
 * @param {object} jwk - JWK object
 * @returns {Promise<CryptoKey>} ECDSA private key
 */
export async function importSigningPrivateKey(jwk) {
    return await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
    );
}

/**
 * Sign a message with ECDSA private key.
 * Creates a digital signature to prove authenticity and detect tampering.
 * @param {CryptoKey} privateKey - ECDSA private key
 * @param {string} message - Message to sign (usually encrypted content)
 * @returns {Promise<string>} Base64-encoded signature
 */
export async function signMessage(privateKey, message) {
    const messageBytes = TEXT_ENCODER.encode(message);
    const signatureBuffer = await crypto.subtle.sign(
        {
            name: 'ECDSA',
            hash: 'SHA-256'
        },
        privateKey,
        messageBytes
    );
    return arrayBufferToBase64(signatureBuffer);
}

/**
 * Verify message signature with ECDSA public key.
 * Returns true if signature is valid, false if tampered or forged.
 * @param {CryptoKey} publicKey - ECDSA public key of sender
 * @param {string} message - Original message (encrypted content)
 * @param {string} signatureBase64 - Base64-encoded signature
 * @returns {Promise<boolean>} True if signature is valid
 */
export async function verifySignature(publicKey, message, signatureBase64) {
    try {
        if (!signatureBase64 || !message || !publicKey) {
            console.warn('Missing required parameters for signature verification');
            return false;
        }

        const messageBytes = TEXT_ENCODER.encode(message);
        const signatureBytes = base64ToUint8Array(signatureBase64);

        if (!signatureBytes || signatureBytes.length === 0) {
            console.warn('Invalid signature bytes');
            return false;
        }

        const isValid = await crypto.subtle.verify(
            {
                name: 'ECDSA',
                hash: 'SHA-256'
            },
            publicKey,
            signatureBytes.buffer, // Use .buffer to get ArrayBuffer
            messageBytes
        );
        return isValid;
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

/**
 * Ensure signing key pair exists in localStorage.
 * Generates new keys if not found.
 * @returns {Promise<{publicKeyPem: string, privateKeyJwk: object}>}
 */
export async function ensureSigningKeyPair() {
    const storedPub = localStorage.getItem('chatapp_signing_public_key_pem');
    const storedPriv = localStorage.getItem('chatapp_signing_private_key_jwk');

    if (storedPub && storedPriv) {
        return {
            publicKeyPem: storedPub,
            privateKeyJwk: JSON.parse(storedPriv)
        };
    }

    // Generate new signing key pair
    const keyPair = await generateSigningKeyPair();
    const publicPem = await exportSigningPublicKey(keyPair.publicKey);
    const privateJwk = await exportSigningPrivateKey(keyPair.privateKey);

    localStorage.setItem('chatapp_signing_public_key_pem', publicPem);
    localStorage.setItem('chatapp_signing_private_key_jwk', JSON.stringify(privateJwk));

    return {
        publicKeyPem: publicPem,
        privateKeyJwk: privateJwk
    };
}

// ---------------------------------------------------------------------------
// 5️⃣ Ultra Secure Chat (USC) - Passphrase-Based Encryption
// ---------------------------------------------------------------------------

/**
 * Derive a 256-bit AES key from a passphrase using PBKDF2-SHA512
 * @param {string} passphrase - User's passphrase
 * @param {Uint8Array} salt - 32-byte salt (must be same for encryption/decryption)
 * @returns {Promise<CryptoKey>} AES-GCM key for encryption/decryption
 */
export async function derivePassphraseKey(passphrase, salt) {
    // Import passphrase as raw key material
    const passphraseKey = await crypto.subtle.importKey(
        'raw',
        TEXT_ENCODER.encode(passphrase),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    // Derive 256-bit AES key using PBKDF2-SHA512 with 310k iterations (OWASP 2023)
    const derivedKey = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 310000,  // Computationally expensive to brute-force
            hash: 'SHA-512'
        },
        passphraseKey,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );

    return derivedKey;
}

/**
 * Encrypt data with passphrase-derived key (Layer 3 encryption for USC)
 * @param {ArrayBuffer|Uint8Array} data - Data to encrypt
 * @param {string} passphrase - User's passphrase
 * @param {Uint8Array} salt - 32-byte salt
 * @returns {Promise<{encrypted: string, iv: string}>} Base64-encoded encrypted data and IV
 */
export async function encryptWithPassphrase(data, passphrase, salt) {
    // Derive AES key from passphrase
    const passphraseKey = await derivePassphraseKey(passphrase, salt);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Ensure data is ArrayBuffer
    const dataBuffer = data instanceof Uint8Array ? data.buffer : data;

    // Encrypt with AES-GCM
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        passphraseKey,
        dataBuffer
    );

    return {
        encrypted: arrayBufferToBase64(encrypted),
        iv: arrayBufferToBase64(iv.buffer)
    };
}

/**
 * Decrypt data with passphrase-derived key
 * @param {string} encryptedBase64 - Base64-encoded encrypted data
 * @param {string} ivBase64 - Base64-encoded IV
 * @param {string} passphrase - User's passphrase
 * @param {Uint8Array} salt - 32-byte salt (same as encryption)
 * @returns {Promise<Uint8Array>} Decrypted data
 * @throws {Error} If passphrase is incorrect or data is tampered
 */
export async function decryptWithPassphrase(encryptedBase64, ivBase64, passphrase, salt) {
    // Derive AES key from passphrase
    const passphraseKey = await derivePassphraseKey(passphrase, salt);

    // Convert base64 to ArrayBuffer
    const encrypted = base64ToUint8Array(encryptedBase64).buffer;
    const iv = base64ToUint8Array(ivBase64);

    // Decrypt with AES-GCM (will throw if passphrase is wrong or data tampered)
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        passphraseKey,
        encrypted
    );

    return new Uint8Array(decrypted);
}

/**
 * Hash passphrase for server-side verification (never store plaintext)
 * @param {string} passphrase - User's passphrase
 * @param {Uint8Array} salt - 32-byte salt
 * @returns {Promise<string>} Base64-encoded hash
 */
export async function hashPassphrase(passphrase, salt) {
    // Use same PBKDF2 derivation
    const passphraseKey = await crypto.subtle.importKey(
        'raw',
        TEXT_ENCODER.encode(passphrase),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const hashBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 310000,
            hash: 'SHA-512'
        },
        passphraseKey,
        256  // 256 bits = 32 bytes
    );

    return arrayBufferToBase64(hashBits);
}

/**
 * Validate passphrase strength
 * @param {string} passphrase - Passphrase to validate
 * @returns {{valid: boolean, strength: string, score: number, errors: string[]}}
 */
export function validatePassphraseStrength(passphrase) {
    const errors = [];
    let score = 0;

    // Length check
    if (passphrase.length < 10) {
        errors.push('Must be at least 10 characters');
    } else {
        score += 20;
        if (passphrase.length >= 15) score += 20;
        if (passphrase.length >= 20) score += 10;
    }

    // Numbers check
    if (!/[0-9]/.test(passphrase)) {
        errors.push('Must contain at least one number');
    } else {
        score += 15;
    }

    // Special characters check
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passphrase)) {
        errors.push('Must contain at least one special character');
    } else {
        score += 15;
    }

    // Uppercase check
    if (!/[A-Z]/.test(passphrase)) {
        errors.push('Must contain at least one uppercase letter');
    } else {
        score += 10;
    }

    // Lowercase check
    if (!/[a-z]/.test(passphrase)) {
        errors.push('Must contain at least one lowercase letter');
    } else {
        score += 10;
    }

    // Determine strength
    let strength = 'weak';
    if (score >= 80) strength = 'strong';
    else if (score >= 60) strength = 'medium';

    return {
        valid: errors.length === 0,
        strength,
        score,
        errors
    };
}

/**
 * Generate random session key for USC (256-bit)
 * @returns {Uint8Array} 32-byte random key
 */
export function generateRandomSessionKey() {
    return crypto.getRandomValues(new Uint8Array(32));
}

/**
 * Encrypt session key with RSA public key (Layer 2 for USC)
 * @param {Uint8Array} sessionKey - 32-byte session key
 * @param {string} publicKeyPem - RSA public key in PEM format
 * @returns {Promise<string>} Base64-encoded encrypted session key
 */
export async function encryptSessionKeyWithRSA(sessionKey, publicKeyPem) {
    const publicKey = await importPublicKeyFromPem(publicKeyPem);
    const encrypted = await crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        publicKey,
        sessionKey
    );
    return arrayBufferToBase64(encrypted);
}

/**
 * Decrypt session key with RSA private key
 * @param {string} encryptedKeyBase64 - Base64-encoded encrypted session key
 * @param {object} privateKeyJwk - RSA private key in JWK format
 * @returns {Promise<Uint8Array>} Decrypted session key
 */
export async function decryptSessionKeyWithRSA(encryptedKeyBase64, privateKeyJwk) {
    const privateKey = await importPrivateKeyFromJwk(privateKeyJwk);
    const encrypted = base64ToUint8Array(encryptedKeyBase64).buffer;
    const decrypted = await crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        privateKey,
        encrypted
    );
    return new Uint8Array(decrypted);
}

/**
 * Generate realistic dummy messages for decoy mode
 * @param {string} userA - First user
 * @param {string} userB - Second user
 * @param {number} count - Number of messages to generate
 * @returns {Array} Array of dummy message objects
 */
export function generateDummyMessages(userA, userB, count = 20) {
    const templates = [
        "Hey, how are you?",
        "Good, thanks! You?",
        "Meeting at {time} confirmed",
        "Ok 👍",
        "See you tomorrow",
        "Thanks for the update",
        "Got it",
        "Sounds good",
        "Let me know when you're free",
        "Sure, will do",
        "How's the project going?",
        "Making progress, almost done",
        "Great!",
        "Can we reschedule?",
        "Yes, how about {day}?",
        "Perfect",
        "Sent you the file",
        "Received, thanks!",
        "No problem",
        "Talk later",
        "Have a good day!",
        "You too!",
        "Let's catch up soon",
        "Definitely",
        "Working on it now",
        "Keep me posted",
        "Will do",
        "Thanks again",
        "Anytime!",
        "See you then"
    ];

    const times = ['3 PM', '5 PM', '6 PM', '10 AM', '2 PM', '4:30 PM'];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    const dummyMessages = [];
    const now = Date.now();
    const hourInMs = 3600000;

    for (let i = 0; i < count; i++) {
        const template = templates[Math.floor(Math.random() * templates.length)];
        const message = template
            .replace('{time}', times[Math.floor(Math.random() * times.length)])
            .replace('{day}', days[Math.floor(Math.random() * days.length)]);

        // Alternate sender/receiver
        const sender = i % 2 === 0 ? userA : userB;
        const receiver = i % 2 === 0 ? userB : userA;

        dummyMessages.push({
            id: `dummy_${i}`,
            sender,
            receiver,
            message,
            content: message,
            timestamp: new Date(now - (count - i) * hourInMs * (1 + Math.random())),
            verified: true,  // Make it look legitimate
            isDummy: true    // Internal flag (not shown to attacker)
        });
    }

    return dummyMessages;
}
