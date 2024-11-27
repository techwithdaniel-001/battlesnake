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
  if (!head) {
    console.log("WARNING: Invalid head position provided to getNextPosition");
    return null;
  }
  
  switch(move) {
    case 'up': return { x: head.x, y: head.y + 1 };
    case 'down': return { x: head.x, y: head.y - 1 };
    case 'left': return { x: head.x - 1, y: head.y };
    case 'right': return { x: head.x + 1, y: head.y };
    default: 
      console.log("WARNING: Invalid move provided:", move);
      return null;
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
  console.log("\n💭 Analyzing safe moves:", safeMoves);
  
  const moveScores = safeMoves.map(move => {
    const nextPos = getNextPosition(gameState.you.head, move);
    let score = 100;

    // 1. Heavily penalize moves near larger snakes
    gameState.board.snakes.forEach(snake => {
      if (snake.id !== gameState.you.id && snake.length >= gameState.you.length) {
        const distanceToHead = Math.abs(nextPos.x - snake.head.x) + Math.abs(nextPos.y - snake.head.y);
        if (distanceToHead <= 2) {
          score -= 1000;
          console.log(`⚠️ ${move}: Too close to larger snake! (-1000)`);
        }
      }
    });

    // 2. Reward moves with more escape routes
    const futureEscapes = countFutureEscapeRoutes(nextPos, gameState);
    score += futureEscapes * 100;
    console.log(`🚪 ${move}: ${futureEscapes} future escapes (+${futureEscapes * 100})`);

    // 3. Prefer center of board
    const distanceToCenter = Math.abs(nextPos.x - gameState.board.width/2) + 
                           Math.abs(nextPos.y - gameState.board.height/2);
    score -= distanceToCenter * 10;
    console.log(`🎯 ${move}: Distance from center: ${distanceToCenter} (-${distanceToCenter * 10})`);

    return { move, score };
  });

  moveScores.sort((a, b) => b.score - a.score);
  console.log("\n📊 Final move scores:", moveScores);

  // If best move has negative score, try to find any safe move
  if (moveScores[0].score < 0) {
    console.log("⚠️ All moves seem dangerous, looking for safest option...");
    // Find move with most escape routes
    return moveScores.reduce((safest, current) => {
      const safestEscapes = countFutureEscapeRoutes(
        getNextPosition(gameState.you.head, safest.move), 
        gameState
      );
      const currentEscapes = countFutureEscapeRoutes(
        getNextPosition(gameState.you.head, current.move), 
        gameState
      );
      return currentEscapes > safestEscapes ? current : safest;
    }).move;
  }

  return moveScores[0].move;
}

function willDieNextTurn(pos, gameState) {
  // Check for immediate head-to-head with larger/equal snakes
  return gameState.board.snakes.some(snake => {
    if (snake.id === gameState.you.id) return false;
    
    const distanceToHead = Math.abs(pos.x - snake.head.x) + Math.abs(pos.y - snake.head.y);
    return distanceToHead <= 1 && snake.length >= gameState.you.length;
  });
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
  // Debug current position
  console.log("\n🔍 Analyzing position:", pos);

  // 1. Never move next to ANY larger snake's head
  const largerSnakeNearby = gameState.board.snakes.some(snake => {
    if (snake.id === gameState.you.id) return false;
    
    // Calculate distance to enemy head
    const distanceToHead = Math.abs(pos.x - snake.head.x) + Math.abs(pos.y - snake.head.y);
    
    // If snake is larger or equal, keep safe distance
    if (snake.length >= gameState.you.length) {
      if (distanceToHead <= 2) {  // Increased safe distance
        console.log(`❌ Larger/Equal snake nearby: ${snake.length} vs our ${gameState.you.length}`);
        return true;
      }
    }
    return false;
  });

  if (largerSnakeNearby) return false;

  // 2. Check for boxing in
  const futureEscapeRoutes = countFutureEscapeRoutes(pos, gameState);
  if (futureEscapeRoutes < 2) {
    console.log(`❌ Could get boxed in! Only ${futureEscapeRoutes} future escape routes`);
    return false;
  }

  return true;
}

