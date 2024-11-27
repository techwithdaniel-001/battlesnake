const PriorityQueue = require('./PriorityQueue');

// Add these helper functions at the top of the file
function willHitSnake(pos, gameState) {
    return gameState.board.snakes.some(snake => 
        snake.body.some(segment => 
            segment.x === pos.x && segment.y === pos.y
        )
    );
}

function getValidNeighbors(pos, gameState) {
    const neighbors = [
        {x: pos.x, y: pos.y + 1}, // up
        {x: pos.x, y: pos.y - 1}, // down
        {x: pos.x - 1, y: pos.y}, // left
        {x: pos.x + 1, y: pos.y}  // right
    ];

    return neighbors.filter(pos => 
        isValidPosition(pos, gameState) && 
        !willHitSnake(pos, gameState)
    );
}

function isValidPosition(pos, gameState) {
    // Wall collision check
    const isWallCollision = pos.x < 0 || 
                           pos.x >= gameState.board.width || 
                           pos.y < 0 || 
                           pos.y >= gameState.board.height;
    
    if (isWallCollision) {
        console.log(`🧱 Wall collision detected at ${JSON.stringify(pos)}`);
        return false;
    }
    return true;
}

function getQuickValidMoves(pos, gameState) {
    return ['up', 'down', 'left', 'right']
        .map(move => getNextPosition(pos, move))
        .filter(pos => 
            isValidPosition(pos, gameState) && 
            !willHitSnake(pos, gameState)
        );
}

function getNextPosition(pos, move) {
    switch(move) {
        case 'up': return {x: pos.x, y: pos.y + 1};
        case 'down': return {x: pos.x, y: pos.y - 1};
        case 'left': return {x: pos.x - 1, y: pos.y};
        case 'right': return {x: pos.x + 1, y: pos.y};
        default: return pos;
    }
}

function getDirectionFromPositions(from, to) {
    if (to.x > from.x) return 'right';
    if (to.x < from.x) return 'left';
    if (to.y > from.y) return 'up';
    if (to.y < from.y) return 'down';
    return 'up'; // default
}

// Utility functions
function getNextPosition(currentPos, move) {
    switch(move.toLowerCase()) {
        case 'up': return { x: currentPos.x, y: currentPos.y + 1 };
        case 'down': return { x: currentPos.x, y: currentPos.y - 1 };
        case 'left': return { x: currentPos.x - 1, y: currentPos.y };
        case 'right': return { x: currentPos.x + 1, y: currentPos.y };
        default: return null;
    }
}

function isWithinBounds(pos, gameState) {
    return pos.x >= 0 && pos.x < gameState.board.width &&
           pos.y >= 0 && pos.y < gameState.board.height;
}

function isSelfCollision(pos, gameState) {
    return gameState.you.body.some(segment => 
        segment.x === pos.x && segment.y === pos.y
    );
}

function isValidPosition(pos, gameState) {
    // Check for any snake body or tail collision
    const hasAnySnakeCollision = gameState.board.snakes.some(snake => 
        snake.body.some(segment => 
            segment.x === pos.x && segment.y === pos.y
        )
    );
    
    if (hasAnySnakeCollision) return false;  // Avoid all body and tail collisions

    // Other checks...
    return true;
}

function countAvailableSpace(pos, gameState) {
    if (!pos) return 0;
    const visited = new Set();
    const queue = [pos];
    let space = 0;
    
    while (queue.length > 0) {
        const current = queue.shift();
        const key = `${current.x},${current.y}`;
        
        if (visited.has(key)) continue;
        visited.add(key);
        space++;
        
        ['up', 'down', 'left', 'right'].forEach(move => {
            const next = getNextPosition(current, move);
            if (next && isValidPosition(next, gameState) && 
                !visited.has(`${next.x},${next.y}`)) {
                queue.push(next);
            }
        });
    }
    
    return space;
}

function findEscapeRoutes(gameState) {
    const moves = ['up', 'down', 'left', 'right'];
    return moves.map(move => {
        const nextPos = getNextPosition(gameState.you.head, move);
        if (!isValidPosition(nextPos, gameState)) {
            return { move, score: -Infinity, paths: [] };
        }

        const spaceEval = evaluateSpaceValue(nextPos, gameState);
        const score = calculateMoveScore(spaceEval, nextPos, gameState);
        
        return {
            move,
            score,
            spaceEval,
            paths: [[nextPos]]
        };
    });
}

