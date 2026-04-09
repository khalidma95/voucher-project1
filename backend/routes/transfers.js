const router = require('express').Router();
const pool   = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

async function addNotification(client, { type, icon, title, detail, username }) {
  await client.query(
    `INSERT INTO notifications (type,icon,title,detail,username) VALUES ($1,$2,$3,$4,$5)`,
    [type || 'info', icon || '🔔', title, detail || '', username || '']
  );
}

// GET /api/transfers?source=...
router.get('/', authMiddleware, async (req, res) => {
  const { source } = req.query;
  try {
    const q = source
      ? 'SELECT * FROM transfers WHERE source=$1 ORDER BY created_at DESC'
      : 'SELECT * FROM transfers ORDER BY created_at DESC';
    const { rows } = await pool.query(q, source ? [source] : []);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transfers — طلب مناقلة (محاسب)
router.post('/', authMiddleware, async (req, res) => {
  const { source, from_bab, to_bab, amount, note, date, requested_by } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO transfers (source,from_bab,to_bab,amount,note,date,requested_by,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending') RETURNING *`,
      [source, from_bab, to_bab, Number(amount), note || '', date, requested_by]
    );

    await addNotification(client, {
      type: 'transfer', icon: '🔄', title: 'طلب مناقلة جديد',
      detail: `${source}: ${from_bab} ← ${to_bab} (${Number(amount).toLocaleString('en-US')} IQD)`,
      username: requested_by || '',
    });

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/transfers/:id/approve — موافقة (أدمن)
router.patch('/:id/approve', authMiddleware, adminOnly, async (req, res) => {
  const { admin_name } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: tr } = await client.query('SELECT * FROM transfers WHERE id=$1', [req.params.id]);
    const t = tr[0];
    if (!t) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'غير موجود' }); }
    if (t.status !== 'pending') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'الطلب ليس pending' }); }

    // تطبيق المناقلة — اقتطاع من المصدر وإضافة للوجهة
    await client.query(
      `UPDATE bab_allocations SET total=total-$1, updated_at=NOW() WHERE source=$2 AND bab=$3`,
      [t.amount, t.source, t.from_bab]
    );
    await client.query(
      `INSERT INTO bab_allocations (source,bab,total,spent) VALUES ($1,$2,$3,0)
       ON CONFLICT (source,bab) DO UPDATE SET total=bab_allocations.total+$3, updated_at=NOW()`,
      [t.source, t.to_bab, t.amount]
    );

    const { rows } = await client.query(
      `UPDATE transfers SET status='approved', approved_by=$1, approved_at=NOW()
       WHERE id=$2 RETURNING *`,
      [admin_name, req.params.id]
    );

    await addNotification(client, {
      type: 'transfer', icon: '✅', title: 'موافقة على مناقلة',
      detail: `${t.source}: ${t.from_bab} → ${t.to_bab}`,
      username: admin_name || '',
    });

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/transfers/:id/reject — رفض (أدمن)
router.patch('/:id/reject', authMiddleware, adminOnly, async (req, res) => {
  const { admin_name, reject_note } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE transfers SET status='rejected', rejected_by=$1, reject_note=$2, rejected_at=NOW()
       WHERE id=$3 RETURNING *`,
      [admin_name, reject_note || '', req.params.id]
    );
    if (!rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'غير موجود' }); }

    await addNotification(client, {
      type: 'transfer', icon: '❌', title: 'رفض مناقلة',
      detail: `${rows[0].source}: ${rows[0].from_bab} → ${rows[0].to_bab}`,
      username: admin_name || '',
    });

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/transfers/:id — إلغاء (pending) أو حذف مع عكس (approved — أدمن)
router.delete('/:id', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: tr } = await client.query('SELECT * FROM transfers WHERE id=$1', [req.params.id]);
    const t = tr[0];
    if (!t) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'غير موجود' }); }

    if (t.status === 'pending' && req.user.role !== 'admin' && req.user.name !== t.requested_by) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'غير مصرح' });
    }

    // عكس المناقلة إذا كانت موافقاً عليها
    if (t.status === 'approved') {
      if (req.user.role !== 'admin') { await client.query('ROLLBACK'); return res.status(403).json({ error: 'للمدير فقط' }); }
      await client.query(
        'UPDATE bab_allocations SET total=total+$1, updated_at=NOW() WHERE source=$2 AND bab=$3',
        [t.amount, t.source, t.from_bab]
      );
      await client.query(
        'UPDATE bab_allocations SET total=total-$1, updated_at=NOW() WHERE source=$2 AND bab=$3',
        [t.amount, t.source, t.to_bab]
      );
    }

    await client.query('DELETE FROM transfers WHERE id=$1', [req.params.id]);
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
