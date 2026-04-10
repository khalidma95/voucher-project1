require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const allocationsRouter = require('./routes/allocations');
const babNamesRouter = require('./routes/bab-names');
const vouchersRouter = require('./routes/vouchers');
const transfersRouter = require('./routes/transfers');
const babRequestsRouter = require('./routes/bab-requests');
const notificationsRouter = require('./routes/notifications');
const auditLogRouter = require('./routes/audit-log');
const journalRouter = require('./routes/journal');
const accountsRouter = require('./routes/accounts');
const recordsRouter = require('./routes/records');
const settingsRouter = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static('uploads'));
// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/allocations', allocationsRouter);
app.use('/api/bab-names', babNamesRouter);
app.use('/api/vouchers', vouchersRouter);
app.use('/api/transfers', transfersRouter);
app.use('/api/bab-requests', babRequestsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/audit-log', auditLogRouter);
app.use('/api/journal', journalRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/records', recordsRouter);
app.use('/api/settings', settingsRouter);

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: err.message });
  }
});

// ── Error handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
