-- ============================================================
-- SCCT - Quản lý thiết bị cơ điện — MySQL Schema
-- (chuyển từ schema.sql PostgreSQL)
-- ============================================================
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS ticket_updates;
DROP TABLE IF EXISTS ticket_assignees;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS devices;
DROP TABLE IF EXISTS sites;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ── USERS ────────────────────────────────────────────────────
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50)  NOT NULL DEFAULT 'tech',
  -- role: tech | specialist | deputy_manager | manager | director | admin
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── SITES ────────────────────────────────────────────────────
CREATE TABLE sites (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  loc            VARCHAR(255),
  type           VARCHAR(100),
  reg_no         VARCHAR(100),
  inspect_expiry DATE,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── DEVICES ──────────────────────────────────────────────────
CREATE TABLE devices (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  type           VARCHAR(100),
  status         VARCHAR(50) DEFAULT 'normal',
  site_id        INT,
  assigned_to    INT,
  reg_no         VARCHAR(100),
  inspect_expiry DATE,
  description    TEXT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dev_site FOREIGN KEY (site_id)     REFERENCES sites(id) ON DELETE SET NULL,
  CONSTRAINT fk_dev_user FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── TICKETS ──────────────────────────────────────────────────
CREATE TABLE tickets (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  device_id       INT,
  site_id         INT,
  user_id         INT NOT NULL,
  status          VARCHAR(50) DEFAULT 'pending',
  description     TEXT NOT NULL,
  plan            TEXT,
  due_date        DATE,
  other_label     VARCHAR(255),
  approved_plan   TEXT,
  approved_by     INT,
  approved_date   DATE,
  resolved_date   DATE,
  resolve_note    TEXT,
  incident_time   DATETIME,
  operating_hours INT,
  operator        VARCHAR(255),
  initial_cause   TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tk_device   FOREIGN KEY (device_id)   REFERENCES devices(id) ON DELETE SET NULL,
  CONSTRAINT fk_tk_site     FOREIGN KEY (site_id)     REFERENCES sites(id)   ON DELETE SET NULL,
  CONSTRAINT fk_tk_user     FOREIGN KEY (user_id)     REFERENCES users(id),
  CONSTRAINT fk_tk_approver FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── TICKET ASSIGNEES (nhiều nhân viên / 1 phiếu) ─────────────
CREATE TABLE ticket_assignees (
  ticket_id INT NOT NULL,
  user_id   INT NOT NULL,
  PRIMARY KEY (ticket_id, user_id),
  CONSTRAINT fk_ta_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_ta_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── TICKET UPDATES (nhật ký tiến độ) ─────────────────────────
CREATE TABLE ticket_updates (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id  INT NOT NULL,
  user_id    INT NOT NULL,
  note       TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tu_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_tu_user   FOREIGN KEY (user_id)   REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── MONTHLY REPORTS ───────────────────────────────────────────
CREATE TABLE reports (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  month        CHAR(7) NOT NULL,
  summary      TEXT,
  self_rate    TEXT,
  mgr_comment  TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_report (user_id, month),
  CONSTRAINT fk_rp_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
