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

// Health threshold for food pursuit
const HEALTH_THRESHOLD = 50

function getMoveResponse(gameState) {
  try {
    const board = createGameBoard(gameState)
    console.log('\nCurrent Board:')
    printBoard(board)

    // Decide whether to pursue food
    const shouldPursueFood = gameState.you.health < HEALTH_THRESHOLD
    console.log(`Health: ${gameState.you.health}, Pursuing food: ${shouldPursueFood}`)

    let bestMove
    if (shouldPursueFood) {
      // Find path to nearest food
      const foodPath = findPathToNearestFood(gameState, board)
      if (foodPath && foodPath.length > 0) {
        bestMove = getDirectionFromPath(gameState.you.head, foodPath[0])
        console.log('Food path found, moving:', bestMove)
      }
    }

    // If no food path or not pursuing food, find safest move
    if (!bestMove) {
      const safeMoves = calculateSafeMoves(gameState, board)
      bestMove = chooseBestMove(safeMoves)
      console.log('Using safe move:', bestMove)
    }

    return bestMove || 'right'
  } catch (error) {
    console.error('Move error:', error)
    return 'right'
  }
}

function findPathToNearestFood(gameState, board) {
  const start = gameState.you.head
  const foods = gameState.board.food

  // Find closest food using A*
  let shortestPath = null
  let shortestDistance = Infinity

  foods.forEach(food => {
    const path = aStarSearch(start, food, gameState, board)
    if (path && path.length < shortestDistance) {
      shortestPath = path
      shortestDistance = path.length
    }
  })

  return shortestPath
}

function aStarSearch(start, goal, gameState, board) {
  const openSet = new Set([JSON.stringify(start)])
  const cameFrom = new Map()
  
  const gScore = new Map()
  gScore.set(JSON.stringify(start), 0)
  
  const fScore = new Map()
  fScore.set(JSON.stringify(start), heuristic(start, goal))

  while (openSet.size > 0) {
    // Find node with lowest fScore
    let current = null
    let lowestFScore = Infinity
    
    openSet.forEach(pos => {
      const score = fScore.get(pos) || Infinity
      if (score < lowestFScore) {
        lowestFScore = score
        current = pos
      }
    })

    const currentPos = JSON.parse(current)
    
    // Check if reached goal
    if (currentPos.x === goal.x && currentPos.y === goal.y) {
      return reconstructPath(cameFrom, current)
    }

    openSet.delete(current)

    // Check neighbors
    getNeighbors(currentPos, gameState, board).forEach(neighbor => {
      const neighborStr = JSON.stringify(neighbor)
      const tentativeGScore = (gScore.get(current) || 0) + 1

      if (tentativeGScore < (gScore.get(neighborStr) || Infinity)) {
        cameFrom.set(neighborStr, current)
        gScore.set(neighborStr, tentativeGScore)
        fScore.set(neighborStr, tentativeGScore + heuristic(neighbor, goal))
        
        if (!openSet.has(neighborStr)) {
          openSet.add(neighborStr)
        }
      }
    })
  }

  return null // No path found
}

function heuristic(a, b) {
  // Manhattan distance
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

function getNeighbors(pos, gameState, board) {
  const neighbors = []
  const directions = [
    {x: 0, y: 1}, {x: 0, y: -1},
    {x: 1, y: 0}, {x: -1, y: 0}
  ]

  directions.forEach(dir => {
    const neighbor = {
      x: pos.x + dir.x,
      y: pos.y + dir.y
    }

    if (isValidMove(neighbor, gameState, board)) {
      neighbors.push(neighbor)
    }
  })

  return neighbors
}

function isValidMove(pos, gameState, board) {
  // Check bounds
  if (pos.x < 0 || pos.x >= gameState.board.width) return false
  if (pos.y < 0 || pos.y >= gameState.board.height) return false

  // Check cell content
  const cell = board[pos.y][pos.x]
  return cell === CELL.EMPTY || cell === CELL.FOOD
}

function reconstructPath(cameFrom, current) {
  const path = [JSON.parse(current)]
  
  while (cameFrom.has(current)) {
    current = cameFrom.get(current)
    path.unshift(JSON.parse(current))
  }

  return path.slice(1) // Remove start position
}

function getDirectionFromPath(head, next) {
  if (next.x > head.x) return 'right'
  if (next.x < head.x) return 'left'
  if (next.y > head.y) return 'up'
  if (next.y < head.y) return 'down'
  return null
}

function calculateSafeMoves(gameState, board) {
  const head = gameState.you.head
  const possibleMoves = []

  // Check each direction
  Object.values(DIRECTIONS).forEach(direction => {
    const nextPos = getNextPosition(head, direction)
    const safetyScore = evaluateMove(nextPos, gameState, board)
    
    if (safetyScore > -100) { // -100 means deadly move
      possibleMoves.push({
        direction,
        position: nextPos,
        score: safetyScore
      })
    }
  })

  return possibleMoves
}

function evaluateMove(pos, gameState, board) {
  let score = 0
  
  // Check bounds
  if (pos.x < 0 || pos.x >= gameState.board.width) return -100
  if (pos.y < 0 || pos.y >= gameState.board.height) return -100

  // Get cell content
  const cell = board[pos.y][pos.x]

  // Score different scenarios
  switch(cell) {
    case CELL.EMPTY:
      score += 10  // Basic safe move
      break
    case CELL.FOOD:
      score += 20  // Food is good
      // Add health consideration
      if (gameState.you.health < 50) score += 30
      break
    case CELL.MY_BODY:
    case CELL.ENEMY_BODY:
      return -100  // Deadly
    case CELL.ENEMY_HEAD:
      return -100  // Very dangerous
    case CELL.WALL:
      return -100  // Can't move here
  }

  // Check for nearby dangers
  const dangers = checkSurroundingDangers(pos, gameState, board)
  score -= dangers * 5

  // Check if move leads to open space
  const openSpace = countAccessibleCells(pos, gameState, board)
  score += openSpace * 2

  return score
}

function checkSurroundingDangers(pos, gameState, board) {
  let dangers = 0
  const directions = [{x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}]

  directions.forEach(dir => {
    const checkPos = {
      x: pos.x + dir.x,
      y: pos.y + dir.y
    }

    // Check if position is valid
    if (checkPos.x >= 0 && checkPos.x < gameState.board.width &&
        checkPos.y >= 0 && checkPos.y < gameState.board.height) {
      const cell = board[checkPos.y][checkPos.x]
      if (cell === CELL.ENEMY_HEAD || cell === CELL.ENEMY_BODY) {
        dangers++
      }
    }
  })

  return dangers
}

function countAccessibleCells(pos, gameState, board) {
  let count = 0
  const visited = new Set()
  const queue = [pos]

  while (queue.length > 0) {
    const current = queue.shift()
    const key = `${current.x},${current.y}`

    if (visited.has(key)) continue
    visited.add(key)

    // Count this cell
    count++

    // Check neighbors
    const directions = [{x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}]
    directions.forEach(dir => {
      const next = {
        x: current.x + dir.x,
        y: current.y + dir.y
      }

      // Check if valid and safe
      if (next.x >= 0 && next.x < gameState.board.width &&
          next.y >= 0 && next.y < gameState.board.height) {
        const cell = board[next.y][next.x]
        if (cell === CELL.EMPTY || cell === CELL.FOOD) {
          queue.push(next)
        }
      }
    })
  }

  return count
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