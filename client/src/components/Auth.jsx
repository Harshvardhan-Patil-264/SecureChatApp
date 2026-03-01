import { useState } from 'react'
import { api } from '../lib/api'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { ensureSigningKeyPair, ensureKeyPair } from '../lib/crypto'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Eye, EyeOff, Fingerprint, Lock, ArrowRight, UserPlus, Sun, Moon, Mail, ChevronLeft, KeyRound } from 'lucide-react'
import './Auth.css'

const SECURITY_POINTS = [
  'End-to-end encryption',
  'Zero-knowledge architecture',
  'No data retention policy',
]

export default function Auth({ onLogin, theme, toggleTheme }) {
  const [isRegister, setIsRegister] = useState(false)

  // Form fields
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // OTP state
  const [otpStep, setOtpStep] = useState(false)   // false = form step, true = OTP entry step
  const [otp, setOtp] = useState('')

  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // ─── REGISTER – Step 1: send OTP ────────────────────────────────────────────
  const handleSendRegisterOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/send-register-otp', { username, email, password, name })
      toast.success('OTP sent! Check your email inbox.')
      setOtpStep(true)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  // ─── REGISTER – Step 2: verify OTP & create account ─────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { publicKeyPem } = await ensureSigningKeyPair()

      await api.post('/auth/register', {
        username,
        name,
        email,
        password,
        otp,
        signingPublicKey: publicKeyPem
      })

      toast.success('Registration successful! You can now login.')
      resetAll()
      setIsRegister(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  // ─── LOGIN – Step 1: send OTP ────────────────────────────────────────────────
  const handleSendLoginOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (!window.crypto || !window.crypto.subtle) {
        throw new Error('Encryption unavailable. Browser must be in Secure Context (HTTPS or localhost).')
      }
      await api.post('/auth/send-login-otp', { username, password })
      toast.success('OTP sent! Check your email inbox.')
      setOtpStep(true)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  // ─── LOGIN – Step 2: verify OTP & login ──────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { publicKeyPem: signingPublicKey } = await ensureSigningKeyPair()
      const { publicKeyPem: rsaPublicKey } = await ensureKeyPair()

      await api.post('/auth/login', { username, password, otp })

      // Update signing key if not already set
      try {
        await api.put(`/signatures/${username}`, { publicKey: signingPublicKey })
      } catch (err) {
        console.log('Signing key update skipped:', err.message)
      }

      // Save RSA public key to database (for USC)
      try {
        await api.put(`/users/${username}/rsa-key`, { rsaPublicKey })
        console.log('✅ RSA public key saved to database')
      } catch (err) {
        console.error('❌ Failed to save RSA key:', err.message)
      }

      toast.success('Login successful!')
      setTimeout(() => onLogin(username), 700)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed')
      setLoading(false)
    }
  }

  const handleBiometricLogin = () => {
    toast.info('Biometric login coming soon')
  }

  const resetAll = () => {
    setUsername('')
    setName('')
    setEmail('')
    setPassword('')
    setOtp('')
    setOtpStep(false)
  }

  const toggleAuthMode = () => {
    resetAll()
    setIsRegister((prev) => !prev)
  }

  const goBackToForm = () => {
    setOtp('')
    setOtpStep(false)
  }

  // ─── Derived submit handler ──────────────────────────────────────────────────
  const handleFormSubmit = isRegister
    ? (otpStep ? handleRegister : handleSendRegisterOtp)
    : (otpStep ? handleLogin : handleSendLoginOtp)

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

        <AnimatePresence mode="wait">

          {/* ── OTP ENTRY STEP ── */}
          {otpStep ? (
            <motion.form
              key="otp-form"
              className="secure-auth-form"
              onSubmit={handleFormSubmit}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              {/* OTP info banner */}
              <div className="otp-info-banner">
                <Mail size={16} />
                <span>
                  OTP sent to <strong>{isRegister ? email : 'your registered email'}</strong>
                </span>
              </div>

              <div className="input-field-group">
                <label className="input-label" htmlFor="otp-input">
                  <KeyRound size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  Enter 6-digit OTP
                </label>
                <div className="input-field otp-field">
                  <input
                    id="otp-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="● ● ● ● ● ●"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <p className="otp-hint">Valid for 10 minutes. Check spam if not received.</p>
              </div>

              <motion.div
                className="encryption-pill"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Lock size={14} />
                <span>256-bit AES encryption enabled</span>
              </motion.div>

              <motion.button
                className="primary-btn"
                type="submit"
                disabled={loading || otp.length !== 6}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? 'Verifying…' : isRegister ? (
                  <span className="btn-content">Verify & Create Account <UserPlus size={18} /></span>
                ) : (
                  <span className="btn-content">Verify & Login <ArrowRight size={18} /></span>
                )}
              </motion.button>

              <button
                type="button"
                className="ghost-toggle back-btn"
                onClick={goBackToForm}
                disabled={loading}
              >
                <ChevronLeft size={15} style={{ verticalAlign: 'middle' }} />
                Back / Resend OTP
              </button>
            </motion.form>
          ) : (

            /* ── FORM STEP ── */
            <motion.form
              key="main-form"
              className="secure-auth-form"
              onSubmit={handleFormSubmit}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.25 }}
            >
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

              {/* Name + Email - only for register */}
              <AnimatePresence>
                {isRegister && (
                  <>
                    <motion.div
                      className="input-field-group"
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <label className="input-label" htmlFor="secure-name">Display Name</label>
                      <div className="input-field">
                        <input
                          id="secure-name"
                          type="text"
                          placeholder="Your full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          disabled={loading}
                        />
                      </div>
                    </motion.div>
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
                  </>
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
                {loading ? 'Sending OTP…' : isRegister ? (
                  <span className="btn-content">Send OTP to Email <Mail size={18} /></span>
                ) : (
                  <span className="btn-content">Send OTP to Email <Mail size={18} /></span>
                )}
              </motion.button>

              <div className="divider"><span>Or</span></div>

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
            </motion.form>
          )}
        </AnimatePresence>
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