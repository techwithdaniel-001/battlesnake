const { getMoveResponse } = require('../logic/moves')
const board = require('../utils/board')

// Add at the top with other constants
const HEALTH_THRESHOLD = 50

// Index handler
function handleIndex(req, res) {
  const battlesnakeInfo = {
    apiversion: "1",
    author: "ebube12345",
    color: "#FF0000",
    head: "silly",
    tail: "bolt",
    version: "v2.1 - Trapping Update"
  }
  
  console.log('Battlesnake Info:', battlesnakeInfo);
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
    const gameState = req.body;
    
    // Validate game state
    if (!gameState || !gameState.you || !gameState.board) {
      throw new Error('Invalid game state received');
    }

    const move = getMoveResponse(gameState);
    
    // Validate move before sending
    if (!move || !move.move) {
      throw new Error('Invalid move generated');
    }

    console.log(`Turn ${gameState.turn}: Chose move ${move.move}`);
    res.json(move);
  } catch (error) {
    console.error('Move error:', error);
    // Send a safe fallback move
    res.json({ move: 'up' });
  }
}

// End handler
function handleEnd(req, res) {
  try {
    const gameState = req.body;
    console.log('\n=== GAME OVER ===');
    console.log('Game ID:', gameState.game.id);
    console.log('Final Turn:', gameState.turn);
    console.log('Final Length:', gameState.you.length);
    res.json({});
  } catch (error) {
    console.error('End game error:', error);
    res.json({});
  }
}

module.exports = {
  handleIndex,
  handleStart,
  handleMove,
  handleEnd
} 