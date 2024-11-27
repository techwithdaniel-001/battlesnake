const express = require('express')
const { handleIndex, handleMove } = require('./src/routes')

const app = express()
app.use(express.json())

app.get('/', handleIndex)
app.post('/', handleMove)

const port = process.env.PORT || 8080
app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})

module.exports = app
