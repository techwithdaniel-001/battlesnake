const PriorityQueue = require('./PriorityQueue');

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
const HEALTH_CRITICAL = 25;    // Critical health level
const HEALTH_LOW = 50;         // Low health level
const HEALTH_SAFE = 75;        // Safe health level

function calculateMoveScore(spaceEval, pos, gameState) {
    let score = 0;
    
    // CRITICAL: Health Management
    const healthScore = calculateHealthScore(pos, gameState);
    score += healthScore;

    // Existing space evaluation
    score += spaceEval.accessibleSpace * 100;
    score -= spaceEval.deadEnds * 200;
    score += spaceEval.escapeRoutes * 150;
    
    return score;
}

function calculateHealthScore(pos, gameState) {
    const health = gameState.you.health;
    let healthScore = 0;

    // Find nearest food
    const nearestFood = findNearestFood(pos, gameState);
    
    if (health <= HEALTH_CRITICAL) {
        // CRITICAL HEALTH: Make food the absolute priority
        healthScore = nearestFood ? (1000 - (nearestFood.distance * 50)) : -2000;
    } 
    else if (health <= HEALTH_LOW) {
        // LOW HEALTH: Strongly consider food
        healthScore = nearestFood ? (500 - (nearestFood.distance * 30)) : -1000;
    }
    else if (health <= HEALTH_SAFE) {
        // MODERATE HEALTH: Consider food if convenient
        healthScore = nearestFood ? (200 - (nearestFood.distance * 10)) : 0;
    }

    return healthScore;
}

function findNearestFood(pos, gameState) {
    if (!gameState.board.food.length) return null;

    let nearest = null;
    let shortestDistance = Infinity;

    for (const food of gameState.board.food) {
        const distance = Math.abs(food.x - pos.x) + Math.abs(food.y - pos.y);
        
        // Check if path to food is safe
        const pathToFood = findSafePathToFood(pos, food, gameState);
        
        if (pathToFood && distance < shortestDistance) {
            shortestDistance = distance;
            nearest = {
                pos: food,
                distance: distance,
                path: pathToFood
            };
        }
    }

    return nearest;
}

function findSafePathToFood(start, food, gameState) {
    const queue = [{
        pos: start,
        path: [start],
        cost: 0
    }];
    const visited = new Set();

    while (queue.length > 0) {
        const current = queue.shift();
        const key = `${current.pos.x},${current.pos.y}`;

        if (current.pos.x === food.x && current.pos.y === food.y) {
            return current.path;
        }

        if (visited.has(key)) continue;
        visited.add(key);

        // Get valid neighbors
        const neighbors = getValidNeighbors(current.pos, gameState);
        
        for (const next of neighbors) {
            // Calculate risk for this move
            const risk = calculateMoveRisk(next, gameState);
            
            if (risk < 0.8) { // Only consider relatively safe moves
                queue.push({
                    pos: next,
                    path: [...current.path, next],
                    cost: current.cost + 1 + risk
                });
            }
        }
    }

    return null; // No safe path found
}

