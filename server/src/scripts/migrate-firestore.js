/**
 * Migrate dữ liệu Firestore (scct-*) → MySQL.
 *
 * Cách chạy (từ thư mục server, sau khi đã import schema.mysql.sql vào DB rỗng):
 *   FIREBASE_PROJECT_ID=... FIREBASE_API_KEY=... npm run migrate
 *
 * Quy trình:
 *  1. Đọc toàn bộ 6 collection từ Firestore REST.
 *  2. Ghi backup JSON gốc vào server/backup/firestore-YYYYMMDD-HHmm.json.
 *  3. Đổ vào MySQL theo thứ tự khoá ngoại, ánh xạ ID chuỗi → ID số AUTO_INCREMENT.
 */
const axios = require('axios')
const fs    = require('fs')
const path  = require('path')
require('dotenv').config()

const { pool } = require('../db')

const PROJECT = process.env.FIREBASE_PROJECT_ID
const KEY     = process.env.FIREBASE_API_KEY
if (!PROJECT || !KEY) {
  console.error('❌ Thiếu FIREBASE_PROJECT_ID hoặc FIREBASE_API_KEY trong env.')
  process.exit(1)
}
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`

// ── Firestore value → JS ─────────────────────────────────────
function fromVal(v) {
  if (!v) return null
  if ('nullValue'      in v) return null
  if ('booleanValue'   in v) return v.booleanValue
  if ('integerValue'   in v) return parseInt(v.integerValue)
  if ('doubleValue'    in v) return v.doubleValue
  if ('stringValue'    in v) return v.stringValue
  if ('timestampValue' in v) return v.timestampValue
  if ('arrayValue'     in v) return (v.arrayValue.values || []).map(fromVal)
  if ('mapValue'       in v) return fromFields(v.mapValue.fields || {})
  return null
}
function fromFields(f) {
  const o = {}
  for (const [k, v] of Object.entries(f || {})) o[k] = fromVal(v)
  return o
}
function docToObj(doc) {
  return { id: doc.name.split('/').pop(), ...fromFields(doc.fields) }
}

async function getAll(col) {
  const docs = []
  let pageToken = ''
  do {
    const url = `${BASE}/${col}?key=${KEY}&pageSize=300`
      + (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '')
    const { data } = await axios.get(url)
    if (data.documents) docs.push(...data.documents.map(docToObj))
    pageToken = data.nextPageToken
  } while (pageToken)
  return docs
}

// ── Chuyển định dạng ngày/giờ ────────────────────────────────
function toDT(v) {
  if (!v) return null
  const d = new Date(v)
  if (isNaN(d)) return null
  return d.toISOString().slice(0, 19).replace('T', ' ')
}
function toD(v) {
  if (!v) return null
  return String(v).slice(0, 10)
}

async function main() {
  console.log(`📥 Đọc dữ liệu từ Firestore (${PROJECT})...`)
  const [users, sites, devices, tickets, updates, reports] = await Promise.all([
    getAll('scct_users'), getAll('scct_sites'), getAll('scct_devices'),
    getAll('scct_tickets'), getAll('scct_ticket_updates'), getAll('scct_reports')
  ])
  console.log(`   users=${users.length} sites=${sites.length} devices=${devices.length} `
    + `tickets=${tickets.length} updates=${updates.length} reports=${reports.length}`)

  // Backup gốc
  const backupDir = path.join(__dirname, '..', '..', 'backup')
  fs.mkdirSync(backupDir, { recursive: true })
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '').replace(/(\d{8})(\d{4})/, '$1-$2')
  const backupFile = path.join(backupDir, `firestore-${stamp}.json`)
  fs.writeFileSync(backupFile, JSON.stringify({ users, sites, devices, tickets, updates, reports }, null, 2))
  console.log(`💾 Đã backup gốc: ${backupFile}`)

  const conn = await pool.getConnection()
  const map = { users: {}, sites: {}, devices: {}, tickets: {} }
  let warns = 0
  const ref = (m, id, ctx) => {
    if (id == null) return null
    if (m[id] == null) { console.warn(`   ⚠️  ${ctx}: không tìm thấy ID ${id}`); warns++; return null }
    return m[id]
  }

  try {
    await conn.beginTransaction()

    for (const u of users) {
      const [r] = await conn.execute(
        'INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
        [u.name, (u.email || '').toLowerCase(), u.password_hash, u.role || 'tech', toDT(u.created_at)]
      )
      map.users[u.id] = r.insertId
    }

    for (const s of sites) {
      const [r] = await conn.execute(
        'INSERT INTO sites (name, loc, type, reg_no, inspect_expiry, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [s.name, s.loc || null, s.type || null, s.reg_no || null, toD(s.inspect_expiry), toDT(s.created_at)]
      )
      map.sites[s.id] = r.insertId
    }

    for (const d of devices) {
      const [r] = await conn.execute(
        `INSERT INTO devices (name, type, status, site_id, assigned_to, reg_no, inspect_expiry, description, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [d.name, d.type || null, d.status || 'normal', ref(map.sites, d.site_id, `device ${d.name}.site`),
         ref(map.users, d.assigned_to, `device ${d.name}.assigned_to`), d.reg_no || null,
         toD(d.inspect_expiry), d.description || null, toDT(d.created_at)]
      )
      map.devices[d.id] = r.insertId
    }

    for (const t of tickets) {
      const [r] = await conn.execute(
        `INSERT INTO tickets (device_id, site_id, user_id, status, description, plan, due_date, other_label,
            approved_plan, approved_by, approved_date, resolved_date, resolve_note, incident_time,
            operating_hours, operator, initial_cause, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ref(map.devices, t.device_id, `ticket.device`), ref(map.sites, t.site_id, `ticket.site`),
         ref(map.users, t.user_id, `ticket.user`), t.status || 'pending', t.description, t.plan || null,
         toD(t.due_date), t.other_label || null, t.approved_plan || null,
         ref(map.users, t.approved_by, `ticket.approved_by`), toD(t.approved_date), toD(t.resolved_date),
         t.resolve_note || null, toDT(t.incident_time), t.operating_hours || null, t.operator || null,
         t.initial_cause || null, toDT(t.created_at)]
      )
      map.tickets[t.id] = r.insertId

      for (const uid of (t.assignee_ids || [])) {
        const mu = ref(map.users, uid, `ticket.assignee`)
        if (mu) await conn.execute(
          'INSERT IGNORE INTO ticket_assignees (ticket_id, user_id) VALUES (?, ?)', [r.insertId, mu])
      }
    }

    for (const u of updates) {
      const tid = ref(map.tickets, u.ticket_id, `update.ticket`)
      const uid = ref(map.users, u.user_id, `update.user`)
      if (tid && uid) await conn.execute(
        'INSERT INTO ticket_updates (ticket_id, user_id, note, created_at) VALUES (?, ?, ?, ?)',
        [tid, uid, u.note, toDT(u.created_at)]
      )
    }

    for (const rp of reports) {
      const uid = ref(map.users, rp.user_id, `report.user`)
      if (uid) await conn.execute(
        `INSERT INTO reports (user_id, month, summary, self_rate, mgr_comment, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uid, rp.month, rp.summary || null, rp.self_rate || null, rp.mgr_comment || null, toDT(rp.submitted_at)]
      )
    }

    await conn.commit()
    console.log(`✅ Migrate xong. Cảnh báo FK không khớp: ${warns}`)
  } catch (err) {
    await conn.rollback()
    console.error('❌ Lỗi, đã rollback:', err.message)
    process.exitCode = 1
  } finally {
    conn.release()
    await pool.end()
  }
}

main()
