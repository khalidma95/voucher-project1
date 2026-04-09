const router = require('express').Router();
const pool   = require('../db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/audit-log?user=...&action=...&entity=...
router.get('/', authMiddleware, async (req, res) => {
  const { user, action, entity } = req.query;
  try {
    let q = 'SELECT * FROM audit_log WHERE 1=1';
    const params = [];
    if (user)   { params.push(user);   q += ` AND user_name=$${params.length}`; }
    if (action) { params.push(action); q += ` AND action=$${params.length}`; }
    if (entity) { params.push(entity); q += ` AND entity=$${params.length}`; }
    q += ' ORDER BY created_at DESC LIMIT 2000';
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/audit-log
router.post('/', authMiddleware, async (req, res) => {
  const { user_name, user_role, action, entity, detail, entity_id } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO audit_log (user_name,user_role,action,entity,detail,entity_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [user_name, user_role, action, entity, detail, entity_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/audit-log — مسح الكل (أدمن)
router.delete('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'للمدير فقط' });
  try {
    await pool.query('DELETE FROM audit_log');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
