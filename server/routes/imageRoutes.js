/**
 * routes/imageRoutes.js
 * Handles image upload (Multer) and retrieval.
 * POST /api/images/upload  (form-data with file field "file")
 * GET  /api/images/:imageId
 */

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const router = express.Router();
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads/images';

// Ensure upload dir exists
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // Unique filename: timestamp-random.ext
    const id = Date.now() + '-' + Math.random().toString(36).slice(2, 9);
    const ext = path.extname(file.originalname) || '';
    cb(null, id + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('File must be an image'), false);
    }
    cb(null, true);
  }
});

// POST /api/images/upload
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'File required' });

    const imageId = path.basename(file.filename, path.extname(file.filename));
    const contentType = file.mimetype;
    await db.query(
      'INSERT INTO images (image_id, filename, content_type, size, created_at) VALUES (?, ?, ?, ?, NOW())',
      [imageId, file.filename, contentType, file.size]
    );

    // short URL pointing to GET /api/images/:imageId
    const imageUrl = `/api/images/${imageId}`;
    res.json({ imageId, imageUrl, contentType, size: file.size, message: 'Image uploaded successfully' });
  } catch (err) {
    console.error('Image upload error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/images/:imageId
router.get('/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    const [rows] = await db.query('SELECT filename, content_type FROM images WHERE image_id = ?', [imageId]);
    if (!rows.length) return res.status(404).json({ error: 'Image not found' });
    const { filename, content_type } = rows[0];
    const filePath = path.join(UPLOAD_DIR, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Image file missing' });

    res.setHeader('Content-Type', content_type || 'image/png');
    res.sendFile(path.resolve(filePath));
  } catch (err) {
    console.error('Image retrieval error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
