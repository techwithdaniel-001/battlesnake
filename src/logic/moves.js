const { evaluateMove } = require('./strategy')
const { astar } = require('./pathfinding')

function getMoveResponse(gameState) {
  const head = gameState.you.body[0]
  const possibleMoves = ['up', 'down', 'left', 'right']
  
  // Score each possible move
  const scoredMoves = possibleMoves.map(move => ({
    move,
    score: evaluateMove(gameState, getNextPosition(head, move))
  }))

  console.log('Scored moves:', scoredMoves)
  
  // Sort by score
  scoredMoves.sort((a, b) => b.score - a.score)
  
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