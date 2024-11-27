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
  
  for (let y = board.length - 1; y >= 0; y--) {
    let row = '║'
    for (let x = 0; x < board[y].length; x++) {
      row += symbols[board[y][x]] + ' '
    }
    row += '║'
    console.log(row)
  }
  
  console.log('╚' + '═'.repeat(board[0].length * 2) + '╝')
} 