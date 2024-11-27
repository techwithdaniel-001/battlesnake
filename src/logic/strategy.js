const PRIORITIES = {
  SURVIVAL: 100,
  FOOD: 80,
  ATTACK: 60,
  DEFEND: 40
}

const { astar, manhattanDistance } = require('./pathfinding')

function evaluateMove(gameState, move) {
  const head = gameState.you.body[0]
  const nextPos = getNextPosition(head, move)
  let score = 0

  // 1. Survival Checks (Highest Priority)
  if (!isSafeMove(gameState, nextPos)) return -1000

  // 2. Health Management
  score += evaluateHealth(gameState, nextPos)

  // 3. Space Control
  score += evaluateSpace(gameState, nextPos)

  // 4. Offensive/Defensive Strategy
  score += evaluateTactical(gameState, nextPos)

  return score
}

function isSafeMove(gameState, pos) {
  // Check walls
  if (pos.x < 0 || pos.x >= gameState.board.width) return false
  if (pos.y < 0 || pos.y >= gameState.board.height) return false

  // Check snake collisions (including potential head-to-head)
  const snakes = gameState.board.snakes
  const you = gameState.you

  for (let snake of snakes) {
    // Head-to-head collision check with larger snakes
    if (snake.id !== you.id && snake.length >= you.length) {
      const possibleHeads = getPossibleHeads(snake.head)
      if (possibleHeads.some(h => h.x === pos.x && h.y === pos.y)) {
        return false
      }
    }

    // Body collision check
    if (snake.body.some(b => b.x === pos.x && b.y === pos.y)) {
      return false
    }
  }

  return true
}

function evaluateHealth(gameState, pos) {
  let score = 0
  const health = gameState.you.health

  // Urgent food seeking when health is low
  if (health < 30) {
    const nearestFood = findNearestFood(gameState, pos)
    if (nearestFood) {
      score += (100 - getDistance(pos, nearestFood)) * 2
    }
  }

  // Moderate food seeking when health is medium
  else if (health < 70) {
    const nearestFood = findNearestFood(gameState, pos)
    if (nearestFood) {
      score += (100 - getDistance(pos, nearestFood))
    }
  }

  return score
}

function evaluateSpace(gameState, pos) {
  let score = 0
  
  // Flood fill to check available space
  const availableSpace = floodFill(gameState, pos)
  score += availableSpace * 2

  // Prefer center control when healthy
  if (gameState.you.health > 50) {
    const centerDistance = getDistanceToCenter(gameState, pos)
    score += (gameState.board.width - centerDistance) * 1.5
  }

  return score
}

function evaluateTactical(gameState, pos) {
  let score = 0
  const you = gameState.you
  const otherSnakes = gameState.board.snakes.filter(s => s.id !== you.id)

  // Aggressive behavior when larger
  for (let snake of otherSnakes) {
    if (you.length > snake.length) {
      const distanceToSnake = getDistance(pos, snake.head)
      if (distanceToSnake < 3) {
        score += 30 // Encourage cutting off smaller snakes
      }
    }
  }

  // Defensive behavior when smaller
  for (let snake of otherSnakes) {
    if (you.length <= snake.length) {
      const distanceToSnake = getDistance(pos, snake.head)
      if (distanceToSnake < 3) {
        score -= 40 // Avoid larger snakes
      }
    }
  }

  return score
}

// Helper functions
function getDistance(pos1, pos2) {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y)
}

function findNearestFood(gameState, pos) {
  return gameState.board.food.reduce((nearest, food) => {
    const distance = getDistance(pos, food)
    if (!nearest || distance < getDistance(pos, nearest)) {
      return food
    }
    return nearest
  }, null)
}

function floodFill(gameState, start) {
  const visited = new Set()
  const queue = [start]
  const board = gameState.board

  while (queue.length > 0) {
    const pos = queue.shift()
    const key = `${pos.x},${pos.y}`

    if (visited.has(key)) continue
    if (!isValidPosition(pos, gameState)) continue

    visited.add(key)

    // Add adjacent squares
    queue.push(
      {x: pos.x + 1, y: pos.y},
      {x: pos.x - 1, y: pos.y},
      {x: pos.x, y: pos.y + 1},
      {x: pos.x, y: pos.y - 1}
    )
  }

  return visited.size
}

function isValidPosition(pos, gameState) {
  if (pos.x < 0 || pos.x >= gameState.board.width) return false
  if (pos.y < 0 || pos.y >= gameState.board.height) return false

  // Check for snake bodies
  return !gameState.board.snakes.some(snake =>
    snake.body.some(b => b.x === pos.x && b.y === pos.y)
  )
}

function getBoardMap(gameState) {
  const width = gameState.board.width
  const height = gameState.board.height
  const board = Array(height).fill().map(() => Array(width).fill(0))
  
  // Mark snake bodies
  gameState.board.snakes.forEach(snake => {
    snake.body.forEach(pos => {
      board[pos.y][pos.x] = 1
    })
  })
  
  // Mark food
  gameState.board.food.forEach(food => {
    board[food.y][food.x] = 2
  })
  
  return board
}

function shouldChaseTail(gameState) {
  const health = gameState.you.health
  const nearestFood = findNearestFood(gameState, gameState.you.head)
  
  // Chase tail if healthy and no nearby food
  return health > 50 && (!nearestFood || 
    manhattanDistance(gameState.you.head, nearestFood) > 5)
}

module.exports = {
  evaluateMove,
  PRIORITIES
} 