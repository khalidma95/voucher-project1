// سكريبت بذر المستخدمين الافتراضيين مع تشفير كلمات المرور
// node scripts/seed-users.js

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcrypt');
const pool   = require('../db');

const DEFAULT_USERS = [
  { username:'admin',    password:'admin123',   role:'admin',      name:'عمار رياض - مدير القسم',     source: null },
  { username:'ibrahim',  password:'ibrahim123', role:'accountant', name:'ابراهيم - محاسب',             source:'برنامج تطوير المختبرات' },
  { username:'ali',      password:'ali123',     role:'accountant', name:'علي - محاسب',                 source:'برنامج صيانة الاصناف' },
  { username:'anas',     password:'anas123',    role:'accountant', name:'أنس - محاسب',                 source:'حملة الدعم' },
  { username:'auditor1', password:'audit123',   role:'auditor',    name:'مدقق المختبرات',              source:'برنامج تطوير المختبرات' },
  { username:'auditor2', password:'audit456',   role:'auditor',    name:'مدقق صيانة الاصناف',          source:'برنامج صيانة الاصناف' },
  { username:'auditor3', password:'audit789',   role:'auditor',    name:'مدقق حملة الدعم',             source:'حملة الدعم' },
  { username:'sarf',     password:'sarf123',    role:'voucher',    name:'مستخدم الصرف',                source: null },
  { username:'sijilat',  password:'sijilat123', role:'records',    name:'مستخدم السجلات',              source: null },
  { username:'sanad',    password:'sanad123',   role:'journal',    name:'مستخدم سند القيد',            source: null },
];

async function seed() {
  console.log('🌱 بذر المستخدمين الافتراضيين...');
  for (const u of DEFAULT_USERS) {
    const hash = await bcrypt.hash(u.password, 10);
    await pool.query(
      `INSERT INTO users (username,password,name,role,source)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (username) DO NOTHING`,
      [u.username, hash, u.name, u.role, u.source]
    );
    console.log(`  ✅ ${u.username} (${u.role})`);
  }
  console.log('✅ تم بذر المستخدمين بنجاح');
  await pool.end();
}

seed().catch(err => { console.error('❌ خطأ:', err.message); process.exit(1); });
