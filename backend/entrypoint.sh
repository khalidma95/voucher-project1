#!/bin/sh
set -e

echo "⏳ تشغيل الـ migrations..."
node scripts/run-migration.js
node scripts/run-migration.js 002
node scripts/run-migration.js 003

echo "👤 تهيئة المستخدمين..."
node scripts/seed-users.js

echo "🚀 تشغيل السيرفر..."
exec node server.js
