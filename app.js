const express = require('express')
const routes = require('./src/routes/index.js')

const app = express()

// Middleware
app.use(express.json())

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('ERROR:', err)
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  })
})

// Add request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

// Routes
app.get('/', routes.handleIndex)
app.post('/start', routes.handleStart)
app.post('/move', routes.handleMove)
app.post('/end', routes.handleEnd)

module.exports = app
