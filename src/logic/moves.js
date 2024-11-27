const { DIRECTIONS } = require('../utils/constants')

// Board cell states
const CELL = {
  EMPTY: 0,
  FOOD: 1,
  MY_HEAD: 2,
  MY_BODY: 3,
  ENEMY_HEAD: 4,
  ENEMY_BODY: 5,
  WALL: 6,
  DANGER: 7
}

function getMoveResponse(gameState) {
  try {
    console.log('\n=== Processing Move ===')
    console.log('Turn:', gameState.turn)
    console.log('Health:', gameState.you.health)
    console.log('Head Position:', gameState.you.head)

    const board = createGameBoard(gameState)
    printBoard(board)

    // Get all possible safe moves
    const safeMoves = getPossibleMoves(gameState, board)
    console.log('Safe moves:', safeMoves)

    // If no safe moves, try any valid move
    if (safeMoves.length === 0) {
      console.log('NO SAFE MOVES AVAILABLE!')
      const lastResortMove = getLastResortMove(gameState, board)
      console.log('Last resort move:', lastResortMove)
      return lastResortMove
    }

    // If health is low, try to find food
    if (gameState.you.health < 50) {
      console.log('Health is low, looking for food')
      const moveTowardFood = findFoodMove(gameState, board, safeMoves)
      if (moveTowardFood) {
        console.log('Moving toward food:', moveTowardFood)
        return moveTowardFood
      }
    }

    // Otherwise, choose the safest move
    const bestMove = chooseSafestMove(safeMoves, gameState, board)
    console.log('Chosen safe move:', bestMove)
    return bestMove
  } catch (error) {
    console.error('ERROR in getMoveResponse:', error)
    return findEmergencyMove(gameState)
  }
}

function getPossibleMoves(gameState, board) {
  const head = gameState.you.head
  const possibleMoves = []

  // Check each direction
  Object.values(DIRECTIONS).forEach(direction => {
    const nextPos = getNextPosition(head, direction)
    if (isSafeMove(nextPos, gameState, board)) {
      possibleMoves.push(direction)
    }
  })

  return possibleMoves
}

function isSafeMove(pos, gameState, board) {
  // Check bounds
  if (pos.x < 0 || pos.x >= gameState.board.width) {
    console.log(`Position ${JSON.stringify(pos)} is out of bounds`)
    return false
  }
  if (pos.y < 0 || pos.y >= gameState.board.height) {
    console.log(`Position ${JSON.stringify(pos)} is out of bounds`)
    return false
  }

  // Check cell content
  const cell = board[pos.y][pos.x]
  const isSafe = cell === CELL.EMPTY || cell === CELL.FOOD
  console.log(`Position ${JSON.stringify(pos)} is ${isSafe ? 'safe' : 'unsafe'} (cell type: ${cell})`)
  return isSafe
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
  if (safeMoves.length === 0) return 'right'
  
  // Prefer moves that keep options open
  const moveScores = safeMoves.map(move => {
    const nextPos = getNextPosition(gameState.you.head, move)
    const futureOptions = countFutureOptions(nextPos, gameState, board)
    return { move, score: futureOptions }
  })

  moveScores.sort((a, b) => b.score - a.score)
  return moveScores[0].move
}

function countFutureOptions(pos, gameState, board) {
  let count = 0
  Object.values(DIRECTIONS).forEach(direction => {
    const nextPos = getNextPosition(pos, direction)
    if (isSafeMove(nextPos, gameState, board)) {
      count++
    }
  })
  return count
}

function getLastResortMove(gameState, board) {
  const head = gameState.you.head
  const moves = ['up', 'down', 'left', 'right']
  
  // Try each move
  for (const move of moves) {
    const nextPos = getNextPosition(head, move)
    if (nextPos.x >= 0 && nextPos.x < gameState.board.width &&
        nextPos.y >= 0 && nextPos.y < gameState.board.height) {
      return move
    }
  }
  
  return 'right' // Last resort
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

function createGameBoard(gameState) {
  const width = gameState.board.width
  const height = gameState.board.height
  
  // Initialize empty board
  const board = Array(height).fill().map(() => 
    Array(width).fill(CELL.EMPTY)
  )
  
  // Add food
  gameState.board.food.forEach(food => {
    board[food.y][food.x] = CELL.FOOD
  })
  
  // Add my snake
  const mySnake = gameState.you
  board[mySnake.head.y][mySnake.head.x] = CELL.MY_HEAD
  mySnake.body.slice(1).forEach(segment => {
    board[segment.y][segment.x] = CELL.MY_BODY
  })
  
  // Add enemy snakes
  gameState.board.snakes.forEach(snake => {
    if (snake.id !== gameState.you.id) {
      board[snake.head.y][snake.head.x] = CELL.ENEMY_HEAD
      snake.body.slice(1).forEach(segment => {
        board[segment.y][segment.x] = CELL.ENEMY_BODY
      })
    }
  })
  
  return board
}

function printBoard(board) {
  const symbols = ['⬜', '🍎', '😎', '🟦', '👿', '🟥', '⬛']
  console.log('\nCurrent Board:')
  console.log('╔' + '═'.repeat(board[0].length * 2) + '╗')
  
  // Print board from top to bottom
  for (let y = board.length - 1; y >= 0; y--) {
    let row = board[y].map(cell => symbols[cell]).join(' ')
    console.log('║' + row + '║')
  }
  
  console.log('╚' + '═'.repeat(board[0].length * 2) + '╝')
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

module.exports = {
  getMoveResponse
} 