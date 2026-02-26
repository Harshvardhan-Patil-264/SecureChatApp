import { useState } from 'react'
import { api } from '../lib/api'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { ensureSigningKeyPair, ensureKeyPair } from '../lib/crypto'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Eye, EyeOff, Fingerprint, Lock, ArrowRight, UserPlus, Sun, Moon } from 'lucide-react'
import './Auth.css'

const SECURITY_POINTS = [
  'End-to-end encryption',
  'Zero-knowledge architecture',
  'No data retention policy',
]

export default function Auth({ onLogin, theme, toggleTheme }) {
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
      <ToastContainer theme={theme === 'dark' ? 'dark' : 'light'} />

      {/* Theme Toggle */}
      <motion.button
        className="theme-toggle-btn"
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        {theme === 'dark' ? 'Light' : 'Dark'}
      </motion.button>

      {/* Animated Background Orbs */}
      <motion.div
        className="bg-orb orb-1"
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="bg-orb orb-2"
        animate={{ scale: [1, 1.5, 1], opacity: [0.05, 0.15, 0.05] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      <motion.div
        className="secure-auth-panel"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
      >
        <div className="secure-auth-header">
          <motion.div
            className="secure-logo"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Shield className="logo-icon" size={42} strokeWidth={1.5} color="#3A86FF" />
          </motion.div>
          <h1>SecureChat</h1>
          <p>Military-grade encrypted messaging</p>
        </div>

        <form className="secure-auth-form" onSubmit={isRegister ? handleRegister : handleLogin}>

          <div className="input-field-group">
            <label className="input-label" htmlFor="secure-username">Username</label>
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
          </div>

          <AnimatePresence mode="wait">
            {isRegister && (
              <motion.div
                className="input-field-group"
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.3 }}
              >
                <label className="input-label" htmlFor="secure-email">Email</label>
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
              </motion.div>
            )}
          </AnimatePresence>

          <div className="input-field-group">
            <label className="input-label" htmlFor="secure-password">Password</label>
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
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <motion.div
            className="encryption-pill"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Lock size={14} />
            <span>256-bit AES encryption enabled</span>
          </motion.div>

          <motion.button
            className="primary-btn"
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? 'Processing…' : isRegister ? (
              <span className="btn-content">Create Secure Account <UserPlus size={18} /></span>
            ) : (
              <span className="btn-content">Secure Login <ArrowRight size={18} /></span>
            )}
          </motion.button>

          <div className="divider">
            <span>Or</span>
          </div>

          <motion.button
            type="button"
            className="biometric-btn"
            onClick={handleBiometricLogin}
            disabled={loading}
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
            whileTap={{ scale: 0.98 }}
          >
            <Fingerprint size={18} />
            Biometric Login
          </motion.button>

          <button type="button" className="ghost-toggle" onClick={toggleAuthMode} disabled={loading}>
            {isRegister ? 'Already have access? Secure login' : 'Need access? Create a secure account'}
          </button>
        </form>
      </motion.div>

      <motion.ul
        className="security-footnotes"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, staggerChildren: 0.1 }}
      >
        {SECURITY_POINTS.map((point, i) => (
          <motion.li
            key={point}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + (i * 0.1) }}
          >
            {point}
          </motion.li>
        ))}
      </motion.ul>
    </div>
  )
}