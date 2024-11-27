const { DIRECTIONS } = require('../utils/constants')
const { CELL, createGameBoard, printBoard } = require('../utils/board')

function getMoveResponse(gameState) {
  try {
    console.log('\n=== MOVE DEBUG ===')
    console.log('Head position:', gameState.you.head)
    console.log('Board size:', gameState.board.width, 'x', gameState.board.height)

    const board = createGameBoard(gameState)
    
    // Get SAFE moves first
    let safeMoves = getPossibleMoves(gameState, board)
    console.log('Available safe moves:', safeMoves)

    // CRITICAL: If no safe moves, try emergency moves
    if (safeMoves.length === 0) {
      console.log('WARNING: No safe moves available!')
      // Try to find any move that keeps us alive
      const emergencyMoves = getEmergencyMoves(gameState, board)
      console.log('Emergency moves:', emergencyMoves)
      
      if (emergencyMoves.length > 0) {
        const move = emergencyMoves[0]
        console.log('Choosing emergency move:', move)
        return move
      }
      
      // If still no moves, try absolute last resort
      const lastResort = getLastResortMove(gameState)
      console.log('Last resort move:', lastResort)
      return lastResort
    }

    // Choose the safest move
    const move = chooseSafestMove(safeMoves, gameState, board)
    console.log('Chosen safe move:', move)
    return move

  } catch (error) {
    console.error('MOVE ERROR:', error)
    return findEmergencyMove(gameState)
  }
}

function getPossibleMoves(gameState, board) {
  const head = gameState.you.head
  const possibleMoves = []

  // Check each direction for safety
  const moves = [
    { dir: 'up', x: head.x, y: head.y + 1 },
    { dir: 'down', x: head.x, y: head.y - 1 },
    { dir: 'left', x: head.x - 1, y: head.y },
    { dir: 'right', x: head.x + 1, y: head.y }
  ]

  moves.forEach(move => {
    if (isSafeMove({ x: move.x, y: move.y }, gameState, board)) {
      possibleMoves.push(move.dir)
    }
  })

  console.log('Checking moves from position:', head)
  console.log('Safe moves found:', possibleMoves)
  return possibleMoves
}

function isSafeMove(pos, gameState, board) {
  // Check bounds FIRST
  if (pos.x < 0 || pos.x >= gameState.board.width) {
    console.log(`Position ${JSON.stringify(pos)} is out of bounds`)
    return false
  }
  if (pos.y < 0 || pos.y >= gameState.board.height) {
    console.log(`Position ${JSON.stringify(pos)} is out of bounds`)
    return false
  }

  const cell = board[pos.y][pos.x]
  
  // Never hit yourself
  if (cell === CELL.MY_BODY) {
    console.log(`Position ${JSON.stringify(pos)} would hit our body`)
    return false
  }

  // Check for potential head-to-head collisions
  if (cell === CELL.ENEMY_HEAD || isPossibleHeadCollision(pos, gameState)) {
    const myLength = gameState.you.body.length
    const enemySnake = gameState.board.snakes.find(
      snake => snake.id !== gameState.you.id && 
      isAdjacent(snake.head, pos)
    )
    
    if (enemySnake) {
      // Allow head-on collisions if we're longer
      const isSafe = myLength > enemySnake.body.length
      if (isSafe) {
        console.log(`Offensive: Engaging shorter snake ${enemySnake.id}`)
      }
      return isSafe
    }
  }

  // Safe if empty or food
  return cell === CELL.EMPTY || cell === CELL.FOOD
}

// Helper function to check if a position is adjacent to another
function isAdjacent(pos1, pos2) {
  const dx = Math.abs(pos1.x - pos2.x)
  const dy = Math.abs(pos1.y - pos2.y)
  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1)
}

// Check if moving to this position could result in a head-to-head next turn
function isPossibleHeadCollision(pos, gameState) {
  return gameState.board.snakes.some(snake => {
    if (snake.id === gameState.you.id) return false
    
    // Check if enemy snake head is one move away from our target position
    return isAdjacent(snake.head, pos)
  })
}

function avoidLargerSnakes(gameState, board, safeMoves) {
  const myLength = gameState.you.body.length
  const dangerousPositions = new Set()

  // Mark positions near larger snake heads
  gameState.board.snakes.forEach(snake => {
    if (snake.id !== gameState.you.id && snake.body.length >= myLength) {
      const head = snake.head
      // Mark all positions around the head
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          dangerousPositions.add(`${head.x + dx},${head.y + dy}`)
        }
      }
    }
  })

  // Filter moves that don't go near larger snakes
  return safeMoves.filter(move => {
    const nextPos = getNextPosition(gameState.you.head, move)
    return !dangerousPositions.has(`${nextPos.x},${nextPos.y}`)
  })
}

function moveTowardTail(gameState, board, safeMoves) {
  const head = gameState.you.head
  const tail = gameState.you.body[gameState.you.body.length - 1]
  
  // Don't chase tail if it's too far
  const distanceToTail = calculateDistance(head, tail)
  if (distanceToTail > gameState.you.body.length) {
    return null
  }

  return chooseMoveTowardTarget(head, tail, safeMoves)
}

