const router = require('express').Router()
const { query } = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')

const TECH_ROLES = ['tech', 'specialist', 'deputy_manager']

router.get('/', authenticate, async (req, res) => {
  try {
    const isMgr = ['manager', 'director', 'admin'].includes(req.user.role)
    const sql = `
      SELECT r.*, u.name AS user_name, u.role AS user_role
      FROM reports r JOIN users u ON u.id = r.user_id
      ${isMgr ? '' : 'WHERE r.user_id = ?'}
      ORDER BY r.month DESC`
    const rows = await query(sql, isMgr ? [] : [req.user.id])
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/stats/:month', authenticate, async (req, res) => {
  const { month } = req.params
  try {
    const techUsers = await query(
      `SELECT id, name, email, role, created_at FROM users WHERE role IN (?, ?, ?) ORDER BY name`, TECH_ROLES
    )

    const countBy = async (extra, params) => {
      const rows = await query(`
        SELECT ta.user_id, COUNT(*) AS n
        FROM ticket_assignees ta JOIN tickets t ON t.id = ta.ticket_id
        WHERE ${extra} GROUP BY ta.user_id`, params)
      return Object.fromEntries(rows.map(r => [r.user_id, Number(r.n)]))
    }

    const assigned = await countBy(`DATE_FORMAT(t.approved_date, '%Y-%m') = ?`, [month])
    const resolved = await countBy(`t.status = 'resolved' AND DATE_FORMAT(t.resolved_date, '%Y-%m') = ?`, [month])
    const open     = await countBy(`t.status IN ('pending','in_progress')`, [])

    const reports = await query('SELECT * FROM reports WHERE month = ?', [month])

    res.json(techUsers.map(u => ({
      user: u,
      stats: {
        assigned: assigned[u.id] || 0,
        resolved: resolved[u.id] || 0,
        open:     open[u.id] || 0
      },
      report: reports.find(r => r.user_id === u.id) || null
    })))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', authenticate, async (req, res) => {
  const { month, summary, self_rate } = req.body
  if (!month || !summary) return res.status(400).json({ error: 'Thiếu tháng hoặc nội dung' })
  try {
    await query(`
      INSERT INTO reports (user_id, month, summary, self_rate) VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE summary = VALUES(summary), self_rate = VALUES(self_rate), submitted_at = CURRENT_TIMESTAMP
    `, [req.user.id, month, summary, self_rate || ''])
    const rows = await query('SELECT * FROM reports WHERE user_id = ? AND month = ?', [req.user.id, month])
    res.json(rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id/comment', authenticate, requireRole('manager', 'director', 'admin'), async (req, res) => {
  try {
    await query('UPDATE reports SET mgr_comment = ? WHERE id = ?', [req.body.mgr_comment || '', req.params.id])
    const rows = await query('SELECT * FROM reports WHERE id = ?', [req.params.id])
    res.json(rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
