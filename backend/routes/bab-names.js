const router = require('express').Router();
const pool   = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /api/bab-names?source=...
router.get('/', authMiddleware, async (req, res) => {
  const { source } = req.query;
  try {
    const q = source
      ? 'SELECT bab FROM bab_names WHERE source=$1 ORDER BY sort_order,id'
      : 'SELECT source,bab,sort_order FROM bab_names ORDER BY source,sort_order,id';
    const { rows } = await pool.query(q, source ? [source] : []);

    if (source) return res.json(rows.map(r => r.bab));

    // إرجاع كـ map { source: [bab1, bab2, ...] }
    const map = {};
    rows.forEach(r => {
      if (!map[r.source]) map[r.source] = [];
      map[r.source].push(r.bab);
    });
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bab-names — إضافة باب جديد (أدمن)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  const { source, bab } = req.body;
  if (!source || !bab?.trim())
    return res.status(400).json({ error: 'أدخل المصدر واسم الباب' });

  try {
    const maxOrder = await pool.query(
      'SELECT COALESCE(MAX(sort_order),0)+1 AS next FROM bab_names WHERE source=$1', [source]
    );
    await pool.query(
      'INSERT INTO bab_names (source,bab,sort_order) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [source, bab.trim(), maxOrder.rows[0].next]
    );
    await pool.query(
      `INSERT INTO bab_allocations (source,bab,total,spent) VALUES ($1,$2,0,0) ON CONFLICT DO NOTHING`,
      [source, bab.trim()]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/bab-names/rename — إعادة تسمية باب (أدمن)
router.put('/rename', authMiddleware, adminOnly, async (req, res) => {
  const { source, oldName, newName } = req.body;
  if (!source || !oldName || !newName?.trim())
    return res.status(400).json({ error: 'بيانات ناقصة' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'UPDATE bab_names SET bab=$1 WHERE source=$2 AND bab=$3',
      [newName.trim(), source, oldName]
    );
    // تحديث bab_allocations
    await client.query(
      'UPDATE bab_allocations SET bab=$1 WHERE source=$2 AND bab=$3',
      [newName.trim(), source, oldName]
    );
    // تحديث المعاملات
    await client.query(
      'UPDATE vouchers SET bab=$1 WHERE source=$2 AND bab=$3',
      [newName.trim(), source, oldName]
    );
    // تحديث المناقلات
    await client.query(
      'UPDATE transfers SET from_bab=$1 WHERE source=$2 AND from_bab=$3',
      [newName.trim(), source, oldName]
    );
    await client.query(
      'UPDATE transfers SET to_bab=$1 WHERE source=$2 AND to_bab=$3',
      [newName.trim(), source, oldName]
    );
    // تحديث طلبات الأبواب
    await client.query(
      'UPDATE bab_requests SET bab=$1 WHERE source=$2 AND bab=$3',
      [newName.trim(), source, oldName]
    );

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