function calculateSnakeProximity(pos, gameState) {
    let proximity = 0;
    gameState.board.snakes.forEach(snake => {
        if (snake.id === gameState.you.id) return;
        
        const distanceToHead = Math.abs(pos.x - snake.head.x) + 
                             Math.abs(pos.y - snake.head.y);
        if (distanceToHead <= 2) {
            proximity += (3 - distanceToHead) * 50;
        }
    });
    return proximity;
}

function findEmergencyMove(gameState) {
    const head = gameState.you.head;
    const moves = ['up', 'down', 'left', 'right'];
    
    const analysis = moves.map(move => {
        const nextPos = getNextPosition(head, move);
        const deathType = getDeathType(nextPos, gameState);
        
        // Check for immediate death scenarios
        const certainDeath = deathType !== 'none' || 
                           willCollideWithLargerSnake(nextPos, gameState);
        
        return { move, deathType, certainDeath };
    });

    console.log("🆘 Emergency analysis:", analysis);

    // First, try to find moves that don't result in certain death
    const safeMoves = analysis.filter(m => !m.certainDeath);
    if (safeMoves.length > 0) {
        // Choose the safest move based on space and head-to-head potential
        const bestMove = safeMoves.reduce((best, current) => {
            const nextPos = getNextPosition(head, current.move);
            const space = quickSpaceCheck(nextPos, gameState);
            const headToHeadRisk = checkHeadToHeadRisk(nextPos, gameState);
            
            current.score = space - (headToHeadRisk * 2);
            return (!best || current.score > best.score) ? current : best;
        }, null);

        console.log("Found safer emergency move:", bestMove.move);
        return bestMove.move;
    }

    // If all moves look deadly, try to find the least bad option
    const leastBadMove = analysis.reduce((best, current) => {
        const nextPos = getNextPosition(head, current.move);
        const space = quickSpaceCheck(nextPos, gameState);
        return (!best || space > best.space) ? 
            {move: current.move, space} : best;
    }, {move: 'up', space: -1});

    return leastBadMove.move;
}

function getDeathType(pos, gameState) {
    if (!isWithinBounds(pos, gameState)) return 'wall';
    if (isSelfCollision(pos, gameState)) return 'self';
    if (isSnakeCollision(pos, gameState)) return 'snake';
    return 'none';
}

function isSnakeCollision(pos, gameState) {
    return gameState.board.snakes.some(snake => 
        snake.body.some(segment => 
            segment.x === pos.x && segment.y === pos.y
        )
    );
}

// Health management constants
const HEALTH_THRESHOLDS = {
    CRITICAL: 25,
    LOW: 50,
    SAFE: 75
};

function calculateHealthScore(pos, gameState) {
    const health = gameState.you.health;
    let score = 0;

    // Find nearest food
    const nearestFood = findNearestFood(pos, gameState);
    
    if (health <= HEALTH_THRESHOLDS.CRITICAL) {
        // CRITICAL: Make food the highest priority
        score += nearestFood ? (1000 - (nearestFood.distance * 50)) : -2000;
    } 
    else if (health <= HEALTH_THRESHOLDS.LOW) {
        // LOW: Strongly consider food
        score += nearestFood ? (500 - (nearestFood.distance * 30)) : -1000;
    }
    else if (health <= HEALTH_THRESHOLDS.SAFE) {
        // MODERATE: Consider food if convenient
        score += nearestFood ? (200 - (nearestFood.distance * 10)) : 0;
    }

    return score;
}

function findNearestFood(pos, gameState) {
    if (!gameState.board.food.length) return null;

    let nearest = null;
    let shortestDistance = Infinity;

    gameState.board.food.forEach(food => {
        const distance = Math.abs(food.x - pos.x) + Math.abs(food.y - pos.y);
        
        // Check if this food is in a trap
        const isTrap = isFoodTrap(food, gameState);
        
        if (distance < shortestDistance && !isTrap) {
            shortestDistance = distance;
            nearest = {
                pos: food,
                distance: distance,
                path: findPathToFood(pos, food, gameState)
            };
        }
    });

    return nearest;
}

function findPathToFood(start, food, gameState) {
    const queue = [{pos: start, path: [start]}];
    const visited = new Set();
    
    while (queue.length > 0) {
        const current = queue.shift();
        const key = `${current.pos.x},${current.pos.y}`;
        
        if (visited.has(key)) continue;
        visited.add(key);
        
        if (current.pos.x === food.x && current.pos.y === food.y) {
            return current.path;
        }
        
        getValidNeighbors(current.pos, gameState).forEach(next => {
            if (!visited.has(`${next.x},${next.y}`)) {
                queue.push({
                    pos: next,
                    path: [...current.path, next]
                });
            }
        });
    }
    
    return null;
}

