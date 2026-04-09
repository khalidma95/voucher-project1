const router = require('express').Router();
const pool   = require('../db');
const { authMiddleware } = require('../middleware/auth');

// ══════════════════════════════════════════════
// القيود اليومية (journal_entries) — مولودة من المعاملات
// ══════════════════════════════════════════════

// GET /api/journal/entries?source=...
router.get('/entries', authMiddleware, async (req, res) => {
  const { source } = req.query;
  try {
    const q = source
      ? `SELECT je.*, json_agg(jl.* ORDER BY jl.id) AS lines
         FROM journal_entries je
         LEFT JOIN journal_lines jl ON jl.journal_entry_id = je.id
         WHERE je.source=$1
         GROUP BY je.id ORDER BY je.created_at DESC`
      : `SELECT je.*, json_agg(jl.* ORDER BY jl.id) AS lines
         FROM journal_entries je
         LEFT JOIN journal_lines jl ON jl.journal_entry_id = je.id
         GROUP BY je.id ORDER BY je.created_at DESC`;
    const { rows } = await pool.query(q, source ? [source] : []);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/journal/entries
router.post('/entries', authMiddleware, async (req, res) => {
  const { voucher_id, ref, date, narration, source, status, lines } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // منع التكرار
    const dup = await client.query('SELECT id FROM journal_entries WHERE voucher_id=$1', [voucher_id]);
    let entryId;
    if (dup.rows[0]) {
      // تحديث
      await client.query(
        'UPDATE journal_entries SET ref=$1,date=$2,narration=$3,source=$4,status=$5 WHERE voucher_id=$6',
        [ref, date, narration, source, status || 'مرحّل', voucher_id]
      );
      entryId = dup.rows[0].id;
      await client.query('DELETE FROM journal_lines WHERE journal_entry_id=$1', [entryId]);
    } else {
      const { rows } = await client.query(
        `INSERT INTO journal_entries (voucher_id,ref,date,narration,source,status)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [voucher_id, ref, date, narration, source, status || 'مرحّل']
      );
      entryId = rows[0].id;
    }

    for (const line of (lines || [])) {
      await client.query(
        `INSERT INTO journal_lines (journal_entry_id,account,account_name,bab,debit,credit)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [entryId, line.account, line.account_name, line.bab || '', Number(line.debit || 0), Number(line.credit || 0)]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, id: entryId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /api/journal/entries/:voucherId
router.delete('/entries/:voucherId', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM journal_entries WHERE voucher_id=$1', [req.params.voucherId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// سندات القيد اليدوية (journals)
// ══════════════════════════════════════════════

// GET /api/journal/vouchers
router.get('/vouchers', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT j.*, json_agg(jr.* ORDER BY jr.sort_order) FILTER (WHERE jr.id IS NOT NULL) AS rows
       FROM journals j
       LEFT JOIN journal_rows jr ON jr.journal_id = j.id
       GROUP BY j.id ORDER BY j.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/journal/vouchers
router.post('/vouchers', authMiddleware, async (req, res) => {
  const { page_no, sigs, rows: jRows, created_by } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO journals (page_no,sigs,created_by) VALUES ($1,$2,$3) RETURNING id`,
      [page_no, JSON.stringify(sigs || {}), created_by]
    );
    const journalId = rows[0].id;

    for (let i = 0; i < (jRows || []).length; i++) {
      const r = jRows[i];
      await client.query(
        `INSERT INTO journal_rows
         (journal_id,sort_order,bayan,m3,d3,fari4,dal3,dal4,dal5,kulf5,kulf6,kulf7,kulf8,kulf9)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [journalId, i, r.bayan||'', r.m3||'', r.d3||'', r.fari4||'',
         r.dal3||'', r.dal4||'', r.dal5||'', r.kulf5||'', r.kulf6||'',
         r.kulf7||'', r.kulf8||'', r.kulf9||'']
      );
    }

    await client.query(
      `INSERT INTO notifications (type,icon,title,detail,username)
       VALUES ('journal','📒','سند قيد جديد',$1,$2)`,
      [`صفحة رقم: ${page_no}`, created_by || '']
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, id: journalId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/journal/vouchers/:id/archive — حفظ صورة الأرشيف
router.patch('/vouchers/:id/archive', authMiddleware, async (req, res) => {
  const { archive_img } = req.body;
  try {
    await pool.query('UPDATE journals SET archive_img=$1 WHERE id=$2', [archive_img, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/journal/vouchers/:id
router.delete('/vouchers/:id', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT page_no, created_by FROM journals WHERE id=$1', [req.params.id]);
    await pool.query('DELETE FROM journals WHERE id=$1', [req.params.id]);
    if (rows[0]) {
      await pool.query(
        `INSERT INTO notifications (type,icon,title,detail,username)
         VALUES ('journal','🗑️','حذف سند قيد',$1,$2)`,
        [`صفحة رقم: ${rows[0].page_no}`, rows[0].created_by || '']
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/journal/sig-defaults
router.get('/sig-defaults', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT value FROM settings WHERE key='journalSigDefaults'`);
    res.json(rows[0]?.value || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/journal/sig-defaults
router.put('/sig-defaults', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO settings (key,value) VALUES ('journalSigDefaults',$1)
       ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=NOW()`,
      [JSON.stringify(req.body)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
