const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt    = require('jsonwebtoken')
const { query } = require('../db')
const { authenticate } = require('../middleware/auth')

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Thiếu email hoặc mật khẩu' })
  try {
    const rows = await query('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()])
    if (!rows.length) return res.status(401).json({ error: 'Email không tồn tại' })
    const user = rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Mật khẩu không đúng' })
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' })
    const { password_hash, ...safeUser } = user
    res.json({ token, user: safeUser })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/change-password', authenticate, async (req, res) => {
  const { oldPassword, newPassword } = req.body
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Mật khẩu mới phải ít nhất 6 ký tự' })
  try {
    const rows = await query('SELECT * FROM users WHERE id = ?', [req.user.id])
    if (!rows.length) return res.status(404).json({ error: 'Không tìm thấy người dùng' })
    const valid = await bcrypt.compare(oldPassword, rows[0].password_hash)
    if (!valid) return res.status(401).json({ error: 'Mật khẩu cũ không đúng' })
    const hash = await bcrypt.hash(newPassword, 10)
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id])
    res.json({ message: 'Đổi mật khẩu thành công' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
