/**
 * routes/signatureRoutes.js
 * API endpoints for ECDSA signature key management
 */

const express = require('express');
const signatureService = require('../services/signatureService');

const router = express.Router();

/**
 * GET /api/signatures/:username
 * Retrieve user's ECDSA signing public key
 */
router.get('/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const publicKey = await signatureService.getSigningKey(username);

        if (!publicKey) {
            return res.status(404).json({ error: 'Signing key not found' });
        }

        res.json({ username, publicKey });
    } catch (err) {
        console.error('Error fetching signing key:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PUT /api/signatures/:username
 * Update user's ECDSA signing public key (for key rotation)
 */
router.put('/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const { publicKey } = req.body;

        if (!publicKey) {
            return res.status(400).json({ error: 'Public key is required' });
        }

        await signatureService.storeSigningKey(username, publicKey);
        res.json({ success: true, message: 'Signing key updated' });
    } catch (err) {
        console.error('Error updating signing key:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
