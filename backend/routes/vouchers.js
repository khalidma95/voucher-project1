const router = require('express').Router();
const pool   = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// helper لإضافة إشعار
async function addNotification(client, { type, icon, title, detail, username }) {
  await client.query(
    `INSERT INTO notifications (type,icon,title,detail,username)
     VALUES ($1,$2,$3,$4,$5)`,
    [type || 'info', icon || '🔔', title, detail || '', username || '']
  );
}

// helper لاقتطاع/إعادة المبلغ من التخصيصات
async function adjustAllocations(client, source, bab, amount) {
  if (source) {
    await client.query(
      'UPDATE allocations SET spent=spent+$1, updated_at=NOW() WHERE source=$2',
      [amount, source]
    );
  }
  if (source && bab) {
    await client.query(
      `INSERT INTO bab_allocations (source,bab,total,spent)
       VALUES ($1,$2,0,$3)
       ON CONFLICT (source,bab) DO UPDATE SET spent=bab_allocations.spent+$3, updated_at=NOW()`,
      [source, bab, amount]
    );
  }
}

// GET /api/vouchers?source=...&type=voucher|sarf
router.get('/', authMiddleware, async (req, res) => {
  const { source, type } = req.query;
  try {
    let q = 'SELECT * FROM vouchers WHERE 1=1';
    const params = [];
    if (source) { params.push(source); q += ` AND source=$${params.length}`; }
    if (type)   { params.push(type);   q += ` AND type=$${params.length}`; }
    else        { q += ` AND type<>'sarf'`; }
    q += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vouchers/sarf
router.get('/sarf', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM vouchers WHERE type='sarf' ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/vouchers/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM vouchers WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'غير موجود' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vouchers
router.post('/', authMiddleware, async (req, res) => {
  const { type, source, bab, doc_no, doc_date, chk_no, chk_amt, details, payee, notes, rows: vRows, created_by, saved_by } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO vouchers (type,source,bab,doc_no,doc_date,chk_no,chk_amt,details,payee,notes,rows,created_by,saved_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        type || 'voucher', source, bab, doc_no, doc_date, chk_no || '',
        Number(chk_amt || 0), details, payee, notes,
        JSON.stringify(vRows || []), created_by, saved_by,
      ]
    );
    const voucher = rows[0];

    // اقتطاع من التخصيصات (للمعاملات العادية فقط)
    if (type !== 'sarf') {
      await adjustAllocations(client, source, bab, Number(chk_amt || 0));
    }

    await addNotification(client, {
      type: 'voucher', icon: '📄', title: 'معاملة جديدة',
      detail: `${source || ''} - ${bab || ''} - ${Number(chk_amt || 0).toLocaleString('en-US')} IQD`,
      username: created_by || '',
    });

    await client.query('COMMIT');
    res.status(201).json(voucher);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/vouchers/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query('SELECT * FROM vouchers WHERE id=$1', [req.params.id]);
    const v = rows[0];
    if (!v) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'غير موجود' }); }

    // إعادة المبلغ للتخصيصات
    if (v.type !== 'sarf') {
      await adjustAllocations(client, v.source, v.bab, -Number(v.chk_amt || 0));
    }

    // حذف القيد اليومي المرتبط
    await client.query('DELETE FROM journal_entries WHERE voucher_id=$1', [v.id]);

    await client.query('DELETE FROM vouchers WHERE id=$1', [v.id]);

    await addNotification(client, {
      type: 'voucher', icon: '🗑️', title: 'حذف معاملة',
      detail: `${v.source || ''} - ${v.bab || ''} - ${Number(v.chk_amt || 0).toLocaleString('en-US')} IQD`,
      username: '',
    });

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/vouchers/:id/audit — تدقيق معاملة
router.patch('/:id/audit', authMiddleware, async (req, res) => {
  const { audited, auditor_name } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE vouchers SET audited=$1, auditor_name=$2, audited_at=NOW()
       WHERE id=$3 RETURNING *`,
      [Boolean(audited), auditor_name, req.params.id]
    );
    if (!rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'غير موجود' }); }

    await addNotification(client, {
      type: 'audit',
      icon: audited ? '✅' : '↩️',
      title: audited ? 'تدقيق معاملة' : 'إلغاء تدقيق',
      detail: `مستند #${String(req.params.id).slice(-6)}`,
      username: auditor_name || '',
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

// PUT /api/vouchers/:id — تحديث معاملة (مع تعديل التخصيص إذا تغير المبلغ)
router.put('/:id', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: old } = await client.query('SELECT * FROM vouchers WHERE id=$1', [req.params.id]);
    const v = old[0];
    if (!v) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'غير موجود' }); }

    const { chk_amt, chk_no, doc_no, doc_date, details, payee, notes, rows: vRows } = req.body;
    const newAmt = chk_amt !== undefined ? Number(chk_amt) : Number(v.chk_amt);
    const oldAmt = Number(v.chk_amt);

    if (v.type !== 'sarf' && newAmt !== oldAmt) {
      await adjustAllocations(client, v.source, v.bab, newAmt - oldAmt);
    }

    const { rows: updated } = await client.query(
      `UPDATE vouchers SET
        chk_amt=$1, chk_no=$2, doc_no=$3, doc_date=$4, details=$5, payee=$6, notes=$7, rows=$8
       WHERE id=$9 RETURNING *`,
      [
        newAmt,
        chk_no   !== undefined ? chk_no   : v.chk_no,
        doc_no   !== undefined ? doc_no   : v.doc_no,
        doc_date !== undefined ? doc_date : v.doc_date,
        details  !== undefined ? details  : v.details,
        payee    !== undefined ? payee    : v.payee,
        notes    !== undefined ? notes    : v.notes,
        vRows    !== undefined ? JSON.stringify(vRows) : v.rows,
        req.params.id,
      ]
    );

    await client.query('COMMIT');
    res.json(updated[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/vouchers/:id/archive — حفظ صورة الأرشيف
router.patch('/:id/archive', authMiddleware, async (req, res) => {
  const { archive_img } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE vouchers SET archive_img=$1 WHERE id=$2 RETURNING *',
      [archive_img, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'غير موجود' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
