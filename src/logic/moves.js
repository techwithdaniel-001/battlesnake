const DIRECTIONS = ['up', 'down', 'left', 'right']

function getMoveResponse(gameState) {
  const possibleMoves = [...DIRECTIONS]
  const safeMoves = possibleMoves.filter(move => isSafeMove(gameState, move))
  
  if (safeMoves.length === 0) return 'down'
  return safeMoves[Math.floor(Math.random() * safeMoves.length)]
}

function isSafeMove(gameState, move) {
  const head = gameState.you.body[0]
  const nextPosition = getNextPosition(head, move)
  
  // Don't hit walls
  if (nextPosition.x < 0) return false
  if (nextPosition.x >= gameState.board.width) return false
  if (nextPosition.y < 0) return false
  if (nextPosition.y >= gameState.board.height) return false
  
  // Don't hit snakes (including self)
  const snakes = gameState.board.snakes
  for (let snake of snakes) {
    for (let bodyPart of snake.body) {
      if (nextPosition.x === bodyPart.x && nextPosition.y === bodyPart.y) {
        return false
      }
    }
  }
  
  return true
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