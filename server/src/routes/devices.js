const router = require('express').Router()
const { pool, query } = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')

const mgr = [authenticate, requireRole('manager', 'admin')]

const OPEN = "('pending','in_progress')"

router.get('/', authenticate, async (req, res) => {
  try {
    const rows = await query(`
      SELECT d.*,
             s.name AS site_name, s.loc AS site_loc, s.type AS site_type,
             u.name AS assigned_name, u.email AS assigned_email,
             EXISTS(SELECT 1 FROM tickets t WHERE t.device_id = d.id AND t.status IN ${OPEN}) AS has_open_ticket
      FROM devices d
      LEFT JOIN sites s ON s.id = d.site_id
      LEFT JOIN users u ON u.id = d.assigned_to
      ORDER BY d.name
    `)
    res.json(rows.map(r => ({ ...r, has_open_ticket: !!r.has_open_ticket })))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/mine', authenticate, async (req, res) => {
  try {
    const rows = await query(`
      SELECT d.*,
             s.name AS site_name, s.loc AS site_loc, s.type AS site_type,
             (SELECT COUNT(*) FROM tickets t WHERE t.device_id = d.id AND t.status IN ${OPEN}) AS open_ticket_count
      FROM devices d
      LEFT JOIN sites s ON s.id = d.site_id
      WHERE d.assigned_to = ?
      ORDER BY d.name
    `, [req.user.id])
    res.json(rows.map(r => ({ ...r, open_ticket_count: Number(r.open_ticket_count), has_open_ticket: Number(r.open_ticket_count) > 0 })))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', ...mgr, async (req, res) => {
  const { name, type, status, site_id, assigned_to, reg_no, inspect_expiry, description } = req.body
  if (!name) return res.status(400).json({ error: 'Thiếu tên thiết bị' })
  try {
    const r = await query(
      `INSERT INTO devices (name, type, status, site_id, assigned_to, reg_no, inspect_expiry, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, type || '', status || 'normal', site_id || null, assigned_to || null, reg_no || null, inspect_expiry || null, description || '']
    )
    const rows = await query('SELECT * FROM devices WHERE id = ?', [r.insertId])
    res.status(201).json(rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Nhập hàng loạt — frontend đã map tên→id và validate, ở đây guard tối thiểu rồi ghi 1 lô.
router.post('/bulk', ...mgr, async (req, res) => {
  const { devices } = req.body
  if (!Array.isArray(devices) || devices.length === 0)
    return res.status(400).json({ error: 'Danh sách thiết bị trống' })
  if (devices.length > 500)
    return res.status(400).json({ error: 'Tối đa 500 thiết bị mỗi lần nhập' })
  const bad = devices.findIndex(d => !d || !d.name)
  if (bad >= 0)
    return res.status(400).json({ error: `Dòng ${bad + 1}: thiếu tên thiết bị` })

  const values = devices.map(d => [
    d.name, d.type || '', d.status || 'normal', d.site_id || null,
    d.assigned_to || null, d.reg_no || null, d.inspect_expiry || null, d.description || ''
  ])
  try {
    const [r] = await pool.query(
      `INSERT INTO devices (name, type, status, site_id, assigned_to, reg_no, inspect_expiry, description) VALUES ?`,
      [values]
    )
    res.status(201).json({ created: r.affectedRows })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id', ...mgr, async (req, res) => {
  const { name, type, status, site_id, assigned_to, reg_no, inspect_expiry, description } = req.body
  try {
    await query(
      `UPDATE devices SET name = ?, type = ?, status = ?, site_id = ?, assigned_to = ?, reg_no = ?, inspect_expiry = ?, description = ? WHERE id = ?`,
      [name, type || '', status || 'normal', site_id || null, assigned_to || null, reg_no || null, inspect_expiry || null, description || '', req.params.id]
    )
    const rows = await query('SELECT * FROM devices WHERE id = ?', [req.params.id])
    res.json(rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', ...mgr, async (req, res) => {
  try {
    await query('DELETE FROM devices WHERE id = ?', [req.params.id])
    res.json({ message: 'Đã xóa' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
