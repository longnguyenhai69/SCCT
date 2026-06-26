# Hướng dẫn cài đặt và chạy SCCT Web App

## Yêu cầu
- Node.js 18+
- PostgreSQL 14+

---

## 1. Cài đặt Database

```bash
# Tạo database
psql -U postgres -c "CREATE DATABASE scct_db;"

# Chạy schema + seed data
psql -U postgres -d scct_db -f backend/schema.sql
```

---

## 2. Cài đặt Backend

```bash
cd backend
npm install

# Tạo file .env từ .env.example
cp .env.example .env
# Sửa DATABASE_URL, JWT_SECRET trong .env

npm run dev      # development (nodemon)
# hoặc
npm start        # production
```

Backend chạy tại: http://localhost:5000

---

## 3. Cài đặt Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend chạy tại: http://localhost:3000

---

## Tài khoản mặc định (từ schema.sql)

| Email | Mật khẩu | Chức danh |
|-------|----------|-----------|
| admin@scct.vn | scct@2026 | Quản trị hệ thống |
| nguyen.van.a@scct.vn | scct@2026 | Nhân viên kỹ thuật |
| tran.thi.b@scct.vn | scct@2026 | Chuyên viên cơ điện |
| le.van.c@scct.vn | scct@2026 | Trưởng phòng KT |
| pham.thi.d@scct.vn | scct@2026 | Phó Tổng Giám Đốc |

---

## Cấu trúc thư mục

```
SCCT/
├── backend/
│   ├── src/
│   │   ├── index.js          # Express server
│   │   ├── db.js             # PostgreSQL pool
│   │   ├── middleware/auth.js # JWT middleware
│   │   └── routes/           # auth, users, sites, devices, tickets, reports
│   ├── schema.sql            # Database schema + seed data
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── tech/         # MyDevices, Issues, History, Monthly
│   │   │   ├── manager/      # Overview, Sites, Devices, Tickets, Reports
│   │   │   ├── director/     # Dashboard, Tickets
│   │   │   └── admin/        # Accounts
│   │   ├── components/       # Layout, Badge, Alert, Modal, TicketCard
│   │   ├── styles/global.css
│   │   ├── App.jsx, AuthContext.jsx, api.js, utils.js, main.jsx
│   ├── index.html
│   └── vite.config.js
└── demo.html                 # Bản demo HTML gốc
```