function calculateMoveRisk(pos, gameState) {
    let risk = 0;

    // Check proximity to enemy snakes
    gameState.board.snakes.forEach(snake => {
        if (snake.id === gameState.you.id) return;
        
        const headDistance = Math.abs(snake.head.x - pos.x) + 
                           Math.abs(snake.head.y - pos.y);
        
        // Higher risk near larger snakes
        if (headDistance < 3) {
            risk += snake.length >= gameState.you.length ? 0.4 : 0.2;
        }
    });

    // Risk increases in confined spaces
    const spaceAvailable = quickSpaceCheck(pos, gameState);
    if (spaceAvailable < 4) risk += 0.3;

    return risk;
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

// Optimized move response
function getMoveResponse(gameState) {
    console.time('moveCalc');  // Performance tracking
    try {
        const head = gameState.you.head;
        const moves = getQuickValidMoves(head, gameState);
        
        // Quick emergency check
        if (moves.length === 0) {
            console.timeEnd('moveCalc');
            return { move: findEmergencyMove(gameState) };
        }

        // Score moves with simplified scoring
        const scoredMoves = moves.map(pos => ({
            move: getDirectionFromPositions(head, pos),
            score: quickScoreMove(pos, gameState)
        }));

        // Sort and pick best move
        scoredMoves.sort((a, b) => b.score - a.score);
        console.timeEnd('moveCalc');
        return { move: scoredMoves[0].move };

    } catch (error) {
        console.error("Error in getMoveResponse:", error);
        console.timeEnd('moveCalc');
        return { move: findEmergencyMove(gameState) };
    }
}

// Quick move scoring
function quickScoreMove(pos, gameState) {
    let score = 100;

    // Health consideration
    if (gameState.you.health < 50) {
        const nearestFood = findNearestFood(pos, gameState);
        if (nearestFood) {
            score += (100 - nearestFood.distance * 10);
        }
    }

    // Space evaluation (simplified)
    const space = quickSpaceCheck(pos, gameState, 10);
    score += space * 50;

    // Enemy distance
    const enemyDistance = getMinEnemyDistance(pos, gameState);
    score += enemyDistance * 20;

    return score;
}

// Quick space check with limit
function quickSpaceCheck(pos, gameState, limit = 10) {
    const visited = new Set();
    const queue = [pos];
    
    while (queue.length > 0 && visited.size < limit) {
        const current = queue.shift();
        const key = `${current.x},${current.y}`;
        
        if (visited.has(key)) continue;
        visited.add(key);
        
        getQuickValidMoves(current, gameState)
            .forEach(next => queue.push(next));
    }
    
    return visited.size;
}

// Add these new flood-fill functions

function evaluateSpaceValue(pos, gameState) {
    const floodFillResult = floodFill(pos, gameState);
    return {
        accessibleSpace: floodFillResult.spaceCount,
        deadEnds: floodFillResult.deadEnds,
        escapeRoutes: floodFillResult.escapeRoutes,
        nearestFood: floodFillResult.nearestFood,
        distanceToWall: floodFillResult.distanceToWall
    };
}

function floodFill(startPos, gameState, maxDepth = 20) {  // Add depth limit
    const visited = new Set();
    const queue = [{pos: startPos, depth: 0}];
    let spaceCount = 0;
    let deadEnds = 0;
    let escapeRoutes = 0;
    
    while (queue.length > 0 && visited.size < 100) {  // Add size limit
        const current = queue.shift();
        const key = `${current.pos.x},${current.pos.y}`;
        
        if (visited.has(key) || current.depth > maxDepth) continue;
        visited.add(key);
        spaceCount++;

        // Get valid neighbors
        const neighbors = getValidNeighbors(current.pos, gameState);
        
        // Check if this is a dead end
        if (neighbors.length === 1 && current.depth > 0) {
            deadEnds++;
        }
        
        // Check for escape routes
        if (neighbors.length > 2) {
            escapeRoutes++;
        }
        
        // Add neighbors to queue with increased depth
        for (const neighbor of neighbors) {
            queue.push({pos: neighbor, depth: current.depth + 1});
        }
    }
    
    return {
        spaceCount,
        deadEnds,
        escapeRoutes
    };
}

function getValidNeighbors(pos, gameState) {
    const neighbors = [];
    const directions = [
        {x: 0, y: 1},  // up
        {x: 0, y: -1}, // down
        {x: -1, y: 0}, // left
        {x: 1, y: 0}   // right
    ];
    
    for (const dir of directions) {
        const neighbor = {
            x: pos.x + dir.x,
            y: pos.y + dir.y
        };
        
        if (isValidPosition(neighbor, gameState)) {
            neighbors.push(neighbor);
        }
    }
    
    return neighbors;
}

function isFood(pos, gameState) {
    return gameState.board.food.some(food => 
        food.x === pos.x && food.y === pos.y
    );
}

function isNearWall(pos, gameState) {
    return pos.x === 0 || 
           pos.x === gameState.board.width - 1 || 
           pos.y === 0 || 
           pos.y === gameState.board.height - 1;
}

// Core Pathfinding Strategy
function findAllSafePaths(startPos, gameState, depth = 4) {
    const paths = [];
    const queue = new PriorityQueue();
    
    queue.enqueue({
        pos: startPos,
        path: [startPos],
        cost: 0,
        turn: 0
    }, 0);

    while (!queue.isEmpty() && paths.length < 10) {
        const current = queue.dequeue();
        
        // NEW: Predict enemy positions for this turn
        const enemyPossiblePositions = predictEnemyPositions(
            gameState, 
            current.turn
        );

        // Check if current position is safe from predicted enemy moves
        if (isPositionSafeFromPredictions(
            current.pos, 
            enemyPossiblePositions,
            gameState
        )) {
            if (current.path.length >= depth) {
                paths.push(current.path);
                continue;
            }

            // Get neighbors and check against predicted enemy positions
            const neighbors = getValidNeighbors(current.pos, gameState)
                .filter(pos => isPositionSafeFromPredictions(
                    pos, 
                    enemyPossiblePositions,
                    gameState
                ));

            for (const neighbor of neighbors) {
                const priority = calculatePathPriority(
                    [...current.path, neighbor], 
                    gameState,
                    enemyPossiblePositions
                );
                
                queue.enqueue({
                    pos: neighbor,
                    path: [...current.path, neighbor],
                    cost: current.cost + 1,
                    turn: current.turn + 1
                }, priority);
            }
        }
    }

    return paths;
}

function predictEnemyPositions(gameState, turnsAhead) {
    const predictions = new Set();
    
    gameState.board.snakes.forEach(snake => {
        if (snake.id === gameState.you.id) return;
        
        // Start with current head position
        let possiblePositions = [snake.head];
        
        // Calculate possible positions for each turn
        for (let turn = 0; turn < turnsAhead; turn++) {
            const newPositions = [];
            
            possiblePositions.forEach(pos => {
                ['up', 'down', 'left', 'right'].forEach(move => {
                    const nextPos = getNextPosition(pos, move);
                    if (isWithinBounds(nextPos, gameState)) {
                        newPositions.push(nextPos);
                        predictions.add(`${nextPos.x},${nextPos.y}`);
                    }
                });
            });
            
            possiblePositions = newPositions;
        }
    });
    
    return predictions;
}

function isPositionSafeFromPredictions(pos, enemyPredictions, gameState) {
    // Check if position could result in head-to-head
    const posKey = `${pos.x},${pos.y}`;
    if (enemyPredictions.has(posKey)) {
        // If enemy could be here, check if it's a head-to-head risk
        return !gameState.board.snakes.some(snake => 
            snake.id !== gameState.you.id && 
            snake.length >= gameState.you.length
        );
    }
    return true;
}

// Path Priority Calculation
function calculatePathPriority(path, gameState, enemyPredictions) {
    let priority = 0;
    const endPos = path[path.length - 1];

    // CRITICAL: Check for potential boxing patterns
    if (detectBoxingPattern(endPos, gameState)) {
        priority -= 3000; // Extremely high penalty for potential boxing
    }

    // Check for space constriction
    const spaceAnalysis = analyzeAvailableSpace(endPos, gameState);
    if (spaceAnalysis.constrainedDirections >= 2) {
        priority -= 2000; // Heavy penalty for moves that limit our movement
    }

    // CRITICAL: Heavily penalize any path that might lead to snake collision
    const futureDangerZones = predictFutureSnakeBodies(gameState, path.length);
    const mightHitSnake = path.some(pos => 
        futureDangerZones.some(zone => 
            zone.x === pos.x && zone.y === pos.y
        )
    );

    if (mightHitSnake) {
        priority -= 2000;  // Make this a very high penalty
    }

    // CRITICAL: Check if this path could lead to being trapped
    const potentialTrappedSpaces = checkForPotentialTrap(path, gameState);
    if (potentialTrappedSpaces < 3) {  // If less than 3 escape squares
        priority -= 1000;  // Heavily penalize paths that could lead to traps
    }

    // NEW: Check if we're moving into a corner or edge
    const isCornerOrEdge = isPositionCornerOrEdge(endPos, gameState);
    if (isCornerOrEdge) {
        priority -= 500;  // Significant penalty for corner/edge positions
    }

    // NEW: Check if enemy snakes could cut off our escape
    const enemyTrapRisk = calculateEnemyTrapRisk(path, gameState);
    priority -= enemyTrapRisk * 300;

    // Existing priorities...
    gameState.board.snakes.forEach(snake => {
        const distanceToHead = Math.abs(endPos.x - snake.head.x) + 
                             Math.abs(endPos.y - snake.head.y);
        priority += Math.min(distanceToHead * 10, 50);
    });

    return -priority;
}

function checkForPotentialTrap(path, gameState) {
    const endPos = path[path.length - 1];
    let availableSpace = 0;
    const visited = new Set();
    const queue = [endPos];

    // Simulate enemy snake possible moves
    const enemyPossibleMoves = predictEnemyMoves(gameState);
    
    while (queue.length > 0) {
        const current = queue.shift();
        const key = `${current.x},${current.y}`;
        
        if (visited.has(key)) continue;
        visited.add(key);
        availableSpace++;

        // Get valid neighbors that aren't potentially blocked by enemies
        const neighbors = getValidNeighbors(current, gameState)
            .filter(pos => !enemyPossibleMoves.some(enemy => 
                enemy.x === pos.x && enemy.y === pos.y
            ));

        queue.push(...neighbors);
    }

    return availableSpace;
}

function predictEnemyMoves(gameState) {
    const enemyMoves = [];
    gameState.board.snakes.forEach(snake => {
        if (snake.id === gameState.you.id) return;
        
        // Predict possible moves for this enemy
        ['up', 'down', 'left', 'right'].forEach(move => {
            const nextPos = getNextPosition(snake.head, move);
            if (isWithinBounds(nextPos, gameState)) {
                enemyMoves.push(nextPos);
            }
        });
    });
    return enemyMoves;
}

function isPositionCornerOrEdge(pos, gameState) {
    const isEdge = pos.x === 0 || pos.x === gameState.board.width - 1 ||
                  pos.y === 0 || pos.y === gameState.board.height - 1;
    const isCorner = (pos.x === 0 || pos.x === gameState.board.width - 1) &&
                    (pos.y === 0 || pos.y === gameState.board.height - 1);
    return isEdge || isCorner;
}

function calculateEnemyTrapRisk(path, gameState) {
    const endPos = path[path.length - 1];
    let risk = 0;

    gameState.board.snakes.forEach(snake => {
        if (snake.id === gameState.you.id) return;
        
        // Calculate how many moves it would take enemy to cut off our path
        const distanceToPath = Math.abs(snake.head.x - endPos.x) + 
                             Math.abs(snake.head.y - endPos.y);
        
        if (distanceToPath <= path.length + 2) {  // If enemy can reach our path
            risk += (path.length + 2 - distanceToPath) / path.length;
        }
    });

    return risk;
}

function predictFutureSnakeBodies(gameState, depth) {
    const dangerZones = new Set();

    gameState.board.snakes.forEach(snake => {
        // Mark ALL current snake body and tail parts as dangerous
        snake.body.forEach(segment => {
            dangerZones.add(`${segment.x},${segment.y}`);
        });

        // Predict where snake bodies and tails could be in future moves
        let possibleHeads = [snake.head];
        for (let i = 0; i < depth; i++) {
            possibleHeads.forEach(head => {
                ['up', 'down', 'left', 'right'].forEach(move => {
                    const nextPos = getNextPosition(head, move);
                    dangerZones.add(`${nextPos.x},${nextPos.y}`);
                });
            });
        }
    });

    return Array.from(dangerZones).map(str => {
        const [x, y] = str.split(',');
        return { x: parseInt(x), y: parseInt(y) };
    });
}

function detectBoxingPattern(pos, gameState) {
    // Check for potential boxing patterns in all directions
    const boxPatterns = [
        // Check L-shaped traps
        [{x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 1}],  // ⌝
        [{x: -1, y: 0}, {x: -1, y: 1}, {x: 0, y: 1}], // ⌜
        [{x: 1, y: 0}, {x: 1, y: -1}, {x: 0, y: -1}], // ⌟
        [{x: -1, y: 0}, {x: -1, y: -1}, {x: 0, y: -1}] // ⌞
    ];

    // Check if any enemy snake could form these patterns
    for (const snake of gameState.board.snakes) {
        if (snake.id === gameState.you.id) continue;

        for (const pattern of boxPatterns) {
            const potentialTrap = pattern.every(offset => {
                const checkPos = {
                    x: pos.x + offset.x,
                    y: pos.y + offset.y
                };
                // Check if enemy snake could reach this position
                return couldSnakeReachPosition(snake, checkPos, gameState);
            });

            if (potentialTrap) {
                return true; // Position could be boxed in
            }
        }
    }
    return false;
}

function couldSnakeReachPosition(snake, pos, gameState, moves = 2) {
    // Check if snake could reach this position within given moves
    const queue = [{pos: snake.head, moves: moves}];
    const visited = new Set();

    while (queue.length > 0) {
        const current = queue.shift();
        const key = `${current.pos.x},${current.pos.y}`;

        if (current.pos.x === pos.x && current.pos.y === pos.y) {
            return true;
        }

        if (current.moves === 0 || visited.has(key)) continue;
        visited.add(key);

        // Check all possible moves
        ['up', 'down', 'left', 'right'].forEach(move => {
            const nextPos = getNextPosition(current.pos, move);
            if (isWithinBounds(nextPos, gameState)) {
                queue.push({
                    pos: nextPos,
                    moves: current.moves - 1
                });
            }
        });
    }
    return false;
}

function analyzeAvailableSpace(pos, gameState) {
    const directions = ['up', 'down', 'left', 'right'];
    let constrainedDirections = 0;
    let openDirections = [];

    directions.forEach(dir => {
        const nextPos = getNextPosition(pos, dir);
        if (!isValidPosition(nextPos, gameState)) {
            constrainedDirections++;
        } else {
            openDirections.push(dir);
        }
    });

    return {
        constrainedDirections,
        openDirections,
        isSafe: constrainedDirections < 2
    };
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

// Export after all functions are defined
module.exports = {
    getMoveResponse
};