function countFutureEscapeRoutes(pos, gameState) {
  let escapeRoutes = 0;
  const moves = ['up', 'down', 'left', 'right'];
  
  moves.forEach(move => {
    const nextPos = getNextPosition(pos, move);
    if (!nextPos) return;

    // Check if move is safe
    if (isWithinBounds(nextPos, gameState) && 
        !isPositionOccupied(nextPos, gameState) && 
        !isNearLargerSnake(nextPos, gameState)) {
      escapeRoutes++;
    }
  });

  console.log(`🚪 Found ${escapeRoutes} potential escape routes from ${JSON.stringify(pos)}`);
  return escapeRoutes;
}

function isNearLargerSnake(pos, gameState) {
  return gameState.board.snakes.some(snake => {
    if (snake.id === gameState.you.id) return false;
    
    // Check if snake is larger or equal
    if (snake.length >= gameState.you.length) {
      // Calculate all possible next positions for enemy snake
      const enemyMoves = ['up', 'down', 'left', 'right']
        .map(move => getNextPosition(snake.head, move))
        .filter(movePos => movePos !== null);
      
      // If any possible enemy move could reach us, it's dangerous
      return enemyMoves.some(enemyPos => 
        Math.abs(pos.x - enemyPos.x) + Math.abs(pos.y - enemyPos.y) <= 1
      );
    }
    return false;
  });
}

function checkForTraps(pos, gameState) {
  try {
    // Count available escape routes
    const escapeRoutes = countEscapeRoutes(pos, gameState);
    
    // Safely get enemy snakes
    const enemySnakes = gameState.board.snakes.filter(snake => {
      // Validate snake object
      if (!snake || !snake.head || !snake.body || !snake.id) {
        console.log("WARNING: Invalid snake object detected:", snake);
        return false;
      }
      return snake.id !== gameState.you.id;
    });

    // Debug logging
    console.log("Enemy snakes:", enemySnakes.length);
    enemySnakes.forEach(snake => {
      console.log(`Enemy at (${snake.head.x},${snake.head.y}), length: ${snake.length}`);
    });

    // Safely calculate potential blocks
    const potentialBlocks = [];
    enemySnakes.forEach(snake => {
      const moves = ['up', 'down', 'left', 'right'];
      moves.forEach(move => {
        const newPos = getNextPosition(snake.head, move);
        if (newPos) {
          potentialBlocks.push(newPos);
        }
      });
    });

    // Calculate safe spaces
    const safeSpaces = escapeRoutes.filter(route => 
      !potentialBlocks.some(block => 
        block.x === route.x && block.y === route.y
      )
    );

    console.log("Safe spaces found:", safeSpaces.length);

    // Detect immediate dangers
    if (safeSpaces.length < 2) {
      return {
        isTrap: true,
        reason: `Limited escape routes (${safeSpaces.length} safe spaces)`
      };
    }

    // Check for corridor trap
    const isInCorridor = checkForCorridor(pos, gameState);
    if (isInCorridor) {
      return {
        isTrap: true,
        reason: 'Corridor trap detected'
      };
    }

    // Check for corner trap
    const isInCorner = checkForCornerTrap(pos, gameState);
    if (isInCorner) {
      return {
        isTrap: true,
        reason: 'Corner trap detected'
      };
    }

    return { isTrap: false };
  } catch (error) {
    console.error("ERROR in checkForTraps:", error);
    // Return conservative result on error
    return {
      isTrap: true,
      reason: 'Error in trap detection'
    };
  }
}

function countEscapeRoutes(pos, gameState) {
  return ['up', 'down', 'left', 'right']
    .map(move => getNextPosition(pos, move))
    .filter(newPos => 
      newPos && 
      isWithinBounds(newPos, gameState) && 
      !isPositionOccupied(newPos, gameState) &&
      !isNearEnemyHead(newPos, gameState)
    );
}

function checkForCorridor(pos, gameState) {
  // Check if we're between snake bodies
  const adjacentSpaces = [
    {x: pos.x - 1, y: pos.y},
    {x: pos.x + 1, y: pos.y},
    {x: pos.x, y: pos.y - 1},
    {x: pos.x, y: pos.y + 1}
  ];
  
  const blockedSpaces = adjacentSpaces.filter(space => 
    !isWithinBounds(space, gameState) || 
    isPositionOccupied(space, gameState)
  ).length;

  return blockedSpaces >= 3; // If 3 or more sides are blocked
}

