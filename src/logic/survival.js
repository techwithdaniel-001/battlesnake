const { DIRECTIONS } = require('../utils/constants')

function getSafeMoves(gameState) {
  const possibleMoves = Object.values(DIRECTIONS)
  const head = gameState.you.body[0]
  
  return possibleMoves.filter(move => {
    const nextPos = getNextPosition(head, move)
    return (
      !willHitWall(nextPos, gameState.board) &&
      !willHitSnake(nextPos, gameState.board.snakes, gameState.you) &&
      hasEscapeRoute(nextPos, gameState)
    )
  })
}

function getNextPosition(head, move) {
  switch(move) {
    case DIRECTIONS.UP: return { x: head.x, y: head.y + 1 }
    case DIRECTIONS.DOWN: return { x: head.x, y: head.y - 1 }
    case DIRECTIONS.LEFT: return { x: head.x - 1, y: head.y }
    case DIRECTIONS.RIGHT: return { x: head.x + 1, y: head.y }
  }
}

function willHitWall(pos, board) {
  return pos.x < 0 || pos.x >= board.width || 
         pos.y < 0 || pos.y >= board.height
}

function willHitSnake(pos, snakes, self) {
  return snakes.some(snake => {
    // Don't check last tail piece if snake didn't just eat
    const body = snake.length === self.length ? 
      snake.body.slice(0, -1) : snake.body
    return body.some(segment => 
      segment.x === pos.x && segment.y === pos.y
    )
  })
}

function hasEscapeRoute(pos, gameState) {
  // Check if there are at least 2 safe adjacent squares
  const escapeRoutes = Object.values(DIRECTIONS)
    .map(move => getNextPosition(pos, move))
    .filter(nextPos => 
      !willHitWall(nextPos, gameState.board) &&
      !willHitSnake(nextPos, gameState.board.snakes, gameState.you)
    )
  return escapeRoutes.length >= 2
}

module.exports = {
  getSafeMoves,
  getNextPosition,
  willHitWall,
  willHitSnake
} 