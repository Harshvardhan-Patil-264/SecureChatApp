# Message Verification & Authenticity Implementation Plan

## Overview

This plan implements **ECDSA digital signatures** for message verification, providing cryptographic proof of message authenticity and integrity. This surpasses WhatsApp's security by detecting tampering and man-in-the-middle attacks.

## User Review Required

> [!IMPORTANT]
> **Breaking Change**: This adds a new signing key pair separate from encryption keys. Users will need to generate signing keys on first login after this update.

> [!WARNING]
> **Database Migration**: Adds new columns to `users` and `messages` tables. Backup database before deployment.

---

## Proposed Changes

### Cryptography Layer

#### [MODIFY] [crypto.js](file:///e:/SY%20CSE/MINI%20PROJECT/ChatApp/client/src/lib/crypto.js)

**Add ECDSA Functions:**
```javascript
// Generate ECDSA P-256 key pair for signing
async function generateSigningKeyPair()

// Sign message hash with private signing key
async function signMessage(privateKey, message)

// Verify signature with public signing key
async function verifySignature(publicKey, message, signature)

// Export/Import signing keys
async function exportSigningPublicKey(publicKey)
async function importSigningPublicKey(pemString)
```

**Key Design:**
- Algorithm: ECDSA with P-256 curve
- Hash: SHA-256
- Storage: Private key in IndexedDB, Public key on server
- Format: JWK for private, PEM for public

---

### Database Schema

#### [MODIFY] [migrations/init.sql](file:///e:/SY%20CSE/MINI%20PROJECT/ChatApp/server/migrations/init.sql)

**Users Table:**
```sql
ALTER TABLE users
ADD COLUMN signature_key_public TEXT NULL;
```

**Messages Table:**
```sql
ALTER TABLE messages
ADD COLUMN signature TEXT NULL,
ADD COLUMN verified BOOLEAN DEFAULT FALSE;
```

**Purpose:**
- `signature_key_public`: Stores user's ECDSA public key (PEM format)
- `signature`: Base64-encoded ECDSA signature of message
- `verified`: Server-side verification status

---

### Backend Services

#### [NEW] [services/signatureService.js](file:///e:/SY%20CSE/MINI%20PROJECT/ChatApp/server/services/signatureService.js)

**Functions:**
```javascript
// Store user's signing public key
async function storeSigningKey(username, publicKeyPem)

// Retrieve user's signing public key
async function getSigningKey(username)

// Verify message signature (server-side)
async function verifyMessageSignature(username, message, signature)
```

**Verification Flow:**
1. Fetch sender's public signing key
2. Reconstruct message hash
3. Verify signature using crypto.verify()
4. Return verification status

---

### API Routes

#### [MODIFY] [routes/authRoutes.js](file:///e:/SY%20CSE/MINI%20PROJECT/ChatApp/server/routes/authRoutes.js)

**Update Registration:**
```javascript
POST /api/auth/register
// Accept signingPublicKey in request body
// Store in users.signature_key_public
```

**Update Login:**
```javascript
POST /api/auth/login
// Return user's signing public key
// Client verifies it matches local private key
```

---

#### [NEW] [routes/signatureRoutes.js](file:///e:/SY%20CSE/MINI%20PROJECT/ChatApp/server/routes/signatureRoutes.js)

```javascript
// Get user's signing public key
GET /api/signatures/:username

// Update signing public key (for key rotation)
PUT /api/signatures/:username
```

---

#### [MODIFY] [routes/messageRoutes.js](file:///e:/SY%20CSE/MINI%20PROJECT/ChatApp/server/routes/messageRoutes.js)

**Update Message Sending:**
```javascript
POST /api/messages
// Accept signature in request body
// Verify signature server-side
// Store signature and verification status
```

**Update Message Retrieval:**
```javascript
GET /api/messages/:userA/:userB
// Include signature and verified fields in response
```

---

### Frontend Integration

#### [MODIFY] [components/Auth.jsx](file:///e:/SY%20CSE/MINI%20PROJECT/ChatApp/client/src/components/Auth.jsx)

