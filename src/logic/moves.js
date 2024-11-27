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
  
  if (distanceToTail === 2) score += 75
  else if (distanceToTail === 3) score += 50
  else if (distanceToTail === 1) score += 25

  if (isCircularPattern(pos, gameState.you.body)) {
    score += 50
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
    console.log('\n=== TURN', gameState.turn, '===')
    console.log('Health:', gameState.you.health)
    console.log('Length:', gameState.you.body.length)
    
    // Create board first
    const board = createGameBoard(gameState)
    if (!board) {
      console.error('Failed to create game board')
      return { move: getEmergencyMove(gameState) }
    }

    try {
      printBoard(gameState, board)
    } catch (boardError) {
      console.error('Board printing error:', boardError)
      // Continue even if board visualization fails
    }
    
    // Get list of safe moves
    const safeMoves = getPossibleMoves(gameState, board)
    console.log('Available safe moves:', safeMoves)
    
    if (safeMoves.length === 0) {
      console.log('NO SAFE MOVES AVAILABLE!')
      return { move: getEmergencyMove(gameState) }
    }

    // Choose best safe move
    const move = chooseSafestMove(safeMoves, gameState, board)
    console.log('Chosen move:', move)
    
    return { move }
  } catch (error) {
    console.error('MOVE ERROR:', error)
    return { move: getEmergencyMove(gameState) }
  }
}

function getPossibleMoves(gameState, board) {
  const head = gameState.you.head
  const possibleMoves = []
  const moves = ['up', 'down', 'left', 'right']

  console.log('Checking moves from position:', head)

  moves.forEach(move => {
    const nextPos = getNextPosition(head, move)
    if (isSafeMove(nextPos, gameState, board)) {
      possibleMoves.push(move)
    }
  })

  return possibleMoves
}

function isSafeMove(pos, gameState, board) {
  // 1. Basic boundary check
  if (!isWithinBounds(pos, gameState)) {
    console.log(`Rejecting move to ${JSON.stringify(pos)}: Out of bounds`);
    return false;
  }

  // 2. Snake collision check (including self)
  if (isOccupiedBySnake(pos, gameState)) {
    console.log(`Rejecting move to ${JSON.stringify(pos)}: Snake collision`);
    return false;
  }

  return true;
}

function isWithinBounds(pos, gameState) {
  return pos.x >= 0 && 
         pos.x < gameState.board.width && 
         pos.y >= 0 && 
         pos.y < gameState.board.height;
}

function isOccupiedBySnake(pos, gameState) {
  return gameState.board.snakes.some(snake => 
    snake.body.some(segment => 
      segment.x === pos.x && segment.y === pos.y
    )
  );
}

function chooseSafestMove(safeMoves, gameState, board) {
  const moveScores = safeMoves.map(move => {
    const nextPos = getNextPosition(gameState.you.head, move);
    let score = 100;  // Base score
    
    // Analyze wall situation
    const wallAnalysis = analyzeWallSituation(nextPos, gameState);
    
    // Smart wall scoring
    if (wallAnalysis.isAgainstWall) {
      // Being against wall is okay if we have escape paths
      if (wallAnalysis.escapePaths >= 2) {
        score -= 200; // Small penalty
      } else {
        score -= 800; // Big penalty for limited escape
      }
    } else if (wallAnalysis.isNearWall) {
      // Near wall is fine if we can trap others
      if (wallAnalysis.canTrapOthers) {
        score += 300; // Bonus for tactical position
      } else {
        score -= 100; // Small penalty for being near wall
      }
    }

    // Space evaluation with escape paths
    const spaceScore = evaluateAvailableSpace(nextPos, gameState, board);
    score += spaceScore * wallAnalysis.escapePaths; // Weight by escape options

    // Food evaluation considering wall position
    const foodScore = evaluateFoodPosition(nextPos, gameState);
    if (needsFood(gameState)) {
      // Desperate for food - take more risks
      if (gameState.you.health < 30) {
        score += foodScore * 3;
      } else {
        score += foodScore * wallAnalysis.safetyScore;
      }
    }

    // Trapping evaluation
    if (wallAnalysis.canTrapOthers) {
      const trapScore = evaluateTrappingOpportunities(nextPos, gameState);
      score += trapScore * 2; // Double trap score if position is good
    }

    console.log(`${move}: safety=${wallAnalysis.safetyScore}, escapes=${wallAnalysis.escapePaths}, trap=${wallAnalysis.canTrapOthers}, total=${score}`);
    return { move, score };
  });

  moveScores.sort((a, b) => b.score - a.score);
  return moveScores[0].move;
}

