const { getMoveResponse } = require('../logic/moves')

function handleIndex(req, res) {
  res.json({
    apiversion: "1",
    author: "Ebubechukwu",
    color: "#00FF00",
    head: "silly",
    tail: "bolt",
    version: "1.0.0"
  })
}

function handleStart(req, res) {
  console.log("Game Starting...")
  res.json({})
}

function handleMove(req, res) {
  const gameState = req.body
  const move = getMoveResponse(gameState)
  console.log(`Moving ${move}...`)
  res.json({ move })
}

function handleEnd(req, res) {
  console.log("Game Over!")
  res.json({})
}

module.exports = {
  handleIndex,
  handleStart,
  handleMove,
  handleEnd
} 