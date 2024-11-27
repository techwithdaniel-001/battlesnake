const STRATEGIES = require('./strategies');

// Constants
const MOVES = {
    UP: 'up',
    DOWN: 'down',
    LEFT: 'left',
    RIGHT: 'right'
};

// Add moveCounter to this file
let moveCounter = 0;

function getMoveResponse(gameState) {
    try {
        moveCounter++; // Increment counter
        const head = gameState.you.head;
        
        console.log("\n=== DETAILED MOVE ANALYSIS ===");
        console.log(`Move #${moveCounter}`);
        console.log("Current position:", head);
        console.log("Board size:", `${gameState.board.width}x${gameState.board.height}`);

        // Get valid moves using our strategies
        console.log("\n1️⃣ Checking Valid Moves...");
        const validMoves = STRATEGIES.ORIGINAL.getValidMoves(head, gameState);
        console.log(`🎯 Valid moves:`, validMoves);

        if (validMoves.length === 0) {
            console.log("⚠️ No valid moves found");
            return { move: findEmergencyMove(gameState) };
        }

        // Score moves using all our strategies
        console.log("\n2️⃣ Scoring Each Move...");
        const scoredMoves = validMoves.map(pos => {
            console.log(`\nAnalyzing move to position:`, pos);
            
            try {
                // Log each strategy's contribution
                const scores = {
                    survival: STRATEGIES.ORIGINAL.willHitSnake(pos, gameState) ? 0 : 100,
                    bodyHugging: STRATEGIES.BODY_HUGGING.calculateScore(pos, gameState),
                    health: STRATEGIES.HEALTH.calculateScore(pos, gameState),
                    space: STRATEGIES.SPACE.calculateScore(pos, gameState)
                };

                console.log("Individual scores:", scores);
                
                const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
                console.log(`Total score for move: ${totalScore}`);

                return {
                    move: getDirectionFromPositions(head, pos),
                    scores: scores,
                    totalScore: totalScore
                };
            } catch (error) {
                console.error(`Error scoring move to ${JSON.stringify(pos)}:`, error);
                return {
                    move: getDirectionFromPositions(head, pos),
                    scores: {},
                    totalScore: -1000
                };
            }
        });

        console.log("\n3️⃣ Final Move Scores:");
        scoredMoves.forEach(move => {
            console.log(`${move.move}: ${move.totalScore} (${JSON.stringify(move.scores)})`);
        });
        
        // Sort and choose best move
        scoredMoves.sort((a, b) => b.totalScore - a.totalScore);
        const bestMove = scoredMoves[0];
        
        console.log(`\n✅ Choosing: ${bestMove.move} (score: ${bestMove.totalScore})`);
        return { move: bestMove.move };

    } catch (error) {
        console.error("\n🚨 Error in move calculation:", error);
        return { move: findEmergencyMove(gameState) };
    }
}

function getDirectionFromPositions(from, to) {
    if (to.x > from.x) return MOVES.RIGHT;
    if (to.x < from.x) return MOVES.LEFT;
    if (to.y > from.y) return MOVES.UP;
    if (to.y < from.y) return MOVES.DOWN;
    return MOVES.UP;
}

function findEmergencyMove(gameState) {
    const head = gameState.you.head;
    const possibleMoves = [MOVES.UP, MOVES.DOWN, MOVES.LEFT, MOVES.RIGHT];
    
    // Try to find any safe move
    for (const move of possibleMoves) {
        const nextPos = getNextPosition(head, move);
        if (STRATEGIES.COLLISION.checkAll(nextPos, gameState).safe) {
            return move;
        }
    }
    
    return MOVES.UP; // Last resort
}

function getNextPosition(pos, move) {
    switch(move) {
        case MOVES.UP: return {x: pos.x, y: pos.y + 1};
        case MOVES.DOWN: return {x: pos.x, y: pos.y - 1};
        case MOVES.LEFT: return {x: pos.x - 1, y: pos.y};
        case MOVES.RIGHT: return {x: pos.x + 1, y: pos.y};
        default: return pos;
    }
}

module.exports = {
    getMoveResponse,
    getNextPosition,
    STRATEGIES,
    MOVES,
    moveCounter  // Export moveCounter if needed elsewhere
};