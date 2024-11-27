const { getMoveResponse } = require('../logic/moves')

// Board cell states (keep in sync with moves.js)
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

// Add at the top with other constants
const HEALTH_THRESHOLD = 50

// Index handler
function handleIndex(req, res) {
  const battlesnakeInfo = {
    apiversion: "1",
    author: "Ebubechukwu",
    color: "#FF0000",
    head: "silly",
    tail: "bolt",
    version: "1.0.0"
  }
  res.json(battlesnakeInfo)
}

// Start handler
function handleStart(req, res) {
  try {
    const gameState = req.body
    console.log('\n=== GAME START ===')
    console.log('Game ID:', gameState.game.id)
    console.log('Board Size:', gameState.board.width, 'x', gameState.board.height)
    console.log('My Snake ID:', gameState.you.id)
    res.json({})
  } catch (error) {
    console.error('Start Error:', error)
    res.json({})
  }
}

// Move handler
function handleMove(req, res) {
  try {
    const gameState = req.body
    
    console.log('\n=== TURN', gameState.turn, '===')
    console.log('Health:', gameState.you.health)
    console.log('Length:', gameState.you.length)
    
    const board = createGameBoard(gameState)
    console.log('\nCurrent Board:')
    printBoard(board)
    
    // Get move with A* pathfinding
    const move = getMoveResponse(gameState)
    console.log('\nChosen move:', move)
    
    if (gameState.you.health < HEALTH_THRESHOLD) {
      console.log('Low health! Pursuing food')
    }
    
    res.json({ move })
  } catch (error) {
    console.error('Move Error:', error)
    res.json({ move: 'right' })
  }
}

// End handler
function handleEnd(req, res) {
  try {
    const gameState = req.body
    console.log('\n=== GAME OVER ===')
    console.log('Game ID:', gameState.game.id)
    console.log('Final Turn:', gameState.turn)
    console.log('Final Length:', gameState.you.length)
    console.log('Reason:', gameState.you.elimination_reason || 'Unknown')
    res.json({})
  } catch (error) {
    console.error('End Error:', error)
    res.json({})
  }
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
  const symbols = ['⬜', '🍎', '😎', '🟦', '👿', '🟥', '⬛', '⚠️']
  console.log('╔' + '═'.repeat(board[0].length * 2) + '╗')
  
  // Print board from top to bottom
  for (let y = board.length - 1; y >= 0; y--) {
    let row = board[y].map(cell => symbols[cell]).join(' ')
    console.log('║' + row + '║')
  }
  
  console.log('╚' + '═'.repeat(board[0].length * 2) + '╝')
}

module.exports = {
  handleIndex,
  handleStart,
  handleMove,
  handleEnd
} 