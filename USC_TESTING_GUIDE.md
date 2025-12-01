# Ultra Secure Chat - Complete Testing Guide

## 🚀 Quick Start Testing (Without Integration)

Since the USC components aren't integrated into Chat.jsx yet, we can test the backend and components independently.

---

## Test 1: Backend API Testing (5 minutes)

### 1.1 Test USS Session Creation

Open a new terminal and run:

```bash
curl -X POST http://localhost:8080/api/uss/create \
  -H "Content-Type: application/json" \
  -d "{
    \"userA\": \"admin1\",
    \"userB\": \"admin2\",
    \"userAEmail\": \"admin1@test.com\",
    \"userBEmail\": \"admin2@test.com\",
    \"doubleEncryptedKeyA\": \"test_encrypted_key_a_base64\",
    \"doubleEncryptedKeyB\": \"test_encrypted_key_b_base64\",
    \"passphraseHash\": \"test_hash_base64\",
    \"salt\": \"dGVzdF9zYWx0XzMyX2J5dGVzX2Jhc2U2NA==\",
    \"ivA\": \"dGVzdF9pdl9h\",
    \"ivB\": \"dGVzdF9pdl9i\"
  }"
```

**Expected Response:**
```json
{
  "success": true,
  "sessionId": 1,
  "message": "Ultra Secure Session created successfully"
}
```

### 1.2 Test Get Session by ID

```bash
curl "http://localhost:8080/api/uss/1?requestingUser=admin1"
```

**Expected Response:**
```json
{
  "sessionId": 1,
  "userA": "admin1",
  "userB": "admin2",
  "doubleEncryptedKey": "test_encrypted_key_a_base64",
  "passphraseHash": "test_hash_base64",
  "salt": "dGVzdF9zYWx0XzMyX2J5dGVzX2Jhc2U2NA==",
  "iv": "dGVzdF9pdl9h",
  "wrongAttempts": 0,
  "status": "ACTIVE",
  "createdAt": "2024-11-28T...",
  "lastAccess": "2024-11-28T..."
}
```

### 1.3 Test Failed Passphrase Attempt

```bash
# Attempt 1
curl -X POST http://localhost:8080/api/uss/1/verify \
  -H "Content-Type: application/json" \
  -d '{"success": false}'

# Attempt 2
curl -X POST http://localhost:8080/api/uss/1/verify \
  -H "Content-Type: application/json" \
  -d '{"success": false}'

# Attempt 3 (triggers lockdown)
curl -X POST http://localhost:8080/api/uss/1/verify \
  -H "Content-Type: application/json" \
  -d '{"success": false}'
```

**Expected Response (Attempt 3):**
```json
{
  "success": false,
  "message": "Session locked due to too many failed attempts",
  "attemptsRemaining": 0,
  "locked": true
}
```

**Check Server Console:**
You should see:
```
🔒 Activating lockdown for session 1
📦 Exporting messages...
✅ Exported 0 messages
🗜️  Creating ZIP backup...
✅ ZIP created (XXX bytes)
📧 Sending security emails...
✅ Sent 0/0 emails (email not configured)
🗑️  Wiping messages from database...
✅ Deleted 0 messages
✅ Lockdown completed for session 1
```

### 1.4 Test Security Events

```bash
curl http://localhost:8080/api/uss/1/events
```

**Expected Response:**
```json
[
  {
    "event_id": 1,
    "event_type": "USS_CREATED",
    "user_involved": "admin1",
    "details": "{...}",
    "timestamp": "2024-11-28T..."
  },
  {
    "event_type": "USS_ACCESS_DENIED",
    ...
  },
  {
    "event_type": "USS_LOCKDOWN",
    ...
  }
]
```

---

## Test 2: Database Verification (2 minutes)

Open MySQL:

```bash
mysql -u root -p
# Password: pass
```

Run these queries:

```sql
USE chatapp;

-- Check USS sessions
SELECT * FROM ultra_secure_sessions;

-- Check security events
SELECT event_type, session_id, timestamp 
FROM security_events 
ORDER BY timestamp DESC;

-- Check if session is locked
SELECT session_id, status, wrong_attempts, locked_at 
FROM ultra_secure_sessions 
WHERE session_id = 1;
```

**Expected Results:**
- Session status should be `LOCKED`
- `wrong_attempts` should be `3`
- `locked_at` should have a timestamp
- Multiple security events logged

---

## Test 3: Crypto Functions Testing (Browser Console)

### 3.1 Create Test HTML File

Create `test_crypto.html` in the project root:

