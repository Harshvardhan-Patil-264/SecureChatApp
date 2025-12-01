/**
 * routes/healthRoutes.js
 * Basic health endpoint
 */

const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = router;
