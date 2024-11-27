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
    // CRITICAL: Never allow ANY snake body collision
    const hasAnySnakeCollision = gameState.board.snakes.some(snake => 
        snake.body.some(segment => 
            segment.x === pos.x && segment.y === pos.y
        )
    );
    
    // Immediate death conditions
    if (!isWithinBounds(pos, gameState)) return false;
    if (hasAnySnakeCollision) return false;  // STRICT: No body collisions ever

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
    console.log("🆘 Emergency move needed!");
    const moves = ['up', 'down', 'left', 'right'];
    
    const analysis = moves.map(move => {
        const nextPos = getNextPosition(gameState.you.head, move);
        const deathType = getDeathType(nextPos, gameState);
        return {
            move,
            deathType,
            certainDeath: deathType !== 'none'
        };
    });
    
    console.log("Emergency analysis:", analysis);
    
    // Find any non-deadly moves
    const safeMoves = analysis.filter(m => !m.certainDeath);
    if (safeMoves.length > 0) {
        console.log("Found non-certain death move:", safeMoves[0].move);
        return safeMoves[0].move;
    }
    
    console.log("⚠️ All moves seem deadly! Defaulting to down");
    return 'down';
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

function getMoveResponse(gameState) {
    try {
        const head = gameState.you.head;
        console.log("\n🔍 Current position:", head);

        const pathAnalysis = findEscapeRoutes(gameState);
        console.log("🛣️ Snake collision analysis:");
        pathAnalysis.forEach(p => {
            console.log(`${p.move.toUpperCase()}:
                Score: ${p.score}
                Body Collisions: ${p.bodyCollisionRisk || 'None'}
                Future Collision Risk: ${p.futureCollisionRisk || 'Low'}
                Safe Distance: ${p.distanceToNearestSnake || 'N/A'}
            `);
        });

        // Filter out ANY moves that risk snake collision
        const safeMoves = pathAnalysis.filter(p => 
            p.score > -Infinity && !p.bodyCollisionRisk
        );
        
        if (safeMoves.length > 0) {
            safeMoves.sort((a, b) => b.score - a.score);
            const bestMove = safeMoves[0].move;
            console.log(`✅ Choosing safest move: ${bestMove} (score: ${safeMoves[0].score})`);
            return { move: bestMove };
        }

        console.log("⚠️ No completely safe moves found, trying emergency move");
        return { move: findEmergencyMove(gameState) };

    } catch (error) {
        console.error("Error in getMoveResponse:", error);
        return { move: findEmergencyMove(gameState) };
    }
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

function floodFill(startPos, gameState) {
    const visited = new Set();
    const queue = [{pos: startPos, depth: 0}];
    let spaceCount = 0;
    let deadEnds = 0;
    let escapeRoutes = 0;
    let nearestFood = Infinity;
    let distanceToWall = Infinity;
    
    // Track visited positions with their depths
    const depthMap = new Map();
    
    while (queue.length > 0) {
        const {pos, depth} = queue.shift();
        const key = `${pos.x},${pos.y}`;
        
        if (visited.has(key)) continue;
        visited.add(key);
        depthMap.set(key, depth);
        
        spaceCount++;
        
        // Check for food
        if (isFood(pos, gameState)) {
            nearestFood = Math.min(nearestFood, depth);
        }
        
        // Get valid neighbors
        const neighbors = getValidNeighbors(pos, gameState);
        
        // Check if this is a dead end
        if (neighbors.length === 1 && depth > 0) {
            deadEnds++;
        }
        
        // Check for escape routes (spaces with multiple paths)
        if (neighbors.length > 2) {
            escapeRoutes++;
        }
        
        // Track distance to walls
        if (isNearWall(pos, gameState)) {
            distanceToWall = Math.min(distanceToWall, depth);
        }
        
        // Add valid neighbors to queue
        for (const neighbor of neighbors) {
            const neighborKey = `${neighbor.x},${neighbor.y}`;
            if (!visited.has(neighborKey)) {
                queue.push({pos: neighbor, depth: depth + 1});
            }
        }
    }
    
    // Calculate space quality metrics
    const avgDepth = Array.from(depthMap.values()).reduce((a, b) => a + b, 0) / depthMap.size;
    
    return {
        spaceCount,
        deadEnds,
        escapeRoutes,
        nearestFood,
        distanceToWall,
        avgDepth,
        visitedPositions: visited
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

function calculateMoveScore(spaceEval, pos, gameState) {
    let score = 0;
    
    // Space availability (most important)
    score += spaceEval.accessibleSpace * 100;
    
    // Penalize dead ends heavily
    score -= spaceEval.deadEnds * 200;
    
    // Reward escape routes
    score += spaceEval.escapeRoutes * 150;
    
    // Consider food if health is low
    if (gameState.you.health < 50 && spaceEval.nearestFood !== Infinity) {
        score += (100 - spaceEval.nearestFood) * 2;
    }
    
    // Slight penalty for being near walls
    score -= Math.max(0, 10 - spaceEval.distanceToWall) * 10;
    
    // Consider snake proximity
    const snakeProximity = calculateSnakeProximity(pos, gameState);
    score -= snakeProximity * 50;
    
    return score;
}

// Core Pathfinding Strategy
function findAllSafePaths(startPos, gameState, depth = 4) {  // Looks 4 moves ahead
    const paths = [];
    const visited = new Set();
    const queue = new PriorityQueue();
    
    queue.enqueue({
        pos: startPos,
        path: [startPos],
        cost: 0
    }, 0);

    while (!queue.isEmpty() && paths.length < 10) {  // Find up to 10 best paths
        const current = queue.dequeue();
        
        // Found a valid path of desired length
        if (current.path.length >= depth) {
            paths.push(current.path);
            continue;
        }

        // Explore neighbors using A* heuristics
        const neighbors = getValidNeighbors(current.pos, gameState);
        for (const neighbor of neighbors) {
            const priority = calculatePathPriority(newPath, gameState);
            queue.enqueue({
                pos: neighbor,
                path: [...current.path, neighbor],
                cost: current.cost + 1
            }, priority);
        }
    }

    return paths;
}

// Path Priority Calculation
function calculatePathPriority(path, gameState) {
    let priority = 0;
    const endPos = path[path.length - 1];

    // NEW: Check future positions for potential snake collisions
    const futureDangerZones = predictFutureSnakeBodies(gameState, path.length);
    const mightHitSnake = path.some(pos => 
        futureDangerZones.some(zone => 
            zone.x === pos.x && zone.y === pos.y
        )
    );

    // CRITICAL: Heavily penalize any path that might lead to snake collision
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
        if (snake.id === gameState.you.id) return;
        
        // Current snake body is always dangerous
        snake.body.forEach(segment => {
            dangerZones.add(`${segment.x},${segment.y}`);
        });

        // Predict possible future positions
        let possibleHeads = [snake.head];
        for (let i = 0; i < depth; i++) {
            const newPossibleHeads = [];
            possibleHeads.forEach(head => {
                ['up', 'down', 'left', 'right'].forEach(move => {
                    const nextPos = getNextPosition(head, move);
                    if (isWithinBounds(nextPos, gameState)) {
                        newPossibleHeads.push(nextPos);
                        // Add entire predicted snake body
                        dangerZones.add(`${nextPos.x},${nextPos.y}`);
                    }
                });
            });
            possibleHeads = newPossibleHeads;
        }
    });

    return Array.from(dangerZones).map(str => {
        const [x, y] = str.split(',');
        return { x: parseInt(x), y: parseInt(y) };
    });
}

// Export after all functions are defined
module.exports = {
    getMoveResponse
};