```html
<!DOCTYPE html>
<html>
<head>
    <title>USC Crypto Test</title>
</head>
<body>
    <h1>Ultra Secure Chat - Crypto Test</h1>
    <div id="results"></div>

    <script type="module">
        import { 
            validatePassphraseStrength,
            derivePassphraseKey,
            encryptWithPassphrase,
            decryptWithPassphrase,
            hashPassphrase,
            generateDummyMessages
        } from './client/src/lib/crypto.js';

        const results = document.getElementById('results');
        
        async function runTests() {
            results.innerHTML = '<h2>Running Tests...</h2>';
            
            // Test 1: Passphrase Strength
            console.log('Test 1: Passphrase Strength Validation');
            const weak = validatePassphraseStrength('weak');
            const medium = validatePassphraseStrength('Medium123!');
            const strong = validatePassphraseStrength('VeryStrong123!@#ABC');
            
            console.log('Weak:', weak);
            console.log('Medium:', medium);
            console.log('Strong:', strong);
            
            results.innerHTML += `
                <h3>Test 1: Passphrase Strength ✅</h3>
                <p>Weak: ${weak.strength} (score: ${weak.score})</p>
                <p>Medium: ${medium.strength} (score: ${medium.score})</p>
                <p>Strong: ${strong.strength} (score: ${strong.score})</p>
            `;
            
            // Test 2: Encryption/Decryption
            console.log('Test 2: Passphrase Encryption');
            const passphrase = 'MySecurePass123!@#';
            const salt = crypto.getRandomValues(new Uint8Array(32));
            const plaintext = 'Hello, Ultra Secure Chat!';
            
            const { encrypted, iv } = await encryptWithPassphrase(
                new TextEncoder().encode(plaintext),
                passphrase,
                salt
            );
            
            console.log('Encrypted:', encrypted);
            
            const decrypted = await decryptWithPassphrase(
                encrypted,
                iv,
                passphrase,
                salt
            );
            
            const decryptedText = new TextDecoder().decode(decrypted);
            console.log('Decrypted:', decryptedText);
            
            results.innerHTML += `
                <h3>Test 2: Encryption/Decryption ✅</h3>
                <p>Original: ${plaintext}</p>
                <p>Encrypted: ${encrypted.substring(0, 50)}...</p>
                <p>Decrypted: ${decryptedText}</p>
                <p>Match: ${plaintext === decryptedText ? '✅ YES' : '❌ NO'}</p>
            `;
            
            // Test 3: Passphrase Hashing
            console.log('Test 3: Passphrase Hashing');
            const hash = await hashPassphrase(passphrase, salt);
            console.log('Hash:', hash);
            
            results.innerHTML += `
                <h3>Test 3: Passphrase Hashing ✅</h3>
                <p>Hash: ${hash.substring(0, 50)}...</p>
                <p>Length: ${hash.length} characters</p>
            `;
            
            // Test 4: Dummy Messages
            console.log('Test 4: Dummy Messages');
            const dummies = generateDummyMessages('alice', 'bob', 10);
            console.log('Dummy messages:', dummies);
            
            results.innerHTML += `
                <h3>Test 4: Dummy Messages ✅</h3>
                <p>Generated: ${dummies.length} messages</p>
                <p>Sample: "${dummies[0].message}"</p>
                <p>From: ${dummies[0].sender} → ${dummies[0].receiver}</p>
            `;
            
            results.innerHTML += '<h2 style="color: green;">All Tests Passed! ✅</h2>';
        }
        
        runTests().catch(err => {
            console.error('Test failed:', err);
            results.innerHTML += `<h2 style="color: red;">Test Failed: ${err.message}</h2>`;
        });
    </script>
</body>
</html>
```

### 3.2 Run the Test

1. Open browser to `http://localhost:5173/test_crypto.html`
2. Open browser console (F12)
3. Check results on page and in console

**Expected Output:**
- All 4 tests should pass ✅
- Encryption/decryption should match
- Dummy messages should be realistic

---

## Test 4: UI Components Testing (Standalone)

### 4.1 Create Test Page for Modals

Create `test_ui.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>USC UI Test</title>
    <link rel="stylesheet" href="./client/src/components/UltraSecureChat/UltraSecureChat.css">
</head>
<body style="background: #0a0a0a; padding: 20px;">
    <h1 style="color: #00d4ff; text-align: center;">USC UI Components Test</h1>
    
    <div style="display: flex; gap: 20px; justify-content: center; margin: 20px;">
        <button onclick="showCreateModal()" style="padding: 12px 24px; background: #00d4ff; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
            Test Create Modal
        </button>
        <button onclick="showPassphraseEntry()" style="padding: 12px 24px; background: #00ff88; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
            Test Passphrase Entry
        </button>
        <button onclick="showSecurityAlert()" style="padding: 12px 24px; background: #ff6b6b; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
            Test Security Alert
        </button>
    </div>
    
    <div id="modal-container"></div>
    
    <script type="module">
        import React from 'react';
        import ReactDOM from 'react-dom/client';
        import CreateUSSModal from './client/src/components/UltraSecureChat/CreateUSSModal.jsx';
        import PassphraseEntry from './client/src/components/UltraSecureChat/PassphraseEntry.jsx';
        import SecurityAlert from './client/src/components/UltraSecureChat/SecurityAlert.jsx';
        
        const container = document.getElementById('modal-container');
        const root = ReactDOM.createRoot(container);
        
        window.showCreateModal = () => {
            root.render(
                <CreateUSSModal
                    isOpen={true}
                    onClose={() => root.render(null)}
                    users={[
                        { username: 'alice' },
                        { username: 'bob' },
                        { username: 'charlie' }
                    ]}
                    currentUser="admin1"
                    onSessionCreated={(id) => {
                        alert('Session created: ' + id);
                        root.render(null);
                    }}
                />
            );
        };
        
        window.showPassphraseEntry = () => {
            root.render(
                <PassphraseEntry
                    session={{
                        sessionId: 1,
                        userA: 'admin1',
                        userB: 'admin2',
                        wrongAttempts: 1,
                        status: 'ACTIVE',
                        createdAt: new Date().toISOString(),
                        salt: 'dGVzdF9zYWx0',
                        iv: 'dGVzdF9pdg==',
                        doubleEncryptedKey: 'test_key'
                    }}
                    currentUser="admin1"
                    onAccessGranted={(key) => {
                        alert('Access granted!');
                        root.render(null);
                    }}
                    onAccessDenied={() => {
                        alert('Access denied!');
                        root.render(null);
                    }}
                />
            );
        };
        
        window.showSecurityAlert = () => {
            root.render(
                <SecurityAlert
                    session={{
                        sessionId: 1,
                        lockedAt: new Date().toISOString()
                    }}
                    onClose={() => root.render(null)}
                />
            );
        };
    </script>
</body>
</html>
```

