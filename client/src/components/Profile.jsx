import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { toast } from 'react-toastify';
import { X, User, AtSign, Mail, Save, Loader2, ChevronRight } from 'lucide-react';
import './Profile.css';

const Profile = ({ username, onClose, onProfileUpdate }) => {
    const [profile, setProfile] = useState({ name: '', username: '', email: '' });
    const [name, setName] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [emailOtp, setEmailOtp] = useState('');
    const [emailStep, setEmailStep] = useState(false); // false = input, true = OTP
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, [username]);

    const fetchProfile = async () => {
        try {
            setFetching(true);
            const res = await api.get(`/users/profile/${username}`);
            setProfile(res.data);
            setName(res.data.name || '');
            setNewUsername(res.data.username || '');
            setNewEmail(res.data.email || '');
        } catch {
            toast.error('Failed to load profile');
        } finally {
            setFetching(false);
        }
    };

    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            const res = await api.put('/users/profile/update', {
                username,
                name: name.trim(),
                newUsername: newUsername.trim() !== username ? newUsername.trim() : undefined
            });
            setProfile(prev => ({ ...prev, name: res.data.name, username: res.data.username }));
            toast.success('Profile updated!');
            if (onProfileUpdate) onProfileUpdate({ name: res.data.name, username: res.data.username });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleSendEmailOtp = async () => {
        if (!newEmail || newEmail === profile.email) {
            toast.info('Enter a new email address first');
            return;
        }
        setLoading(true);
        try {
            await api.post('/users/profile/send-email-otp', { username, newEmail });
            toast.success('OTP sent to new email!');
            setEmailStep(true);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateEmail = async () => {
        setLoading(true);
        try {
            await api.put('/users/profile/update-email', { username, newEmail, otp: emailOtp });
            setProfile(prev => ({ ...prev, email: newEmail }));
            setEmailStep(false);
            setEmailOtp('');
            toast.success('Email updated successfully!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Invalid or expired OTP');
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (n) => {
        if (!n) return '?';
        return n.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
    };

    const getAvatarColor = (str) => {
        const colors = ['#3A86FF', '#FF006E', '#FB5607', '#8338EC', '#06D6A0', '#FFD166'];
        let hash = 0;
        for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <div className="profile-overlay" onClick={onClose}>
            <div className="profile-panel" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="profile-header">
                    <h2>Your Profile</h2>
                    <button className="profile-close-btn" onClick={onClose}><X size={18} /></button>
                </div>

                {fetching ? (
                    <div className="profile-loading"><Loader2 size={28} className="spin" /><p>Loading profile…</p></div>
                ) : (
                    <div className="profile-body">
                        {/* Avatar */}
                        <div className="profile-avatar-section">
                            <div className="profile-avatar" style={{ background: getAvatarColor(username) }}>
                                {getInitials(name || username)}
                            </div>
                            <div>
                                <div className="profile-display-name">{name || username}</div>
                                <div className="profile-username-tag">@{profile.username}</div>
                            </div>
                        </div>

                        <div className="profile-divider" />

                        {/* Name */}
                        <div className="profile-field">
                            <label><User size={14} /> Display Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Your display name"
                                className="profile-input"
                            />
                        </div>

                        {/* Username */}
                        <div className="profile-field">
                            <label><AtSign size={14} /> Username</label>
                            <input
                                type="text"
                                value={newUsername}
                                onChange={e => setNewUsername(e.target.value)}
                                placeholder="username"
                                className="profile-input"
                            />
                            <span className="profile-field-hint">Changing username will log you out of other sessions</span>
                        </div>

                        <button
                            className="profile-save-btn"
                            onClick={handleSaveProfile}
                            disabled={loading}
                        >
                            {loading ? <Loader2 size={15} className="spin" /> : <Save size={15} />}
                            Save Changes
                        </button>

                        <div className="profile-divider" />

                        {/* Email */}
                        <div className="profile-field">
                            <label><Mail size={14} /> Email Address</label>
                            {!emailStep ? (
                                <>
                                    <input
                                        type="email"
                                        value={newEmail}
                                        onChange={e => setNewEmail(e.target.value)}
                                        placeholder="new@email.com"
                                        className="profile-input"
                                    />
                                    <button
                                        className="profile-email-otp-btn"
                                        onClick={handleSendEmailOtp}
                                        disabled={loading || !newEmail || newEmail === profile.email}
                                    >
                                        {loading ? <Loader2 size={14} className="spin" /> : <ChevronRight size={14} />}
                                        Send Verification OTP
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p className="profile-otp-info">Enter the OTP sent to <strong>{newEmail}</strong></p>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={emailOtp}
                                        onChange={e => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="● ● ● ● ● ●"
                                        className="profile-input profile-otp-input"
                                        autoFocus
                                    />
                                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                        <button className="profile-save-btn" onClick={handleUpdateEmail} disabled={loading || emailOtp.length !== 6}>
                                            {loading ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Confirm Email
                                        </button>
                                        <button className="profile-cancel-btn" onClick={() => { setEmailStep(false); setEmailOtp(''); }}>
                                            Cancel
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
