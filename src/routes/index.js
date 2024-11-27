const { getMoveResponse } = require('../logic/moves')

function handleIndex(req, res) {
  res.json({
    apiversion: "1",
    author: "Ebubechukwu",
    color: "#FF5733",
    head: "silly",
    tail: "bolt",
    version: "1.0.0"
  })
}

function handleMove(req, res) {
  const gameState = req.body
  const move = getMoveResponse(gameState)
  res.json({ move })
}

module.exports = {
  handleIndex,
  handleMove
} 