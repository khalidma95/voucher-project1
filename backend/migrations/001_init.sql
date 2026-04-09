-- ══════════════════════════════════════════════════════════════
-- قاعدة بيانات نظام القسائم المالية
-- ══════════════════════════════════════════════════════════════

-- ── المستخدمون ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  username    VARCHAR(100) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,           -- bcrypt hash
  name        VARCHAR(255) NOT NULL,
  role        VARCHAR(50)  NOT NULL,           -- admin | accountant | auditor | voucher | records | journal
  source      VARCHAR(255),                    -- مصدر التمويل للمحاسب/المدقق
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── مصادر التمويل والتخصيصات الكلية ─────────────────────────
CREATE TABLE IF NOT EXISTS allocations (
  id          SERIAL PRIMARY KEY,
  source      VARCHAR(255) UNIQUE NOT NULL,
  total       NUMERIC(15,3) DEFAULT 0,
  spent       NUMERIC(15,3) DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── أسماء أبواب الصرف لكل مصدر ──────────────────────────────
CREATE TABLE IF NOT EXISTS bab_names (
  id          SERIAL PRIMARY KEY,
  source      VARCHAR(255) NOT NULL,
  bab         VARCHAR(255) NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  UNIQUE(source, bab)
);

-- ── تخصيصات أبواب الصرف ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS bab_allocations (
  id          SERIAL PRIMARY KEY,
  source      VARCHAR(255) NOT NULL,
  bab         VARCHAR(255) NOT NULL,
  total       NUMERIC(15,3) DEFAULT 0,
  spent       NUMERIC(15,3) DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, bab)
);

