import { useState, useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Auth from './components/Auth';
import Chat from './components/Chat';
import './index.css';

const SESSION_STORAGE_KEY = 'chatapp_username';
const THEME_STORAGE_KEY = 'chatapp_theme';

export default function App() {
  const [username, setUsername] = useState(null);
  const [theme, setTheme] = useState(() => {
    // Persist theme preference across sessions
    return localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
  });

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
    </div>
  );
}
