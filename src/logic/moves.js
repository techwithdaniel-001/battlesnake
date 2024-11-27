const { evaluateMove } = require('./strategy')
const { astar } = require('./pathfinding')

function getMoveResponse(gameState) {
  const head = gameState.you.body[0]
  const possibleMoves = ['up', 'down', 'left', 'right']
  
  // Filter out moves that would hit walls
  const safeMoves = possibleMoves.filter(move => {
    const nextPos = getNextPosition(head, move)
    return !willHitWall(nextPos, gameState.board)
  })
  
  console.log('Safe moves:', safeMoves)
  
  // If no safe moves, try anything
  if (safeMoves.length === 0) {
    console.log('No safe moves! Trying random move...')
    return possibleMoves[Math.floor(Math.random() * possibleMoves.length)]
  }
  
  // Choose random safe move
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

function willHitWall(pos, board) {
  return pos.x < 0 || pos.x >= board.width || 
         pos.y < 0 || pos.y >= board.height
}

module.exports = {
  getMoveResponse
} 