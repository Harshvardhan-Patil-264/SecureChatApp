# 🔐 SecureChatApp

A cutting-edge, end-to-end encrypted real-time chat application featuring military-grade cryptography, ECDSA digital signatures, and ultra-secure chat sessions with self-destruct capabilities.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange.svg)](https://www.mysql.com/)

## 🌟 Features

### 🛡️ Advanced Security
- **End-to-End Encryption**: AES-256-GCM encryption for all messages
- **RSA-2048 Key Exchange**: Secure session key establishment using RSA-OAEP
- **ECDSA Digital Signatures**: P-256 curve signatures for message authenticity verification
- **Two-Factor Authentication**: TOTP-based 2FA with QR code generation
- **Ultra Secure Chat (USS)**: Self-destructing sessions with lockdown protection

### 💬 Real-Time Communication
- **WebSocket Integration**: Instant message delivery using Socket.IO
- **Online Status Indicators**: Real-time user presence tracking
- **Typing Indicators**: Live typing status updates
- **Unread Message Counters**: Smart notification system
- **Message Verification Badges**: Visual indicators for cryptographically verified messages

### 🔒 Ultra Secure Chat (USS)
- **Passphrase-Protected Sessions**: Additional layer of security for sensitive conversations
- **Auto-Lockdown**: Automatic session termination after 3 failed passphrase attempts
- **Emergency Backup**: Encrypted ZIP archives sent via email on lockdown
- **Self-Destruct**: Complete message deletion and session termination on security breach
- **Tamper Detection**: Cryptographic verification of message integrity

### 🎨 Modern User Experience
- **Sleek Dark UI**: Modern, responsive design with glassmorphism effects
- **File Sharing**: Secure file upload and download capabilities
- **Export Conversations**: Download chat history as encrypted archives
- **Responsive Design**: Optimized for desktop and mobile devices

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- React 18.3 with Vite
- Socket.IO Client for real-time communication
- Web Crypto API for client-side cryptography
- React Toastify for notifications

**Backend:**
- Node.js with Express.js
- Socket.IO for WebSocket connections
- MySQL 8.0 for data persistence
- Bcrypt.js for password hashing
- Speakeasy for TOTP generation
- Nodemailer for email notifications

**Security:**
- RSA-OAEP-2048 for key exchange
- AES-256-GCM for message encryption
- ECDSA P-256 for digital signatures
- SHA-256 for hashing
- PBKDF2 for key derivation

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (React + Vite)                    │
├─────────────────────────────────────────────────────────────┤
│  • RSA Key Generation & Management                          │
│  • AES-GCM Message Encryption/Decryption                    │
│  • ECDSA Message Signing & Verification                     │
│  • Real-time WebSocket Communication                        │
│  • TOTP 2FA Verification                                    │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTPS/WSS
┌─────────────────────────────────────────────────────────────┐
│                  SERVER (Node.js + Express)                  │
├─────────────────────────────────────────────────────────────┤
│  • User Authentication & Session Management                 │
│  • ECDSA Signature Verification                             │
│  • USS Session Management                                   │
│  • File Upload/Download Handling                            │
│  • Email Notification Service                               │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE (MySQL)                        │
├─────────────────────────────────────────────────────────────┤
│  • Users (credentials, public keys, TOTP secrets)           │
│  • Messages (encrypted content, signatures, metadata)       │
│  • USS Sessions (passphrases, lockdown status)              │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- MySQL 8.0 or higher
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Harshvardhan-Patil-264/SecureChatApp.git
   cd SecureChatApp
   ```

2. **Set up the database**
   ```bash
   mysql -u root -p
   CREATE DATABASE chatapp;
   USE chatapp;
   SOURCE server/migrations/create_tables.sql;
   ```

3. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

4. **Configure environment variables**
   
   Create a `.env` file in the `server` directory:
   ```env
   PORT=8080
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=chatapp
   
   # Email Configuration (for USS lockdown notifications)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

5. **Run database migrations**
   ```bash
   node scripts/add_signature_fields.js
   ```

6. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

### Running the Application

1. **Start the backend server**
   ```bash
   cd server
   npm start
   # or for development with auto-reload
   npm run dev
   ```

2. **Start the frontend development server**
   ```bash
   cd client
   npm run dev
   ```

3. **Access the application**
   
   Open your browser and navigate to `http://localhost:5173`

## 📖 Usage

### Registration
1. Enter a unique username and strong password
2. Scan the QR code with an authenticator app (Google Authenticator, Authy, etc.)
3. Save your backup codes securely

### Login
1. Enter your username and password
2. Provide the 6-digit TOTP code from your authenticator app

### Sending Messages
1. Select a user from the contacts list
2. Type your message in the input field
3. Messages are automatically encrypted and signed before sending
4. Green ✓ badge indicates verified messages

### Creating Ultra Secure Chat
1. Click the "🔐 Ultra Secure" button in the chat header
2. Select the recipient and create a strong passphrase
3. Share the passphrase securely (out-of-band)
4. Both parties must enter the passphrase to access the session

### File Sharing
1. Click the attachment icon in the chat
2. Select a file to upload (max 10MB)
3. File is encrypted before transmission
4. Recipient can download and decrypt the file

## 🔐 Security Features Explained

### Message Flow Security

1. **Key Exchange**: RSA-2048 public keys are exchanged during session initialization
2. **Session Key**: AES-256 session key is generated and encrypted with recipient's RSA public key
3. **Message Encryption**: Each message is encrypted with AES-256-GCM using a unique nonce
4. **Digital Signature**: Encrypted message is signed with sender's ECDSA private key
5. **Verification**: Recipient verifies signature with sender's ECDSA public key before decryption
6. **Decryption**: Message is decrypted using the shared session key

### USS Lockdown Mechanism

When 3 failed passphrase attempts occur:
1. Session is immediately locked and marked as compromised
2. All messages in the session are exported to an encrypted ZIP file
3. ZIP file is emailed to both participants
4. All messages are permanently deleted from the database
5. Session is terminated and cannot be reopened

## 📁 Project Structure

```
SecureChatApp/
├── client/                      # React frontend
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── Auth.jsx         # Authentication UI
│   │   │   ├── Chat.jsx         # Main chat interface
│   │   │   └── UltraSecureChat/ # USS components
│   │   ├── lib/
│   │   │   ├── api.js           # API client
│   │   │   └── crypto.js        # Cryptographic functions
│   │   └── App.jsx              # Root component
│   └── package.json
│
├── server/                      # Node.js backend
│   ├── config/
│   │   └── db.js                # Database configuration
│   ├── routes/
│   │   ├── authRoutes.js        # Authentication endpoints
│   │   ├── messageRoutes.js     # Message endpoints
│   │   ├── signatureRoutes.js   # Signature verification
│   │   └── ussRoutes.js         # Ultra Secure Chat
│   ├── services/
│   │   ├── messageService.js    # Message handling
│   │   ├── signatureService.js  # Signature verification
│   │   └── ussService.js        # USS management
│   ├── migrations/              # Database migrations
│   ├── scripts/                 # Utility scripts
│   ├── server.js                # Express server
│   └── package.json
│
├── docs/                        # Documentation
│   ├── technical_report.md      # Detailed technical documentation
│   ├── USC_INTEGRATION_GUIDE.md # USS integration guide
│   └── USC_TESTING_GUIDE.md     # Testing procedures
│
└── README.md                    # This file
```

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Backend tests
cd server
npm test

# Frontend tests
cd client
npm test
```

For USS testing, refer to [USC_TESTING_GUIDE.md](USC_TESTING_GUIDE.md)

## 🚢 Deployment

For production deployment instructions, see [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)

## 🛣️ Roadmap

- [ ] Voice and video calling with WebRTC
- [ ] Group chat functionality
- [ ] Message reactions and emoji support
- [ ] Desktop application (Electron)
- [ ] Mobile applications (React Native)
- [ ] Message search functionality
- [ ] Dark/Light theme toggle
- [ ] Multi-language support

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Harshvardhan Patil**  
Computer Science Engineer

- 📧 Email: [harsh264patil@gmail.com](mailto:harsh264patil@gmail.com)
- 🐙 GitHub: [@Harshvardhan-Patil-264](https://github.com/Harshvardhan-Patil-264)
- 💼 LinkedIn: [harshvardhan-patil-hp](https://linkedin.com/in/harshvardhan-patil-hp/)
- 🌐 Portfolio: [harshvardhan-patil-portfolio.onrender.com](https://harshvardhan-patil-portfolio.onrender.com)

## 🙏 Acknowledgments

- Web Crypto API for browser-based cryptography
- Socket.IO for real-time communication
- NIST for cryptographic standards (FIPS 186-4)
- The open-source community for invaluable tools and libraries

## 📞 Support

If you encounter any issues or have questions:

1. Check the [documentation](docs/)
2. Search existing [GitHub Issues](https://github.com/Harshvardhan-Patil-264/SecureChatApp/issues)
3. Create a new issue with detailed information
4. Contact me directly at harsh264patil@gmail.com

---

<div align="center">

**⭐ Star this repository if you find it helpful! ⭐**

Made with ❤️ and 🔐 by Harshvardhan Patil

</div>
