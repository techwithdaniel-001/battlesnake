const moves = require('../logic/moves');

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
  try {
    const gameState = req.body;
    
    console.log('\n=== TEST SCENARIO ===');
    console.log('Your Length:', gameState.you.length);
    console.log('Your Position:', gameState.you.head);
    
    // Log all snakes and their lengths
    gameState.board.snakes.forEach(snake => {
      if (snake.id !== gameState.you.id) {
        console.log(`Enemy Snake Length: ${snake.length}, Position: ${JSON.stringify(snake.head)}`);
      }
    });

    const move = moves.getMoveResponse(gameState);
    
    // Simulate next position
    const nextPos = getNextPosition(gameState.you.head, move.move);
    
    // Check if move would result in death
    const wouldDie = checkDeadlyMove(nextPos, gameState);
    if (wouldDie) {
      console.log('\n❌ TEST FAILED - SNAKE DIED!');
      console.log('Cause of Death:', wouldDie);
      console.log('Game Over! 💀');
    } else {
      console.log('\n✅ TEST PASSED - SAFE MOVE!');
      if (wouldEatSmaller(nextPos, gameState)) {
        console.log('Victory! Successfully eliminated smaller snake! 🎯');
      }
    }

    console.log('\nChosen Move:', move.move);
    console.log('Next Position:', JSON.stringify(nextPos));
    
    res.json(move);
  } catch (error) {
    console.error('MOVE ERROR:', error);
    res.json({ move: 'up' }); // Emergency fallback
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

module.exports = {
  handleIndex,
  handleStart,
  handleMove,
  handleEnd
}; 