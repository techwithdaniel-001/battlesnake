const { getMoveResponse } = require('../logic/moves')

function handleIndex(req, res) {
  try {
    const battlesnakeInfo = {
      apiversion: "1",
      author: "Ebubechukwu",
      color: "#FF0000",
      head: "silly",
      tail: "bolt",
      version: "1.0.0"
    }
    console.log('Battlesnake Info:', battlesnakeInfo)
    res.json(battlesnakeInfo)
  } catch (error) {
    console.error('Index Error:', error)
    res.status(500).json({ error: error.message })
  }
}

function handleStart(req, res) {
  try {
    const gameState = req.body
    console.log('\n=== GAME START ===')
    console.log('Game ID:', gameState.game.id)
    console.log('Board Size:', gameState.board.width, 'x', gameState.board.height)
    console.log('My Snake ID:', gameState.you.id)
    console.log('All Snakes:', gameState.board.snakes.map(s => ({
      id: s.id,
      length: s.length,
      name: s.name
    })))
    res.json({})
  } catch (error) {
    console.error('Start Error:', error)
    res.status(500).json({ error: error.message })
  }
}

function handleMove(req, res) {
  try {
    const gameState = req.body
    
    // Detailed game state logging
    console.log('\n=== TURN', gameState.turn, '===')
    console.log('My Snake:')
    console.log('- Health:', gameState.you.health)
    console.log('- Length:', gameState.you.length)
    console.log('- Head:', gameState.you.head)
    console.log('Board:')
    console.log('- Food:', gameState.board.food)
    console.log('- Snakes:', gameState.board.snakes.length)
    
    // Validate game state
    if (!gameState.you || !gameState.board) {
      throw new Error('Invalid game state received')
    }
    
    // Get and validate move
    const move = getMoveResponse(gameState)
    
    // Validate move response
    if (!['up', 'down', 'left', 'right'].includes(move)) {
      throw new Error(`Invalid move received: ${move}`)
    }
    
    console.log('Move chosen:', move)
    res.json({ move })
    
  } catch (error) {
    console.error('Move Error:', error)
    console.error('Stack:', error.stack)
    // Default to right if there's an error, but log it
    console.error('Defaulting to RIGHT due to error')
    res.json({ move: 'right' })
  }
}

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
    res.status(500).json({ error: error.message })
  }
}

module.exports = {
  handleIndex,
  handleStart,
  handleMove,
  handleEnd
} 