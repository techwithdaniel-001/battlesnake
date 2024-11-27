const { getMoveResponse } = require('../logic/moves')
const board = require('../utils/board')

// Add at the top with other constants
const HEALTH_THRESHOLD = 50

// Index handler
function handleIndex(req, res) {
  const battlesnakeInfo = {
    apiversion: "1",
    author: "Ebubechukwu",
    color: "#FF0000",
    head: "silly",
    tail: "bolt",
    version: "1.0.0"
  }
  res.json(battlesnakeInfo)
}

// Start handler
function handleStart(req, res) {
  try {
    const gameState = req.body
    console.log('\n=== GAME START ===')
    console.log('Game ID:', gameState.game.id)
    console.log('Board Size:', gameState.board.width, 'x', gameState.board.height)
    console.log('My Snake ID:', gameState.you.id)
    res.json({})
  } catch (error) {
    console.error('Start Error:', error)
    res.json({})
  }
}

// Move handler
function handleMove(req, res) {
  try {
    const gameState = req.body
    
    console.log('\n=== TURN', gameState.turn, '===')
    console.log('Health:', gameState.you?.health || 100)
    console.log('Length:', gameState.you?.body?.length || 1)
    
    // Create and display board
    const gameBoard = board.createGameBoard(gameState)
    board.printBoard(gameBoard)
    
    // Get move response
    const move = getMoveResponse(gameState)
    console.log('\nChosen move:', move)
    
    res.json({ move })
  } catch (error) {
    console.error('Move Error:', error)
    res.json({ move: 'right' })
  }
}

// End handler
function handleEnd(req, res) {
  try {
    const gameState = req.body
    console.log('\n=== GAME OVER ===')
    console.log('Game ID:', gameState.game.id)
    console.log('Final Turn:', gameState.turn)
    console.log('Final Length:', gameState.you.length)
    console.log('Reason:', gameState.you.elimination_reason || 'Unknown')
    res.json({})
  } catch (error) {
    console.error('End Error:', error)
    res.json({})
  }
}

module.exports = {
  handleIndex,
  handleStart,
  handleMove,
  handleEnd
} 