function evaluateAvailableSpace(pos, gameState, board) {
  const visited = new Set()
  const queue = [pos]
  let space = 0

  while (queue.length > 0) {
    const current = queue.shift()
    const key = `${current.x},${current.y}`

    if (visited.has(key)) continue
    visited.add(key)
    space++

    // Check all adjacent cells
    const moves = ['up', 'down', 'left', 'right']
    moves.forEach(move => {
      const next = getNextPosition(current, move)
      if (isSafeMove(next, gameState, board)) {
        queue.push(next)
      }
    })
  }

  return space
}

function findOpenSpace(gameState, board, safeMoves) {
  const moveScores = safeMoves.map(move => {
    const nextPos = getNextPosition(gameState.you.head, move)
    const spaceScore = evaluateAvailableSpace(nextPos, gameState, board)
    return { move, score: spaceScore }
  })

  moveScores.sort((a, b) => b.score - a.score)
  return moveScores[0]?.move
}

function findFoodMove(gameState, board, safeMoves) {
  const head = gameState.you.head
  const foods = gameState.board.food

  if (foods.length === 0) return null

  // Find closest food
  let closestFood = foods[0]
  let shortestDistance = calculateDistance(head, foods[0])

  foods.forEach(food => {
    const distance = calculateDistance(head, food)
    if (distance < shortestDistance) {
      closestFood = food
      shortestDistance = distance
    }
  })

  // Choose move that gets us closer to food
  return chooseMoveTowardTarget(head, closestFood, safeMoves)
}

function calculateDistance(pos1, pos2) {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y)
}

function chooseMoveTowardTarget(head, target, safeMoves) {
  const moveScores = safeMoves.map(move => {
    const nextPos = getNextPosition(head, move)
    const score = calculateDistance(nextPos, target)
    return { move, score }
  })

  // Choose move that minimizes distance
  moveScores.sort((a, b) => a.score - b.score)
  return moveScores[0]?.move
}

function chooseSafestMove(safeMoves, gameState, board) {
  console.log('\nEvaluating offensive moves...')
  
  const moveScores = safeMoves.map(move => {
    const nextPos = getNextPosition(gameState.you.head, move)
    let score = 0
    
    // Basic space and food scores
    const spaceScore = evaluateAvailableSpace(nextPos, gameState, board)
    score += spaceScore * 2
    const foodScore = evaluateFoodPosition(nextPos, gameState)
    score += foodScore

    // Offensive scoring
    const offensiveScore = evaluateOffensiveMoves(nextPos, gameState, board)
    score += offensiveScore * 3  // Weight offensive moves heavily
    console.log(`${move}: Offensive score = ${offensiveScore}`)

    return { move, score }
  })

  moveScores.sort((a, b) => b.score - a.score)
  console.log('\nMove scores:', moveScores)
  return moveScores[0].move
}

function evaluateFoodPosition(pos, gameState) {
  let score = 0
  const health = gameState.you.health

  gameState.board.food.forEach(food => {
    const distance = Math.abs(food.x - pos.x) + Math.abs(food.y - pos.y)
    
    // If health is low, prioritize closer food
    if (health < 50) {
      score += (100 - distance) / (101 - health)
    } else {
      score += (100 - distance) / 200  // Less weight when healthy
    }
  })

  return score
}

function evaluateDangerZones(pos, gameState, board) {
  let dangerScore = 0

  gameState.board.snakes.forEach(snake => {
    if (snake.id === gameState.you.id) return

    // Check distance to enemy head
    const headDistance = Math.abs(snake.head.x - pos.x) + Math.abs(snake.head.y - pos.y)
    
    // Immediate danger if enemy is longer and one move away
    if (headDistance <= 2 && snake.body.length >= gameState.you.body.length) {
      dangerScore += 100
    }

    // Check if move could trap us
    const trappedScore = checkForTrappedPosition(pos, snake, gameState, board)
    dangerScore += trappedScore
  })

  return dangerScore
}

function checkForTrappedPosition(pos, enemySnake, gameState, board) {
  // Check if this move could lead to being trapped
  const moves = ['up', 'down', 'left', 'right']
  let escapeRoutes = 0

  moves.forEach(move => {
    const nextPos = getNextPosition(pos, move)
    if (isSafeMove(nextPos, gameState, board)) {
      escapeRoutes++
    }
  })

  // More penalty for fewer escape routes
  return Math.max(0, (4 - escapeRoutes) * 25)
}

function getLastResortMove(gameState) {
  const head = gameState.you.head
  const moves = ['up', 'right', 'down', 'left']
  
  // Try each move in order of preference
  for (const move of moves) {
    const nextPos = getNextPosition(head, move)
    // At least stay on the board
    if (nextPos.x >= 0 && nextPos.x < gameState.board.width &&
        nextPos.y >= 0 && nextPos.y < gameState.board.height) {
      console.log('Last resort choosing:', move)
      return move
    }
  }
  
  console.log('No valid moves found, going up')
  return 'up'
}