function isNearWall(pos, gameState) {
  return pos.x === 0 || pos.x === gameState.board.width - 1 ||
         pos.y === 0 || pos.y === gameState.board.height - 1
}

function evaluateAvailableSpace(pos, gameState, board) {
  let space = 0
  const visited = new Set()
  const queue = [pos]

  while (queue.length > 0) {
    const current = queue.shift()
    const key = `${current.x},${current.y}`
    
    if (visited.has(key)) continue
    visited.add(key)
    space++

    // Check all directions
    ['up', 'down', 'left', 'right'].forEach(move => {
      const next = getNextPosition(current, move)
      if (isSafeMove(next, gameState, board)) {
        queue.push(next)
      }
    })
  }

  return space
}

function evaluateFoodPosition(pos, gameState) {
  const nearestFood = getNearestFood(pos, gameState.board.food)
  if (!nearestFood) {
    console.log('No food available on board')
    return 0
  }

  const distance = Math.abs(nearestFood.x - pos.x) + Math.abs(nearestFood.y - pos.y)
  let score = Math.max(0, 75 - distance * 3)  // Increased base food score

  // Check if we're closest to this food
  const otherSnakes = gameState.board.snakes.filter(s => s.id !== gameState.you.id)
  const weAreClosest = otherSnakes.every(snake => {
    const theirDist = Math.abs(snake.head.x - nearestFood.x) + 
                      Math.abs(snake.head.y - nearestFood.y)
    return distance <= theirDist
  })

  if (weAreClosest) {
    score *= 1.5  // 50% bonus if we're closest
    console.log(`We're closest to food at ${JSON.stringify(nearestFood)}`)
  }

  console.log(`Food score for ${JSON.stringify(pos)}: ${score}`)
  return score
}

function needsFood(gameState) {
  const needsFood = gameState.you.health < 50 || 
                   gameState.you.body.length < 5 || 
                   (gameState.you.health < 80 && isClosestToFood(gameState))
  
  console.log(`Needs food: ${needsFood} (Health: ${gameState.you.health}, Length: ${gameState.you.body.length})`)
  return needsFood
}

function isClosestToFood(gameState) {
  const nearestFood = getNearestFood(gameState.you.head, gameState.board.food)
  if (!nearestFood) return false

  const ourDistance = Math.abs(gameState.you.head.x - nearestFood.x) + 
                     Math.abs(gameState.you.head.y - nearestFood.y)

  return gameState.board.snakes.every(snake => {
    if (snake.id === gameState.you.id) return true
    const theirDistance = Math.abs(snake.head.x - nearestFood.x) + 
                         Math.abs(snake.head.y - nearestFood.y)
    return ourDistance <= theirDistance
  })
}

