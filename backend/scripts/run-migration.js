// تشغيل ملفات SQL لإنشاء الجداول
// node scripts/run-migration.js           ← يشغّل 001_init.sql
// node scripts/run-migration.js 002       ← يشغّل 002_records_extra.sql

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs   = require('fs');
const path = require('path');
const pool = require('../db');

async function migrate() {
  const arg  = process.argv[2] || '001';
  const file = arg === '002' ? '002_records_extra.sql'
             : arg === '003' ? '003_fix_vouchers.sql'
             : '001_init.sql';
  const sql  = fs.readFileSync(path.join(__dirname, '../migrations', file), 'utf8');
  console.log(`🔄 تشغيل migration: ${file}`);
  await pool.query(sql);
  console.log('✅ تمت العملية بنجاح');
  await pool.end();
}

migrate().catch(err => { console.error('❌ خطأ:', err.message); process.exit(1); });