function checkForCornerTrap(pos, gameState) {
  // Check if we're being forced into a corner
  const isNearWall = pos.x <= 1 || pos.x >= gameState.board.width - 2 ||
                     pos.y <= 1 || pos.y >= gameState.board.height - 2;
                     
  if (!isNearWall) return false;

  // Count nearby enemy snakes
  const nearbyEnemies = gameState.board.snakes.filter(snake => 
    snake.id !== gameState.you.id &&
    Math.abs(snake.head.x - pos.x) + Math.abs(snake.head.y - pos.y) <= 2
  ).length;

  return nearbyEnemies >= 1;
}

function checkForPincerMove(pos, gameState) {
  const enemies = gameState.board.snakes.filter(snake => snake.id !== gameState.you.id);
  
  // Check if enemies are positioned for a pincer movement
  for (let i = 0; i < enemies.length; i++) {
    for (let j = i + 1; j < enemies.length; j++) {
      const enemy1 = enemies[i];
      const enemy2 = enemies[j];
      
      // Check if enemies are on opposite sides
      const isPincer = (
        (Math.abs(enemy1.head.x - pos.x) <= 2 && Math.abs(enemy2.head.x - pos.x) <= 2) ||
        (Math.abs(enemy1.head.y - pos.y) <= 2 && Math.abs(enemy2.head.y - pos.y) <= 2)
      );
      
      if (isPincer) return true;
    }
  }
  
  return false;
}

function isPositionOccupied(pos, gameState) {
  return gameState.board.snakes.some(snake => 
    snake.body.some(segment => 
      segment.x === pos.x && segment.y === pos.y
    )
  );
}

function countOpenSpace(pos, gameState, depth) {
  if (depth === 0) return 0;
  
  const moves = ['up', 'down', 'left', 'right'];
  let count = 0;
  
  moves.forEach(move => {
    const newPos = getNextPosition(pos, move);
    if (isWithinBounds(newPos, gameState) && !isPositionOccupied(newPos, gameState)) {
      count += 1 + countOpenSpace(newPos, gameState, depth - 1);
    }
  });
  
  return count;
}

function isNearEnemyHead(pos, gameState) {
  return gameState.board.snakes.some(snake => {
    if (snake.id === gameState.you.id) return false;
    const distance = Math.abs(pos.x - snake.head.x) + Math.abs(pos.y - snake.head.y);
    return distance <= 1 && snake.length >= gameState.you.length;
  });
}

function detectPotentialTrap(pos, gameState, depth = 2) {
    console.log("🔍 Checking for potential traps...");
    
    // Count escape routes now
    const currentEscapes = countEscapeRoutes(pos, gameState);
    
    // Look ahead for potential boxing in
    const enemySnakes = gameState.board.snakes.filter(s => s.id !== gameState.you.id);
    let dangerZones = new Set();
    
    // Calculate where enemy snakes could move
    enemySnakes.forEach(snake => {
        const possibleMoves = getPossibleMoves(snake.head)
            .map(move => getNextPosition(snake.head, move))
            .filter(pos => isWithinBounds(pos, gameState));
            
        possibleMoves.forEach(pos => dangerZones.add(`${pos.x},${pos.y}`));
    });
    
    // If we're getting boxed in, warn early
    if (currentEscapes <= 2 && dangerZones.size >= currentEscapes - 1) {
        console.log("⚠️ TRAP WARNING: Could get boxed in soon!");
        return true;
    }
    
    return false;
}

function chooseSafestMove(safeMoves, gameState) {
    // First, check if we're heading towards a trap
    const nextPositions = safeMoves.map(move => ({
        move,
        pos: getNextPosition(gameState.you.head, move)
    }));
    
    // Filter out moves that lead to potential traps
    const safestMoves = nextPositions.filter(({pos}) => 
        !detectPotentialTrap(pos, gameState)
    );
    
    if (safestMoves.length > 0) {
        console.log("✅ Found moves that avoid traps!");
        return safestMoves[0].move;
    }
    
    // If all moves are dangerous, try to find the least trapped option...
    console.log("⚠️ All moves look dangerous, choosing least trapped...");
    return findLeastTrappedMove(safeMoves, gameState);
}

module.exports = {
  getMoveResponse
} 