function getEmergencyMove(gameState) {
  const head = gameState.you.head
  const moves = ['up', 'down', 'left', 'right']
  
  // Try each move in order, return first one that doesn't hit a wall
  for (const move of moves) {
    const pos = getNextPosition(head, move)
    if (isWithinBounds(pos, gameState)) {
      console.log('Emergency move chosen:', move)
      return move
    }
  }
  
  console.log('No safe emergency moves! Defaulting to up')
  return 'up'
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

// NEW: Better hunting of shorter snakes
function evaluateHuntingOpportunities(pos, gameState) {
  let score = 0
  
  gameState.board.snakes.forEach(snake => {
    if (snake.id === gameState.you.id) return
    
    const lengthDiff = gameState.you.body.length - snake.body.length
    const distance = Math.abs(snake.head.x - pos.x) + Math.abs(snake.head.y - pos.y)
    
    if (lengthDiff >= 1) {  // We're longer
      if (distance === 1) {  // Can eliminate next turn
        score += 200
        console.log(`Can eliminate shorter snake at ${JSON.stringify(pos)}`)
      } else if (distance <= 3) {  // Close enough to hunt
        score += 50
        console.log(`Hunting opportunity near ${JSON.stringify(pos)}`)
      }
    }
  })
  
  return score
}

// Add these utility functions at the top of the file
function isAdjacent(pos1, pos2) {
  if (!pos1 || !pos2) return false
  
  const dx = Math.abs(pos1.x - pos2.x)
  const dy = Math.abs(pos1.y - pos2.y)
  
  // Adjacent if exactly one square away in either x or y direction
  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1)
}

// Add these utility functions
function getNearestFood(pos, foodList) {
  if (!foodList || !foodList.length || !pos) return null
  
  let nearest = null
  let minDistance = Infinity

  foodList.forEach(food => {
    const distance = Math.abs(food.x - pos.x) + Math.abs(food.y - pos.y)
    if (distance < minDistance) {
      minDistance = distance
      nearest = food
    }
  })

  if (nearest) {
    console.log(`Nearest food to ${JSON.stringify(pos)} is at ${JSON.stringify(nearest)}, distance: ${minDistance}`)
  }

  return nearest
}

function evaluateMove(pos, gameState, board) {
  let score = 100 // Base score
  
  // Space evaluation (weighted less when healthy)
  const spaceScore = evaluateAvailableSpace(pos, gameState, board)
  score += spaceScore * (gameState.you.health < 50 ? 2 : 1)
  
  // Food evaluation (weighted by health)
  const foodScore = evaluateFoodPosition(pos, gameState)
  score += foodScore * (needsFood(gameState) ? 2 : 0.5)
  
  // Wall avoidance (stronger when healthy)
  if (isNearWall(pos, gameState)) {
    score -= gameState.you.health > 50 ? 75 : 25
  }
  
  return score
}

// Add these pathfinding utilities
function findPath(start, end, gameState) {
  const queue = [[start]]
  const visited = new Set()
  const board = createGameBoard(gameState)
  
  while (queue.length > 0) {
    const path = queue.shift()
    const pos = path[path.length - 1]
    const posKey = `${pos.x},${pos.y}`
    
    if (pos.x === end.x && pos.y === end.y) {
      return path
    }
    
    if (visited.has(posKey)) continue
    visited.add(posKey)
    
    // Check all possible moves
    const moves = ['up', 'down', 'left', 'right']
    moves.forEach(move => {
      const nextPos = getNextPosition(pos, move)
      if (isSafeMove(nextPos, gameState, board)) {
        const newPath = [...path, nextPos]
        queue.push(newPath)
      }
    })
  }
  
  return [] // No path found
}

// Simplified food blocking check
function isBlockingFoodAccess(pos, enemy, gameState) {
  const nearestFood = getNearestFood(enemy.head, gameState.board.food)
  if (!nearestFood) return false
  
  // Check if we're between enemy and food
  const enemyToFood = {
    dx: nearestFood.x - enemy.head.x,
    dy: nearestFood.y - enemy.head.y
  }
  
  const enemyToUs = {
    dx: pos.x - enemy.head.x,
    dy: pos.y - enemy.head.y
  }
  
  // Are we in the path between enemy and food?
  const isBlocking = (
    Math.abs(enemyToUs.dx) <= Math.abs(enemyToFood.dx) &&
    Math.abs(enemyToUs.dy) <= Math.abs(enemyToFood.dy) &&
    Math.sign(enemyToUs.dx) === Math.sign(enemyToFood.dx) &&
    Math.sign(enemyToUs.dy) === Math.sign(enemyToFood.dy)
  )
  
  if (isBlocking) {
    console.log(`Blocking food access from ${enemy.id} to food at ${JSON.stringify(nearestFood)}`)
  }
  
  return isBlocking
}

