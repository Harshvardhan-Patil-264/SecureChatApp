/**
 * routes/mediaRoutes.js
 * Encrypted media upload and retrieval.
 * The server stores ONLY encrypted ciphertext — it never sees plaintext content.
 *
 * POST /api/media/upload  — receives encrypted binary blob, saves as uuid.enc
 * GET  /api/media/:filename — serves encrypted bytes back; client decrypts
 */

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const ENC_DIR = process.env.MEDIA_DIR || 'uploads/media';

// Ensure upload directory exists
fs.mkdirSync(ENC_DIR, { recursive: true });

// Accept raw encrypted binary as application/octet-stream OR multipart
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, ENC_DIR),
    filename: (_req, _file, cb) => cb(null, uuidv4() + '.enc')
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50 MB (encrypted overhead ~0%)
    // No mimetype filter — the blob is always application/octet-stream
});

// POST /api/media/upload
router.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file received' });
        const filename = req.file.filename; // uuid.enc
        res.json({ filename, url: `/api/media/${filename}` });
    } catch (err) {
        console.error('media upload error', err);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// GET /api/media/:filename — serves the encrypted blob back
router.get('/:filename', (req, res) => {
    // Sanitize: only allow uuid.enc filenames
    const name = path.basename(req.params.filename);
    if (!/^[a-f0-9\-]{36}\.enc$/.test(name)) {
        return res.status(400).json({ error: 'Invalid filename' });
    }
    const filePath = path.join(ENC_DIR, name);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.sendFile(path.resolve(filePath));
});

module.exports = router;