function calculateMoveScore(pos, gameState) {
    let score = 0;

    // Get future predictions
    const predictions = predictFutureMoves(gameState);
    
    // Check if move leads to predicted danger zone
    const posKey = `${pos.x},${pos.y}`;
    if (predictions.dangerZones.has(posKey)) {
        score -= 500; // Heavy penalty for moving into predicted danger
        console.log(`⚠️ Position ${posKey} is in predicted danger zone`);
    }

    // Add other scoring components
    const spaceScore = calculateSpaceScore(pos, gameState);
    const bodyHuggingScore = calculateBodyHuggingScore(pos, gameState);
    const healthScore = calculateHealthScore(pos, gameState);
    
    score += spaceScore.score;
    score += bodyHuggingScore;
    score += healthScore;

    // Log comprehensive scoring
    console.log(` Move to ${posKey} scoring breakdown:
        - Prediction Impact: ${predictions.dangerZones.has(posKey) ? -500 : 0}
        - Space Score: ${spaceScore.score}
        - Body Hugging: ${bodyHuggingScore}
        - Health Factor: ${healthScore}
        = Total: ${score}
    `);

    return score;
}

function calculateBodyHuggingScore(pos, gameState) {
    let score = 0;
    const SAFE_DISTANCE = 1; // One square away from snake bodies

    gameState.board.snakes.forEach(snake => {
        if (snake.id === gameState.you.id) return;

        // Check distance to snake's body (not head)
        snake.body.slice(1).forEach(segment => {
            const distance = Math.abs(segment.x - pos.x) + 
                           Math.abs(segment.y - pos.y);
            
            // Reward being EXACTLY one square away from enemy body
            if (distance === SAFE_DISTANCE) {
                score += 200;  // High reward for perfect body hugging
            } else if (distance === 0) {
                score -= 1000; // Heavy penalty for collision
            }
        });

        // But stay away from enemy heads!
        const headDistance = Math.abs(snake.head.x - pos.x) + 
                           Math.abs(snake.head.y - pos.y);
        if (headDistance <= 1 && snake.length >= gameState.you.length) {
            score -= 2000; // Very heavy penalty for potential head collision
        }
    });

    return score;
}

function isFoodTrap(food, gameState) {
    const dangerRadius = 2;
    const nearbyEnemies = gameState.board.snakes.filter(snake => 
        snake.id !== gameState.you.id &&
        Math.abs(snake.head.x - food.x) + Math.abs(snake.head.y - food.y) <= dangerRadius
    );

    if (nearbyEnemies.length === 0) return false;

    // Check if enemies are closer to food
    const ourDistance = Math.abs(gameState.you.head.x - food.x) + 
                       Math.abs(gameState.you.head.y - food.y);
    
    return nearbyEnemies.some(enemy => 
        Math.abs(enemy.head.x - food.x) + Math.abs(enemy.head.y - food.y) <= ourDistance
    );
}

// Cache for path calculations to improve speed
const pathCache = new Map();
const CACHE_TTL = 5; // Cache valid for 5 turns

// Optimized A* with caching and early exit
function findAllSafePaths(startPos, gameState, depth = 4) {
    const cacheKey = `${startPos.x},${startPos.y}-${gameState.turn}`;
    if (pathCache.has(cacheKey)) {
        return pathCache.get(cacheKey);
    }

    const paths = [];
    const queue = new PriorityQueue();
    const visited = new Set();
    
    queue.enqueue({
        pos: startPos,
        path: [startPos],
        cost: 0,
        turn: 0
    }, 0);

    // Early exit conditions
    while (!queue.isEmpty() && paths.length < 5 && visited.size < 50) {
        const current = queue.dequeue();
        const posKey = `${current.pos.x},${current.pos.y}`;
        
        if (visited.has(posKey)) continue;
        visited.add(posKey);

        // Quick enemy collision check (faster than full prediction)
        const quickSafetyCheck = isQuickSafe(current.pos, gameState);
        if (!quickSafetyCheck) continue;

        if (current.path.length >= depth) {
            paths.push(current.path);
            continue;
        }

        // Get valid moves with optimized checks
        getQuickValidMoves(current.pos, gameState)
            .forEach(nextPos => {
                const newCost = current.cost + 1;
                queue.enqueue({
                    pos: nextPos,
                    path: [...current.path, nextPos],
                    cost: newCost,
                    turn: current.turn + 1
                }, newCost + manhattanDistance(nextPos, startPos));
            });
    }

    // Cache the result
    pathCache.set(cacheKey, paths);
    setTimeout(() => pathCache.delete(cacheKey), CACHE_TTL * 1000);

    return paths;
}

