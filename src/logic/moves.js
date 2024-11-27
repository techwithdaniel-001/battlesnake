const { DIRECTIONS } = require('../utils/constants')
const { CELL, createGameBoard, printBoard } = require('../utils/board')

function getMoveResponse(gameState) {
  try {
    const board = createGameBoard(gameState)
    let safeMoves = getPossibleMoves(gameState, board)

    // If no safe moves, try emergency moves
    if (safeMoves.length === 0) {
      return getLastResortMove(gameState, board)
    }

    // Priority 1: Avoid larger snakes
    const movesAwayFromBiggerSnakes = avoidLargerSnakes(gameState, board, safeMoves)
    if (movesAwayFromBiggerSnakes.length > 0) {
      safeMoves = movesAwayFromBiggerSnakes
    }

    // Priority 2: If health is low, find food
    if (gameState.you.health < 50) {
      const moveTowardFood = findFoodMove(gameState, board, safeMoves)
      if (moveTowardFood) return moveTowardFood
    }

    // Priority 3: If safe, chase tail
    if (gameState.you.health > 50) {
      const tailMove = moveTowardTail(gameState, board, safeMoves)
      if (tailMove) return tailMove
    }

    // Default: Choose safest move
    return chooseSafestMove(safeMoves, gameState, board)
  } catch (error) {
    console.error('ERROR in getMoveResponse:', error)
    return findEmergencyMove(gameState)
  }
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

function evaluateAvailableSpace(gameState, board) {
  const visited = new Set()
  const queue = [gameState.you.head]
  let space = 0

  while (queue.length > 0) {
    const pos = queue.shift()
    const key = `${pos.x},${pos.y}`

    if (visited.has(key)) continue
    visited.add(key)
    space++

    // Check all adjacent cells
    Object.values(DIRECTIONS).forEach(direction => {
      const nextPos = getNextPosition(pos, direction)
      if (isSafeMove(nextPos, gameState, board)) {
        queue.push(nextPos)
      }
    })
  }

  return space
}

function findOpenSpace(gameState, board, safeMoves) {
  const moveScores = safeMoves.map(move => {
    const nextPos = getNextPosition(gameState.you.head, move)
    const spaceScore = evaluateAvailableSpace({ ...gameState, you: { ...gameState.you, head: nextPos }}, board)
    return { move, score: spaceScore }
  })

  moveScores.sort((a, b) => b.score - a.score)
  return moveScores[0]?.move
}

// Update isSafeMove to consider snake sizes
function isSafeMove(pos, gameState, board) {
  // Check bounds
  if (pos.x < 0 || pos.x >= gameState.board.width) return false
  if (pos.y < 0 || pos.y >= gameState.board.height) return false

  const cell = board[pos.y][pos.x]
  
  // Never hit yourself
  if (cell === CELL.MY_BODY) return false
  
  // Check for enemy snake heads
  if (cell === CELL.ENEMY_HEAD) {
    const myLength = gameState.you.body.length
    const enemySnake = gameState.board.snakes.find(
      snake => snake.id !== gameState.you.id && 
      snake.head.x === pos.x && 
      snake.head.y === pos.y
    )
    // Only safe if we're longer than the enemy
    return enemySnake && myLength > enemySnake.body.length
  }

  // Safe if empty or food
  return cell === CELL.EMPTY || cell === CELL.FOOD
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