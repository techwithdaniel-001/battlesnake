const { DIRECTIONS } = require('../utils/constants')
const { isOutOfBounds, willHitSnake } = require('../utils/board')

function getMoveResponse(gameState) {
  const head = gameState.you.body[0]
  const myLength = gameState.you.length
  console.log('My length:', myLength)
  
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
      console.log(`${move} would hit snake body`)
      continue
    }
    
    // Check for potential head-to-head collisions
    if (willCollideWithLargerSnakeHead(nextPos, myLength, gameState.board.snakes)) {
      console.log(`${move} risks head collision with larger snake`)
      continue
    }
    
    console.log(`${move} is safe`)
    safeMoves.push(move)
  }
  
  console.log('Safe moves:', safeMoves)
  
  if (safeMoves.length === 0) {
    console.log('WARNING: No safe moves!')
    return emergencyMove(gameState)
  }
  
  return chooseBestMove(gameState, safeMoves)
}

function willCollideWithLargerSnakeHead(myNextPos, myLength, snakes) {
  for (const snake of snakes) {
    // Skip our own snake
    if (snake.length <= myLength) continue
    
    // Get possible next positions for this snake's head
    const theirHead = snake.head
    const theirPossibleMoves = [
      { x: theirHead.x, y: theirHead.y + 1 }, // up
      { x: theirHead.x, y: theirHead.y - 1 }, // down
      { x: theirHead.x - 1, y: theirHead.y }, // left
      { x: theirHead.x + 1, y: theirHead.y }  // right
    ]
    
    // If any of their possible moves collide with our next position
    if (theirPossibleMoves.some(pos => 
      pos.x === myNextPos.x && pos.y === myNextPos.y
    )) {
      console.log(`Possible head collision with snake of length ${snake.length}`)
      return true
    }
  }
  
  return false
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
  const myLength = gameState.you.length
  
  // FOOD SEEKING
  const nearestFood = findNearestFood(gameState, pos)
  if (nearestFood) {
    const foodDistance = Math.abs(pos.x - nearestFood.x) + Math.abs(pos.y - nearestFood.y)
    
    if (health < 30) {
      score += (200 - foodDistance * 2)
      console.log(`Hungry! Food distance: ${foodDistance}, Score boost: ${200 - foodDistance * 2}`)
    }
    else if (health < 75) {
      score += (100 - foodDistance)
      console.log(`Could eat! Food distance: ${foodDistance}, Score boost: ${100 - foodDistance}`)
    }
  }
  
  // AVOID LARGER SNAKES
  for (const snake of gameState.board.snakes) {
    if (snake.length > myLength) {
      const distanceToTheirHead = Math.abs(pos.x - snake.head.x) + Math.abs(pos.y - snake.head.y)
      if (distanceToTheirHead < 3) {
        score -= (3 - distanceToTheirHead) * 50
        console.log(`Avoiding larger snake! Distance: ${distanceToTheirHead}, Penalty: ${(3 - distanceToTheirHead) * 50}`)
      }
    }
  }
  
  // Center control is now tertiary priority
  const centerX = Math.floor(gameState.board.width / 2)
  const centerY = Math.floor(gameState.board.height / 2)
  const distanceToCenter = Math.abs(pos.x - centerX) + Math.abs(pos.y - centerY)
  score -= distanceToCenter * 0.5
  
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