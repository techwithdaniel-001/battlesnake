const express = require('express')
const {
  handleIndex,
  handleStart,
  handleMove,
  handleEnd
} = require('./src/routes')

const app = express()

// Middleware
app.use(express.json())

// Debug middleware - log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

// Routes
app.get('/', handleIndex)
app.post('/start', handleStart)
app.post('/move', handleMove)
app.post('/end', handleEnd)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    error: 'Something broke!',
    message: err.message
  })
})

// Start server
const port = process.env.PORT || 8080
app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})

module.exports = app
