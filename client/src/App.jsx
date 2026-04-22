import { useState, useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Auth from './components/Auth';
import Chat from './components/Chat';
import AIAssistant from './components/AIAssistant';
import './index.css';

const SESSION_STORAGE_KEY = 'chatapp_username';
const THEME_STORAGE_KEY = 'chatapp_theme';
const APP_VERSION = '4'; // bump this whenever you deploy major changes
const VERSION_KEY = 'chatapp_version';

export default function App() {
  const [username, setUsername] = useState(null);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
  });

  // ── Version-based cache invalidation ───────────────────────────────────────
  // If an old user has a different (stale) version stored, nuke all caches
  // and reload once so they get fresh JS/CSS immediately.
  useEffect(() => {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    if (storedVersion !== APP_VERSION) {
      localStorage.setItem(VERSION_KEY, APP_VERSION);
      // Unregister all service workers and clear every cache bucket
      const clearAndReload = async () => {
        try {
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(r => r.unregister()));
          }
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
          }
        } catch (_) {}
        // Only hard-reload if this isn't the first-ever visit
        if (storedVersion !== null) {
          window.location.reload(true);
        }
      };
      clearAndReload();
    }
  }, []);

  // Apply theme to <html> element
  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'light') {
      html.setAttribute('data-theme', 'light');
    } else {
      html.removeAttribute('data-theme');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const savedUsername = localStorage.getItem(SESSION_STORAGE_KEY);
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);


  const handleLogin = (username) => {
    setUsername(username);
    localStorage.setItem(SESSION_STORAGE_KEY, username);
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    // Clear ALL security keys on logout for privacy
    localStorage.removeItem('chatapp_public_key_pem');
    localStorage.removeItem('chatapp_private_key_jwk');
    localStorage.removeItem('chatapp_signing_public_key_pem');
    localStorage.removeItem('chatapp_signing_private_key_jwk');
    
    setUsername(null);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className={`app-root ${username ? 'chat-active' : ''}`}>
      <ToastContainer
        position="top-right"
        theme={theme === 'dark' ? 'dark' : 'light'}
      />
      {!username ? (
        <Auth onLogin={handleLogin} theme={theme} toggleTheme={toggleTheme} />
      ) : (
        <Chat username={username} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
      )}
      {/* AI Assistant FAB — rendered at root so position:fixed works correctly */}
      {username && <AIAssistant />}
    </div>
  );
}