function findEmergencyMove(gameState) {
  console.log('EMERGENCY: Choosing fallback move')
  const head = gameState.you.head
  const moves = ['up', 'down', 'left', 'right']
  
  // Try to stay on board
  for (const move of moves) {
    const nextPos = getNextPosition(head, move)
    if (nextPos.x >= 0 && nextPos.x < gameState.board.width &&
        nextPos.y >= 0 && nextPos.y < gameState.board.height) {
      console.log('Emergency move chosen:', move)
      return move
    }
  }
  
  console.log('No valid emergency move found, defaulting to right')
  return 'right'
}

function getNextPosition(head, move) {
  switch(move) {
    case 'up': return { x: head.x, y: head.y + 1 }
    case 'down': return { x: head.x, y: head.y - 1 }
    case 'left': return { x: head.x - 1, y: head.y }
    case 'right': return { x: head.x + 1, y: head.y }
    default: return head
  }
}

function getEmergencyMoves(gameState, board) {
  const head = gameState.you.head
  const moves = []
  
  // Check each direction
  const possibleMoves = [
    { dir: 'up', x: head.x, y: head.y + 1 },
    { dir: 'down', x: head.x, y: head.y - 1 },
    { dir: 'left', x: head.x - 1, y: head.y },
    { dir: 'right', x: head.x + 1, y: head.y }
  ]

  // First, try to find a move that avoids longer snakes
  possibleMoves.forEach(move => {
    if (isEmergencySafe(move, gameState, board)) {
      moves.push(move.dir)
    }
  })

  console.log('Emergency moves available:', moves)
  return moves
}

function isEmergencySafe(move, gameState, board) {
  // Check bounds
  if (move.x < 0 || move.x >= gameState.board.width ||
      move.y < 0 || move.y >= gameState.board.height) {
    return false
  }

  const cell = board[move.y][move.x]
  const myLength = gameState.you.body.length

  // Check for enemy snake heads
  const enemySnake = gameState.board.snakes.find(
    snake => snake.id !== gameState.you.id && 
    isAdjacent(snake.head, move)
  )

  if (enemySnake && enemySnake.body.length >= myLength) {
    console.log(`Avoiding longer snake at ${move.x},${move.y}`)
    return false
  }

  // In emergency, we can move anywhere except:
  // - Our own body
  // - Longer enemy snake heads
  return cell !== CELL.MY_BODY
}

function evaluateOffensiveMoves(pos, gameState, board) {
  let score = 0
  const myLength = gameState.you.body.length

  gameState.board.snakes.forEach(snake => {
    if (snake.id === gameState.you.id) return

    // Head-on collision opportunity
    if (isAdjacent(snake.head, pos)) {
      if (myLength > snake.body.length) {
        // Aggressive bonus for eliminating shorter snakes
        score += 50 * (myLength - snake.body.length)
        console.log(`Offensive opportunity: Head-on with shorter snake ${snake.id}`)
      }
    }

    // Blocking opportunities
    if (snake.body.length < myLength) {
      // Check if we can block their path to food
      const nearbyFood = findNearbyFood(snake.head, gameState)
      if (nearbyFood && isBlockingPosition(pos, snake.head, nearbyFood)) {
        score += 30
        console.log(`Blocking opportunity: Cut off ${snake.id} from food`)
      }

      // Check if we can trap them
      if (canTrapSnake(pos, snake, gameState, board)) {
        score += 40
        console.log(`Trapping opportunity: Can restrict ${snake.id}'s movement`)
      }
    }
  })

  return score
}

function findNearbyFood(pos, gameState) {
  return gameState.board.food.reduce((closest, food) => {
    const distance = Math.abs(food.x - pos.x) + Math.abs(food.y - pos.y)
    if (!closest || distance < closest.distance) {
      return { food, distance }
    }
    return closest
  }, null)?.food
}

function isBlockingPosition(myPos, enemyHead, food) {
  // Check if we're between enemy and their food
  const enemyToFood = Math.abs(food.x - enemyHead.x) + Math.abs(food.y - enemyHead.y)
  const myToFood = Math.abs(food.x - myPos.x) + Math.abs(food.y - myPos.y)
  const enemyToMe = Math.abs(myPos.x - enemyHead.x) + Math.abs(myPos.y - enemyHead.y)
  
  return myToFood < enemyToFood && enemyToMe <= 2
}

function canTrapSnake(myPos, enemy, gameState, board) {
  // Check if move reduces enemy's escape routes
  const currentEscapes = countEscapeRoutes(enemy.head, gameState, board)
  const futureEscapes = countEscapeRoutes(enemy.head, gameState, board, myPos)
  
  return futureEscapes < currentEscapes && futureEscapes <= 2
}

function countEscapeRoutes(pos, gameState, board, blockedPos = null) {
  const moves = ['up', 'down', 'left', 'right']
  return moves.filter(move => {
    const nextPos = getNextPosition(pos, move)
    if (blockedPos && nextPos.x === blockedPos.x && nextPos.y === blockedPos.y) {
      return false
    }
    return isSafeMove(nextPos, gameState, board)
  }).length
}

module.exports = {
  getMoveResponse
} 