-- ── المعاملات (قسائم المحاسب + مستندات الصرف) ──────────────
CREATE TABLE IF NOT EXISTS vouchers (
  id          SERIAL PRIMARY KEY,
  type        VARCHAR(20) DEFAULT 'voucher',   -- 'voucher' | 'sarf'
  source      VARCHAR(255),
  bab         VARCHAR(255),
  doc_no      VARCHAR(100),
  doc_date    VARCHAR(50),
  chk_amt     NUMERIC(15,3) DEFAULT 0,
  details     TEXT,
  payee       VARCHAR(255),
  notes       TEXT,
  rows        JSONB DEFAULT '[]',              -- صفوف مستند الصرف
  audited     BOOLEAN DEFAULT FALSE,
  auditor_name VARCHAR(255),
  audited_at  TIMESTAMPTZ,
  created_by  VARCHAR(255),
  saved_by    VARCHAR(255),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── المناقلات بين أبواب الصرف ────────────────────────────────
CREATE TABLE IF NOT EXISTS transfers (
  id          SERIAL PRIMARY KEY,
  source      VARCHAR(255) NOT NULL,
  from_bab    VARCHAR(255) NOT NULL,
  to_bab      VARCHAR(255) NOT NULL,
  amount      NUMERIC(15,3) NOT NULL,
  note        TEXT,
  date        VARCHAR(50),
  status      VARCHAR(20) DEFAULT 'pending',   -- pending | approved | rejected
  requested_by VARCHAR(255),
  approved_by  VARCHAR(255),
  rejected_by  VARCHAR(255),
  reject_note  TEXT,
  approved_at  TIMESTAMPTZ,
  rejected_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── طلبات تعديل أبواب الصرف ──────────────────────────────────
CREATE TABLE IF NOT EXISTS bab_requests (
  id          SERIAL PRIMARY KEY,
  source      VARCHAR(255) NOT NULL,
  bab         VARCHAR(255) NOT NULL,           -- '__total__' للتخصيص الكلي
  old_value   NUMERIC(15,3) NOT NULL,
  new_value   NUMERIC(15,3) NOT NULL,
  note        TEXT,
  status      VARCHAR(20) DEFAULT 'pending',   -- pending | approved | rejected
  requested_by VARCHAR(255),
  approved_by  VARCHAR(255),
  rejected_by  VARCHAR(255),
  reject_note  TEXT,
  approved_at  TIMESTAMPTZ,
  rejected_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── الإشعارات ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          BIGSERIAL PRIMARY KEY,
  type        VARCHAR(50) DEFAULT 'info',
  icon        VARCHAR(10) DEFAULT '🔔',
  title       VARCHAR(255) NOT NULL,
  detail      TEXT DEFAULT '',
  username    VARCHAR(255) DEFAULT '',
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── سجل العمليات ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  user_name   VARCHAR(255),
  user_role   VARCHAR(50),
  action      VARCHAR(50),                     -- login | logout | create | update | delete | import | export | print
  entity      VARCHAR(100),                    -- voucher | record | account | ...
  detail      TEXT,
  entity_id   VARCHAR(255),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── القيود اليومية (مولودة تلقائياً من المعاملات) ───────────
CREATE TABLE IF NOT EXISTS journal_entries (
  id          SERIAL PRIMARY KEY,
  voucher_id  INTEGER REFERENCES vouchers(id) ON DELETE CASCADE,
  ref         VARCHAR(100),
  date        VARCHAR(50),
  narration   TEXT,
  source      VARCHAR(255),
  status      VARCHAR(50) DEFAULT 'مرحّل',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_lines (
  id              SERIAL PRIMARY KEY,
  journal_entry_id INTEGER REFERENCES journal_entries(id) ON DELETE CASCADE,
  account         VARCHAR(100),
  account_name    VARCHAR(255),
  bab             VARCHAR(255),
  debit           NUMERIC(15,3) DEFAULT 0,
  credit          NUMERIC(15,3) DEFAULT 0
);

-- ── سندات القيد (يدوية — صفحة Journal) ─────────────────────
CREATE TABLE IF NOT EXISTS journals (
  id          SERIAL PRIMARY KEY,
  page_no     VARCHAR(100),
  sigs        JSONB DEFAULT '{}',              -- { munazzim, muhasib, dirHisabat, mudaqqiq, musadaqa }
  archive_img TEXT,                            -- base64 صورة الأرشيف
  created_by  VARCHAR(255),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_rows (
  id          SERIAL PRIMARY KEY,
  journal_id  INTEGER REFERENCES journals(id) ON DELETE CASCADE,
  sort_order  INTEGER DEFAULT 0,
  bayan       TEXT DEFAULT '',
  m3          VARCHAR(100) DEFAULT '',
  d3          VARCHAR(100) DEFAULT '',
  fari4       VARCHAR(100) DEFAULT '',
  dal3        VARCHAR(100) DEFAULT '',
  dal4        VARCHAR(100) DEFAULT '',
  dal5        VARCHAR(100) DEFAULT '',
  kulf5       VARCHAR(100) DEFAULT '',
  kulf6       VARCHAR(100) DEFAULT '',
  kulf7       VARCHAR(100) DEFAULT '',
  kulf8       VARCHAR(100) DEFAULT '',
  kulf9       VARCHAR(100) DEFAULT ''
);

-- ── الدليل المحاسبي ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(50),
  name        VARCHAR(255) NOT NULL,
  parent_code VARCHAR(50),
  level       INTEGER DEFAULT 1,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── سجل الإيرادات ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS iradat_records (
  id          BIGINT PRIMARY KEY,             -- timestamp من الفرونت اند
  adad        VARCHAR(100) DEFAULT '',
  mada        VARCHAR(255) DEFAULT '',
  muhasaba    VARCHAR(50)  DEFAULT '٦',
  type_names  JSONB DEFAULT '[]',             -- [ "النوع1", "النوع2", ... ] (8 عناصر)
  created_by  VARCHAR(255) DEFAULT '',
  date        VARCHAR(50)  DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS iradat_rows (
  id              SERIAL PRIMARY KEY,
  iradat_record_id BIGINT REFERENCES iradat_records(id) ON DELETE CASCADE,
  sort_order      INTEGER DEFAULT 0,
  t1_dinar  VARCHAR(50) DEFAULT '', t1_fils  VARCHAR(50) DEFAULT '',
  t2_dinar  VARCHAR(50) DEFAULT '', t2_fils  VARCHAR(50) DEFAULT '',
  t3_dinar  VARCHAR(50) DEFAULT '', t3_fils  VARCHAR(50) DEFAULT '',
  t4_dinar  VARCHAR(50) DEFAULT '', t4_fils  VARCHAR(50) DEFAULT '',
  t5_dinar  VARCHAR(50) DEFAULT '', t5_fils  VARCHAR(50) DEFAULT '',
  t6_dinar  VARCHAR(50) DEFAULT '', t6_fils  VARCHAR(50) DEFAULT '',
  t7_dinar  VARCHAR(50) DEFAULT '', t7_fils  VARCHAR(50) DEFAULT '',
  t8_dinar  VARCHAR(50) DEFAULT '', t8_fils  VARCHAR(50) DEFAULT ''
);

-- ── سجل الخزائن (سلف - يمين) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS khazain_records (
  id          BIGINT PRIMARY KEY,
  muhasaba    VARCHAR(100) DEFAULT '',
  madfuat     VARCHAR(255) DEFAULT '',
  muhafaza    VARCHAR(255) DEFAULT '',
  shahr       VARCHAR(100) DEFAULT '',
  created_by  VARCHAR(255) DEFAULT '',
  date        VARCHAR(50)  DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS khazain_rows (
  id                  SERIAL PRIMARY KEY,
  khazain_record_id   BIGINT REFERENCES khazain_records(id) ON DELETE CASCADE,
  sort_order          INTEGER DEFAULT 0,
  fils                VARCHAR(50)  DEFAULT '',
  dinar               VARCHAR(100) DEFAULT '',
  tafasil             TEXT DEFAULT '',
  raqm                VARCHAR(100) DEFAULT '',
  tarikh              VARCHAR(50)  DEFAULT '',
  mulahazat           TEXT DEFAULT ''
);

-- ── سجل الخزائن (سلف - يسار / إلى) ──────────────────────────
CREATE TABLE IF NOT EXISTS khazain_ila_records (
  id          BIGINT PRIMARY KEY,
  muhasaba    VARCHAR(100) DEFAULT '',
  madfuat     VARCHAR(255) DEFAULT '',
  muhafaza    VARCHAR(255) DEFAULT '',
  shahr       VARCHAR(100) DEFAULT '',
  created_by  VARCHAR(255) DEFAULT '',
  date        VARCHAR(50)  DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS khazain_ila_rows (
  id                      SERIAL PRIMARY KEY,
  khazain_ila_record_id   BIGINT REFERENCES khazain_ila_records(id) ON DELETE CASCADE,
  sort_order              INTEGER DEFAULT 0,
  fils                    VARCHAR(50)  DEFAULT '',
  dinar                   VARCHAR(100) DEFAULT '',
  tafasil                 TEXT DEFAULT '',
  raqm                    VARCHAR(100) DEFAULT '',
  tarikh                  VARCHAR(50)  DEFAULT '',
  mulahazat               TEXT DEFAULT ''
);

-- ── سجل المدينون ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS madinin_records (
  id          BIGINT PRIMARY KEY,
  bayan       TEXT DEFAULT '',
  mul_hdr     VARCHAR(255) DEFAULT '',
  created_by  VARCHAR(255) DEFAULT '',
  date        VARCHAR(50)  DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS madinin_rows (
  id                  SERIAL PRIMARY KEY,
  madinin_record_id   BIGINT REFERENCES madinin_records(id) ON DELETE CASCADE,
  sort_order          INTEGER DEFAULT 0,
  fils                VARCHAR(50)  DEFAULT '',
  dinar               VARCHAR(100) DEFAULT '',
  tafasil             TEXT DEFAULT '',
  raqm                VARCHAR(100) DEFAULT '',
  tarikh              VARCHAR(50)  DEFAULT '',
  mulahazat           TEXT DEFAULT ''
);

-- ── سجل الدائنون ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dainun_records (
  id          BIGINT PRIMARY KEY,
  bayan       TEXT DEFAULT '',
  mul_hdr     VARCHAR(255) DEFAULT '',
  created_by  VARCHAR(255) DEFAULT '',
  date        VARCHAR(50)  DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dainun_rows (
  id                  SERIAL PRIMARY KEY,
  dainun_record_id    BIGINT REFERENCES dainun_records(id) ON DELETE CASCADE,
  sort_order          INTEGER DEFAULT 0,
  fils                VARCHAR(50)  DEFAULT '',
  dinar               VARCHAR(100) DEFAULT '',
  tafasil             TEXT DEFAULT '',
  raqm                VARCHAR(100) DEFAULT '',
  tarikh              VARCHAR(50)  DEFAULT '',
  mulahazat           TEXT DEFAULT ''
);

-- ── إعدادات النظام ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── فهارس للأداء ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vouchers_source      ON vouchers(source);
CREATE INDEX IF NOT EXISTS idx_vouchers_type        ON vouchers(type);
CREATE INDEX IF NOT EXISTS idx_vouchers_created_at  ON vouchers(created_at);
CREATE INDEX IF NOT EXISTS idx_transfers_source     ON transfers(source);
CREATE INDEX IF NOT EXISTS idx_transfers_status     ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_bab_requests_source  ON bab_requests(source);
CREATE INDEX IF NOT EXISTS idx_bab_requests_status  ON bab_requests(status);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_journal_entries_voucher ON journal_entries(voucher_id);

-- ══════════════════════════════════════════════════════════════
-- البيانات الافتراضية
-- ══════════════════════════════════════════════════════════════

-- مصادر التمويل
INSERT INTO allocations (source, total, spent) VALUES
  ('برنامج تطوير المختبرات', 0, 0),
  ('برنامج صيانة الاصناف',   0, 0),
  ('حملة الدعم',              0, 0)
ON CONFLICT (source) DO NOTHING;

-- أبواب الصرف الافتراضية
INSERT INTO bab_names (source, bab, sort_order) VALUES
  ('برنامج تطوير المختبرات', 'الات ومعدات',     1),
  ('برنامج تطوير المختبرات', 'وسائل نقل',       2),
  ('برنامج تطوير المختبرات', 'متنوعة',           3),
  ('برنامج تطوير المختبرات', 'مكافآت',           4),
  ('برنامج تطوير المختبرات', 'ايفادات',          5),
  ('برنامج تطوير المختبرات', 'لوازم وسلع',       6),
  ('برنامج تطوير المختبرات', 'بناء وانشاءات',    7),
  ('برنامج صيانة الاصناف',   'الات ومعدات',     1),
  ('برنامج صيانة الاصناف',   'وسائل نقل',       2),
  ('برنامج صيانة الاصناف',   'متنوعة',           3),
  ('برنامج صيانة الاصناف',   'مكافآت',           4),
  ('برنامج صيانة الاصناف',   'ايفادات',          5),
  ('برنامج صيانة الاصناف',   'لوازم وسلع',       6),
  ('برنامج صيانة الاصناف',   'بناء وانشاءات',    7),
  ('حملة الدعم', 'اجور نقل',                      1),
  ('حملة الدعم', 'اخرى متنوعة',                   2),
  ('حملة الدعم', 'الوقود / اخرى',                 3),
  ('حملة الدعم', 'صيانة السيارات والات والمعدات والاجهزة والمستلزمات الاخرى', 4),
  ('حملة الدعم', 'الايفادات',                     5),
  ('حملة الدعم', 'الاطعام للعاملين في حملة الدعم والساندين', 6),
  ('حملة الدعم', 'مكافأت',                        7),
  ('حملة الدعم', 'الساعات الاضافية',               8)
ON CONFLICT (source, bab) DO NOTHING;

-- تخصيصات أبواب الصرف الافتراضية (صفر)
INSERT INTO bab_allocations (source, bab, total, spent)
SELECT source, bab, 0, 0 FROM bab_names
ON CONFLICT (source, bab) DO NOTHING;
