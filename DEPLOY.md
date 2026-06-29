# Hướng dẫn deploy SCCT lên cPanel (Tenten)

> Mục tiêu: 1 Node app phục vụ cả API + UI, dùng MySQL của hosting. Khớp gói "1 website".

## 0. Yêu cầu
- cPanel có **Setup Node.js App** (đã xác nhận có).
- Node ≥ 18.

---

## 1. Tạo MySQL database
cPanel → **MySQL® Databases**:
1. Create New Database → ví dụ `btia_scct` (cPanel tự thêm tiền tố user).
2. Add New User → đặt user + mật khẩu mạnh.
3. **Add User To Database** → tích **ALL PRIVILEGES**.
4. Ghi lại: `DB_NAME`, `DB_USER`, `DB_PASSWORD` (host = `localhost`).

## 2. Import schema
cPanel → **phpMyAdmin** → chọn database vừa tạo → tab **Import**:
- Import `server/src/schema.mysql.sql`.
- (Chỉ khi KHÔNG migrate dữ liệu thật) import thêm `server/src/seed.mysql.sql`.

## 3. Build frontend ở máy rồi đẩy lên
Gói RAM 2GB dễ thiếu khi build trên hosting → **build ở máy**:
```bash
npm run build          # tạo server/public
```
Sau đó đưa code lên hosting bằng **một trong hai cách**:

**Cách A — Git (khuyến nghị):**
1. cPanel → **Git Version Control** → tạo repo mới `SCCT` (xoá 2 repo cũ SCCT_backend/SCCT_frontend nếu muốn).
2. Push monorepo này lên repo đó, rồi **Pull** trên cPanel.
3. Vì `.gitignore` bỏ qua `server/public`, hãy upload thư mục `server/public` riêng qua **File Manager**
   (hoặc bỏ `server/public` khỏi `.gitignore` để commit luôn bản build).

**Cách B — File Manager:** nén toàn bộ `SCCT/` (đã có `server/public`, bỏ `node_modules`) → upload → giải nén.

## 4. Setup Node.js App
cPanel → **Setup Node.js App** → **Create Application**:
- **Node version**: ≥ 18
- **Application mode**: Production
- **Application root**: đường dẫn tới thư mục `SCCT/server` (ví dụ `repositories/SCCT/server`)
- **Application URL**: domain/subdomain muốn chạy
- **Application startup file**: `src/index.js`

Sau khi tạo, mục **Environment variables** thêm:
| Biến | Giá trị |
|---|---|
| `JWT_SECRET` | chuỗi bí mật dài, ngẫu nhiên |
| `DB_HOST` | `localhost` |
| `DB_PORT` | `3306` |
| `DB_USER` | user MySQL ở bước 1 |
| `DB_PASSWORD` | mật khẩu MySQL |
| `DB_NAME` | tên database |
| `NODE_ENV` | `production` |

> Không cần đặt `PORT` — Passenger tự cấp, code đã đọc `process.env.PORT`.

Bấm **Run NPM Install** (cài deps cho `server`) → **Restart**.

## 5. Migrate dữ liệu Firestore → MySQL (làm 1 lần)
Cần `FIREBASE_PROJECT_ID` và `FIREBASE_API_KEY` (xem `server/.env.example`).

Chạy **trên hosting** (an toàn nhất — MySQL ở localhost):
1. Vào **Setup Node.js App** → "Enter to the virtual environment" (copy lệnh `source ...activate`).
2. Trong terminal cPanel:
   ```bash
   source /home/<user>/nodevenv/.../bin/activate
   cd ~/repositories/SCCT/server
   FIREBASE_PROJECT_ID=scct-cb346 FIREBASE_API_KEY=xxxx npm run migrate
   ```
3. Script sẽ:
   - Lưu backup gốc vào `server/backup/firestore-*.json`.
   - Đổ dữ liệu vào MySQL, ánh xạ ID chuỗi → ID số.
   - In số bản ghi + cảnh báo (nếu có).

> Giữ Firestore **read-only** đến khi xác minh MySQL đầy đủ rồi mới ngừng dùng.

## 6. Kiểm tra
- Mở domain → thấy UI đăng nhập.
- Đăng nhập tài khoản thật → các trang theo role hiển thị đúng.
- Tạo/sửa 1 bản ghi → kiểm tra trong phpMyAdmin.

---

## 7. Backup MySQL định kỳ (cron)
cPanel → **Cron Jobs** → thêm job chạy hằng ngày (ví dụ 2h sáng):

```bash
mkdir -p ~/backups && mysqldump -u DB_USER -p'DB_PASSWORD' DB_NAME \
  | gzip > ~/backups/scct-$(date +\%F).sql.gz && \
  find ~/backups -name 'scct-*.sql.gz' -mtime +14 -delete
```
- Tự nén `.gz`, giữ 14 ngày gần nhất, xoá bản cũ hơn.
- Định kỳ tải `~/backups/*.gz` về máy phòng mất hosting.

Khôi phục khi cần:
```bash
gunzip < scct-YYYY-MM-DD.sql.gz | mysql -u DB_USER -p DB_NAME
```

---

## Khắc phục sự cố
- **502 / app không chạy**: kiểm tra log trong Setup Node.js App; thường do thiếu env DB hoặc chưa Run NPM Install.
- **Lỗi DB connect**: kiểm tra user đã được gán quyền vào database chưa.
- **Trang trắng / 404 khi refresh route con**: đảm bảo đã upload `server/public` và `index.js` có fallback SPA (đã có sẵn).
- **Tiếng Việt lỗi font chữ trong DB**: schema dùng `utf8mb4`, đảm bảo import bằng phpMyAdmin (UTF-8).
