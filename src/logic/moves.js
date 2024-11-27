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
  
  console.log('Evaluating moves:')
  for (const move of safeMoves) {
    const nextPos = getNextPosition(gameState.you.body[0], move)
    const score = evaluatePosition(gameState, nextPos)
    
    console.log(`Move ${move} to (${nextPos.x},${nextPos.y}) score: ${score}`)
    
    if (score > bestScore) {
      bestScore = score
      bestMove = move
    }
  }
  
  console.log(`Chose ${bestMove} with score ${bestScore}`)
  return bestMove
}

function evaluatePosition(gameState, pos) {
  let score = 0
  const health = gameState.you.health
  
  // FOOD SEEKING - More aggressive now
  const nearestFood = findNearestFood(gameState, pos)
  if (nearestFood) {
    const foodDistance = Math.abs(pos.x - nearestFood.x) + Math.abs(pos.y - nearestFood.y)
    
    // Urgent food seeking when health is low
    if (health < 30) {
      score += (200 - foodDistance * 2)  // Very high priority
      console.log(`Hungry! Food distance: ${foodDistance}, Score boost: ${200 - foodDistance * 2}`)
    }
    // Moderate food seeking when health is medium
    else if (health < 75) {
      score += (100 - foodDistance)  // Medium priority
      console.log(`Could eat! Food distance: ${foodDistance}, Score boost: ${100 - foodDistance}`)
    }
  }
  
  // Center control is now secondary to food
  const centerX = Math.floor(gameState.board.width / 2)
  const centerY = Math.floor(gameState.board.height / 2)
  const distanceToCenter = Math.abs(pos.x - centerX) + Math.abs(pos.y - centerY)
  score -= distanceToCenter * 0.5  // Reduced weight for center control
  
  console.log(`Position (${pos.x},${pos.y}) total score: ${score}`)
  return score
}

function findNearestFood(gameState, pos) {
  let nearestFood = null
  let minDistance = Infinity

  for (const food of gameState.board.food) {
    const distance = Math.abs(pos.x - food.x) + Math.abs(pos.y - food.y)
    if (distance < minDistance) {
      minDistance = distance
      nearestFood = food
    }
  }

  if (nearestFood) {
    console.log(`Nearest food at (${nearestFood.x},${nearestFood.y}), distance: ${minDistance}`)
  }
  
  return nearestFood
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