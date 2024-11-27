function isOutOfBounds(pos, board) {
  return pos.x < 0 || pos.x >= board.width ||
         pos.y < 0 || pos.y >= board.height
}

function willHitSnake(pos, snakes) {
  return snakes.some(snake => 
    snake.body.some(segment => 
      segment.x === pos.x && segment.y === pos.y
    )
  )
}

module.exports = {
  isOutOfBounds,
  willHitSnake
} 