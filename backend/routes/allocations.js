const router = require('express').Router();
const pool   = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /api/allocations
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM allocations ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/allocations/bab  — كل تخصيصات الأبواب
router.get('/bab', authMiddleware, async (req, res) => {
  const { source } = req.query;
  try {
    const q = source
      ? 'SELECT * FROM bab_allocations WHERE source=$1 ORDER BY source,bab'
      : 'SELECT * FROM bab_allocations ORDER BY source,bab';
    const { rows } = await pool.query(q, source ? [source] : []);
    // إرجاع بنفس شكل localStorage: { "source__bab": { source, bab, total, spent } }
    const map = {};
    rows.forEach(r => { map[`${r.source}__${r.bab}`] = { source: r.source, bab: r.bab, total: Number(r.total), spent: Number(r.spent) }; });
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/allocations/:source — تعديل تخصيص كلي (أدمن)
router.put('/:source', authMiddleware, adminOnly, async (req, res) => {
  const { total } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE allocations SET total=$1, updated_at=NOW()
       WHERE source=$2 RETURNING *`,
      [Number(total), req.params.source]
    );
    if (!rows[0]) return res.status(404).json({ error: 'المصدر غير موجود' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/allocations/bab/:source/:bab — تعديل تخصيص باب (أدمن)
router.put('/bab/:source/:bab', authMiddleware, adminOnly, async (req, res) => {
  const { total } = req.body;
  const { source, bab } = req.params;
  try {
    const { rows } = await pool.query(
      `INSERT INTO bab_allocations (source,bab,total,spent)
       VALUES ($1,$2,$3,0)
       ON CONFLICT (source,bab) DO UPDATE SET total=$3, updated_at=NOW()
       RETURNING *`,
      [source, bab, Number(total)]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