// Update trapping evaluation
function evaluateTrappingOpportunities(pos, gameState) {
  let score = 0
  const enemies = gameState.board.snakes.filter(s => s.id !== gameState.you.id)
  
  enemies.forEach(enemy => {
    // Only try to trap shorter or equal length snakes
    if (enemy.body.length >= gameState.you.body.length) {
      console.log(`Skipping trap evaluation for longer snake ${enemy.id}`)
      return
    }
    
    let trapScore = 0
    
    // 1. Check if we reduce escape routes
    const currentEscapes = countEscapeRoutes(enemy, gameState)
    const newEscapes = simulateEscapeRoutes(pos, enemy, gameState)
    if (newEscapes < currentEscapes) {
      trapScore += (currentEscapes - newEscapes) * 50
      console.log(`Reducing escape routes from ${currentEscapes} to ${newEscapes}`)
    }
    
    // 2. Check if we're blocking food
    if (isBlockingFoodAccess(pos, enemy, gameState)) {
      trapScore += 75
    }
    
    // 3. Check if we force them towards a wall
    if (forcesEnemyToWall(pos, enemy, gameState)) {
      trapScore += 100
      console.log(`Forcing ${enemy.id} towards wall`)
    }
    
    score += trapScore
    if (trapScore > 0) {
      console.log(`Total trap score against ${enemy.id}: ${trapScore}`)
    }
  })
  
  return score
}

function countEscapeRoutes(snake, gameState) {
  const moves = ['up', 'down', 'left', 'right']
  let routes = 0
  
  moves.forEach(move => {
    const nextPos = getNextPosition(snake.head, move)
    if (isSafeMove(nextPos, gameState, createGameBoard(gameState))) {
      routes++
    }
  })
  
  return routes
}

function simulateEscapeRoutes(ourMove, enemy, gameState) {
  // Create a copy of the game state with our simulated move
  const simulatedState = JSON.parse(JSON.stringify(gameState))
  const ourSnake = simulatedState.board.snakes.find(s => s.id === simulatedState.you.id)
  
  // Update our position in the simulation
  ourSnake.body.unshift(ourMove)
  ourSnake.body.pop()
  
  return countEscapeRoutes(enemy, simulatedState)
}

function forcesEnemyToWall(pos, enemy, gameState) {
  const moves = ['up', 'down', 'left', 'right']
  let safeMovesCount = 0
  let wallMovesCount = 0
  
  moves.forEach(move => {
    const nextPos = getNextPosition(enemy.head, move)
    if (isSafeMove(nextPos, gameState, createGameBoard(gameState))) {
      safeMovesCount++
      if (isNearWall(nextPos, gameState)) {
        wallMovesCount++
      }
    }
  })
  
  return safeMovesCount > 0 && wallMovesCount === safeMovesCount
}

// Improved wall analysis
function analyzeWallSituation(pos, gameState) {
  const result = {
    isAgainstWall: false,
    isNearWall: false,
    escapePaths: 0,
    canTrapOthers: false,
    safetyScore: 0
  };

  // Check immediate wall contact
  result.isAgainstWall = (pos.x === 0 || pos.x === gameState.board.width - 1 ||
                         pos.y === 0 || pos.y === gameState.board.height - 1);
  
  // Check near wall (2 spaces)
  result.isNearWall = (pos.x <= 1 || pos.x >= gameState.board.width - 2 ||
                      pos.y <= 1 || pos.y >= gameState.board.height - 2);

  // Count escape paths
  const moves = ['up', 'down', 'left', 'right'];
  moves.forEach(move => {
    const nextPos = getNextPosition(pos, move);
    if (isStrictlySafe(nextPos, gameState)) {
      result.escapePaths++;
    }
  });

  // Check if we can trap others against wall
  const enemies = gameState.board.snakes.filter(s => s.id !== gameState.you.id);
  enemies.forEach(enemy => {
    if (canForceToWall(pos, enemy, gameState)) {
      result.canTrapOthers = true;
    }
  });

  // Calculate safety score
  result.safetyScore = calculateSafetyScore(pos, result.escapePaths, gameState);

  return result;
}

