const router = require('express').Router()
const { pool, query } = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')

// Tải tickets kèm tên liên kết + assignees + updates.
async function loadTickets(where = '', params = []) {
  const tickets = await query(`
    SELECT t.*,
           d.name AS device_name, d.type AS device_type,
           s.name AS site_name,
           c.name AS creator_name,
           a.name AS approved_by_name
    FROM tickets t
    LEFT JOIN devices d ON d.id = t.device_id
    LEFT JOIN sites   s ON s.id = t.site_id
    LEFT JOIN users   c ON c.id = t.user_id
    LEFT JOIN users   a ON a.id = t.approved_by
    ${where}
    ORDER BY t.created_at DESC
  `, params)
  if (!tickets.length) return []

  const ids = tickets.map(t => t.id)
  const ph = ids.map(() => '?').join(',')

  const assignees = await query(`
    SELECT ta.ticket_id, u.id, u.name, u.role
    FROM ticket_assignees ta JOIN users u ON u.id = ta.user_id
    WHERE ta.ticket_id IN (${ph})
  `, ids)

  const updates = await query(`
    SELECT tu.*, u.name AS user_name
    FROM ticket_updates tu JOIN users u ON u.id = tu.user_id
    WHERE tu.ticket_id IN (${ph})
    ORDER BY tu.created_at ASC
  `, ids)

  return tickets.map(t => ({
    ...t,
    assignees: assignees.filter(a => a.ticket_id === t.id).map(({ id, name, role }) => ({ id, name, role })),
    updates: updates.filter(u => u.ticket_id === t.id)
  }))
}

async function oneTicket(id) {
  const list = await loadTickets('WHERE t.id = ?', [id])
  return list[0] || null
}

router.get('/', authenticate, async (req, res) => {
  try { res.json(await loadTickets()) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/mine', authenticate, async (req, res) => {
  try {
    res.json(await loadTickets(
      `WHERE t.user_id = ? OR t.id IN (SELECT ticket_id FROM ticket_assignees WHERE user_id = ?)`,
      [req.user.id, req.user.id]
    ))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', authenticate, async (req, res) => {
  const { device_id, site_id, description, plan, due_date, other_label, incident_time, operating_hours, operator, initial_cause } = req.body
  if (!description) return res.status(400).json({ error: 'Thiếu mô tả sự cố' })
  try {
    const r = await query(`
      INSERT INTO tickets (device_id, site_id, user_id, status, description, plan, due_date, other_label, incident_time, operating_hours, operator, initial_cause)
      VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)
    `, [device_id || null, site_id || null, req.user.id, description, plan || '', due_date || null,
        other_label || '', incident_time || null, operating_hours || null, operator || '', initial_cause || ''])
    res.status(201).json(await oneTicket(r.insertId))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id/approve', authenticate, requireRole('manager'), async (req, res) => {
  const { approved_plan, assignee_ids, due_date } = req.body
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.execute(`
      UPDATE tickets SET status = 'in_progress', approved_plan = ?, approved_by = ?,
             approved_date = CURDATE(), due_date = ? WHERE id = ?
    `, [approved_plan || '', req.user.id, due_date || null, req.params.id])
    await conn.execute('DELETE FROM ticket_assignees WHERE ticket_id = ?', [req.params.id])
    for (const uid of (assignee_ids || [])) {
      await conn.execute('INSERT INTO ticket_assignees (ticket_id, user_id) VALUES (?, ?)', [req.params.id, uid])
    }
    await conn.commit()
    res.json(await oneTicket(req.params.id))
  } catch (err) {
    await conn.rollback()
    res.status(500).json({ error: err.message })
  } finally { conn.release() }
})

router.post('/:id/updates', authenticate, async (req, res) => {
  const { note } = req.body
  if (!note) return res.status(400).json({ error: 'Thiếu nội dung cập nhật' })
  try {
    await query('INSERT INTO ticket_updates (ticket_id, user_id, note) VALUES (?, ?, ?)',
      [req.params.id, req.user.id, note])
    res.json(await oneTicket(req.params.id))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id/resolve', authenticate, async (req, res) => {
  const { resolve_note } = req.body
  try {
    await query(`UPDATE tickets SET status = 'resolved', resolved_date = CURDATE(), resolve_note = ? WHERE id = ?`,
      [resolve_note || '', req.params.id])
    res.json(await oneTicket(req.params.id))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', authenticate, requireRole('manager', 'admin'), async (req, res) => {
  try {
    await query('DELETE FROM tickets WHERE id = ?', [req.params.id]) // cascade xoá assignees + updates
    res.json({ message: 'Đã xóa' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
