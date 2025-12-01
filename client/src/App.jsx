import { useState, useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Auth from './components/Auth';
import Chat from './components/Chat';
import './index.css';

const SESSION_STORAGE_KEY = 'chatapp_username';

export default function App() {
  const [username, setUsername] = useState(null);

  useEffect(() => {
    const savedUsername = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  const handleLogin = (username) => {
    setUsername(username);
    sessionStorage.setItem(SESSION_STORAGE_KEY, username);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem('chatapp_public_key_pem');
    localStorage.removeItem('chatapp_private_key_jwk');
    setUsername(null);
  };

  return (
    <div className={`app-root ${username ? 'chat-active' : ''}`}>
      <ToastContainer position="top-right" />
      {!username ? (
        <Auth onLogin={handleLogin} />
      ) : (
        <Chat username={username} onLogout={handleLogout} />
      )}
    </div>
  );
}
