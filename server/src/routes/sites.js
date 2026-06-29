const router = require('express').Router()
const { query } = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')

const mgr = [authenticate, requireRole('manager', 'director', 'admin')]

router.get('/', authenticate, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM sites ORDER BY name')
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', ...mgr, async (req, res) => {
  const { name, loc, type, reg_no, inspect_expiry } = req.body
  if (!name) return res.status(400).json({ error: 'Thiếu tên công trường' })
  try {
    const r = await query(
      'INSERT INTO sites (name, loc, type, reg_no, inspect_expiry) VALUES (?, ?, ?, ?, ?)',
      [name, loc || '', type || null, reg_no || null, inspect_expiry || null]
    )
    const rows = await query('SELECT * FROM sites WHERE id = ?', [r.insertId])
    res.status(201).json(rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id', ...mgr, async (req, res) => {
  const { name, loc, type, reg_no, inspect_expiry } = req.body
  try {
    await query(
      'UPDATE sites SET name = ?, loc = ?, type = ?, reg_no = ?, inspect_expiry = ? WHERE id = ?',
      [name, loc || '', type || null, reg_no || null, inspect_expiry || null, req.params.id]
    )
    const rows = await query('SELECT * FROM sites WHERE id = ?', [req.params.id])
    res.json(rows[0])
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', ...mgr, async (req, res) => {
  try {
    await query('DELETE FROM sites WHERE id = ?', [req.params.id])
    res.json({ message: 'Đã xóa' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
