const router = require('express').Router();
const bcrypt = require('bcrypt');
const pool   = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const safe = (u) => ({ id: u.id, username: u.username, name: u.name, role: u.role, source: u.source });

// GET /api/users
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id,username,name,role,source FROM users ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users  — أدمن فقط
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  const { username, password, name, role, source } = req.body;
  if (!username || !password || !name || !role)
    return res.status(400).json({ error: 'أدخل جميع الحقول المطلوبة' });
  if (password.length < 4)
    return res.status(400).json({ error: 'كلمة المرور قصيرة جداً' });

  try {
    const dup = await pool.query('SELECT id FROM users WHERE username=$1', [username.trim()]);
    if (dup.rows[0]) return res.status(400).json({ error: 'اسم المستخدم موجود مسبقاً' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (username,password,name,role,source)
       VALUES ($1,$2,$3,$4,$5) RETURNING id,username,name,role,source`,
      [username.trim(), hash, name.trim(), role, source || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id  — أدمن فقط
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  const { name, role, source, username } = req.body;
  try {
    if (username) {
      const dup = await pool.query('SELECT id FROM users WHERE username=$1 AND id<>$2', [username, req.params.id]);
      if (dup.rows[0]) return res.status(400).json({ error: 'اسم المستخدم موجود مسبقاً' });
    }
    const { rows } = await pool.query(
      `UPDATE users SET name=$1, role=$2, source=$3, username=COALESCE($4,username), updated_at=NOW()
       WHERE id=$5 RETURNING id,username,name,role,source`,
      [name, role, source || null, username || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'المستخدم غير موجود' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id  — أدمن فقط
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/:id/reset-password  — أدمن فقط
router.post('/:id/reset-password', authMiddleware, adminOnly, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 4)
    return res.status(400).json({ error: 'كلمة المرور قصيرة جداً' });

  try {
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password=$1, updated_at=NOW() WHERE id=$2', [hash, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
