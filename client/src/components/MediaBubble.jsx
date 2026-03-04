/**
 * MediaBubble.jsx  —  WhatsApp-style encrypted media renderer
 * Images  → compact thumbnail (240px), click to open full
 * Videos  → compact player (240px) with native controls
 * Audio   → custom player: play/pause + scrubber + duration (no native UI)
 */
import { useEffect, useState, useRef } from 'react';
import { decryptFile } from '../lib/crypto';
import { Download, Play, Pause, Lock, FileText, Image, Video, Music } from 'lucide-react';
import { API_URL } from '../config';
import './MediaBubble.css';

/* ─── Custom Audio Player ─────────────────────────────────────────────────── */
function AudioPlayer({ src }) {
    const audioRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [current, setCurrent] = useState(0);
    const [duration, setDuration] = useState(0);

    const toggle = () => {
        const a = audioRef.current;
        if (!a) return;
        if (playing) { a.pause(); setPlaying(false); }
        else { a.play().catch(() => { }); setPlaying(true); }
    };

    const fmt = (s) => {
        if (!s || !isFinite(s)) return '0:00';
        const m = Math.floor(s / 60);
        const sec = String(Math.floor(s % 60)).padStart(2, '0');
        return `${m}:${sec}`;
    };

    const pct = duration ? (current / duration) * 100 : 0;

    return (
        <div className="wa-audio">
            <audio
                ref={audioRef}
                src={src}
                onTimeUpdate={e => setCurrent(e.target.currentTime)}
                onDurationChange={e => setDuration(e.target.duration)}
                onEnded={() => { setPlaying(false); setCurrent(0); }}
            />
            <button className="wa-audio-play" onClick={toggle}>
                {playing ? <Pause size={18} strokeWidth={2.5} /> : <Play size={18} strokeWidth={2.5} />}
            </button>
            <div className="wa-audio-middle">
                <div className="wa-audio-track"
                    onClick={e => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const ratio = (e.clientX - rect.left) / rect.width;
                        if (audioRef.current) audioRef.current.currentTime = ratio * duration;
                    }}
                >
                    <div className="wa-audio-fill" style={{ width: `${pct}%` }} />
                    <div className="wa-audio-dot" style={{ left: `${pct}%` }} />
                </div>
                <span className="wa-audio-time">{fmt(playing || current ? current : duration)}</span>
            </div>
            <Lock size={12} className="wa-audio-lock" />
        </div>
    );
}

/* ─── Main Component ──────────────────────────────────────────────────────── */
export default function MediaBubble({ message, sessionKey }) {
    const [objectUrl, setObjectUrl] = useState(null);
    const [status, setStatus] = useState('loading');
    const videoRef = useRef(null);

    let meta = null;
    try {
        const p = JSON.parse(message.content || message.message || '{}');
        if (p._media) meta = p;
    } catch (_) { }

    useEffect(() => {
        if (!meta || !sessionKey) { setStatus('error'); return; }
        let cancelled = false;
        (async () => {
            try {
                const fullUrl = meta.url.startsWith('http') ? meta.url : `${API_URL}${meta.url}`;
                const res = await fetch(fullUrl);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const buf = await res.arrayBuffer();
                const blob = await decryptFile(sessionKey, buf, meta.mimeType);
                if (!cancelled) { setObjectUrl(URL.createObjectURL(blob)); setStatus('ready'); }
            } catch (e) {
                console.error('MediaBubble:', e);
                if (!cancelled) setStatus('error');
            }
        })();
        return () => { cancelled = true; };
    }, [meta?.url, sessionKey]);

    // Force video load after blob URL is set
    useEffect(() => {
        if (objectUrl && videoRef.current) videoRef.current.load();
    }, [objectUrl]);

    if (!meta) return <span className="mb-error">⚠ Media unavailable</span>;

    const isImage = meta.mimeType.startsWith('image/');
    const isVideo = meta.mimeType.startsWith('video/');
    const isAudio = meta.mimeType.startsWith('audio/');
    const sizeKB = (meta.size / 1024).toFixed(0);
    const Icon = isImage ? Image : isVideo ? Video : isAudio ? Music : FileText;

    return (
        <div className="mb-wrap">
            {/* ── Loading ── */}
            {status === 'loading' && (
                <div className="mb-loading">
                    <div className="mb-spinner" />
                    <span>Decrypting…</span>
                </div>
            )}

            {/* ── Error ── */}
            {status === 'error' && (
                <div className="mb-err"><Icon size={16} /> Failed to decrypt</div>
            )}

            {/* ── Ready ── */}
            {status === 'ready' && objectUrl && (
                <>
                    {isImage && (
                        <a href={objectUrl} target="_blank" rel="noreferrer" className="mb-img-link">
                            <img src={objectUrl} alt={meta.name} className="mb-img" />
                        </a>
                    )}
                    {isVideo && (
                        <video ref={videoRef} src={objectUrl} controls className="mb-video" />
                    )}
                    {isAudio && <AudioPlayer src={objectUrl} />}
                    {!isImage && !isVideo && !isAudio && (
                        <a href={objectUrl} download={meta.name} className="mb-file">
                            <FileText size={18} /> {meta.name}
                        </a>
                    )}
                </>
            )}

            {/* ── Footer meta row ── */}
            <div className="mb-footer">
                <span className="mb-fname" title={meta.name}>{meta.name}</span>
                <span className="mb-size">{sizeKB} KB · 🔒</span>
                {status === 'ready' && (
                    <a href={objectUrl} download={meta.name} className="mb-dl"><Download size={12} /></a>
                )}
            </div>
        </div>
    );
}
