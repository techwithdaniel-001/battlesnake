const { evaluateMove } = require('./strategy')

function getMoveResponse(gameState) {
  const head = gameState.you.body[0]
  const possibleMoves = ['up', 'down', 'left', 'right']
  
  // Filter out moves that would hit walls
  const safeMoves = possibleMoves.filter(move => {
    const nextPos = getNextPosition(head, move)
    
    // Check walls
    if (nextPos.x < 0) return false
    if (nextPos.x >= gameState.board.width) return false
    if (nextPos.y < 0) return false
    if (nextPos.y >= gameState.board.height) return false
    
    // Check for self collision
    return !willHitSelf(nextPos, gameState.you.body)
  })

  // Log safe moves for debugging
  console.log('Safe moves:', safeMoves)
  
  // If no safe moves available, we're trapped
  if (safeMoves.length === 0) {
    console.log('WARNING: No safe moves available!')
    return possibleMoves[0] // We're probably going to die, but try something
  }
  
  // Choose a random safe move
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