// New function to check if we can force enemy to wall
function canForceToWall(ourPos, enemy, gameState) {
  const enemyHead = enemy.head;
  const moves = ['up', 'down', 'left', 'right'];
  let safeMovesForEnemy = 0;
  let wallMovesForEnemy = 0;

  moves.forEach(move => {
    const nextPos = getNextPosition(enemyHead, move);
    if (isStrictlySafe(nextPos, gameState)) {
      safeMovesForEnemy++;
      if (isNearWall(nextPos, gameState)) {
        wallMovesForEnemy++;
      }
    }
  });

  // If we can force them to only have wall moves
  return safeMovesForEnemy > 0 && safeMovesForEnemy === wallMovesForEnemy;
}

// Calculate safety score based on position
function calculateSafetyScore(pos, escapePaths, gameState) {
  let score = escapePaths * 25; // Base score from escape paths

  // Add bonus for tactical wall positions
  if (isCornerAdjacent(pos, gameState)) {
    score += 50; // Good for trapping
  }

  // Add bonus for positions that control space
  if (isControlPosition(pos, gameState)) {
    score += 75;
  }

  return score;
}

// Helper functions
function isCornerAdjacent(pos, gameState) {
  const corners = [
    {x: 0, y: 0}, {x: 0, y: gameState.board.height-1},
    {x: gameState.board.width-1, y: 0}, 
    {x: gameState.board.width-1, y: gameState.board.height-1}
  ];

  return corners.some(corner => 
    Math.abs(pos.x - corner.x) + Math.abs(pos.y - corner.y) === 1
  );
}

function isControlPosition(pos, gameState) {
  // Positions that control significant board space
  const centerX = Math.floor(gameState.board.width / 2);
  const centerY = Math.floor(gameState.board.height / 2);
  
  return Math.abs(pos.x - centerX) <= 2 && Math.abs(pos.y - centerY) <= 2;
}

// Add this at the top with other utility functions
function isStrictlySafe(pos, gameState) {
  // 1. Basic boundary check
  if (!isWithinBounds(pos, gameState)) {
    console.log(`UNSAFE: Position ${JSON.stringify(pos)} is out of bounds`);
    return false;
  }

  // 2. Never hit ANY snake body (including self)
  const anySnakeCollision = gameState.board.snakes.some(snake => 
    snake.body.some(segment => 
      segment.x === pos.x && segment.y === pos.y
    )
  );
  if (anySnakeCollision) {
    console.log(`UNSAFE: Position ${JSON.stringify(pos)} hits snake body`);
    return false;
  }

  // 3. STRICT head-to-head check - NEVER risk unless we're bigger
  const headToHeadDanger = gameState.board.snakes.some(snake => {
    if (snake.id === gameState.you.id) return false;
    
    // Calculate possible enemy next positions
    const possibleEnemyMoves = ['up', 'down', 'left', 'right'].map(move => 
      getNextPosition(snake.head, move)
    );

    // Check if we might meet head-to-head
    const couldCollide = possibleEnemyMoves.some(enemyPos => 
      enemyPos.x === pos.x && enemyPos.y === pos.y
    );

    if (couldCollide) {
      // If enemy is same size or bigger, position is NOT safe
      if (gameState.you.length <= snake.length) {
        console.log(`UNSAFE: Possible head collision with ${snake.length}-length snake (we are ${gameState.you.length})`);
        return true;
      }
      // Only safe if we're strictly longer
      console.log(`SAFE: Can eliminate ${snake.length}-length snake (we are ${gameState.you.length})`);
    }
    return false;
  });

  if (headToHeadDanger) {
    return false;
  }

  return true;
}

module.exports = {
  getMoveResponse
} 