// Quick safety check without full prediction
function isQuickSafe(pos, gameState) {
    const dangerZones = new Set();
    
    // Add immediate danger zones
    gameState.board.snakes.forEach(snake => {
        if (snake.id === gameState.you.id) return;
        
        // Add head attack zones for larger/equal snakes
        if (snake.length >= gameState.you.length) {
            ['up', 'down', 'left', 'right'].forEach(move => {
                const nextPos = getNextPosition(snake.head, move);
                dangerZones.add(`${nextPos.x},${nextPos.y}`);
            });
        }
    });

    return !dangerZones.has(`${pos.x},${pos.y}`);
}

// Optimized valid move checker
function getQuickValidMoves(pos, gameState) {
    return ['up', 'down', 'left', 'right']
        .map(move => getNextPosition(pos, move))
        .filter(nextPos => 
            isWithinBounds(nextPos, gameState) &&
            !willHitSnake(nextPos, gameState) &&
            isQuickSafe(nextPos, gameState)
        );
}

// Fast distance calculation
function manhattanDistance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// Constants for different scenarios
const SCENARIOS = {
    CORNER_WEIGHT: -500,
    COIL_WEIGHT: -750,
    FOOD_TRAP_WEIGHT: -600,
    SANDWICH_WEIGHT: -800,
    TERRITORY_WEIGHT: 400,
    DEAD_END_WEIGHT: -900,
    ENDGAME_BONUS: 300
};

// Create a unique timer for each move
let moveCounter = 0;

function getValidMoves(pos, gameState) {
    console.log("\n=== CHECKING MOVES ===");
    
    const moves = [
        {x: pos.x, y: pos.y + 1},  // up
        {x: pos.x, y: pos.y - 1},  // down
        {x: pos.x - 1, y: pos.y},  // left
        {x: pos.x + 1, y: pos.y}   // right
    ];

    // Enhanced move validation with detailed logging
    return moves.filter(move => {
        console.log(`\nChecking move to ${JSON.stringify(move)}:`);

        // 1. Wall collision check
        if (!isValidPosition(move, gameState)) {
            console.log(`🧱 INVALID: Would hit wall`);
            return false;
        }

        // 2. Near wall check (optional warning)
        if (isNearWall(move, gameState)) {
            console.log(`⚠️ WARNING: Near wall at ${JSON.stringify(move)}`);
            // Don't reject the move, but it will affect scoring
        }

        // Rest of collision checks...
        return true;
    });
}

// New function to detect if we're getting too close to walls
function isNearWall(pos, gameState) {
    const WALL_DANGER = 1; // How close to wall is considered "near"
    
    return pos.x <= WALL_DANGER || 
           pos.x >= gameState.board.width - WALL_DANGER - 1 || 
           pos.y <= WALL_DANGER || 
           pos.y >= gameState.board.height - WALL_DANGER - 1;
}

// Add wall awareness to move scoring
function calculateSpaceScore(pos, gameState) {
    let score = 0;
    
    // Heavy penalty for being near walls
    if (isNearWall(pos, gameState)) {
        score -= 200;
        console.log(`⚠️ Wall proximity penalty: -200`);
    }

    // Space analysis
    const spaceAnalysis = analyzeAvailableSpace(pos, gameState);
    score += spaceAnalysis.accessibleSpace * 50;
    
    return {
        score,
        analysis: spaceAnalysis
    };
}

// Update getMoveResponse to show wall awareness
function getMoveResponse(gameState) {
    const moveId = moveCounter++;
    console.time(`moveCalc_${moveId}`);
    
    try {
        const head = gameState.you.head;
        console.log("\n=== MOVE ANALYSIS ===");
        console.log(`Current position: ${JSON.stringify(head)}`);
        console.log(`Board size: ${gameState.board.width}x${gameState.board.height}`);
        
        // Check if we're near any walls
        if (isNearWall(head, gameState)) {
            console.log(`⚠️ Currently near wall, seeking open space`);
        }

        // Rest of the move logic...
        
    } catch (error) {
        console.error("Error in move calculation:", error);
        return { move: findEmergencyMove(gameState) };
    }
}

