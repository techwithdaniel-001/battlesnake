const { getMoveResponse } = require('../logic/moves')
const board = require('../utils/board')

// Add at the top with other constants
const HEALTH_THRESHOLD = 50

// Index handler
function handleIndex(req, res) {
  const timestamp = new Date().toISOString();
  const battlesnakeInfo = {
    apiversion: "1",
    author: "ebube12345",
    color: "#FF0000",
    head: "silly",
    tail: "bolt",
    version: "v2.1 - Trapping Update",
    lastChecked: timestamp,
    status: "ACTIVE - Ready for battle! 🐍"
  };
  
  console.log(`[${timestamp}] Snake Status Check - Ready for battle! 🐍`);
  res.json(battlesnakeInfo);
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
    const gameState = req.body;
    
    // Log detailed game state
    console.log('\n=== MOVE REQUEST ===');
    console.log('Turn:', gameState.turn);
    console.log('You:', {
      head: gameState.you.head,
      length: gameState.you.length,
      health: gameState.you.health
    });
    console.log('Board:', {
      width: gameState.board.width,
      height: gameState.board.height,
      food: gameState.board.food.length,
      snakes: gameState.board.snakes.length
    });

    const move = getMoveResponse(gameState);
    
    // Log move decision
    console.log('MOVE CHOICE:', {
      move: move.move,
      nextHead: getNextPosition(gameState.you.head, move.move)
    });

    res.json(move);
  } catch (error) {
    console.error('CRITICAL ERROR:', error);
    console.error('Game State:', JSON.stringify(req.body, null, 2));
    // Emergency move
    res.json({ move: getEmergencyMove(req.body) });
  }
}

// End handler
function handleEnd(req, res) {
  const gameState = req.body;
  console.log('\n=== GAME OVER ANALYSIS ===');
  console.log('Game ID:', gameState.game.id);
  console.log('Final Turn:', gameState.turn);
  console.log('Final Length:', gameState.you.length);
  console.log('Final Health:', gameState.you.health);
  console.log('Cause of Death:', analyzeCauseOfDeath(gameState));
  res.json({});
}

// New helper function
function analyzeCauseOfDeath(gameState) {
  const head = gameState.you.head;
  
  // Check wall collision
  if (head.x < 0 || head.x >= gameState.board.width ||
      head.y < 0 || head.y >= gameState.board.height) {
    return 'Wall collision';
  }
  
  // Check self collision
  if (gameState.you.body.slice(1).some(segment => 
    segment.x === head.x && segment.y === head.y
  )) {
    return 'Self collision';
  }
  
  // Check other snake collision
  const otherSnakes = gameState.board.snakes.filter(s => s.id !== gameState.you.id);
  for (const snake of otherSnakes) {
    if (snake.body.some(segment => 
      segment.x === head.x && segment.y === head.y
    )) {
      return 'Collision with other snake';
    }
  }
  
  // Check head-to-head
  for (const snake of otherSnakes) {
    if (snake.head.x === head.x && snake.head.y === head.y) {
      return `Head-to-head with ${snake.id} (length ${snake.length})`;
    }
  }
  
  return 'Unknown cause';
}

// Helper for emergency moves
function getEmergencyMove(gameState) {
  if (!gameState || !gameState.you || !gameState.you.head) {
    console.log('EMERGENCY: Invalid game state, defaulting to up');
    return 'up';
  }

  const head = gameState.you.head;
  const moves = ['up', 'down', 'left', 'right'];
  
  // Try each move, return first one that doesn't hit a wall
  for (const move of moves) {
    const pos = getNextPosition(head, move);
    if (isWithinBounds(pos, gameState)) {
      console.log(`EMERGENCY: Choosing ${move} to avoid wall`);
      return move;
    }
  }
  
  console.log('EMERGENCY: No safe moves found, defaulting to up');
  return 'up';
}

function getNextPosition(head, move) {
  switch(move) {
    case 'up': return { x: head.x, y: head.y + 1 };
    case 'down': return { x: head.x, y: head.y - 1 };
    case 'left': return { x: head.x - 1, y: head.y };
    case 'right': return { x: head.x + 1, y: head.y };
    default: return head;
  }
}

function isWithinBounds(pos, gameState) {
  return pos.x >= 0 && pos.x < gameState.board.width &&
         pos.y >= 0 && pos.y < gameState.board.height;
}

module.exports = {
  handleIndex,
  handleStart,
  handleMove,
  handleEnd
} 