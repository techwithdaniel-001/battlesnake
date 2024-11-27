const { getMoveResponse } = require('../logic/moves')

// Add debug logging function
function debugLog(title, data) {
  console.log('\n🔍 DEBUG:', title)
  console.log(JSON.stringify(data, null, 2))
  console.log('------------------------')
}

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
    
    // Debug: Log full game state
    debugLog('FULL GAME STATE', {
      turn: gameState.turn,
      board: {
        width: gameState.board.width,
        height: gameState.board.height,
        food: gameState.board.food,
        snakes: gameState.board.snakes.map(s => ({
          id: s.id,
          length: s.length,
          head: s.head
        }))
      },
      you: {
        id: gameState.you.id,
        health: gameState.you.health,
        length: gameState.you.length,
        head: gameState.you.head
      }
    })

    // Validate game state
    if (!gameState.you || !gameState.board) {
      debugLog('ERROR', 'Invalid game state')
      throw new Error('Invalid game state received')
    }
    
    // Get and validate move
    debugLog('CALCULATING MOVE', {
      myHead: gameState.you.head,
      nearestFood: gameState.board.food[0]
    })
    
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