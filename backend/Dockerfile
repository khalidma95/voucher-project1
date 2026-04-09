FROM node:20-alpine

WORKDIR /app

# تثبيت الحزم أولاً للاستفادة من Docker cache
COPY package*.json ./
RUN npm ci --omit=dev

# نسخ باقي الملفات
COPY . .

# سكريبت بدء التشغيل
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 5000

ENTRYPOINT ["/entrypoint.sh"]
