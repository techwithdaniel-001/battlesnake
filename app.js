const express = require('express')
const { handleIndex, handleStart, handleMove, handleEnd } = require('./src/routes')

const app = express()
app.use(express.json())

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body)
  next()
})

app.get('/', handleIndex)
app.post('/start', handleStart)
app.post('/move', handleMove)
app.post('/end', handleEnd)

const port = process.env.PORT || 8080
app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})

module.exports = app
