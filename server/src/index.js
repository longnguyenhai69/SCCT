require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const path    = require('path')

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/auth',    require('./routes/auth'))
app.use('/api/users',   require('./routes/users'))
app.use('/api/sites',   require('./routes/sites'))
app.use('/api/devices', require('./routes/devices'))
app.use('/api/tickets', require('./routes/tickets'))
app.use('/api/reports', require('./routes/reports'))

app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

// ── Phục vụ frontend (bản build Vue) ─────────────────────────
const publicDir = path.join(__dirname, '..', 'public')
app.use(express.static(publicDir))
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next()
  res.sendFile(path.join(publicDir, 'index.html'))
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`✅ SCCT chạy tại http://localhost:${PORT}`))
