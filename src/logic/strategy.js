const { getNextPosition } = require('./moves')

function evaluateMove(gameState, move) {
  const head = gameState.you.body[0]
  const nextPos = getNextPosition(head, move)
  
  // Basic scoring
  let score = 0
  
  // Avoid walls
  if (nextPos.x < 0 || nextPos.x >= gameState.board.width) return -100
  if (nextPos.y < 0 || nextPos.y >= gameState.board.height) return -100
  
  // Avoid snakes
  if (willHitSnake(nextPos, gameState.board.snakes)) return -100
  
  return score
}

function willHitSnake(pos, snakes) {
  return snakes.some(snake => 
    snake.body.some(segment => 
      segment.x === pos.x && segment.y === pos.y
    )
  )
}

module.exports = {
  evaluateMove
} 