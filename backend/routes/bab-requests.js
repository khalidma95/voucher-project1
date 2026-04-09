const router = require('express').Router();
const pool   = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

async function addNotification(client, { type, icon, title, detail, username }) {
  await client.query(
    `INSERT INTO notifications (type,icon,title,detail,username) VALUES ($1,$2,$3,$4,$5)`,
    [type || 'info', icon || '🔔', title, detail || '', username || '']
  );
}

// GET /api/bab-requests?source=...
router.get('/', authMiddleware, async (req, res) => {
  const { source } = req.query;
  try {
    const q = source
      ? 'SELECT * FROM bab_requests WHERE source=$1 ORDER BY created_at DESC'
      : 'SELECT * FROM bab_requests ORDER BY created_at DESC';
    const { rows } = await pool.query(q, source ? [source] : []);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bab-requests — طلب تعديل
router.post('/', authMiddleware, async (req, res) => {
  const { source, bab, old_value, new_value, note, requested_by } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO bab_requests (source,bab,old_value,new_value,note,requested_by,status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending') RETURNING *`,
      [source, bab, Number(old_value), Number(new_value), note || '', requested_by]
    );

    await addNotification(client, {
      type: 'bab', icon: '📝', title: 'طلب تعديل باب صرف',
      detail: `${source} - ${bab === '__total__' ? 'التخصيص الكلي' : bab}: ${Number(old_value).toLocaleString('en-US')} → ${Number(new_value).toLocaleString('en-US')}`,
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

// PATCH /api/bab-requests/:id/approve — موافقة (أدمن)
router.patch('/:id/approve', authMiddleware, adminOnly, async (req, res) => {
  const { admin_name } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: rr } = await client.query('SELECT * FROM bab_requests WHERE id=$1', [req.params.id]);
    const r = rr[0];
    if (!r) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'غير موجود' }); }

    if (r.bab === '__total__') {
      await client.query(
        'UPDATE allocations SET total=$1, updated_at=NOW() WHERE source=$2',
        [r.new_value, r.source]
      );
    } else {
      await client.query(
        `INSERT INTO bab_allocations (source,bab,total,spent) VALUES ($1,$2,$3,0)
         ON CONFLICT (source,bab) DO UPDATE SET total=$3, updated_at=NOW()`,
        [r.source, r.bab, r.new_value]
      );
    }

    const { rows } = await client.query(
      `UPDATE bab_requests SET status='approved', approved_by=$1, approved_at=NOW()
       WHERE id=$2 RETURNING *`,
      [admin_name, req.params.id]
    );

    await addNotification(client, {
      type: 'bab', icon: '✅', title: 'موافقة تعديل باب',
      detail: `${r.source} - ${r.bab === '__total__' ? 'التخصيص الكلي' : r.bab}`,
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

// PATCH /api/bab-requests/:id/reject — رفض (أدمن)
router.patch('/:id/reject', authMiddleware, adminOnly, async (req, res) => {
  const { admin_name, reject_note } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE bab_requests SET status='rejected', rejected_by=$1, reject_note=$2, rejected_at=NOW()
       WHERE id=$3 RETURNING *`,
      [admin_name, reject_note || '', req.params.id]
    );
    if (!rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'غير موجود' }); }

    await addNotification(client, {
      type: 'bab', icon: '❌', title: 'رفض تعديل باب',
      detail: `${rows[0].source} - ${rows[0].bab}`,
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

// DELETE /api/bab-requests/:id — إلغاء (pending فقط)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM bab_requests WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'غير موجود' });
    if (rows[0].status !== 'pending') return res.status(400).json({ error: 'لا يمكن إلغاء طلب غير pending' });
    await pool.query('DELETE FROM bab_requests WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
