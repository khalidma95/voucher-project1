const router = require('express').Router();
const pool   = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /api/settings/:key
router.get('/:key', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT value FROM settings WHERE key=$1', [req.params.key]);
    res.json(rows[0]?.value ?? null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings/:key
router.put('/:key', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO settings (key,value) VALUES ($1,$2)
       ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
      [req.params.key, JSON.stringify(req.body.value)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
