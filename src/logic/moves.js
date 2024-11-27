const { evaluateMove } = require('./strategy')

function getMoveResponse(gameState) {
  const possibleMoves = ['up', 'down', 'left', 'right']
  
  // Score each possible move
  const scoredMoves = possibleMoves.map(move => ({
    move,
    score: evaluateMove(gameState, getNextPosition(gameState.you.body[0], move))
  }))

  // Add some debugging
  console.log('Scored moves:', scoredMoves)

  // Sort by score and pick best move
  scoredMoves.sort((a, b) => b.score - a.score)
  
  console.log('Choosing move:', scoredMoves[0].move)
  return scoredMoves[0].move
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