**Registration Flow:**
1. Generate encryption keys (existing)
2. Generate signing keys (new)
3. Send signing public key to server
4. Store signing private key in IndexedDB

**Login Flow:**
1. Retrieve signing keys from IndexedDB
2. Verify keys exist, regenerate if missing
3. Fetch signing public key from server
4. Verify it matches local private key

---

#### [MODIFY] [components/Chat.jsx](file:///e:/SY%20CSE/MINI%20PROJECT/ChatApp/client/src/components/Chat.jsx)

**Message Sending:**
```javascript
async function sendMessage() {
  // 1. Encrypt message (existing)
  const encrypted = await encryptMessage(...)
  
  // 2. Sign encrypted message (new)
  const signature = await signMessage(signingPrivateKey, encrypted)
  
  // 3. Send with signature
  await api.post('/api/messages', {
    content: encrypted,
    signature: signature,
    ...
  })
}
```

**Message Receiving:**
```javascript
async function handleMessage(msg) {
  // 1. Fetch sender's signing public key
  const senderKey = await fetchSigningKey(msg.sender)
  
  // 2. Verify signature
  const isVerified = await verifySignature(
    senderKey,
    msg.content,
    msg.signature
  )
  
  // 3. Decrypt message (existing)
  const plaintext = await decryptMessage(...)
  
  // 4. Update message with verification status
  msg.verified = isVerified
  msg.content = plaintext
}
```

---

### UI Components

#### [MODIFY] [components/Chat.jsx](file:///e:/SY%20CSE/MINI%20PROJECT/ChatApp/client/src/components/Chat.jsx)

**Message Bubble Updates:**
```jsx
<div className="message-bubble">
  <span className="message-text">{msg.content}</span>
  
  {/* Verification Badge */}
  {msg.verified && (
    <span className="verified-badge" title="Message verified">
      <svg>✓</svg> Verified
    </span>
  )}
  
  {msg.verified === false && (
    <span className="unverified-badge" title="Signature verification failed">
      <svg>⚠</svg> Unverified
    </span>
  )}
  
  <span className="message-timestamp">{formatTime(msg.timestamp)}</span>
</div>
```

---

#### [MODIFY] [components/Chat.css](file:///e:/SY%20CSE/MINI%20PROJECT/ChatApp/client/src/components/Chat.css)

**Verification Badge Styles:**
```css
.verified-badge {
  color: #14ff9d;
  font-size: 10px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.unverified-badge {
  color: #ff4b4b;
  font-size: 10px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
```

---

## Verification Plan

### Automated Tests

**Crypto Tests:**
```bash
# Test ECDSA key generation
# Test message signing
# Test signature verification
# Test tampering detection
```

**API Tests:**
```bash
# Test signature storage
# Test signature retrieval
# Test message verification endpoint
```

### Manual Verification

1. **Registration**: Verify signing keys generated and stored
2. **Message Sending**: Verify signature created and sent
3. **Message Receiving**: Verify signature validated
4. **Tampering Test**: Modify message content, verify signature fails
5. **UI Indicators**: Verify checkmarks appear correctly

---

## Security Considerations

> [!CAUTION]
> **Key Storage**: Signing private keys stored in IndexedDB (encrypted). Consider adding password protection.

> [!IMPORTANT]
> **Key Rotation**: Plan for periodic signing key rotation (every 6 months).

> [!NOTE]
> **Performance**: ECDSA verification is fast (~1ms per message). No performance impact expected.

---

## Migration Strategy

1. **Phase 1**: Deploy database migration
2. **Phase 2**: Deploy backend changes
3. **Phase 3**: Deploy frontend changes
4. **Phase 4**: Existing users generate signing keys on next login
5. **Phase 5**: Monitor verification rates

---

## Rollback Plan

If issues arise:
1. Disable signature verification in frontend
2. Messages still work (signature optional)
3. Fix issues and re-enable
4. No data loss risk
