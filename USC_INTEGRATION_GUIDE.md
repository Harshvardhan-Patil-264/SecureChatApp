# Ultra Secure Chat - Integration Guide for Chat.jsx

## Step 1: Add Imports

Add these imports at the top of `Chat.jsx` (after line 16):

```javascript
import CreateUSSModal from './UltraSecureChat/CreateUSSModal';
import PassphraseEntry from './UltraSecureChat/PassphraseEntry';
import SecurityAlert from './UltraSecureChat/SecurityAlert';
```

## Step 2: Add State Variables

Add these state variables after line 27:

```javascript
// Ultra Secure Chat states
const [showUSSModal, setShowUSSModal] = useState(false);
const [ussSession, setUssSession] = useState(null);
const [showPassphraseEntry, setShowPassphraseEntry] = useState(false);
const [showSecurityAlert, setShowSecurityAlert] = useState(false);
const [ussSessionKey, setUssSessionKey] = useState(null);
```

## Step 3: Add USS Functions

Add these functions before the `return` statement (around line 400):

```javascript
// Check if current chat has an active USS session
const checkUSSSession = async (user) => {
  try {
    const response = await fetch(
      `http://localhost:8080/api/uss/users/${username}/${user.username}?requestingUser=${username}`
    );
    
    if (response.ok) {
      const session = await response.json();
      setUssSession(session);
      
      if (session.status === 'LOCKED') {
        setShowSecurityAlert(true);
      } else if (session.status === 'ACTIVE') {
        setShowPassphraseEntry(true);
      }
    } else {
      setUssSession(null);
    }
  } catch (error) {
    console.log('No USS session found');
    setUssSession(null);
  }
};

// Handle USS session creation
const handleUSSSessionCreated = (sessionId) => {
  console.log('USS Session created:', sessionId);
  // Reload the session
  if (selectedUser) {
    checkUSSSession(selectedUser);
  }
};

// Handle passphrase verification success
const handlePassphraseVerified = (sessionKey) => {
  console.log('Passphrase verified, session key obtained');
  setUssSessionKey(sessionKey);
  setShowPassphraseEntry(false);
  // Now user can send/receive messages with this session key
};

// Handle passphrase verification failure (locked)
const handleAccessDenied = () => {
  setShowPassphraseEntry(false);
  setShowSecurityAlert(true);
};
```

## Step 4: Modify openChat Function

Update the `openChat` function (around line 260) to check for USS sessions:

```javascript
const openChat = async (user) => {
  setSelectedUser(user);
  
  // Check for USS session
  await checkUSSSession(user);
  
  // Mark messages as read
  try {
    await api.post(`/messages/mark-read`, {
      sender: user.username,
      receiver: username,
    });
    
    // Update unread count in UI
    setUsers((prevUsers) =>
      prevUsers.map((u) =>
        u.username === user.username ? { ...u, unreadCount: 0 } : u
      )
    );
  } catch (err) {
    console.error("Failed to mark messages as read", err);
  }
};
```

## Step 5: Add USS Button to Chat Header

Find the chat header actions section (around line 600) and add the USS button:

```javascript
<div className="chat-header-actions">
  {/* Add USS Button */}
  <button 
    className="uss-create-btn" 
    onClick={() => setShowUSSModal(true)}
    title="Create Ultra Secure Chat"
    style={{
      background: 'linear-gradient(135deg, #00d4ff, #00ff88)',
      border: 'none',
      borderRadius: '8px',
      padding: '8px 16px',
      color: '#0a0a0a',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '14px',
      marginRight: '12px',
      transition: 'all 0.2s'
    }}
  >
    🔐 Ultra Secure
  </button>
  
  {/* Existing buttons... */}
</div>
```

## Step 6: Add Modal Components Before Closing Tag

Add these components before the final closing `</div>` of the return statement (around line 700):

```javascript
{/* Ultra Secure Chat Modals */}
{showUSSModal && (
  <CreateUSSModal
    isOpen={showUSSModal}
    onClose={() => setShowUSSModal(false)}
    users={users}
    currentUser={username}
    onSessionCreated={handleUSSSessionCreated}
  />
)}

{showPassphraseEntry && ussSession && (
  <PassphraseEntry
    session={ussSession}
    currentUser={username}
    onAccessGranted={handlePassphraseVerified}
    onAccessDenied={handleAccessDenied}
  />
)}

{showSecurityAlert && ussSession && (
  <SecurityAlert
    session={ussSession}
    onClose={() => {
      setShowSecurityAlert(false);
      setUssSession(null);
    }}
  />
)}
```

## Step 7: Update Message Sending (Optional - for USS messages)

If you want to send messages through USS, modify the `sendMessage` function to check for `ussSessionKey`:

```javascript
const sendMessage = async () => {
  if (!newMessage.trim() || !selectedUser || !sessionKey) return;

  const msgNo = Date.now();
  
  // Use USS session key if available, otherwise use regular session key
  const keyToUse = ussSessionKey || sessionKey;
  
  try {
    const encryptedContent = await encryptMessage(keyToUse, msgNo, newMessage.trim());
    const signature = await signMessage(signingPrivateKey, encryptedContent);

    const payload = {
      sender: username,
      receiver: selectedUser.username,
      message: encryptedContent,
      msgNo,
      signature,
      // Add USS session ID if using USS
      ussSessionId: ussSession?.sessionId || null
    };

    await api.post("/messages", payload);
    setNewMessage("");
  } catch (error) {
    console.error("Failed to send message:", error);
    alert("Failed to send message. Please try again.");
  }
};
```

## Complete Integration Checklist

- [ ] Add imports for USS components
- [ ] Add state variables for USS
- [ ] Add USS helper functions
- [ ] Modify `openChat` to check for USS sessions
- [ ] Add "Ultra Secure" button to chat header
- [ ] Add modal components before closing tag
- [ ] (Optional) Update message sending for USS
- [ ] Test USS session creation
- [ ] Test passphrase verification
- [ ] Test lockdown scenario

## Testing Steps

1. **Create USS Session:**
   - Open chat with a user
   - Click "🔐 Ultra Secure" button
   - Select user and create strong passphrase
   - Verify session is created

2. **Access USS Session:**
   - Reopen chat with same user
   - Should see passphrase entry screen
   - Enter correct passphrase
   - Verify access granted

3. **Test Lockdown:**
   - Enter wrong passphrase 3 times
   - Verify lockdown alert appears
   - Check email for backup ZIP

## Notes

- The USS components are fully styled and ready to use
- All crypto functions are already in `crypto.js`
- Backend API endpoints are ready at `/api/uss/*`
- Email service is configured (update `.env` with SMTP credentials)

## Next Steps

After integration:
1. Test all flows thoroughly
2. Configure email service in `.env`
3. Add USS indicator badge to user list
4. Add USS message styling (optional)
5. Deploy and test in production
