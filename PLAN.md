# Kế hoạch gộp SCCT: Monorepo + MySQL + Vue 3/TS + Deploy cPanel

> Mục tiêu: gộp `SCCT_backend` (Express/Firestore) và `SCCT_frontend` (React/Vite)
> thành **một** ứng dụng Node duy nhất, đổi DB sang **MySQL của hosting**, viết lại
> UI bằng **Vue 3 + TypeScript + Element Plus** (giữ giao diện cũ, đẹp hơn), migrate
> dữ liệu thật từ Firestore, và deploy lên **cPanel (Setup Node.js App)**.

## Quyết định đã chốt
- **Dữ liệu**: có data thật trên Firestore (`scct-cb346`) → cần **migrate**.
- **UI**: Vue 3 + TS + **Element Plus** (theme lại đúng tông xanh đậm hiện tại).
- **Repo**: 1 monorepo `SCCT/` gồm `server/` (Express + MySQL) và `client/` (Vue).
- **Hosting**: cPanel có "Setup Node.js App" → 1 Node app phục vụ cả API lẫn UI tĩnh.

---

## Kiến trúc đích

```
SCCT/                      ← 1 git repo, deploy lên cPanel
├─ server/                 ← Express + MySQL (mysql2/promise)
│  ├─ src/
│  │  ├─ index.js          ← serve /api/* + static client build
│  │  ├─ db.js             ← pool mysql2
│  │  ├─ schema.mysql.sql  ← schema chuyển từ PostgreSQL → MySQL
│  │  ├─ middleware/auth.js
│  │  ├─ routes/ (auth, users, sites, devices, tickets, reports)
│  │  └─ scripts/migrate-firestore.js  ← đổ data Firestore → MySQL
│  └─ package.json
├─ client/                 ← Vue 3 + Vite + TS + Element Plus
│  ├─ src/ (router, stores, api, pages, components)
│  └─ package.json
├─ package.json            ← scripts gốc: build client → copy vào server/public
└─ PLAN.md
```

**Runtime**: chỉ chạy `server`. Express phục vụ:
- `GET /api/*` → REST API.
- mọi path khác → file tĩnh trong `server/public/` (bản build của Vue), fallback `index.html` cho SPA routing.
→ Same-origin: bỏ CORS, bỏ `VITE_API_URL`, frontend gọi thẳng `/api`.

---

## Phase 0 — Scaffold monorepo  *(đã tạo folder)*
1. `client/`: `npm create vite@latest . -- --template vue-ts`, thêm `element-plus`, `vue-router`, `pinia`, `axios`, `xlsx`.
2. `server/`: copy cấu trúc từ `SCCT_backend`, thêm `mysql2`, bỏ `pg`/`axios`(firestore) khỏi runtime (giữ tạm cho script migrate).
3. `package.json` gốc với scripts:
   - `build` → `cd client && npm run build` rồi copy `client/dist` → `server/public`.
   - `start` → `node server/src/index.js`.
- **Verify**: `npm run build` chạy xong, `server/public/index.html` tồn tại.

## Phase 1 — Schema MySQL + lớp DB
1. Chuyển [`schema.sql`](../SCCT_backend/schema.sql) (PostgreSQL) → `server/src/schema.mysql.sql`:
   - `SERIAL PRIMARY KEY` → `INT AUTO_INCREMENT PRIMARY KEY`.
   - `TIMESTAMPTZ DEFAULT NOW()` → `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`.
   - `CHAR(7)` giữ nguyên; `BOOLEAN`/`TEXT`/`DATE` giữ nguyên (MySQL hỗ trợ).
   - `ON DELETE SET NULL/CASCADE` giữ nguyên; engine `InnoDB`, charset `utf8mb4`.
   - Giữ nguyên 7 bảng: users, sites, devices, tickets, ticket_assignees, ticket_updates, reports.
2. `server/src/db.js`: thay `pg.Pool` bằng `mysql2/promise` createPool, đọc host/user/pass/db từ env (cPanel cấp). Export helper `query(sql, params)`.
- **Verify**: import schema vào MySQL local, `SELECT` ra bảng rỗng đúng cấu trúc.

## Phase 2 — Viết lại routes sang SQL
Logic Firestore hiện tại = `getAll` rồi join/filter trong JS. Đổi sang SQL JOIN thật (nhanh + gọn hơn). Map collection → bảng: bỏ tiền tố `scct_`.

| Route | Thay đổi chính |
|---|---|
| `auth.js` | `db.where('scct_users','email',..)` → `SELECT ... WHERE email=?`. bcrypt/jwt giữ nguyên. |
| `users.js` | CRUD users bằng SQL; `/tech` lọc role bằng `WHERE role IN (...)`. |
| `sites.js` | CRUD trực tiếp. |
| `devices.js` | `GET /` dùng JOIN sites+users + subquery đếm ticket mở (thay `enrichDevice`). `/bulk` → `INSERT ... VALUES (?),(?)...` 1 lần (bỏ chunking Firestore). |
| `tickets.js` | `enrichTicket` → JOIN; `assignee_ids` đọc/ghi qua bảng `ticket_assignees` (transaction khi approve). `updates` JOIN `ticket_updates`. |
| `reports.js` | `/stats/:month` gom bằng GROUP BY thay vì filter JS. upsert report bằng `INSERT ... ON DUPLICATE KEY UPDATE` (đã có UNIQUE(user_id,month)). |
| `seed.js` | Chuyển sang insert SQL (dùng cho môi trường mới/khi không migrate). |

- **Verify**: chạy server local trỏ MySQL đã seed; test từng endpoint bằng curl/Postman (login, list devices, tạo+duyệt+resolve ticket, report stats).

