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

// Add this function near the top with other utility functions
function getPossibleEnemyMoves(head) {
  if (!head) return []
  
  return [
    { x: head.x, y: head.y + 1 },  // up
    { x: head.x, y: head.y - 1 },  // down
    { x: head.x - 1, y: head.y },  // left
    { x: head.x + 1, y: head.y }   // right
  ]
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
  console.log('\nEvaluating moves with extra safety...')
  
  const moveScores = safeMoves.map(move => {
    const nextPos = getNextPosition(gameState.you.head, move)
    let score = 0
    
    // Basic scores
    const spaceScore = evaluateAvailableSpace(nextPos, gameState, board) * 2
    const foodScore = evaluateFoodPosition(nextPos, gameState)
    
    // Offensive/defensive scoring
    const offensiveScore = evaluateOffensiveMoves(nextPos, gameState, board)
    
    // Heavy penalty for being near any snake
    const snakeProximityPenalty = evaluateSnakeProximity(nextPos, gameState) * 2
    
    score = spaceScore + foodScore + offensiveScore - snakeProximityPenalty

    console.log(`${move}: Space=${spaceScore}, Food=${foodScore}, 
      Offensive=${offensiveScore}, Snake Penalty=${snakeProximityPenalty}, 
      Total=${score}`)

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

function isSafeMove(pos, gameState, board) {
  // Check bounds first
  if (pos.x < 0 || pos.x >= gameState.board.width ||
      pos.y < 0 || pos.y >= gameState.board.height) {
    console.log(`Position ${JSON.stringify(pos)} is out of bounds`)
    return false
  }

  const cell = board[pos.y][pos.x]
  const myLength = gameState.you.body.length
  
  // NEVER hit any snake body
  if (cell === CELL.MY_BODY || cell === CELL.ENEMY_BODY) {
    console.log(`Position ${JSON.stringify(pos)} would hit snake body - AVOIDING!`)
    return false
  }

  // Head collision logic - EXTREMELY conservative
  if (cell === CELL.ENEMY_HEAD || isPossibleHeadCollision(pos, gameState)) {
    const enemySnake = findNearbyEnemySnake(pos, gameState)
    
    if (enemySnake) {
      // Must be AT LEAST 2 longer to consider head-to-head
      const isSafe = myLength > enemySnake.body.length + 1
      console.log(`Head collision possible with snake ${enemySnake.id}:
        Our length: ${myLength}
        Enemy length: ${enemySnake.body.length}
        Need to be ${enemySnake.body.length + 2} or longer
        Safe: ${isSafe}`)
      
      if (!isSafe) {
        console.log('AVOIDING: Not long enough for head-to-head!')
        return false
      }
      return isSafe
    }
  }

  return true
}

// Update isPossibleHeadCollision to use it safely
function isPossibleHeadCollision(pos, gameState) {
  return gameState.board.snakes.some(snake => {
    if (snake.id === gameState.you.id) return false
    
    // Calculate all possible next positions for enemy snake
    const possibleMoves = getPossibleEnemyMoves(snake.head)
    const willCollide = possibleMoves.some(movePos => 
      movePos.x === pos.x && movePos.y === pos.y
    )

    if (willCollide) {
      console.log(`Possible head collision with snake ${snake.id} at ${JSON.stringify(pos)}`)
      console.log(`Enemy possible moves:`, possibleMoves)
    }
    
    return willCollide
  })
}

function evaluateOffensiveMoves(pos, gameState, board) {
  let score = 0
  const myLength = gameState.you.body.length

  gameState.board.snakes.forEach(snake => {
    if (snake.id === gameState.you.id) return

    // Only consider offensive moves if we're MUCH longer
    if (myLength > snake.body.length + 1) {  // Need to be at least 2 longer
      const distance = Math.abs(snake.head.x - pos.x) + Math.abs(snake.head.y - pos.y)
      
      if (distance === 1) {  // Adjacent to enemy head
        score += 75  // High score for guaranteed elimination
        console.log(`Offensive opportunity: Can eliminate shorter snake ${snake.id}`)
      }
    } else {
      // Penalty for getting close to equal or longer snakes
      const distance = Math.abs(snake.head.x - pos.x) + Math.abs(snake.head.y - pos.y)
      if (distance <= 2) {
        score -= 100  // Heavy penalty
        console.log(`DANGER: Too close to equal/longer snake ${snake.id}`)
      }
    }
  })

  return score
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
  let score = 0
  const space = countAccessibleSpace(pos, gameState, board)
  
  // Bonus for moves that lead away from equal/longer snakes
  gameState.board.snakes.forEach(snake => {
    if (snake.id === gameState.you.id) return
    if (snake.body.length >= gameState.you.body.length) {
      const currentDist = Math.abs(gameState.you.head.x - snake.head.x) + 
                         Math.abs(gameState.you.head.y - snake.head.y)
      const newDist = Math.abs(pos.x - snake.head.x) + 
                     Math.abs(pos.y - snake.head.y)
      if (newDist > currentDist) {
        score += 100 // Bonus for moving away
      }
    }
  })
  
  return score + space
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

function evaluateSnakeProximity(pos, gameState) {
  let penalty = 0
  
  gameState.board.snakes.forEach(snake => {
    if (snake.id === gameState.you.id) return
    
    // Calculate distance to snake head
    const headDistance = Math.abs(snake.head.x - pos.x) + Math.abs(snake.head.y - pos.y)
    
    // Even bigger penalty for equal or longer snakes
    if (snake.body.length >= gameState.you.body.length) {
      if (headDistance <= 2) penalty += 500  // Increased from 150
      else if (headDistance <= 3) penalty += 250  // Increased from 75
    }
  })
  
  return penalty
}

module.exports = {
  getMoveResponse
} 