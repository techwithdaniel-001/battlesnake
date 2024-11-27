const { getMoveResponse, getNextPosition, STRATEGIES, MOVES } = require('../logic/moves');

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
        console.log("Current position:", gameState.you.head);
        console.log("Board size:", `${gameState.board.width}x${gameState.board.height}`);

        const moveResponse = getMoveResponse(gameState);
        
        // Validate the chosen move
        const isValid = validateMove(moveResponse.move, gameState);
        
        if (!isValid) {
            console.log("⚠️ Chosen move failed validation, using emergency move");
            return res.json({ 
                move: findEmergencyMove(gameState) 
            });
        }

        return res.json(moveResponse);

    } catch (error) {
        console.error("🚨 ERROR in move handler:", error);
        return res.json({ 
            move: findEmergencyMove(gameState) 
        });
    }
}

function handleEnd(req, res) {
    res.json({});
}

function validateMove(move, gameState) {
    const head = gameState.you.head;
    const nextPos = getNextPosition(head, move);
    
    console.log("\n=== MOVE VALIDATION ===");
    console.log("Current head:", head);
    console.log("Next position:", nextPos);
    
    const check = STRATEGIES.COLLISION.checkAll(nextPos, gameState);
    
    if (check.safe) {
        console.log("✅ TEST PASSED - SAFE MOVE!");
    } else {
        console.log("❌ TEST FAILED - DANGEROUS MOVE!");
        console.log("Death scenarios:", {
            wall: !STRATEGIES.COLLISION.isValidPosition(nextPos, gameState),
            body: STRATEGIES.COLLISION.checkSnakeCollision(nextPos, gameState).willCollide,
            head: STRATEGIES.COLLISION.checkHeadCollision(nextPos, gameState).dangerous
        });
    }

    return check.safe;
}

function findEmergencyMove(gameState) {
    const possibleMoves = Object.values(MOVES);
    const head = gameState.you.head;
    
    // Try each move in order
    for (const move of possibleMoves) {
        const nextPos = getNextPosition(head, move);
        if (STRATEGIES.COLLISION.checkAll(nextPos, gameState).safe) {
            console.log(`🆘 Found safe emergency move: ${move}`);
            return move;
        }
    }
    
    console.log("⚠️ No safe moves found, using UP as last resort");
    return MOVES.UP;
}

module.exports = {
    handleIndex,
    handleStart,
    handleMove,
    handleEnd
}; 