const router = require('express').Router()
const bcrypt = require('bcryptjs')
const { query } = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')

const adminOnly = [authenticate, requireRole('admin')]
const TECH_ROLES = ['tech', 'specialist', 'deputy_manager']

const SAFE = 'id, name, email, role, created_at'

router.get('/', authenticate, async (req, res) => {
  try {
    const rows = await query(`SELECT ${SAFE} FROM users ORDER BY name`)
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/tech', authenticate, async (req, res) => {
  try {
    const rows = await query(
      `SELECT ${SAFE} FROM users WHERE role IN (?, ?, ?) ORDER BY name`, TECH_ROLES
    )
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', ...adminOnly, async (req, res) => {
  const { name, email, role, password } = req.body
  if (!name || !email) return res.status(400).json({ error: 'Thiếu tên hoặc email' })
  try {
    const mail = email.toLowerCase().trim()
    const existing = await query('SELECT id FROM users WHERE email = ?', [mail])
    if (existing.length) return res.status(400).json({ error: 'Email đã tồn tại' })
    const hash = await bcrypt.hash(password || 'scct@2026', 10)
    const r = await query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, mail, hash, role || 'tech']
    )
    const rows = await query(`SELECT ${SAFE} FROM users WHERE id = ?`, [r.insertId])
    res.status(201).json(rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id', ...adminOnly, async (req, res) => {
  const { name, email, role, password } = req.body
  try {
    if (password) {
      const hash = await bcrypt.hash(password, 10)
      await query('UPDATE users SET name = ?, email = ?, role = ?, password_hash = ? WHERE id = ?',
        [name, email.toLowerCase().trim(), role, hash, req.params.id])
    } else {
      await query('UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?',
        [name, email.toLowerCase().trim(), role, req.params.id])
    }
    const rows = await query(`SELECT ${SAFE} FROM users WHERE id = ?`, [req.params.id])
    res.json(rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', ...adminOnly, async (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'Không thể xóa chính mình' })
  try {
    await query('DELETE FROM users WHERE id = ?', [req.params.id])
    res.json({ message: 'Đã xóa' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
