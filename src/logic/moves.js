const { evaluateMove } = require('./strategy')
const { astar } = require('./pathfinding')

function getMoveResponse(gameState) {
  const head = gameState.you.body[0]
  console.log('Current head position:', head)
  console.log('Board size:', gameState.board.width, 'x', gameState.board.height)
  
  const possibleMoves = ['up', 'down', 'left', 'right']
  
  // Check each move BEFORE making it
  const safeMoves = possibleMoves.filter(move => {
    const nextPos = getNextPosition(head, move)
    console.log(`Checking move ${move} to position:`, nextPos)
    
    // Explicit wall checks
    if (nextPos.x < 0) {
      console.log(`${move} would hit left wall`)
      return false
    }
    if (nextPos.x >= gameState.board.width) {
      console.log(`${move} would hit right wall`)
      return false
    }
    if (nextPos.y < 0) {
      console.log(`${move} would hit bottom wall`)
      return false
    }
    if (nextPos.y >= gameState.board.height) {
      console.log(`${move} would hit top wall`)
      return false
    }
    
    console.log(`${move} is safe`)
    return true
  })
  
  console.log('Safe moves available:', safeMoves)
  
  // If no safe moves, try to move away from walls
  if (safeMoves.length === 0) {
    console.log('WARNING: No safe moves available!')
    // Try to move away from current wall
    if (head.x === 0) return 'right'
    if (head.x === gameState.board.width - 1) return 'left'
    if (head.y === 0) return 'up'
    if (head.y === gameState.board.height - 1) return 'down'
    return 'down' // Last resort
  }
  
  // Choose a safe move
  const move = safeMoves[Math.floor(Math.random() * safeMoves.length)]
  console.log('Chosen move:', move)
  return move
}

function getNextPosition(head, move) {
  switch(move) {
    case 'up': return { x: head.x, y: head.y + 1 }
    case 'down': return { x: head.x, y: head.y - 1 }
    case 'left': return { x: head.x - 1, y: head.y }
    case 'right': return { x: head.x + 1, y: head.y }
  }
}

module.exports = {
  getMoveResponse
} 