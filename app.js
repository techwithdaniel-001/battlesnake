const express = require('express')
const logger = require('./src/utils/logger')
const routes = require('./src/routes')

const app = express()
app.use(express.json())

// Add logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`)
  next()
})

// Routes
app.get('/', routes.handleIndex)
app.post('/start', routes.handleStart)
app.post('/move', routes.handleMove)
app.post('/end', routes.handleEnd)

const port = process.env.PORT || 8080
app.listen(port, () => {
  logger.info(`Server started on port ${port}`)
})

module.exports = app
