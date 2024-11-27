const { DIRECTIONS } = require('../utils/constants')
const { isOutOfBounds, willHitSnake } = require('../utils/board')

// Board cell types
const CELL = {
  EMPTY: '.',
  FOOD: '🍎',
  MY_HEAD: '😎',
  MY_BODY: '🟦',
  ENEMY_HEAD: '👿',
  ENEMY_BODY: '🟥',
  DANGER: '⚠️',
  SAFE_FOOD: '✅'
}

function getMoveResponse(gameState) {
  debugLog('STARTING MOVE CALCULATION', {
    turn: gameState.turn,
    health: gameState.you.health
  })
  
  // Create and display board
  const board = createDetailedBoard(gameState)
  debugLog('CURRENT BOARD', printBoardToString(board))
  
  // Get possible moves
  const possibleMoves = getPossibleMoves(gameState)
  debugLog('POSSIBLE MOVES', possibleMoves)
  
  // Evaluate each move
  const scoredMoves = possibleMoves.map(move => ({
    move,
    score: evaluateMove(gameState, move)
  }))
  debugLog('MOVE SCORES', scoredMoves)
  
  // Choose best move
  const bestMove = chooseBestMove(scoredMoves)
  debugLog('CHOSEN MOVE', bestMove)
  
  return bestMove
}

// Helper to convert board to string
function printBoardToString(board) {
  return board.map(row => row.join(' ')).join('\n')
}

function createDetailedBoard(gameState) {
  const board = Array(gameState.board.height).fill()
    .map(() => Array(gameState.board.width).fill(CELL.EMPTY))
  
  // Mark food
  gameState.board.food.forEach(f => {
    board[f.y][f.x] = CELL.FOOD
  })
  
  // Mark snakes
  gameState.board.snakes.forEach(snake => {
    const isMe = snake.id === gameState.you.id
    
    // Mark head
    const head = snake.body[0]
    board[head.y][head.x] = isMe ? CELL.MY_HEAD : CELL.ENEMY_HEAD
    
    // Mark body
    snake.body.slice(1).forEach(segment => {
      board[segment.y][segment.x] = isMe ? CELL.MY_BODY : CELL.ENEMY_BODY
    })
  })
  
  return board
}

function markDangerZones(board, gameState) {
  const myLength = gameState.you.length
  
  gameState.board.snakes.forEach(snake => {
    if (snake.id === gameState.you.id) return
    
    const head = snake.head
    const isLarger = snake.length >= myLength
    
    // Mark
  })
}

function printBoard(board) {
  console.log('Board:')
  board.forEach(row => console.log(row.join(' ')))
}

function chooseBestMove(board, gameState, foodPaths) {
  let bestMove = foodPaths[0].path[0]
  let bestScore = -Infinity
  
  for (const {path, safety} of foodPaths) {
    let score = evaluatePosition(gameState, path[0])
    
    // Add safety bonus
    score += safety * 100
    
    if (score > bestScore) {
      bestScore = score
      bestMove = path[0]
    }
  }
  
  console.log(`Chose ${bestMove} with score ${bestScore}`)
  return bestMove
}

function willHitSelf(pos, myBody) {
  // Check all body segments except the tail (which will move)
  return myBody.slice(0, -1).some(segment => 
    segment.x === pos.x && segment.y === pos.y
  )
}

function willHitOtherSnakes(pos, snakes, myId) {
  return snakes.some(snake => 
    snake.id !== myId && 
    snake.body.some(segment => 
      segment.x === pos.x && segment.y === pos.y
    )
  )
}

function willGetTrapped(pos, gameState) {
  // Do a flood fill to count available spaces
  const availableSpace = floodFill(pos, gameState)
  const myLength = gameState.you.length
  
  // If available space is less than our length, it's a trap
  if (availableSpace < myLength) {
    console.log(`Only ${availableSpace} spaces available, need ${myLength}`)
    return true
  }
  return false
}

function floodFill(start, gameState) {
  const visited = new Set()
  const queue = [start]
  const board = gameState.board
  
  while (queue.length > 0) {
    const pos = queue.shift()
    const key = `${pos.x},${pos.y}`
    
    if (visited.has(key)) continue
    if (isOutOfBounds(pos, board)) continue
    if (willHitSnake(pos, gameState.board.snakes)) continue
    
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

function evaluatePosition(gameState, pos) {
  let score = 0
  const health = gameState.you.health
  const myLength = gameState.you.length
  
  // HUNTING OTHER SNAKES
  for (const snake of gameState.board.snakes) {
    if (snake.id === gameState.you.id) continue // Skip self
    
    const theirHead = snake.head
    const theirLength = snake.length
    
    // If we're longer, try to trap them
    if (myLength > theirLength + 1) {
      const distanceToTheirHead = Math.abs(pos.x - theirHead.x) + Math.abs(pos.y - theirHead.y)
      
      if (distanceToTheirHead === 1) {
        // Adjacent to their head - perfect for trapping
        score += 300
        console.log(`Can trap smaller snake! Length diff: ${myLength - theirLength}`)
      } else if (distanceToTheirHead < 4) {
        // Close enough to hunt
        score += (4 - distanceToTheirHead) * 50
        console.log(`Hunting smaller snake! Distance: ${distanceToTheirHead}`)
      }
    } else {
      // If we're smaller or equal, keep safe distance
      const distanceToTheirHead = Math.abs(pos.x - theirHead.x) + Math.abs(pos.y - theirHead.y)
      if (distanceToTheirHead < 3) {
        score -= (3 - distanceToTheirHead) * 50
        console.log(`Avoiding larger/equal snake! Distance: ${distanceToTheirHead}`)
      }
    }
  }
  
  // TRAP DETECTION
  const futureSpace = calculateFutureSpace(pos, gameState, 3)
  score += futureSpace * 2
  
  // FOOD SEEKING (less priority when hunting)
  const nearestFood = findNearestFood(gameState, pos)
  if (nearestFood) {
    const foodDistance = Math.abs(pos.x - nearestFood.x) + Math.abs(pos.y - nearestFood.y)
    
    if (health < 30) {
      score += (200 - foodDistance * 2)
      console.log(`Hungry! Food distance: ${foodDistance}`)
    }
    else if (health < 75 && !isHunting(gameState)) {
      score += (100 - foodDistance)
      console.log(`Could eat! Food distance: ${foodDistance}`)
    }
  }
  
  return score
}

function isHunting(gameState) {
  const myLength = gameState.you.length
  return gameState.board.snakes.some(snake => 
    snake.id !== gameState.you.id && 
    myLength > snake.length + 1 &&
    getDistance(gameState.you.head, snake.head) < 4
  )
}

function getDistance(pos1, pos2) {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y)
}

function predictSnakeMove(snake, gameState) {
  const possibleMoves = []
  const head = snake.head
  
  // Check all possible moves
  for (const move of Object.values(DIRECTIONS)) {
    const nextPos = getNextPosition(head, move)
    if (!isOutOfBounds(nextPos, gameState.board) && 
        !willHitSnake(nextPos, gameState.board.snakes)) {
      possibleMoves.push(nextPos)
    }
  }
  
  return possibleMoves
}

function canTrapSnake(myPos, theirHead, gameState) {
  const theirMoves = predictSnakeMove({head: theirHead}, gameState)
  if (theirMoves.length <= 1) return true // They're almost trapped
  
  // Check if we can cut off their escape routes
  const myMoves = predictSnakeMove({head: myPos}, gameState)
  return myMoves.some(myMove => 
    theirMoves.length === 2 && 
    theirMoves.some(theirMove => 
      getDistance(myMove, theirMove) === 1
    )
  )
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