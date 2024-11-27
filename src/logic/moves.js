const { DIRECTIONS } = require('../utils/constants')
const { isOutOfBounds, willHitSnake } = require('../utils/board')

function getMoveResponse(gameState) {
  const head = gameState.you.body[0]
  console.log('Current head position:', head)
  
  const possibleMoves = Object.values(DIRECTIONS)
  const safeMoves = []
  
  // Check each possible move
  for (const move of possibleMoves) {
    const nextPos = getNextPosition(head, move)
    
    // Skip if move is unsafe
    if (isOutOfBounds(nextPos, gameState.board)) {
      console.log(`${move} would hit wall`)
      continue
    }
    
    if (willHitSnake(nextPos, gameState.board.snakes)) {
      console.log(`${move} would hit snake`)
      continue
    }
    
    console.log(`${move} is safe`)
    safeMoves.push(move)
  }
  
  console.log('Safe moves:', safeMoves)
  
  // If no safe moves, try emergency move
  if (safeMoves.length === 0) {
    console.log('WARNING: No safe moves!')
    return emergencyMove(gameState)
  }
  
  // Choose best move from safe moves
  return chooseBestMove(gameState, safeMoves)
}

function chooseBestMove(gameState, safeMoves) {
  let bestMove = safeMoves[0]
  let bestScore = -Infinity
  
  for (const move of safeMoves) {
    const nextPos = getNextPosition(gameState.you.body[0], move)
    const score = evaluatePosition(gameState, nextPos)
    
    if (score > bestScore) {
      bestScore = score
      bestMove = move
    }
  }
  
  console.log(`Choosing ${bestMove} with score ${bestScore}`)
  return bestMove
}

function evaluatePosition(gameState, pos) {
  let score = 0
  
  // Prefer center
  const centerX = Math.floor(gameState.board.width / 2)
  const centerY = Math.floor(gameState.board.height / 2)
  const distanceToCenter = Math.abs(pos.x - centerX) + Math.abs(pos.y - centerY)
  score -= distanceToCenter
  
  // Consider food if health is low
  if (gameState.you.health < 50) {
    const nearestFood = findNearestFood(gameState, pos)
    if (nearestFood) {
      const foodDistance = Math.abs(pos.x - nearestFood.x) + Math.abs(pos.y - nearestFood.y)
      score += (100 - foodDistance)
    }
  }
  
  return score
}

function findNearestFood(gameState, pos) {
  return gameState.board.food.reduce((nearest, food) => {
    if (!nearest) return food
    
    const currentDist = Math.abs(pos.x - food.x) + Math.abs(pos.y - food.y)
    const nearestDist = Math.abs(pos.x - nearest.x) + Math.abs(pos.y - nearest.y)
    
    return currentDist < nearestDist ? food : nearest
  }, null)
}

function emergencyMove(gameState) {
  const head = gameState.you.body[0]
  const moves = Object.values(DIRECTIONS)
  
  // Try to move away from walls
  if (head.x === 0) return DIRECTIONS.RIGHT
  if (head.x === gameState.board.width - 1) return DIRECTIONS.LEFT
  if (head.y === 0) return DIRECTIONS.UP
  if (head.y === gameState.board.height - 1) return DIRECTIONS.DOWN
  
  return moves[0]
}

function getNextPosition(head, move) {
  switch(move) {
    case DIRECTIONS.UP: return { x: head.x, y: head.y + 1 }
    case DIRECTIONS.DOWN: return { x: head.x, y: head.y - 1 }
    case DIRECTIONS.LEFT: return { x: head.x - 1, y: head.y }
    case DIRECTIONS.RIGHT: return { x: head.x + 1, y: head.y }
  }
}

module.exports = {
  getMoveResponse,
  getNextPosition
} 