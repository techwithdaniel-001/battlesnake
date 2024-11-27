const moves = require('../logic/moves');

// Add at the top of the file
let moveCounter = 0;

// Constants
const MOVES = {
    UP: 'up',
    DOWN: 'down',
    LEFT: 'left',
    RIGHT: 'right'
};

function handleIndex(req, res) {
  const battlesnakeInfo = {
    apiversion: "1",
    author: "ebube12345",
    color: "#FF0000",
    head: "silly",
    tail: "bolt",
    version: "v2.1 - Test Mode"
  };
  res.json(battlesnakeInfo);
}

function handleStart(req, res) {
  res.json({});
}

function handleMove(req, res) {
  const gameState = req.body;
  
  try {
    console.log("\n=== MOVE ANALYSIS ===");
    console.log(`Move #${moveCounter}`);
    console.log("Current position:", gameState.you.head);
    console.log("Board size:", `${gameState.board.width}x${gameState.board.height}`);

    const moveResponse = getMoveResponse(gameState);
    
    // Validate the chosen move
    const isValid = validateMove(moveResponse.move, gameState);
    
    if (!isValid) {
      console.log("⚠️ Chosen move failed validation, using emergency move");
      const safeMove = findEmergencyMove(gameState);
      return res.json({ move: safeMove });
    }

    console.log("✅ Move chosen and validated:", moveResponse.move);
    return res.json(moveResponse);

  } catch (error) {
    console.error("🚨 ERROR in move handler:", error);
    const safeMove = findEmergencyMove(gameState);
    console.log("🆘 Using emergency move:", safeMove);
    return res.json({ move: safeMove });
  }
}

function handleEnd(req, res) {
  res.json({});
}

function checkDeadlyMove(nextPos, gameState) {
  // Wall death
  if (!isWithinBounds(nextPos, gameState)) {
    return 'Hit wall';
  }
  
  // Body collision death
  const hitBody = gameState.board.snakes.some(snake => 
    snake.body.some(segment => 
      segment.x === nextPos.x && segment.y === nextPos.y
    )
  );
  if (hitBody) {
    return 'Hit snake body';
  }
  
  // Head collision death
  const headCollisionDeath = gameState.board.snakes.some(snake => {
    if (snake.id === gameState.you.id) return false;
    
    const enemyMoves = ['up', 'down', 'left', 'right'].map(move => 
      getNextPosition(snake.head, move)
    );
    
    return enemyMoves.some(enemyPos => 
      enemyPos.x === nextPos.x && 
      enemyPos.y === nextPos.y && 
      snake.length >= gameState.you.length
    );
  });
  if (headCollisionDeath) {
    return 'Lost head-to-head collision';
  }
  
  return false;
}

function wouldEatSmaller(nextPos, gameState) {
  return gameState.board.snakes.some(snake => {
    if (snake.id === gameState.you.id) return false;
    
    const enemyMoves = ['up', 'down', 'left', 'right'].map(move => 
      getNextPosition(snake.head, move)
    );
    
    return enemyMoves.some(enemyPos => 
      enemyPos.x === nextPos.x && 
      enemyPos.y === nextPos.y && 
      snake.length < gameState.you.length
    );
  });
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
  return pos.x >= 0 && 
         pos.x < gameState.board.width && 
         pos.y >= 0 && 
         pos.y < gameState.board.height;
}

// Update the emergency move function
function findEmergencyMove(gameState) {
  const possibleMoves = ['up', 'down', 'left', 'right'];
  const head = gameState.you.head;
  
  // Check each move for basic safety
  const safeMoves = possibleMoves.map(move => {
    const nextPos = getNextPosition(head, move);
    return {
      move: move,
      safe: isBasicallySafe(nextPos, gameState)
    };
  });

  // Filter safe moves
  const validMoves = safeMoves.filter(m => m.safe);
  
  // If we have safe moves, use one of those
  if (validMoves.length > 0) {
    return validMoves[0].move;
  }
  
  // If no safe moves, try up or left as last resort
  return 'up';
}

