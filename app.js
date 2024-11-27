const express = require('express')
const { handleIndex, handleStart, handleMove, handleEnd } = require('./src/routes')

const app = express()
app.use(express.json())

app.get('/', handleIndex)
app.post('/start', handleStart)
app.post('/move', handleMove)
app.post('/end', handleEnd)
app.post('/', handleMove)

const port = process.env.PORT || 8080
app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})

module.exports = app
