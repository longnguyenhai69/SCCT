# SCCT — Quản lý thiết bị cơ điện

Monorepo gồm:
- **server/** — Express + MySQL (mysql2), JWT, phục vụ luôn frontend đã build.
- **client/** — Vue 3 + TypeScript + Element Plus (Vite).

Khi chạy production chỉ cần **1 tiến trình Node** (`server`): nó vừa trả API `/api/*`,
vừa serve bản build Vue tĩnh trong `server/public`.

## Chạy local (dev)

```bash
# 1. Cài deps
npm run install:all          # = cài cho cả server và client

# 2. Tạo CSDL MySQL local rồi import schema (+ seed nếu muốn)
mysql -u root -p scct_db < server/src/schema.mysql.sql
mysql -u root -p scct_db < server/src/seed.mysql.sql   # tuỳ chọn

# 3. Cấu hình server/.env  (copy từ server/.env.example)

# 4. Chạy 2 cửa sổ:
npm run dev:server           # API tại http://localhost:5000
npm run dev:client           # UI tại http://localhost:3000 (proxy /api → 5000)
```

Tài khoản mặc định (nếu seed): `admin@scct.vn` / `scct@2026`.

## Build production

```bash
npm run build                # client build thẳng vào server/public
npm start                    # chạy server, mở http://localhost:5000
```

## Migrate dữ liệu Firestore → MySQL

Xem [DEPLOY.md](./DEPLOY.md) phần "Migrate dữ liệu".

## Cấu trúc

```
server/src/
  index.js              app + serve static
  db.js                 pool mysql2/promise
  schema.mysql.sql      schema
  seed.mysql.sql        seed (môi trường mới)
  routes/               auth, users, sites, devices, tickets, reports
  middleware/auth.js    JWT + requireRole
  scripts/migrate-firestore.js
client/src/
  router.ts, api.ts, types.ts, utils.ts
  stores/auth.ts
  components/  pages/  styles/global.css
```
