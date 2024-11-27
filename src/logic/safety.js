const { isOutOfBounds, willHitSnake } = require('../utils/board')

function isMovesSafe(gameState, move) {
  const head = gameState.you.head
  const nextPosition = getNextPosition(head, move)
  
  return !isOutOfBounds(nextPosition, gameState.board) &&
         !willHitSnake(nextPosition, gameState.board.snakes)
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
  isMovesSafe,
  getNextPosition
} 