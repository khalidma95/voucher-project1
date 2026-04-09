-- جداول إضافية للسجلات (أمانات، مدينون إلى، دائنون إلى)
-- Run: node scripts/run-migration.js 002

CREATE TABLE IF NOT EXISTS amanat_records (
  id BIGINT PRIMARY KEY,
  bayan TEXT NOT NULL DEFAULT '',
  mul_hdr TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS amanat_rows (
  id SERIAL PRIMARY KEY,
  amanat_record_id BIGINT NOT NULL REFERENCES amanat_records(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  fils TEXT NOT NULL DEFAULT '',
  dinar TEXT NOT NULL DEFAULT '',
  tafasil TEXT NOT NULL DEFAULT '',
  raqm TEXT NOT NULL DEFAULT '',
  tarikh TEXT NOT NULL DEFAULT '',
  mulahazat TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS amanat_ila_records (
  id BIGINT PRIMARY KEY,
  bayan TEXT NOT NULL DEFAULT '',
  mul_hdr TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS amanat_ila_rows (
  id SERIAL PRIMARY KEY,
  amanat_ila_record_id BIGINT NOT NULL REFERENCES amanat_ila_records(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  fils TEXT NOT NULL DEFAULT '',
  dinar TEXT NOT NULL DEFAULT '',
  tafasil TEXT NOT NULL DEFAULT '',
  raqm TEXT NOT NULL DEFAULT '',
  tarikh TEXT NOT NULL DEFAULT '',
  mulahazat TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS madinin_ila_records (
  id BIGINT PRIMARY KEY,
  bayan TEXT NOT NULL DEFAULT '',
  mul_hdr TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS madinin_ila_rows (
  id SERIAL PRIMARY KEY,
  madinin_ila_record_id BIGINT NOT NULL REFERENCES madinin_ila_records(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  fils TEXT NOT NULL DEFAULT '',
  dinar TEXT NOT NULL DEFAULT '',
  tafasil TEXT NOT NULL DEFAULT '',
  raqm TEXT NOT NULL DEFAULT '',
  tarikh TEXT NOT NULL DEFAULT '',
  mulahazat TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS dainun_ila_records (
  id BIGINT PRIMARY KEY,
  bayan TEXT NOT NULL DEFAULT '',
  mul_hdr TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dainun_ila_rows (
  id SERIAL PRIMARY KEY,
  dainun_ila_record_id BIGINT NOT NULL REFERENCES dainun_ila_records(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  fils TEXT NOT NULL DEFAULT '',
  dinar TEXT NOT NULL DEFAULT '',
  tafasil TEXT NOT NULL DEFAULT '',
  raqm TEXT NOT NULL DEFAULT '',
  tarikh TEXT NOT NULL DEFAULT '',
  mulahazat TEXT NOT NULL DEFAULT ''
);