// Basic safety check for emergency moves
function isBasicallySafe(pos, gameState) {
  // Check walls
  if (pos.x < 0 || pos.x >= gameState.board.width || 
      pos.y < 0 || pos.y >= gameState.board.height) {
    return false;
  }

  // Check for immediate collisions with snake bodies
  const hitSnake = gameState.board.snakes.some(snake => 
    snake.body.some(segment => 
      segment.x === pos.x && segment.y === pos.y
    )
  );

  return !hitSnake;
}

// Update getMoveResponse to always return a move
function getMoveResponse(gameState) {
  const currentMove = moveCounter++;
  console.time(`moveCalc_${currentMove}`);
  
  try {
    const head = gameState.you.head;
    
    // Get valid moves
    const validMoves = getValidMoves(head, gameState);
    console.log(`🎯 Valid moves:`, validMoves);

    if (!validMoves || validMoves.length === 0) {
      console.log("⚠️ No valid moves found");
      return { move: findEmergencyMove(gameState) };
    }

    // Score the moves
    const scoredMoves = validMoves.map(pos => ({
      move: getDirectionFromPositions(head, pos),
      score: calculateMoveScore(pos, gameState)
    }));

    console.log(`📊 Scored moves:`, scoredMoves);
    
    // Sort by score
    scoredMoves.sort((a, b) => b.score - a.score);
    
    const bestMove = scoredMoves[0].move;
    console.log(`✅ [Move ${currentMove}] Choosing: ${bestMove} (score: ${scoredMoves[0].score})`);
    
    console.timeEnd(`moveCalc_${currentMove}`);
    return { move: bestMove };

  } catch (error) {
    console.error(`❌ [Move ${currentMove}] Error:`, error);
    console.timeEnd(`moveCalc_${currentMove}`);
    return { move: findEmergencyMove(gameState) };
  }
}

// Make sure we have all our helper functions
function getValidMoves(pos, gameState) {
  const possibleMoves = [
    {x: pos.x, y: pos.y + 1},  // up
    {x: pos.x, y: pos.y - 1},  // down
    {x: pos.x - 1, y: pos.y},  // left
    {x: pos.x + 1, y: pos.y}   // right
  ];

  return possibleMoves.filter(move => isBasicallySafe(move, gameState));
}

function getDirectionFromPositions(from, to) {
  if (to.x > from.x) return MOVES.RIGHT;
  if (to.x < from.x) return MOVES.LEFT;
  if (to.y > from.y) return MOVES.UP;
  if (to.y < from.y) return MOVES.DOWN;
  return MOVES.UP; // fallback
}

function calculateMoveScore(pos, gameState) {
  let score = 100; // base score
  
  // Add basic scoring logic
  if (isNearWall(pos, gameState)) score -= 50;
  if (isNearFood(pos, gameState)) score += 50;
  
  return score;
}

function isNearWall(pos, gameState) {
  return pos.x <= 0 || pos.x >= gameState.board.width - 1 ||
         pos.y <= 0 || pos.y >= gameState.board.height - 1;
}

function isNearFood(pos, gameState) {
  return gameState.board.food.some(food => 
    Math.abs(food.x - pos.x) + Math.abs(food.y - pos.y) === 1
  );
}

function validateMove(move, gameState) {
    const head = gameState.you.head;
    const nextPos = getNextPosition(head, move);
    
    console.log("\n=== MOVE VALIDATION ===");
    console.log("Current head:", head);
    console.log("Next position:", nextPos);
    
    // Check for immediate death scenarios
    const deathScenarios = {
        wall: !isValidPosition(nextPos, gameState),
        body: willHitSnake(nextPos, gameState),
        head: isHeadCollision(nextPos, gameState)
    };

    const isSafe = !Object.values(deathScenarios).some(death => death);
    
    if (isSafe) {
        console.log("✅ TEST PASSED - SAFE MOVE!");
    } else {
        console.log("❌ TEST FAILED - DANGEROUS MOVE!");
        console.log("Death scenarios:", deathScenarios);
    }

    return isSafe;
}

module.exports = {
  handleIndex,
  handleStart,
  handleMove,
  handleEnd
}; 