function calculatePathScore(pos, safePaths) {
    // Give bonus for positions that appear in safe paths
    return safePaths.filter(path => 
        path.some(p => p.x === pos.x && p.y === pos.y)
    ).length * 100;
}

function calculateScenarioScore(pos, gameState) {
    let score = 0;
    
    // Check all scenarios
    if (detectCornerTrap(pos, gameState)) score += SCENARIOS.CORNER_WEIGHT;
    if (detectCoilTrap(pos, gameState)) score += SCENARIOS.COIL_WEIGHT;
    if (detectSandwichTrap(pos, gameState)) score += SCENARIOS.SANDWICH_WEIGHT;
    
    // Territory control
    const territory = calculateTerritoryControl(pos, gameState);
    if (territory.controlled) score += SCENARIOS.TERRITORY_WEIGHT;
    
    // Dead end detection
    if (isDeadEnd(pos, [pos], gameState)) score += SCENARIOS.DEAD_END_WEIGHT;
    
    return score;
}

function detectCornerTrap(pos, gameState) {
    const isNearWall = pos.x <= 1 || pos.x >= gameState.board.width - 2 ||
                       pos.y <= 1 || pos.y >= gameState.board.height - 2;
    
    if (isNearWall) {
        const exits = getQuickValidMoves(pos, gameState);
        const futureExits = exits.map(exit => 
            getQuickValidMoves(exit, gameState).length
        );
        return Math.max(...futureExits, 0) <= 2;
    }
    return false;
}

function detectCoilTrap(pos, gameState) {
    const directions = [[-1,0], [1,0], [0,-1], [0,1], [-1,-1], [-1,1], [1,-1], [1,1]];
    let enemyBodyCount = 0;

    directions.forEach(([dx, dy]) => {
        const checkPos = {x: pos.x + dx, y: pos.y + dy};
        if (isEnemySnakeBody(checkPos, gameState)) {
            enemyBodyCount++;
        }
    });

    return enemyBodyCount >= 5;
}

function isFoodTrap(food, gameState) {
    const dangerRadius = 2;
    const nearbyEnemies = gameState.board.snakes.filter(snake => 
        snake.id !== gameState.you.id &&
        Math.abs(snake.head.x - food.x) + Math.abs(snake.head.y - food.y) <= dangerRadius
    );

    if (nearbyEnemies.length === 0) return false;

    // Check if enemies are closer to food
    const ourDistance = Math.abs(gameState.you.head.x - food.x) + 
                       Math.abs(gameState.you.head.y - food.y);
    
    return nearbyEnemies.some(enemy => 
        Math.abs(enemy.head.x - food.x) + Math.abs(enemy.head.y - food.y) <= ourDistance
    );
}

function calculateTerritoryControl(pos, gameState) {
    const ourTerritory = floodFillTerritory(pos, gameState, 10);
    const enemyTerritories = gameState.board.snakes
        .filter(s => s.id !== gameState.you.id)
        .map(s => floodFillTerritory(s.head, gameState, 10));

    return {
        controlled: ourTerritory > Math.max(...enemyTerritories, 0),
        size: ourTerritory
    };
}

function detectSandwichTrap(pos, gameState) {
    const vertical = [-1, 1].every(dy => {
        const checkPos = {x: pos.x, y: pos.y + dy};
        return !isValidPosition(checkPos, gameState) || 
               isEnemySnakeBody(checkPos, gameState);
    });

    const horizontal = [-1, 1].every(dx => {
        const checkPos = {x: pos.x + dx, y: pos.y};
        return !isValidPosition(checkPos, gameState) || 
               isEnemySnakeBody(checkPos, gameState);
    });

    return vertical || horizontal;
}

function isDeadEnd(pos, path, gameState, depth = 3) {
    if (depth === 0) return false;

    const moves = getQuickValidMoves(pos, gameState)
        .filter(move => !path.some(p => p.x === move.x && p.y === move.y));

    if (moves.length === 0) return true;
    if (moves.length > 1) return false;

    return isDeadEnd(moves[0], [...path, moves[0]], gameState, depth - 1);
}

