const router = require('express').Router();
const pool   = require('../db');
const { authMiddleware } = require('../middleware/auth');

// ── helper ────────────────────────────────────────────────────
async function notif(client, { icon, title, detail, username }) {
  await client.query(
    `INSERT INTO notifications (type,icon,title,detail,username) VALUES ('record',$1,$2,$3,$4)`,
    [icon, title, detail || '', username || '']
  );
}

// ══════════════════════════════════════════════
// سجل الإيرادات
// ══════════════════════════════════════════════

router.get('/iradat', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ir.*, json_agg(irr.* ORDER BY irr.sort_order) FILTER (WHERE irr.id IS NOT NULL) AS rows
       FROM iradat_records ir
       LEFT JOIN iradat_rows irr ON irr.iradat_record_id = ir.id
       GROUP BY ir.id ORDER BY ir.id DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/iradat', authMiddleware, async (req, res) => {
  const { id, adad, mada, muhasaba, type_names, rows: rRows, created_by, date } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const recId = id || Date.now();

    await client.query(
      `INSERT INTO iradat_records (id,adad,mada,muhasaba,type_names,created_by,date)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET adad=$2,mada=$3,muhasaba=$4,type_names=$5,updated_at=NOW()`,
      [recId, adad||'', mada||'', muhasaba||'٦', JSON.stringify(type_names||[]), created_by||'', date||'']
    );

    await client.query('DELETE FROM iradat_rows WHERE iradat_record_id=$1', [recId]);
    for (let i = 0; i < (rRows||[]).length; i++) {
      const r = rRows[i];
      await client.query(
        `INSERT INTO iradat_rows (iradat_record_id,sort_order,
          t1_dinar,t1_fils,t2_dinar,t2_fils,t3_dinar,t3_fils,t4_dinar,t4_fils,
          t5_dinar,t5_fils,t6_dinar,t6_fils,t7_dinar,t7_fils,t8_dinar,t8_fils)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [recId, i,
         r.t1_dinar||'', r.t1_fils||'', r.t2_dinar||'', r.t2_fils||'',
         r.t3_dinar||'', r.t3_fils||'', r.t4_dinar||'', r.t4_fils||'',
         r.t5_dinar||'', r.t5_fils||'', r.t6_dinar||'', r.t6_fils||'',
         r.t7_dinar||'', r.t7_fils||'', r.t8_dinar||'', r.t8_fils||'']
      );
    }

    await notif(client, { icon:'💰', title: id ? 'تعديل سجل إيرادات' : 'سجل إيرادات جديد',
      detail:`العدد: ${adad||'—'} · المادة: ${mada||'—'}`, username: created_by });
    await client.query('COMMIT');
    res.status(201).json({ success: true, id: recId });
  } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: err.message }); }
  finally { client.release(); }
});

router.delete('/iradat/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM iradat_records WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════
// helper عام للسجلات ذات الصفوف البسيطة
// ══════════════════════════════════════════════
function makeRecordRoutes(tableName, rowsTable, fkCol, notifTitle) {
  const get = async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT r.*, json_agg(rr.* ORDER BY rr.sort_order) FILTER (WHERE rr.id IS NOT NULL) AS rows
         FROM ${tableName} r
         LEFT JOIN ${rowsTable} rr ON rr.${fkCol} = r.id
         GROUP BY r.id ORDER BY r.id DESC`
      );
      res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
  };

  const post = async (req, res) => {
    const { id, rows: rRows, created_by, date, ...rest } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const recId = id || Date.now();

      const cols = Object.keys(rest);
      const vals = Object.values(rest);
      const setCols = cols.map((c, i) => `${c}=$${i + 3}`).join(',');

      if (cols.length > 0) {
        await client.query(
          `INSERT INTO ${tableName} (id,created_by,date,${cols.join(',')})
           VALUES ($1,$2,${vals.map((_, i) => `$${i+3}`).join(',')})
           ON CONFLICT (id) DO UPDATE SET created_by=$2,${setCols},updated_at=NOW()`,
          [recId, created_by || '', date || '', ...vals]
        );
      } else {
        await client.query(
          `INSERT INTO ${tableName} (id,created_by,date)
           VALUES ($1,$2,$3)
           ON CONFLICT (id) DO UPDATE SET created_by=$2,updated_at=NOW()`,
          [recId, created_by || '', date || '']
        );
      }

      await client.query(`DELETE FROM ${rowsTable} WHERE ${fkCol}=$1`, [recId]);
      for (let i = 0; i < (rRows||[]).length; i++) {
        const r = rRows[i];
        await client.query(
          `INSERT INTO ${rowsTable} (${fkCol},sort_order,fils,dinar,tafasil,raqm,tarikh,mulahazat)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [recId, i, r.fils||'', r.dinar||'', r.tafasil||'', r.raqm||'', r.tarikh||'', r.mulahazat||'']
        );
      }

      await client.query(
        `INSERT INTO notifications (type,icon,title,username) VALUES ('record','📋',$1,$2)`,
        [notifTitle, created_by || '']
      );
      await client.query('COMMIT');
      res.status(201).json({ success: true, id: recId });
    } catch (err) { await client.query('ROLLBACK'); res.status(500).json({ error: err.message }); }
    finally { client.release(); }
  };

  const del = async (req, res) => {
    try {
      await pool.query(`DELETE FROM ${tableName} WHERE id=$1`, [req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  };

  return { get, post, del };
}

// سجل الخزائن (سلف - يمين)
const khazain = makeRecordRoutes('khazain_records', 'khazain_rows', 'khazain_record_id', 'سجل خزائن');
router.get('/khazain', authMiddleware, khazain.get);
router.post('/khazain', authMiddleware, khazain.post);
router.delete('/khazain/:id', authMiddleware, khazain.del);

// سجل الخزائن إلى (يسار)
const khazainIla = makeRecordRoutes('khazain_ila_records', 'khazain_ila_rows', 'khazain_ila_record_id', 'سجل خزائن إلى');
router.get('/khazain-ila', authMiddleware, khazainIla.get);
router.post('/khazain-ila', authMiddleware, khazainIla.post);
router.delete('/khazain-ila/:id', authMiddleware, khazainIla.del);

// سجل المدينون
const madinin = makeRecordRoutes('madinin_records', 'madinin_rows', 'madinin_record_id', 'سجل مدينون');
router.get('/madinin', authMiddleware, madinin.get);
router.post('/madinin', authMiddleware, madinin.post);
router.delete('/madinin/:id', authMiddleware, madinin.del);

// سجل الدائنون
const dainun = makeRecordRoutes('dainun_records', 'dainun_rows', 'dainun_record_id', 'سجل دائنون');
router.get('/dainun', authMiddleware, dainun.get);
router.post('/dainun', authMiddleware, dainun.post);
router.delete('/dainun/:id', authMiddleware, dainun.del);

// سجل الأمانات
const amanat = makeRecordRoutes('amanat_records', 'amanat_rows', 'amanat_record_id', 'سجل امانات');
router.get('/amanat', authMiddleware, amanat.get);
router.post('/amanat', authMiddleware, amanat.post);
router.delete('/amanat/:id', authMiddleware, amanat.del);

// سجل الأمانات إلى
const amanatIla = makeRecordRoutes('amanat_ila_records', 'amanat_ila_rows', 'amanat_ila_record_id', 'سجل امانات إلى');
router.get('/amanat-ila', authMiddleware, amanatIla.get);
router.post('/amanat-ila', authMiddleware, amanatIla.post);
router.delete('/amanat-ila/:id', authMiddleware, amanatIla.del);

// سجل المدينون إلى
const madininIla = makeRecordRoutes('madinin_ila_records', 'madinin_ila_rows', 'madinin_ila_record_id', 'سجل مدينون إلى');
router.get('/madinin-ila', authMiddleware, madininIla.get);
router.post('/madinin-ila', authMiddleware, madininIla.post);
router.delete('/madinin-ila/:id', authMiddleware, madininIla.del);

// سجل الدائنون إلى
const dainunIla = makeRecordRoutes('dainun_ila_records', 'dainun_ila_rows', 'dainun_ila_record_id', 'سجل دائنون إلى');
router.get('/dainun-ila', authMiddleware, dainunIla.get);
router.post('/dainun-ila', authMiddleware, dainunIla.post);
router.delete('/dainun-ila/:id', authMiddleware, dainunIla.del);

module.exports = router;
