import { useState, useEffect } from 'react';
import { UserCheck, UserX, Clock, ShieldCheck } from 'lucide-react';
import './Requests.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function Requests({ username, onAccepted }) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = async () => {
        try {
            const res = await fetch(`${API_URL}/api/requests/pending?username=${encodeURIComponent(username)}`);
            const data = await res.json();
            setRequests(data.requests || []);
        } catch (e) { }
        setLoading(false);
    };

    useEffect(() => { fetchRequests(); }, [username]);

    const accept = async (sender) => {
        await fetch(`${API_URL}/api/requests/accept`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender, receiver: username })
        });
        setRequests(prev => prev.filter(r => r.sender !== sender));
        onAccepted && onAccepted(sender);
    };

    const decline = async (sender) => {
        await fetch(`${API_URL}/api/requests/decline`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender, receiver: username })
        });
        setRequests(prev => prev.filter(r => r.sender !== sender));
    };

    const getInitials = (name) => (name || '?').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
    const getAvatarColor = (u) => {
        const colors = ['#3A86FF', '#FF006E', '#FB5607', '#FFBE0B', '#8338EC', '#06A77D'];
        let hash = 0;
        for (let c of (u || '')) hash = c.charCodeAt(0) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    if (loading) return (
        <div className="requests-empty">
            <div className="requests-spinner" />
        </div>
    );

    if (!requests.length) return (
        <div className="requests-empty">
            <ShieldCheck size={40} opacity={0.3} />
            <p>No pending requests</p>
        </div>
    );

    return (
        <div className="requests-list">
            {requests.map(r => (
                <div key={r.id} className="request-card">
                    <div className="request-avatar" style={{ backgroundColor: getAvatarColor(r.sender) }}>
                        {getInitials(r.name || r.sender)}
                    </div>
                    <div className="request-info">
                        <span className="request-name">{r.name || r.sender}</span>
                        <span className="request-username">@{r.sender}</span>
                        <span className="request-time">
                            <Clock size={11} /> {new Date(r.created_at).toLocaleDateString()}
                        </span>
                    </div>
                    <div className="request-actions">
                        <button className="req-accept-btn" onClick={() => accept(r.sender)} title="Accept">
                            <UserCheck size={16} />
                        </button>
                        <button className="req-decline-btn" onClick={() => decline(r.sender)} title="Decline">
                            <UserX size={16} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