## Phase 3 — Migrate dữ liệu Firestore → MySQL  *(backup data)*
Script `server/src/scripts/migrate-firestore.js`:
1. Đọc toàn bộ 6 collection qua REST (tái dùng logic [`firestore.js`](../SCCT_backend/src/firestore.js)) → JSON.
2. **Dump backup**: ghi `backup/firestore-YYYYMMDD.json` (ảnh chụp gốc, để đối chiếu/rollback).
3. Insert theo thứ tự FK và **map ID chuỗi → ID số**:
   - `users` → lưu `map.users[fsId] = insertId`.
   - `sites` → `map.sites`.
   - `devices`: remap `site_id`, `assigned_to` qua map.
   - `tickets`: remap `device_id, site_id, user_id, approved_by`; tách `assignee_ids[]` → insert `ticket_assignees`.
   - `ticket_updates`: remap `ticket_id, user_id`.
   - `reports`: remap `user_id`.
4. In báo cáo: số bản ghi mỗi bảng + cảnh báo FK không khớp.
- **Verify**: so số lượng bản ghi Firestore vs MySQL từng bảng; login bằng tài khoản thật chạy được; spot-check vài ticket có đủ assignees/updates.

## Phase 4 — Frontend Vue 3 + TS + Element Plus (giữ giao diện)
Port 1-1 từ React, **giữ nguyên UX & cấu trúc điều hướng**:
1. **Nền tảng**: `main.ts` (Element Plus + locale vi), `vue-router` (giữ đúng path `/app/...` trong [`App.jsx`](../SCCT_frontend/src/App.jsx)), `pinia` cho auth store (thay `AuthContext`).
2. **api.ts**: axios baseURL = `/api` (same-origin), interceptor 401 → logout (giữ logic [`api.js`](../SCCT_frontend/src/api.js)).
3. **Theme**: import `global.css` gần như nguyên trạng để giữ sidebar gradient xanh + cards/badges; override biến màu Element Plus (`--el-color-primary: #2563eb`) cho khớp. Element Plus dùng cho table/form/modal/date-picker/upload → đẹp & nhất quán hơn component tự viết.
4. **Layout.vue**: port [`Layout.jsx`](../SCCT_frontend/src/components/Layout.jsx) (sidebar theo role, footer user).
5. **Pages** (port từng trang, dùng `<el-table>`/`<el-form>`/`<el-dialog>` thay Modal/TicketCard tự viết):
   - tech: MyDevices, Issues, History, Monthly
   - manager: Overview, Sites, Devices, Tickets, Reports
   - director: Dashboard, Tickets
   - admin: Accounts
   - Login (giữ màn hình gradient riêng).
6. `utils.ts`: port `ROLE_LABEL`, `isTechRole`, `isManagerRole`, `initials`. Thêm type cho User/Device/Ticket/...
- **Verify**: `npm run dev` (proxy `/api` → server local), đăng nhập 4 role, đối chiếu từng trang với bản React cũ.

## Phase 5 — Gộp serve 1 app
1. `server/src/index.js`: sau các route `/api`, thêm `express.static('public')` + fallback `app.get('*', sendFile index.html)`.
2. `npm run build` ở gốc → copy `client/dist` → `server/public`.
- **Verify**: chỉ chạy `node server/src/index.js`, mở `http://localhost:5000` thấy UI Vue + gọi API chạy được (không cần Vite).

## Phase 6 — Deploy cPanel
1. **MySQL**: cPanel → MySQL Databases → tạo DB + user + gán quyền (gói có 3 DB). Import `schema.mysql.sql` qua phpMyAdmin.
2. **Migrate data**: chạy `migrate-firestore.js` 1 lần (local trỏ tới MySQL cPanel nếu host bật Remote MySQL, hoặc chạy trên hosting qua terminal/cron) → đổ data thật vào.
3. **Git trên cPanel**: tạo repo mới `SCCT` (thay 2 repo cũ), push code lên / pull về.
4. **Setup Node.js App**:
   - Application root: thư mục chứa `server` (hoặc cấu hình startup file = `server/src/index.js`).
   - Application startup file: `server/src/index.js`; Node version: ≥ 18.
   - Biến môi trường: `JWT_SECRET`, `DB_HOST=localhost`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `NODE_ENV=production`. (PORT do Passenger cấp — đọc `process.env.PORT`.)
   - "Run NPM Install" cho `server`. Build `client` ở máy rồi push `server/public` (đơn giản nhất với shared hosting), hoặc build trên hosting nếu đủ RAM.
   - Restart app.
- **Verify**: domain mở ra UI, đăng nhập tài khoản thật OK, tạo/sửa dữ liệu lưu vào MySQL.

## Phase 7 — Backup MySQL định kỳ
1. Cron job cPanel: `mysqldump -u USER -pPASS DB > ~/backups/scct-$(date +\%F).sql` hằng ngày.
2. Giữ ~7-14 bản, xoá bản cũ (cron dọn dẹp). Tải về định kỳ phòng mất hosting.
- **Verify**: chạy thử cron 1 lần, kiểm tra file dump khôi phục được.

---

## Rủi ro & lưu ý
- **Map ID** là chỗ dễ sai nhất — phải migrate đúng thứ tự FK; giữ bản dump JSON gốc để chạy lại được.
- **Build client trên shared hosting** có thể thiếu RAM (gói 2GB) → ưu tiên build ở máy, chỉ push `dist`.
- **Remote MySQL** từ máy local cần bật trong cPanel + whitelist IP; nếu không, chạy script migrate ngay trên hosting.
- Giữ Firestore **read-only** đến khi xác minh MySQL đầy đủ rồi mới ngừng.
