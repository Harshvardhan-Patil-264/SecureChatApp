import { useState } from 'react'
import { api } from '../lib/api'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { ensureSigningKeyPair, ensureKeyPair } from '../lib/crypto'
import './Auth.css'

const SECURITY_POINTS = [
  'End-to-end encryption',
  'Zero-knowledge architecture',
  'No data retention policy',
]

export default function Auth({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Generate signing keys
      const { publicKeyPem } = await ensureSigningKeyPair()

      // Register with signing public key
      await api.post('/auth/register', {
        username,
        email,
        password,
        signingPublicKey: publicKeyPem
      })

      toast.success('Registration successful! You can now login.')
      // Switch to login mode
      setIsRegister(false)
      setUsername('')
      setEmail('')
      setPassword('')
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Registration failed'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Check for Web Crypto API support (required for encryption)
      if (!window.crypto || !window.crypto.subtle) {
        throw new Error('Encryption unavailable. Browser must be in Secure Context (HTTPS or localhost).');
      }

      // 1. Ensure signing keys exist (for ECDSA signatures)
      const { publicKeyPem: signingPublicKey } = await ensureSigningKeyPair()

      // 2. Ensure RSA encryption keys exist (for USC)
      const { publicKeyPem: rsaPublicKey } = await ensureKeyPair()

      // 3. Login
      await api.post('/auth/login', { username, password })

      // 4. Update signing key if not already set
      try {
        await api.put(`/signatures/${username}`, { publicKey: signingPublicKey })
      } catch (err) {
        console.log('Signing key update skipped:', err.message)
      }

      // 5. Save RSA public key to database (for USC)
      try {
        await api.put(`/users/${username}/rsa-key`, { rsaPublicKey })
        console.log('✅ RSA public key saved to database')
      } catch (err) {
        console.error('❌ Failed to save RSA key:', err.message)
      }

      toast.success('Login successful!')
      setTimeout(() => onLogin(username), 700)
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Login failed'
      toast.error(errorMsg)
      setLoading(false)
    }
  }

  const handleBiometricLogin = () => {
    toast.info('Biometric login coming soon')
  }

  const toggleAuthMode = () => {
    setIsRegister((prev) => !prev)
    setUsername('')
    setEmail('')
    setPassword('')
  }

  return (
    <div className="secure-auth-screen">
      <ToastContainer theme="dark" />
      <div className="secure-auth-panel">
        <div className="secure-auth-header">
          <div className="secure-logo">
            <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
              <defs>
                <linearGradient id="shieldGradient" x1="27%" y1="0%" x2="73%" y2="100%">
                  <stop offset="0%" stopColor="#14ff9d" />
                  <stop offset="100%" stopColor="#00c566" />
                </linearGradient>
              </defs>
              <path
                d="M18 33c6.627 0 12-5.373 12-12V7.5L18 3 6 7.5V21c0 6.627 5.373 12 12 12Z"
                fill="url(#shieldGradient)"
                opacity="0.2"
              />
              <path
                d="M18 30c5.523 0 10-4.477 10-10V9l-10-3-10 3v11c0 5.523 4.477 10 10 10Z"
                stroke="#00c676"
                strokeWidth="1.4"
                fill="none"
              />
              <path d="M13.5 18l3.333 3.333L22.5 15.5" stroke="#14ff9d" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1>SecureChat</h1>
          <p>Military-grade encrypted messaging</p>
        </div>

        <form className="secure-auth-form" onSubmit={isRegister ? handleRegister : handleLogin}>
          <label className="input-label" htmlFor="secure-username">
            Username
          </label>
          <div className="input-field">
            <input
              id="secure-username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {isRegister && (
            <>
              <label className="input-label" htmlFor="secure-email">
                Email
              </label>
              <div className="input-field">
                <input
                  id="secure-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </>
          )}

          <label className="input-label" htmlFor="secure-password">
            Password
          </label>
          <div className="input-field password-field">
            <input
              id="secure-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            <button
              type="button"
              className="icon-button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M3 3l18 18M10.58 10.58a2 2 0 102.83 2.83"
                    stroke="#9ea3b0"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9.88 5.08a9.99 9.99 0 012.12-.21c5.52 0 10 4 12 7-1.036 1.646-2.446 3.196-4 4.42M6.12 6.12C3.986 7.72 2.237 9.698 1 12c2 3 6.48 7 12 7 1.403 0 2.752-.21 4-.6"
                    stroke="#9ea3b0"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M2 12c2-3 6.48-7 12-7s10 4 12 7c-2 3-6.48 7-12 7S4 15 2 12Z"
                    stroke="#9ea3b0"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <circle cx="14" cy="12" r="2.5" stroke="#9ea3b0" strokeWidth="1.5" fill="none" />
                </svg>
              )}
            </button>
          </div>

          <div className="encryption-pill">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M7 11V8a5 5 0 0110 0v3m-9 0h8a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2v-6a2 2 0 012-2Z"
                stroke="#14ff9d"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            <span>256-bit AES encryption enabled</span>
          </div>

          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? 'Processing…' : isRegister ? 'Create Secure Account' : 'Secure Login'}
          </button>

          <div className="divider">
            <span>Or</span>
          </div>

          <button type="button" className="biometric-btn" onClick={handleBiometricLogin} disabled={loading}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 12a3 3 0 013 3v3"
                stroke="#f5f7fb"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6 12a6 6 0 016-6 6 6 0 016 6"
                stroke="#f5f7fb"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8.5 20a6.5 6.5 0 007 0"
                stroke="#f5f7fb"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4 12a8 8 0 018-8 8 8 0 018 8"
                stroke="#f5f7fb"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Biometric Login
          </button>

          <button type="button" className="ghost-toggle" onClick={toggleAuthMode} disabled={loading}>
            {isRegister ? 'Already have access? Secure login' : 'Need access? Create a secure account'}
          </button>
        </form>
      </div>

      <ul className="security-footnotes">
        {SECURITY_POINTS.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </div>
  )
}