function handleEndgame(gameState) {
    const head = gameState.you.head;
    const enemy = gameState.board.snakes.find(s => s.id !== gameState.you.id);

    if (!enemy) {
        // We're the only snake left
        return findSafestMove(gameState);
    }

    // In 1v1, try to cut off the enemy
    const moves = getValidMoves(head, gameState);
    const scoredMoves = moves.map(pos => ({
        move: getDirectionFromPositions(head, pos),
        score: calculateEndgameScore(pos, enemy, gameState)
    }));

    scoredMoves.sort((a, b) => b.score - a.score);
    return { move: scoredMoves[0].move };
}

// New helper functions
function quickSpaceCheck(pos, gameState, maxChecks = 20) {
    if (!isValidPosition(pos, gameState)) return 0;
    
    const visited = new Set();
    const queue = [pos];
    let space = 0;
    
    while (queue.length > 0 && visited.size < maxChecks) {
        const current = queue.shift();
        const key = `${current.x},${current.y}`;
        
        if (visited.has(key)) continue;
        visited.add(key);
        space++;
        
        getValidNeighbors(current, gameState)
            .forEach(neighbor => queue.push(neighbor));
    }
    
    return space;
}

function willCollideWithLargerSnake(pos, gameState) {
    return gameState.board.snakes.some(snake => {
        if (snake.id === gameState.you.id) return false;
        
        const headDistance = Math.abs(snake.head.x - pos.x) + 
                           Math.abs(snake.head.y - pos.y);
                           
        return headDistance === 1 && snake.length >= gameState.you.length;
    });
}

function checkHeadToHeadRisk(pos, gameState) {
    let risk = 0;
    gameState.board.snakes.forEach(snake => {
        if (snake.id === gameState.you.id) return;
        
        const headDistance = Math.abs(snake.head.x - pos.x) + 
                           Math.abs(snake.head.y - pos.y);
                           
        if (headDistance === 1) {
            risk += snake.length >= gameState.you.length ? 2 : 1;
        }
    });
    return risk;
}

function detectCornerTrap(pos, gameState) {
    // Check if we're being forced into a corner
    const isNearWall = pos.x <= 1 || pos.x >= gameState.board.width - 2 ||
                       pos.y <= 1 || pos.y >= gameState.board.height - 2;
    
    if (isNearWall) {
        const availableExits = getQuickValidMoves(pos, gameState).length;
        if (availableExits <= 2) {
            return true; // Potential corner trap
        }
    }
    return false;
}

function analyzeAvailableSpace(pos, gameState, maxDepth = 10) {
    const visited = new Set();
    const queue = [{pos: pos, depth: 0}];
    let accessibleSpace = 0;
    let deadEnds = 0;
    let escapeRoutes = 0;

    while (queue.length > 0 && visited.size < maxDepth) {
        const current = queue.shift();
        const key = `${current.pos.x},${current.pos.y}`;

        if (visited.has(key) || current.depth >= maxDepth) continue;
        visited.add(key);
        accessibleSpace++;

        // Get valid neighbors
        const neighbors = getValidNeighbors(current.pos, gameState);

        // Check for dead ends
        if (neighbors.length === 1 && current.depth > 0) {
            deadEnds++;
        }

        // Check for escape routes
        if (neighbors.length > 2) {
            escapeRoutes++;
        }

        // Add neighbors to queue
        neighbors.forEach(neighbor => {
            if (!visited.has(`${neighbor.x},${neighbor.y}`)) {
                queue.push({
                    pos: neighbor,
                    depth: current.depth + 1
                });
            }
        });
    }

    return {
        accessibleSpace,
        deadEnds,
        escapeRoutes,
        floodFillSize: visited.size
    };
}

function predictFutureMoves(gameState, depth = 3) {
    console.log("🔮 Starting future prediction...");
    
    const predictions = {
        snakes: new Map(),
        dangerZones: new Set(),
        safeMoves: []
    };

    // Predict each snake's possible moves
    gameState.board.snakes.forEach(snake => {
        if (snake.id === gameState.you.id) return;
        
        let possiblePositions = [snake.head];
        for (let turn = 0; turn < depth; turn++) {
            const newPositions = [];
            possiblePositions.forEach(pos => {
                getValidNeighbors(pos, gameState).forEach(newPos => {
                    newPositions.push(newPos);
                    predictions.dangerZones.add(`${newPos.x},${newPos.y}`);
                });
            });
            possiblePositions = newPositions;
        }
        predictions.snakes.set(snake.id, possiblePositions);
    });

    // Log prediction results
    console.log(`🔍 Predicted ${predictions.dangerZones.size} danger zones`);
    return predictions;
}

// Export after all functions are defined
module.exports = {
    getMoveResponse
};