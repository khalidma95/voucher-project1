-- إصلاح جدول vouchers — إضافة الأعمدة الناقصة
-- node scripts/run-migration.js 003

ALTER TABLE vouchers
  ADD COLUMN IF NOT EXISTS chk_no      VARCHAR(100) DEFAULT '',
  ADD COLUMN IF NOT EXISTS archive_img TEXT;

CREATE INDEX IF NOT EXISTS idx_vouchers_audited ON vouchers(audited);
