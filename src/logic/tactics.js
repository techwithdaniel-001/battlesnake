const { SNAKE_CONFIG, WEIGHTS } = require('../utils/constants')

function shouldSeekFood(gameState) {
  const health = gameState.you.health
  const myLength = gameState.you.length
  const otherSnakes = gameState.board.snakes.filter(s => s.id !== gameState.you.id)
  const largerSnakeNearby = otherSnakes.some(snake => 
    snake.length > myLength && 
    getDistance(gameState.you.head, snake.head) < SNAKE_CONFIG.MIN_SAFE_DISTANCE * 2
  )

  return (
    health < SNAKE_CONFIG.LOW_HEALTH ||
    (health < SNAKE_CONFIG.SAFE_HEALTH && myLength < SNAKE_CONFIG.PREFERRED_SIZE) ||
    (health < SNAKE_CONFIG.CRITICAL_HEALTH)
  ) && !largerSnakeNearby
}

function shouldCoil(gameState) {
  const health = gameState.you.health
  const myLength = gameState.you.length
  
  return (
    health > SNAKE_CONFIG.COIL_THRESHOLD &&
    myLength > SNAKE_CONFIG.PREFERRED_SIZE &&
    hasEnoughSpace(gameState) &&
    !isInDanger(gameState)
  )
}

function evaluateFood(food, gameState) {
  const scores = gameState.board.food.map(foodPos => {
    let score = 0
    const distanceToFood = getDistance(gameState.you.head, foodPos)
    
    // Base score based on distance
    score += (gameState.board.width + gameState.board.height - distanceToFood)

    // Penalty for food that other snakes are closer to
    const otherSnakesCloser = gameState.board.snakes.filter(snake => 
      snake.id !== gameState.you.id &&
      getDistance(snake.head, foodPos) < distanceToFood
    ).length
    score -= otherSnakesCloser * 10

    // Bonus for food near walls (potential trap)
    if (isNearWall(foodPos, gameState.board)) {
      score += 5
    }

    return { pos: foodPos, score }
  })

  return scores.sort((a, b) => b.score - a.score)[0]
} 