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
  try {
    console.log("GAME START:", req.body)
    res.json({})
  } catch (error) {
    console.error("Start Error:", error)
    res.json({})
  }
}

function handleMove(req, res) {
  try {
    const gameState = req.body
    console.log(`Turn ${gameState.turn}: Health=${gameState.you.health}`)
    
    const move = getMoveResponse(gameState)
    console.log(`Moving ${move}`)
    
    res.json({ move })
  } catch (error) {
    console.error("Move Error:", error)
    // Default to moving right if there's an error
    res.json({ move: "right" })
  }
}

function handleEnd(req, res) {
  try {
    console.log("GAME OVER:", req.body)
    res.json({})
  } catch (error) {
    console.error("End Error:", error)
    res.json({})
  }
}

module.exports = {
  handleIndex,
  handleStart,
  handleMove,
  handleEnd
} 