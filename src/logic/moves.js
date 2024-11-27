const { DIRECTIONS } = require('../utils/constants')
const { CELL, createGameBoard, printBoard } = require('../utils/board')
const { findSafestPath } = require('./pathfinding');

// Add these utility functions at the TOP of the file, before any other functions
function getDirection(from, to) {
  if (!from || !to) return null
  if (to.y > from.y) return 'up'
  if (to.y < from.y) return 'down'
  if (to.x < from.x) return 'left'
  if (to.x > from.x) return 'right'
  return null
}

function getNextPosition(head, move) {
  if (!head) {
    console.log("WARNING: Invalid head position provided to getNextPosition");
    return null;
  }
  
  switch(move) {
    case 'up': return { x: head.x, y: head.y + 1 };
    case 'down': return { x: head.x, y: head.y - 1 };
    case 'left': return { x: head.x - 1, y: head.y };
    case 'right': return { x: head.x + 1, y: head.y };
    default: 
      console.log("WARNING: Invalid move provided:", move);
      return null;
  }
}

function shouldCoil(gameState) {
  return gameState.you.health > 50 && 
         gameState.you.body.length > 4 &&
         !isNearbyThreat(gameState) &&
         !needsFood(gameState)
}

function isGoodCoilTurn(currentDir, newDir) {
  const validTurns = {
    'up': ['right', 'left'],
    'right': ['down', 'up'],
    'down': ['left', 'right'],
    'left': ['up', 'down']
  }
  return validTurns[currentDir] && validTurns[currentDir].includes(newDir)
}

function isCircularPattern(pos, body) {
  if (body.length < 4) return false
  
  const head = body[0]
  const neck = body[1]
  const currentDir = getDirection(neck, head)
  const newDir = getDirection(head, pos)
  
  return currentDir && newDir && isGoodCoilTurn(currentDir, newDir)
}

function evaluateCoilingMove(pos, gameState) {
  let score = 0
  const tail = gameState.you.body[gameState.you.body.length - 1]
  
  const distanceToTail = Math.abs(pos.x - tail.x) + Math.abs(pos.y - tail.y)
  
  if (distanceToTail === 2) score += 75
  else if (distanceToTail === 3) score += 50
  else if (distanceToTail === 1) score += 25

  if (isCircularPattern(pos, gameState.you.body)) {
    score += 50
    console.log('Maintaining circular pattern')
  }

  return score
}

// Add this function near the top with other utility functions
function getPossibleEnemyMoves(head) {
  if (!head) return []
  
  return [
    { x: head.x, y: head.y + 1 },  // up
    { x: head.x, y: head.y - 1 },  // down
    { x: head.x - 1, y: head.y },  // left
    { x: head.x + 1, y: head.y }   // right
  ]
}

// Add these utility functions at the top of the file
function isWithinBounds(pos, gameState) {
    return pos && 
           pos.x >= 0 && 
           pos.x < gameState.board.width && 
           pos.y >= 0 && 
           pos.y < gameState.board.height;
}

function isSelfCollision(pos, gameState) {
    return gameState.you.body.some(segment => 
        segment.x === pos.x && segment.y === pos.y
    );
}

function getNextPosition(currentPos, move) {
    if (!currentPos) return null;
    
    switch(move.toLowerCase()) {
        case 'up':
            return { x: currentPos.x, y: currentPos.y + 1 };
        case 'down':
            return { x: currentPos.x, y: currentPos.y - 1 };
        case 'left':
            return { x: currentPos.x - 1, y: currentPos.y };
        case 'right':
            return { x: currentPos.x + 1, y: currentPos.y };
        default:
            console.error("Invalid move:", move);
            return null;
    }
}

function isSnakeCollision(pos, gameState) {
    return gameState.board.snakes.some(snake => 
        snake.body.some(segment => 
            segment.x === pos.x && segment.y === pos.y
        )
    );
}

function isPotentialHeadCollision(pos, gameState) {
    return gameState.board.snakes.some(snake => {
        if (snake.id === gameState.you.id) return false;
        
        const distanceToHead = Math.abs(pos.x - snake.head.x) + 
                             Math.abs(pos.y - snake.head.y);
                             
        return distanceToHead <= 1 && snake.length >= gameState.you.length;
    });
}

// Main move response function
function getMoveResponse(gameState) {
    try {
        const head = gameState.you.head;
        console.log("\n🔍 Current position:", head);

        // First, evaluate all possible paths using A*
        const moveScores = evaluateAllPaths(gameState);
        console.log("Path analysis:", moveScores);

        // If we have any safe moves with good paths, use the best one
        const bestMove = chooseBestPath(moveScores);
        if (bestMove) {
            console.log("✅ Choosing best path:", bestMove);
            return { move: bestMove };
        }

        // Fallback to emergency move
        return { move: findEmergencyMove(gameState) };
    } catch (error) {
        console.error("Error in getMoveResponse:", error);
        return { move: findEmergencyMove(gameState) };
    }
}

