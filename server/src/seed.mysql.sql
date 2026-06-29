-- ============================================================
-- SEED DATA (mật khẩu mặc định: 'scct@2026')
-- Chạy SAU schema.mysql.sql. Chỉ dùng cho môi trường mới
-- (KHÔNG chạy nếu sẽ migrate dữ liệu thật từ Firestore).
-- ============================================================

INSERT INTO users (name, email, password_hash, role) VALUES
  ('Quản trị viên',  'admin@scct.vn', '$2a$10$OXJXluGYh1BDtuzvvxIuXO7qWYFz.n.uWQBgtmE9QO5AHZtCevCJ2', 'admin'),
  ('Nguyễn Văn An',  'an@scct.vn',    '$2a$10$OXJXluGYh1BDtuzvvxIuXO7qWYFz.n.uWQBgtmE9QO5AHZtCevCJ2', 'tech'),
  ('Trần Thị Bình',  'binh@scct.vn',  '$2a$10$OXJXluGYh1BDtuzvvxIuXO7qWYFz.n.uWQBgtmE9QO5AHZtCevCJ2', 'tech'),
  ('Lê Minh Cường',  'cuong@scct.vn', '$2a$10$OXJXluGYh1BDtuzvvxIuXO7qWYFz.n.uWQBgtmE9QO5AHZtCevCJ2', 'manager'),
  ('Phạm Quốc Dũng', 'dung@scct.vn',  '$2a$10$OXJXluGYh1BDtuzvvxIuXO7qWYFz.n.uWQBgtmE9QO5AHZtCevCJ2', 'director');

INSERT INTO sites (name, loc, type, reg_no, inspect_expiry) VALUES
  ('Cảng Sài Gòn',           'Quận 4, TP.HCM', 'Phương tiện thủy', 'SG-2024-001', '2026-06-26'),
  ('Công trường Nhơn Trạch', 'Đồng Nai',       'Bốc xúc',          NULL,          NULL),
  ('Cảng Cát Lái',           'Quận 2, TP.HCM', 'Phương tiện thủy', 'CL-2024-003', '2026-09-15');

INSERT INTO devices (name, type, status, site_id, assigned_to, reg_no, inspect_expiry, description) VALUES
  ('Cần cẩu 1',     'Cần cẩu',   'normal', 1, 2, NULL,     NULL,         'Cần cẩu tháp 50 tấn, năm SX 2019'),
  ('Máy bơm A',     'Máy bơm',   'normal', 1, 2, NULL,     NULL,         'Bơm li tâm 200m3/h'),
  ('Máy xúc 01',    'Máy xúc',   'normal', 2, 3, 'MX-001', '2026-12-31', 'Komatsu PC200-8, 20 tấn'),
  ('Máy khoan 3',   'Máy khoan', 'normal', 2, 3, 'MK-003', '2026-07-10', 'Máy khoan thủy lực Atlas'),
  ('Cần cẩu nổi 2', 'Cần cẩu',   'normal', 3, 2, NULL,     NULL,         'Cần cẩu nổi 80 tấn');

INSERT INTO tickets (device_id, site_id, user_id, status, description, plan, due_date, approved_plan, approved_by, approved_date, resolved_date, resolve_note, created_at) VALUES
  (4, 2, 2, 'in_progress', 'Máy khoan rung bất thường, nghi ngờ bạc đạn bị mòn', 'Kiểm tra và thay bạc đạn trục chính', '2026-07-05', 'Dừng máy, tháo kiểm tra, thay bạc đạn nếu cần', 4, '2026-06-25', NULL, NULL, '2026-06-24 08:30:00'),
  (3, 2, 3, 'pending',     'Dầu thủy lực rò rỉ tại khớp nối số 3',              'Thay gioăng và siết lại đầu nối',     '2026-07-03', NULL, NULL, NULL, NULL, NULL, '2026-06-27 14:20:00'),
  (1, 1, 2, 'resolved',    'Puly cáp bị kẹt không quay',                        'Tra dầu và vệ sinh cơ cấu quay',      '2026-06-20', 'Tra dầu mỡ, kiểm tra ổ đỡ, vệ sinh', 4, '2026-06-18', '2026-06-19', 'Đã tra dầu và vệ sinh xong, cần cẩu hoạt động bình thường', '2026-06-17 09:00:00');

INSERT INTO ticket_assignees (ticket_id, user_id) VALUES (1, 2), (2, 3), (3, 2);

INSERT INTO ticket_updates (ticket_id, user_id, note, created_at) VALUES
  (1, 2, 'Đã tháo kiểm tra, xác nhận bạc đạn trục chính mòn nặng. Đặt linh kiện thay thế.', '2026-06-25 16:00:00');

INSERT INTO reports (user_id, month, summary, self_rate, submitted_at) VALUES
  (2, '2026-06', 'Tháng 6 đã xử lý 2 sự cố tại công trường Nhơn Trạch và Cảng Sài Gòn. Kiểm tra định kỳ 5 thiết bị.', 'Hoàn thành 80% công việc được giao, còn 1 phiếu sự cố đang xử lý.', '2026-06-27 10:00:00');
