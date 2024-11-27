const express = require('express')
const routes = require('./src/routes/index.js')

const app = express()

// Middleware
app.use(express.json())

// Make sure routes are defined
console.log('Available routes:', Object.keys(routes))

// Routes with explicit handlers
if (routes.handleIndex) {
  app.get('/', routes.handleIndex)
} else {
  console.error('handleIndex is undefined!')
}

if (routes.handleStart) {
  app.post('/start', routes.handleStart)
}

if (routes.handleMove) {
  app.post('/move', routes.handleMove)
}

if (routes.handleEnd) {
  app.post('/end', routes.handleEnd)
}

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something broke!' })
})

const port = process.env.PORT || 8080
app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})

module.exports = app
