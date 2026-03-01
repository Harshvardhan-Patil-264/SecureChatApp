/**
 * MediaBubble.jsx
 * Renders an encrypted media message.
 * Downloads the encrypted blob from the server, decrypts it client-side
 * with the chat session key, and displays the result:
 *   - image → <img>
 *   - video → <video>
 *   - audio → <audio>
 */
import { useEffect, useState, useRef } from 'react';
import { decryptFile } from '../lib/crypto';
import { Download, Image, Video, Music, FileText } from 'lucide-react';
import { API_URL } from '../config';
import './MediaBubble.css';

export default function MediaBubble({ message, sessionKey }) {
    const [objectUrl, setObjectUrl] = useState(null);
    const [status, setStatus] = useState('loading'); // always start loading
    const videoRef = useRef(null);

    // Parse the media metadata stored in message.content
    let meta = null;
    try {
        const parsed = JSON.parse(message.content || message.message || '{}');
        if (parsed._media) meta = parsed;
    } catch (_) { }

    useEffect(() => {
        if (!meta || !sessionKey) { setStatus('error'); return; }
        let revoked = false;

        (async () => {
            try {
                const fullUrl = meta.url.startsWith('http') ? meta.url : `${API_URL}${meta.url}`;
                const res = await fetch(fullUrl);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const encBuffer = await res.arrayBuffer();
                const blob = await decryptFile(sessionKey, encBuffer, meta.mimeType);
                const url = URL.createObjectURL(blob);
                if (!revoked) {
                    setObjectUrl(url);
                    setStatus('ready');
                }
            } catch (e) {
                console.error('MediaBubble decrypt error', e);
                if (!revoked) setStatus('error');
            }
        })();

        return () => {
            revoked = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [meta?.url, sessionKey]);

    // Fix: blob: URL video doesn't load media metadata until .load() is called.
    // Without this, play button does nothing until user seeks first.
    useEffect(() => {
        if (objectUrl && videoRef.current) {
            videoRef.current.load();
        }
    }, [objectUrl]);

    if (!meta) return <span className="media-parse-error">⚠ Media unavailable</span>;

    const isImage = meta.mimeType.startsWith('image/');
    const isVideo = meta.mimeType.startsWith('video/');
    const isAudio = meta.mimeType.startsWith('audio/');

    const Icon = isImage ? Image : isVideo ? Video : isAudio ? Music : FileText;
    const sizeKB = (meta.size / 1024).toFixed(0);

    return (
        <div className="media-bubble-container">
            {status === 'loading' && (
                <div className="media-loading">
                    <div className="media-spinner" />
                    <span>Decrypting…</span>
                </div>
            )}

            {status === 'error' && (
                <div className="media-error">
                    <Icon size={20} /> Failed to decrypt media
                </div>
            )}

            {status === 'ready' && objectUrl && (
                <>
                    {isImage && (
                        <a href={objectUrl} target="_blank" rel="noreferrer">
                            <img src={objectUrl} alt={meta.name} className="media-img" />
                        </a>
                    )}
                    {isVideo && (
                        <video ref={videoRef} src={objectUrl} controls className="media-video" />
                    )}
                    {isAudio && (
                        <audio src={objectUrl} controls className="media-audio" />
                    )}
                    {!isImage && !isVideo && !isAudio && (
                        <a href={objectUrl} download={meta.name} className="media-file-link">
                            <FileText size={20} /> {meta.name}
                        </a>
                    )}
                </>
            )}

            <div className="media-meta-row">
                <span className="media-name">{meta.name}</span>
                <span className="media-size">{sizeKB} KB · 🔒 Encrypted</span>
                {status === 'ready' && (
                    <a href={objectUrl} download={meta.name} className="media-dl-btn">
                        <Download size={13} />
                    </a>
                )}
            </div>
        </div>
    );
}
