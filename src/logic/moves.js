const { DIRECTIONS } = require('../utils/constants')
const { CELL, createGameBoard, printBoard } = require('../utils/board')

// Add these utility functions at the TOP of the file, before any other functions
function getDirection(from, to) {
  if (!from || !to) return null
  if (to.y > from.y) return 'up'
  if (to.y < from.y) return 'down'
  if (to.x < from.x) return 'left'
  if (to.x > from.x) return 'right'
  return null
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

function shouldCoil(gameState) {
  return gameState.you.health > 50 && 
         gameState.you.body.length > 4 &&
         !isNearbyThreat(gameState) &&
         !needsFood(gameState)
}

function isGoodCoilTurn(currentDir, newDir) {
  const validTurns = {
    'up': ['right', 'left'],
    'right': ['down', 'up'],
    'down': ['left', 'right'],
    'left': ['up', 'down']
  }
  return validTurns[currentDir] && validTurns[currentDir].includes(newDir)
}

function isCircularPattern(pos, body) {
  if (body.length < 4) return false
  
  const head = body[0]
  const neck = body[1]
  const currentDir = getDirection(neck, head)
  const newDir = getDirection(head, pos)
  
  return currentDir && newDir && isGoodCoilTurn(currentDir, newDir)
}

function evaluateCoilingMove(pos, gameState) {
  let score = 0
  const tail = gameState.you.body[gameState.you.body.length - 1]
  
  const distanceToTail = Math.abs(pos.x - tail.x) + Math.abs(pos.y - tail.y)
  
  if (distanceToTail === 2) score += 50
  else if (distanceToTail === 3) score += 30
  else if (distanceToTail === 1) score += 10

  if (isCircularPattern(pos, gameState.you.body)) {
    score += 25
    console.log('Maintaining circular pattern')
  }

  return score
}

// Main move response function
function getMoveResponse(gameState) {
  try {
    console.log('\n=== MOVE DEBUG ===')
    console.log('Head position:', gameState.you.head)
    console.log('Board size:', gameState.board.width, 'x', gameState.board.height)

    const board = createGameBoard(gameState)
    let safeMoves = getPossibleMoves(gameState, board)
    console.log('Available safe moves:', safeMoves)

    if (safeMoves.length === 0) {
      console.log('WARNING: No safe moves available!')
      console.log('Emergency move:', getLastResortMove(gameState))
      return getLastResortMove(gameState)
    }

    const move = chooseSafestMove(safeMoves, gameState, board)
    console.log('\nChosen safe move:', move)
    return move

  } catch (error) {
    console.log('MOVE ERROR:', error)
    console.log('EMERGENCY: Choosing fallback move')
    const move = getLastResortMove(gameState)
    console.log('Emergency move chosen:', move)
    return move
  }
}

function chooseSafestMove(safeMoves, gameState, board) {
  console.log('\nEvaluating moves...')
  
  const moveScores = safeMoves.map(move => {
    const nextPos = getNextPosition(gameState.you.head, move)
    let score = 0
    
    // Basic scores
    const spaceScore = evaluateAvailableSpace(nextPos, gameState, board) * 2
    const foodScore = evaluateFoodPosition(nextPos, gameState)
    
    // Coiling score when appropriate
    let coilScore = 0
    if (shouldCoil(gameState)) {
      coilScore = evaluateCoilingMove(nextPos, gameState) * 1.5
      console.log(`${move}: Coil score = ${coilScore}`)
    }

    score = spaceScore + foodScore + coilScore

    return { move, score }
  })

  moveScores.sort((a, b) => b.score - a.score)
  return moveScores[0].move
}

function getPossibleMoves(gameState, board) {
  const head = gameState.you.head
  const possibleMoves = []
  const moves = ['up', 'down', 'left', 'right']

  // First try with strict safety
  moves.forEach(move => {
    const nextPos = getNextPosition(head, move)
    if (isSafeMove(nextPos, gameState, board, true)) {
      possibleMoves.push(move)
    }
  })

  // If no safe moves, try with relaxed safety
  if (possibleMoves.length === 0) {
    console.log('No strictly safe moves, trying relaxed safety checks...')
    moves.forEach(move => {
      const nextPos = getNextPosition(head, move)
      if (isSafeMove(nextPos, gameState, board, false)) {
        possibleMoves.push(move)
      }
    })
  }

  return possibleMoves
}

function isSafeMove(pos, gameState, board, strict = true) {
  // Check bounds first
  if (pos.x < 0 || pos.x >= gameState.board.width ||
      pos.y < 0 || pos.y >= gameState.board.height) {
    return false
  }

  const cell = board[pos.y][pos.x]
  
  // Never hit any snake body
  if (cell === CELL.MY_BODY || cell === CELL.ENEMY_BODY) {
    return false
  }

  // In strict mode, check for nearby bodies
  if (strict) {
    if (willHitAnySnakeBody(pos, gameState)) {
      return false
    }
  } else {
    // In relaxed mode, only check direct collisions
    if (isDirectBodyCollision(pos, gameState)) {
      return false
    }
  }

  return true
}

function isDirectBodyCollision(pos, gameState) {
  return gameState.board.snakes.some(snake => {
    return snake.body.some(segment => 
      segment.x === pos.x && segment.y === pos.y
    )
  })
}

function willHitAnySnakeBody(pos, gameState) {
  return gameState.board.snakes.some(snake => {
    // Check each body segment (except tail which might move)
    for (let i = 0; i < snake.body.length - 1; i++) {
      const segment = snake.body[i]
      
      // Check exact position
      if (segment.x === pos.x && segment.y === pos.y) {
        return true
      }
      
      // Check adjacent positions (extra cautious)
      if (Math.abs(segment.x - pos.x) + Math.abs(segment.y - pos.y) === 1) {
        console.log(`Too close to snake body at ${JSON.stringify(segment)}`)
        return true
      }
    }
    return false
  })
}

function findNearbyEnemySnake(pos, gameState) {
  return gameState.board.snakes.find(snake =>
    snake.body.some(segment => 
      segment.x === pos.x && segment.y === pos.y
    )
  )
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

function evaluateSpaceManagement(pos, gameState, board) {
  let score = 0
  
  // Check immediate surrounding space
  const immediateSpace = countAccessibleCells(pos, gameState, board, 3)
  score += immediateSpace * 5

  // Check if move creates a good partition of space
  const spacePartition = evaluateSpacePartition(pos, gameState, board)
  score += spacePartition * 10

  // Penalize moves that create small enclosed areas
  const enclosedPenalty = checkEnclosedAreas(pos, gameState, board)
  score -= enclosedPenalty * 15

  return score
}

function countAccessibleCells(pos, gameState, board, depth) {
  const visited = new Set()
  const queue = [{pos, depth}]
  let count = 0

  while (queue.length > 0) {
    const {pos: current, depth: currentDepth} = queue.shift()
    if (currentDepth <= 0) continue

    const key = `${current.x},${current.y}`
    if (visited.has(key)) continue
    visited.add(key)
    count++

    // Add adjacent cells
    const moves = ['up', 'down', 'left', 'right']
    moves.forEach(move => {
      const next = getNextPosition(current, move)
      if (isSafeMove(next, gameState, board)) {
        queue.push({pos: next, depth: currentDepth - 1})
      }
    })
  }

  return count
}

function checkEnclosedAreas(pos, gameState, board) {
  let penalty = 0
  const visited = new Set()
  const moves = ['up', 'down', 'left', 'right']

  moves.forEach(move => {
    const next = getNextPosition(pos, move)
    if (isSafeMove(next, gameState, board)) {
      const areaSize = floodFill(next, gameState, board, visited)
      if (areaSize < gameState.you.body.length) {
        penalty += (gameState.you.body.length - areaSize)
      }
    }
  })

  return penalty
}

function floodFill(pos, gameState, board, visited) {
  const key = `${pos.x},${pos.y}`
  if (visited.has(key)) return 0
  visited.add(key)

  let size = 1
  const moves = ['up', 'down', 'left', 'right']
  
  moves.forEach(move => {
    const next = getNextPosition(pos, move)
    if (isSafeMove(next, gameState, board)) {
      size += floodFill(next, gameState, board, visited)
    }
  })

  return size
}

function evaluatePositioning(pos, gameState, board) {
  let score = 0
  const myLength = gameState.you.body.length

  // Analyze each opponent
  gameState.board.snakes.forEach(snake => {
    if (snake.id === gameState.you.id) return

    // Predict enemy's likely moves
    const enemyPrediction = predictEnemyMove(snake, gameState, board)
    if (enemyPrediction) {
      // Positioning score based on different strategies
      score += evaluateIntercept(pos, snake, enemyPrediction, myLength)
      score += evaluateContainment(pos, snake, gameState, board)
      score += evaluatePathBlock(pos, snake, gameState)
    }
  })

  console.log(`Position ${JSON.stringify(pos)} positioning score: ${score}`)
  return score
}

function predictEnemyMove(snake, gameState, board) {
  const possibleMoves = ['up', 'down', 'left', 'right']
  const scoredMoves = possibleMoves.map(move => {
    const nextPos = getNextPosition(snake.head, move)
    let score = 0

    // Basic safety check
    if (!isPositionSafe(nextPos, gameState, board)) return { move, score: -1000 }

    // Distance to nearest food
    const foodDistance = getNearestFoodDistance(nextPos, gameState.board.food)
    score += (100 - foodDistance) * (snake.health < 50 ? 2 : 1)

    // Space available
    const spaceScore = evaluateAvailableSpace(nextPos, gameState, board)
    score += spaceScore

    return { move, score, pos: nextPos }
  }).filter(move => move.score > -1000)

  // Return the most likely move
  scoredMoves.sort((a, b) => b.score - a.score)
  return scoredMoves[0]?.pos
}

function evaluateIntercept(myPos, enemy, predictedPos, myLength) {
  let score = 0
  
  if (enemy.body.length < myLength) {
    // Calculate interception points
    const interceptPoints = getInterceptionPoints(myPos, enemy.head, predictedPos)
    
    interceptPoints.forEach(point => {
      const canReach = canReachFirst(myPos, point, enemy.head, predictedPos)
      if (canReach) {
        score += 75 * (myLength - enemy.body.length)
        console.log(`Interception opportunity at ${JSON.stringify(point)}`)
      }
    })
  }

  return score
}

function evaluateContainment(myPos, enemy, gameState, board) {
  let score = 0
  
  // Check if move helps contain enemy
  const currentSpace = countAccessibleSpace(enemy.head, gameState, board)
  const futureSpace = countAccessibleSpace(enemy.head, gameState, board, myPos)

  if (futureSpace < currentSpace) {
    score += 40 * (currentSpace - futureSpace)
    console.log(`Containment: Reducing enemy space from ${currentSpace} to ${futureSpace}`)
  }

  return score
}

function evaluatePathBlock(myPos, enemy, gameState) {
  let score = 0
  
  // Find nearest food to enemy
  const nearestFood = getNearestFood(enemy.head, gameState.board.food)
  if (nearestFood) {
    // Check if we're blocking the optimal path
    const isBlocking = isBlockingPath(myPos, enemy.head, nearestFood)
    if (isBlocking) {
      score += 50
      console.log(`Blocking enemy path to food at ${JSON.stringify(nearestFood)}`)
    }
  }

  return score
}

function getInterceptionPoints(myPos, enemyPos, predictedPos) {
  const points = []
  
  // Calculate possible interception points based on movement patterns
  const dx = predictedPos.x - enemyPos.x
  const dy = predictedPos.y - enemyPos.y

  // Add potential cut-off points
  points.push(
    {x: predictedPos.x + dx, y: predictedPos.y + dy},
    {x: predictedPos.x - dy, y: predictedPos.y + dx},
    {x: predictedPos.x + dy, y: predictedPos.y - dx}
  )

  return points.filter(p => 
    p.x >= 0 && p.x < gameState.board.width &&
    p.y >= 0 && p.y < gameState.board.height
  )
}

function canReachFirst(myPos, target, enemyPos, enemyNext) {
  // Calculate Manhattan distances
  const myDistance = Math.abs(target.x - myPos.x) + Math.abs(target.y - myPos.y)
  const enemyDistance = Math.abs(target.x - enemyNext.x) + Math.abs(target.y - enemyNext.y)
  
  // We need to reach the point at least one move before the enemy
  return myDistance < enemyDistance
}

function isNearbyThreat(gameState) {
  const head = gameState.you.head
  const myLength = gameState.you.body.length

  return gameState.board.snakes.some(snake => {
    if (snake.id === gameState.you.id) return false
    
    const distance = Math.abs(snake.head.x - head.x) + Math.abs(snake.head.y - head.y)
    return distance <= 2 && snake.body.length >= myLength
  })
}

function needsFood(gameState) {
  return gameState.you.health < 50 || gameState.you.body.length < 5
}

function isAdjacent(pos1, pos2) {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y) === 1
}

function getNearestFood(pos, foods) {
  return foods.reduce((closest, food) => {
    const distance = Math.abs(food.x - pos.x) + Math.abs(food.y - pos.y)
    if (!closest || distance < closest.distance) {
      return { food, distance }
    }
    return closest
  }, null)?.food
}

function getNearestFoodDistance(pos, foods) {
  const nearest = getNearestFood(pos, foods)
  if (!nearest) return 100 // Large number if no food exists
  return Math.abs(nearest.x - pos.x) + Math.abs(nearest.y - pos.y)
}

function isBlockingPath(myPos, enemyPos, target) {
  const enemyToTarget = Math.abs(target.x - enemyPos.x) + Math.abs(target.y - enemyPos.y)
  const myToTarget = Math.abs(target.x - myPos.x) + Math.abs(target.y - myPos.y)
  const enemyToMe = Math.abs(myPos.x - enemyPos.x) + Math.abs(myPos.y - enemyPos.y)
  
  return myToTarget < enemyToTarget && enemyToMe <= 2
}

function countAccessibleSpace(pos, gameState, board, blockedPos = null) {
  const visited = new Set()
  let count = 0
  const queue = [pos]

  while (queue.length > 0) {
    const current = queue.shift()
    const key = `${current.x},${current.y}`
    
    if (visited.has(key)) continue
    visited.add(key)
    count++

    const moves = ['up', 'down', 'left', 'right']
    moves.forEach(move => {
      const next = getNextPosition(current, move)
      if (blockedPos && next.x === blockedPos.x && next.y === blockedPos.y) return
      if (isSafeMove(next, gameState, board)) {
        queue.push(next)
      }
    })
  }

  return count
}

function isPositionSafe(pos, gameState, board) {
  // Check bounds
  if (pos.x < 0 || pos.x >= gameState.board.width ||
      pos.y < 0 || pos.y >= gameState.board.height) {
    return false
  }

  // Check for collisions with any snake body
  return !gameState.board.snakes.some(snake => 
    snake.body.some(segment => 
      segment.x === pos.x && segment.y === pos.y
    )
  )
}

function evaluateSpacePartition(pos, gameState, board) {
  // Simple space partitioning score
  const accessibleSpace = countAccessibleSpace(pos, gameState, board)
  return Math.min(accessibleSpace, 15) * 5
}

module.exports = {
  getMoveResponse
} 