function evaluateAllPaths(gameState) {
    const moves = ['up', 'down', 'left', 'right'];
    return moves.map(move => {
        const nextPos = getNextPosition(gameState.you.head, move);
        if (!isValidMove(nextPos, gameState)) {
            return { move, score: -Infinity, paths: [] };
        }

        // Look ahead several moves using A*
        const pathAnalysis = analyzePathsFromPosition(nextPos, gameState);
        return {
            move,
            score: pathAnalysis.score,
            paths: pathAnalysis.paths
        };
    });
}

function analyzePathsFromPosition(startPos, gameState, depth = 3) {
    const paths = [];
    let totalScore = 0;

    // Initialize the priority queue for A*
    const openSet = new PriorityQueue();
    const closedSet = new Set();
    
    // Start from current position
    openSet.enqueue({
        pos: startPos,
        path: [],
        gScore: 0,
        fScore: heuristic(startPos, gameState)
    }, 0);

    while (!openSet.isEmpty() && paths.length < 5) {
        const current = openSet.dequeue();
        const posKey = `${current.pos.x},${current.pos.y}`;

        if (closedSet.has(posKey)) continue;
        closedSet.add(posKey);

        // Found a valid path
        if (current.path.length >= depth) {
            paths.push(current.path);
            totalScore += evaluatePath(current.path, gameState);
            continue;
        }

        // Explore neighbors
        const neighbors = getValidNeighbors(current.pos, gameState);
        for (const neighbor of neighbors) {
            const neighborKey = `${neighbor.x},${neighbor.y}`;
            if (closedSet.has(neighborKey)) continue;

            const gScore = current.gScore + 1;
            const fScore = gScore + heuristic(neighbor, gameState);

            openSet.enqueue({
                pos: neighbor,
                path: [...current.path, neighbor],
                gScore: gScore,
                fScore: fScore
            }, fScore);
        }
    }

    return {
        score: paths.length > 0 ? totalScore / paths.length : -Infinity,
        paths: paths
    };
}

function heuristic(pos, gameState) {
    let score = 0;

    // Prefer positions away from walls
    score -= (Math.min(pos.x, gameState.board.width - 1 - pos.x) + 
             Math.min(pos.y, gameState.board.height - 1 - pos.y)) * 0.5;

    // Avoid enemy snake territories
    gameState.board.snakes.forEach(snake => {
        if (snake.id === gameState.you.id) return;
        
        const distanceToHead = Math.abs(pos.x - snake.head.x) + 
                             Math.abs(pos.y - snake.head.y);
        if (snake.length >= gameState.you.length) {
            score -= Math.max(0, 5 - distanceToHead) * 2;
        }
    });

    // Prefer moves with more open space
    const openSpace = countAvailableSpace(pos, gameState);
    score += openSpace * 0.5;

    return score;
}

class PriorityQueue {
    constructor() {
        this.values = [];
    }

    enqueue(val, priority) {
        this.values.push({ val, priority });
        this.sort();
    }

    dequeue() {
        return this.values.shift().val;
    }

    sort() {
        this.values.sort((a, b) => a.priority - b.priority);
    }

    isEmpty() {
        return this.values.length === 0;
    }
}

function evaluatePath(path, gameState) {
    let score = 100;

    // Penalize paths that get too close to enemy snakes
    path.forEach((pos, index) => {
        gameState.board.snakes.forEach(snake => {
            if (snake.id === gameState.you.id) return;
            
            const distanceToHead = Math.abs(pos.x - snake.head.x) + 
                                 Math.abs(pos.y - snake.head.y);
            if (snake.length >= gameState.you.length && distanceToHead <= 2) {
                score -= (50 / (index + 1));  // Penalize less for positions further in the future
            }
        });
    });

    // Reward paths that maintain open space
    const endPos = path[path.length - 1];
    const finalSpace = countAvailableSpace(endPos, gameState);
    score += finalSpace * 10;

    return score;
}

function chooseBestPath(moveScores) {
    // Sort by score
    moveScores.sort((a, b) => b.score - a.score);
    
    // Get best non-deadly move
    const bestMove = moveScores.find(m => m.score > -Infinity);
    return bestMove ? bestMove.move : null;
}

function findEmergencyMove(gameState) {
    console.log("🆘 Emergency move needed!");
    
    const head = gameState.you.head;
    const moves = ['up', 'down', 'left', 'right'];
    
    // Analyze each move's death type
    const moveAnalysis = moves.map(move => {
        const nextPos = getNextPosition(head, move);
        let deathType = 'none';
        let certainDeath = false;
        
        // Check for certain death scenarios
        if (!isWithinBounds(nextPos, gameState)) {
            deathType = 'wall';
            certainDeath = true;
        }
        else if (isSelfCollision(nextPos, gameState)) {
            deathType = 'self';
            certainDeath = true;
        }
        else if (hasEqualOrLargerSnakeHeadCollision(nextPos, gameState)) {
            deathType = 'head-collision';
            certainDeath = true;
        }
        
        return { move, deathType, certainDeath };
    });
    
    console.log("Emergency analysis:", moveAnalysis);
    
    // Look for any moves that aren't certain death
    const possibleMoves = moveAnalysis.filter(m => !m.certainDeath);
    
    if (possibleMoves.length > 0) {
        const chosen = possibleMoves[0].move;
        console.log(`Found non-certain death move: ${chosen}`);
        return chosen;
    }
    
    // If all moves lead to death, log and pick the least embarrassing one
    console.log("💀 All moves lead to certain death!");
    return 'down';  // At this point, direction doesn't matter
}