---

## Test 5: Email Service Testing (Optional)

### 5.1 Configure Email (Gmail)

1. Create `.env` file in `server/` folder:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

2. Get Gmail App Password:
   - Go to Google Account → Security
   - Enable 2-Step Verification
   - Generate App Password
   - Copy the 16-character password

### 5.2 Test Email Sending

Create `test_email.js` in `server/`:

```javascript
require('dotenv').config();
const emailService = require('./services/emailService');

async function testEmail() {
    try {
        console.log('📧 Testing email service...');
        
        const result = await emailService.sendTestEmail('your-email@gmail.com');
        
        console.log('✅ Email sent successfully!');
        console.log('Message ID:', result.messageId);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Email test failed:', error);
        process.exit(1);
    }
}

testEmail();
```

Run:
```bash
cd server
node test_email.js
```

---

## Test 6: Full Integration Test (After Integration)

### 6.1 Prerequisites
- Follow `USC_INTEGRATION_GUIDE.md` to integrate components into Chat.jsx
- Restart client dev server

### 6.2 Test Flow

1. **Login as admin1**
   - Open `http://localhost:5173`
   - Login with admin1

2. **Create USS Session**
   - Select admin2 from user list
   - Click "🔐 Ultra Secure" button
   - Enter passphrase: `MySecure123!@#Pass`
   - Confirm passphrase
   - Click "Create Secure Session"
   - Should see success message

3. **Login as admin2 (New Tab)**
   - Open new incognito tab
   - Login as admin2
   - Select admin1 from user list
   - Should see passphrase entry screen

4. **Test Correct Passphrase**
   - Enter: `MySecure123!@#Pass`
   - Click "Unlock Session"
   - Should grant access

5. **Test Wrong Passphrase (New Session)**
   - Create new USS session
   - Login as admin2
   - Enter wrong passphrase 3 times
   - Should see lockdown alert
   - Check email for backup ZIP

---

## 🐛 Troubleshooting

### Issue: "Module not found" errors
**Solution:** Make sure all files are in correct directories:
```
client/src/components/UltraSecureChat/
├── CreateUSSModal.jsx
├── PassphraseEntry.jsx
├── SecurityAlert.jsx
└── UltraSecureChat.css
```

### Issue: API returns 404
**Solution:** Check server console, ensure `ussRoutes.js` is registered in `server.js`

### Issue: Email not sending
**Solution:** 
1. Check `.env` file exists in `server/` folder
2. Verify Gmail app password is correct
3. Check server console for error messages

### Issue: Crypto functions fail
**Solution:** Ensure browser supports Web Crypto API (all modern browsers do)

---

## ✅ Testing Checklist

- [ ] Backend API endpoints working
- [ ] Database tables created
- [ ] USS session creation works
- [ ] Passphrase verification works
- [ ] Lockdown triggers after 3 attempts
- [ ] Security events logged
- [ ] Crypto functions work (encryption/decryption)
- [ ] Passphrase strength validation works
- [ ] Dummy messages generate correctly
- [ ] UI components render properly
- [ ] Email service configured (optional)
- [ ] Full integration test passed

---

## 📊 Expected Test Results

| Test | Expected Result | Status |
|------|----------------|--------|
| API: Create Session | 201 Created | ⏳ |
| API: Get Session | 200 OK with session data | ⏳ |
| API: Failed Attempts | Lockdown after 3 | ⏳ |
| DB: Sessions Table | Row inserted | ⏳ |
| DB: Events Table | Multiple events logged | ⏳ |
| Crypto: Encryption | Successful encrypt/decrypt | ⏳ |
| Crypto: Hashing | 310k iterations complete | ⏳ |
| UI: Modal Renders | No errors | ⏳ |
| UI: Strength Meter | Colors change | ⏳ |
| Email: Test Send | Email received | ⏳ |

---

**Start with Test 1 (Backend API) - it's the quickest way to verify everything works!**
