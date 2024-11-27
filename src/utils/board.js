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
  if (!gameState || !gameState.board) {
    console.error('Invalid game state for board creation');
    return null;
  }

  const width = gameState.board.width;
  const height = gameState.board.height;
  
  // Initialize empty board
  const board = Array(height).fill(null)
    .map(() => Array(width).fill(0));
  
  return board;
}

function printBoard(gameState, board) {
  // Guard clauses for safety
  if (!gameState || !gameState.board) {
    console.log('Invalid game state for board printing');
    return;
  }

  if (!gameState.board.width || !gameState.board.height) {
    console.log('Invalid board dimensions');
    return;
  }

  if (!gameState.board.snakes || !Array.isArray(gameState.board.snakes)) {
    console.log('Invalid snakes data');
    return;
  }

  const width = gameState.board.width;
  const height = gameState.board.height;

  // Print top border
  console.log('╔' + '══'.repeat(width) + '╗');

  // Print board rows
  for (let y = height - 1; y >= 0; y--) {
    let row = '║';
    for (let x = 0; x < width; x++) {
      // Default to empty space
      let cell = '⬜';

      // Check for food
      if (gameState.board.food && Array.isArray(gameState.board.food)) {
        const hasFood = gameState.board.food.some(f => f.x === x && f.y === y);
        if (hasFood) {
          cell = '🍎';
        }
      }

      // Check for snakes
      gameState.board.snakes.forEach(snake => {
        if (!snake || !snake.body || !Array.isArray(snake.body)) {
          return;
        }

        // Check head position
        if (snake.body[0] && snake.body[0].x === x && snake.body[0].y === y) {
          cell = snake.id === gameState.you.id ? '😎' : '👿';
        }
        // Check body segments
        else if (snake.body.some((segment, index) => 
          index > 0 && segment && segment.x === x && segment.y === y
        )) {
          cell = snake.id === gameState.you.id ? '🟦' : '🟥';
        }
      });

      row += cell + ' ';
    }
    row += '║';
    console.log(row);
  }

  // Print bottom border
  console.log('╚' + '══'.repeat(width) + '╝');
}

module.exports = {
  CELL,
  createGameBoard,
  printBoard
} 