function hasEqualOrLargerSnakeHeadCollision(pos, gameState) {
    return gameState.board.snakes.some(snake => {
        if (snake.id === gameState.you.id) return false;
        
        // Get all possible next positions for enemy snake
        const enemyMoves = ['up', 'down', 'left', 'right']
            .map(move => getNextPosition(snake.head, move))
            .filter(p => p && isWithinBounds(p, gameState));
            
        // If snake is equal or larger, any head collision is deadly
        if (snake.length >= gameState.you.length) {
            return enemyMoves.some(enemyNext => 
                enemyNext.x === pos.x && enemyNext.y === pos.y
            );
        }
        
        return false;
    });
}

function isValidMove(pos, gameState) {
    if (!pos) return false;
    
    // Check bounds
    if (!isWithinBounds(pos, gameState)) return false;
    
    // Check self collision
    if (isSelfCollision(pos, gameState)) return false;
    
    return true;
}

function isBasicallySafe(pos, gameState) {
    if (!isValidMove(pos, gameState)) return false;
    
    // Check for immediate head collisions with larger/equal snakes
    const dangerousHeadCollision = gameState.board.snakes.some(snake => {
        if (snake.id === gameState.you.id) return false;
        
        const distanceToHead = Math.abs(pos.x - snake.head.x) + Math.abs(pos.y - snake.head.y);
        return distanceToHead <= 1 && snake.length >= gameState.you.length;
    });
    
    return !dangerousHeadCollision;
}

function analyzeRisks(pos, gameState) {
    let dangerLevel = 0;
    const details = [];

    // Check space availability first
    const spaceCount = countAvailableSpace(pos, gameState);
    if (spaceCount <= 1) {
        dangerLevel += 1000;
        details.push(`Very limited space: ${spaceCount}`);
    }
    
    // Check proximity to enemy snakes
    gameState.board.snakes.forEach(snake => {
        if (snake.id === gameState.you.id) return;
        
        const distanceToHead = Math.abs(pos.x - snake.head.x) + Math.abs(pos.y - snake.head.y);
        
        // Even being near a larger/equal snake is dangerous
        if (snake.length >= gameState.you.length) {
            if (distanceToHead <= 2) {
                dangerLevel += 500;
                details.push(`Too close to ${snake.length}-length snake`);
            }
        }
    });

    // Prefer moves with more space
    dangerLevel -= spaceCount * 50;
    details.push(`Available space: ${spaceCount}`);

    return { dangerLevel, details };
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
        
        // Check all adjacent squares
        ['up', 'down', 'left', 'right'].forEach(move => {
            const next = getNextPosition(current, move);
            if (next && isValidMove(next, gameState) && !visited.has(`${next.x},${next.y}`)) {
                queue.push(next);
            }
        });
    }
    
    return space;
}

function findNearestFood(gameState) {
    const head = gameState.you.head;
    if (!gameState.board.food.length) return null;
    
    return gameState.board.food
        .map(food => ({
            pos: food,
            distance: Math.abs(head.x - food.x) + Math.abs(head.y - food.y)
        }))
        .sort((a, b) => a.distance - b.distance)[0]?.pos;
}

function getValidNeighbors(pos, gameState) {
    const neighbors = [];
    const directions = [
        { x: 0, y: 1 },  // up
        { x: 0, y: -1 }, // down
        { x: -1, y: 0 }, // left
        { x: 1, y: 0 }   // right
    ];

    for (const dir of directions) {
        const neighbor = {
            x: pos.x + dir.x,
            y: pos.y + dir.y
        };

        // Check if this neighbor is valid
        if (isValidPosition(neighbor, gameState)) {
            neighbors.push(neighbor);
        }
    }

    return neighbors;
}

function isValidPosition(pos, gameState) {
    // Basic bounds check
    if (!isWithinBounds(pos, gameState)) return false;

    // Check for self collision
    if (isSelfCollision(pos, gameState)) return false;

    // Check for immediate head-to-head with equal/larger snakes
    const hasHeadDanger = gameState.board.snakes.some(snake => {
        if (snake.id === gameState.you.id) return false;
        
        const distanceToHead = Math.abs(pos.x - snake.head.x) + 
                             Math.abs(pos.y - snake.head.y);
        
        return distanceToHead <= 1 && snake.length >= gameState.you.length;
    });

    if (hasHeadDanger) return false;

    // Check for other snake bodies
    const hasSnakeCollision = gameState.board.snakes.some(snake => 
        snake.body.some(segment => 
            segment.x === pos.x && segment.y === pos.y
        )
    );

    if (hasSnakeCollision) return false;

    return true;
}

module.exports = {
    getMoveResponse
}; 