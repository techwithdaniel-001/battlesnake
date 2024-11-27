const { getMoveResponse } = require('../logic/moves')

function handleIndex(req, res) {
  res.json({
    apiversion: "1",
    author: "Ebubechukwu",
    color: "#FF0000",
    head: "silly",
    tail: "bolt",
    version: "1.0.0"
  })
}

function handleStart(req, res) {
  console.log("GAME START")
  res.json({})
}

function handleMove(req, res) {
  try {
    const gameState = req.body
    console.log(`Turn ${gameState.turn}: Health=${gameState.you.health}`)
    
    const move = getMoveResponse(gameState)
    console.log(`Moving ${move}`)
    
    res.json({ move: move })
  } catch (error) {
    console.error("Move Error:", error)
    res.json({ move: "right" })
  }
}

function handleEnd(req, res) {
  console.log("GAME OVER")
  res.json({})
}

module.exports = {
  handleIndex,
  handleStart,
  handleMove,
  handleEnd
} 