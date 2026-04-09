const router = require('express').Router();
const pool   = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /api/accounts
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM chart_of_accounts ORDER BY sort_order, id'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/accounts — استبدال كامل (أدمن)
router.put('/', authMiddleware, adminOnly, async (req, res) => {
  const { rows: accs } = req.body;
  if (!Array.isArray(accs)) return res.status(400).json({ error: 'بيانات غير صالحة' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE chart_of_accounts RESTART IDENTITY');

    for (let i = 0; i < accs.length; i++) {
      const a = accs[i];
      await client.query(
        `INSERT INTO chart_of_accounts (code,name,parent_code,level,sort_order)
         VALUES ($1,$2,$3,$4,$5)`,
        [a.code || null, a.name, a.parent_code || null, a.level || 1, i]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/accounts — إضافة حساب
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  const { code, name, parent_code, level } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم الحساب مطلوب' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO chart_of_accounts (code,name,parent_code,level)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [code || null, name, parent_code || null, level || 1]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/accounts/:id
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM chart_of_accounts WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
