const { evaluateMove } = require('./strategy')
const { astar } = require('./pathfinding')

function getMoveResponse(gameState) {
  const head = gameState.you.body[0]
  const possibleMoves = ['up', 'down', 'left', 'right']
  
  // Filter out unsafe moves
  const safeMoves = possibleMoves.filter(move => {
    const nextPos = getNextPosition(head, move)
    return isSafeMove(gameState, nextPos)
  })

  // If no safe moves, try any move
  if (safeMoves.length === 0) {
    return possibleMoves[0]
  }

  // Choose a random safe move
  return safeMoves[Math.floor(Math.random() * safeMoves.length)]
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