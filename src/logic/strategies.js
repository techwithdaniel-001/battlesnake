const STRATEGIES = {
    // Strategy weights for importance
    WEIGHTS: {
        SURVIVAL: 2.0,    // Most important
        HEALTH: 1.5,      // Very important
        SPACE: 1.2,       // Important
        ATTACK: 0.8,      // Situational
        PATH: 1.0         // Situational
    },

    // Collision Detection System
    COLLISION: {
        checkAll: function(pos, gameState) {
            // First check walls
            if (!this.isValidPosition(pos, gameState)) {
                console.log("🧱 Wall collision detected at:", pos);
                return { safe: false, reason: 'wall' };
            }

            // ENHANCED SELF-COLLISION CHECK
            const mySnake = gameState.you;
            for (let i = 0; i < mySnake.body.length - 1; i++) {  // -1 to ignore tail
                const segment = mySnake.body[i];
                if (pos.x === segment.x && pos.y === segment.y) {
                    console.log("🚫 Self collision detected at:", segment);
                    return { safe: false, reason: 'self' };
                }
            }

            // Check ALL snake bodies (including enemy snakes)
            for (const snake of gameState.board.snakes) {
                // Log snake positions for debugging
                console.log(`Checking snake ${snake.id} at:`, snake.body);
                
                // Check ENTIRE body of each snake
                for (const segment of snake.body) {
                    if (pos.x === segment.x && pos.y === segment.y) {
                        console.log("🐍 Snake body collision detected at:", segment);
                        return { 
                            safe: false, 
                            reason: snake.id === gameState.you.id ? 'self' : 'enemy',
                            snake: snake
                        };
                    }
                }

                // Special check for vertical snake segments
                for (let i = 1; i < snake.body.length; i++) {
                    const prev = snake.body[i-1];
                    const curr = snake.body[i];
                    
                    // If snake segment is vertical
                    if (prev.x === curr.x && 
                        pos.x === prev.x && 
                        pos.y >= Math.min(prev.y, curr.y) && 
                        pos.y <= Math.max(prev.y, curr.y)) {
                        console.log("🚫 Vertical snake segment detected!");
                        return { 
                            safe: false, 
                            reason: 'vertical_snake',
                            snake: snake
                        };
                    }
                }
            }

            return { safe: true, reason: null };
        },

        isValidPosition: function(pos, gameState) {
            return pos.x >= 0 && 
                   pos.x < gameState.board.width && 
                   pos.y >= 0 && 
                   pos.y < gameState.board.height;
        },

        checkSnakeCollision: function(pos, gameState) {
            for (const snake of gameState.board.snakes) {
                // Check body segments (excluding tail)
                for (let i = 0; i < snake.body.length - 1; i++) {
                    if (snake.body[i].x === pos.x && snake.body[i].y === pos.y) {
                        return { willCollide: true, collisionType: 'body' };
                    }
                }
                
                // Special tail check
                const tail = snake.body[snake.body.length - 1];
                const secondLast = snake.body[snake.body.length - 2];
                if (tail.x === pos.x && tail.y === pos.y) {
                    if (tail.x === secondLast.x && tail.y === secondLast.y) {
                        return { willCollide: true, collisionType: 'tail' };
                    }
                }
            }
            return { willCollide: false };
        },

        checkHeadCollision: function(pos, gameState) {
            const myLength = gameState.you.length;
            let dangerous = false;
            let enemyLength = 0;

            gameState.board.snakes.forEach(snake => {
                if (snake.id === gameState.you.id) return;

                const enemyHead = snake.head;
                const possibleMoves = [
                    {x: enemyHead.x + 1, y: enemyHead.y},
                    {x: enemyHead.x - 1, y: enemyHead.y},
                    {x: enemyHead.x, y: enemyHead.y + 1},
                    {x: enemyHead.x, y: enemyHead.y - 1}
                ];

                if (possibleMoves.some(move => 
                    move.x === pos.x && move.y === pos.y
                ) && snake.length >= myLength) {
                    dangerous = true;
                    enemyLength = snake.length;
                }
            });

            return { dangerous, enemyLength };
        }
    },

    // Health Management System
    HEALTH: {
        THRESHOLDS: {
            CRITICAL: 25,
            LOW: 50,
            SAFE: 75
        },

        calculateScore: function(pos, gameState) {
            const LOW_HEALTH_THRESHOLD = 40;
            const CRITICAL_HEALTH = 25;
            
            console.log(`🫀 Current health: ${gameState.you.health}`);
            
            // Find nearest food with safe path
            const nearestFood = this.findNearestFood(pos, gameState);
            if (!nearestFood) {
                console.log("❌ No safe path to food found");
                return 0;
            }
            
            let foodScore = 0;
            
            // Only be aggressive about food if:
            // 1. Health is low AND
            // 2. Food is nearby AND
            // 3. Path is safe
            if (gameState.you.health <= CRITICAL_HEALTH && nearestFood.distance <= 3) {
                foodScore = 800 - (nearestFood.distance * 50);
                console.log(`🚨 Critical health & close food! Score: ${foodScore}`);
            } 
            else if (gameState.you.health <= LOW_HEALTH_THRESHOLD && nearestFood.distance <= 5) {
                foodScore = 400 - (nearestFood.distance * 30);
                console.log(`⚠️ Low health & reachable food! Score: ${foodScore}`);
            }
            else {
                // Normal food seeking - don't be too aggressive
                foodScore = 100 - (nearestFood.distance * 10);
            }

            return Math.max(0, foodScore);
        },

        findNearestFood: function(pos, gameState) {
            if (!gameState.board.food?.length) return null;

            let nearest = null;
            let shortestDistance = Infinity;

            for (const food of gameState.board.food) {
                // Check if path to food is safe
                const path = STRATEGIES.PATHFINDING.findPath(pos, food, gameState);
                if (!path) {
                    console.log(`🚫 No safe path to food at ${JSON.stringify(food)}`);
                    continue;
                }
                
                // Manhattan distance
                const distance = Math.abs(food.x - pos.x) + Math.abs(food.y - pos.y);
                
                // Check if this path is safer than current best
                if (distance < shortestDistance) {
                    shortestDistance = distance;
                    nearest = { food, distance, path };
                }
            }

            if (nearest) {
                console.log(`✅ Found safe food at: ${JSON.stringify(nearest.food)}, distance: ${nearest.distance}`);
            }
            return nearest;
        }
    },

    // Space Analysis System
    SPACE: {
        calculateScore: function(pos, gameState) {
            let score = 0;
            
            if (this.isNearWall(pos, gameState)) {
                score -= 200;
            }

            const spaceAnalysis = this.analyzeAvailableSpace(pos, gameState);
            score += spaceAnalysis.accessibleSpace * 50;

            return score;
        },

        isNearWall: function(pos, gameState) {
            return pos.x <= 0 || 
                   pos.x >= gameState.board.width - 1 || 
                   pos.y <= 0 || 
                   pos.y >= gameState.board.height - 1;
        },

        analyzeAvailableSpace: function(pos, gameState) {
            const visited = new Set();
            const queue = [pos];
            let accessibleSpace = 0;

            while (queue.length > 0) {
                const current = queue.shift();
                const key = `${current.x},${current.y}`;

                if (visited.has(key)) continue;
                visited.add(key);
                accessibleSpace++;

                // Check all adjacent squares
                const moves = [
                    {x: current.x + 1, y: current.y},
                    {x: current.x - 1, y: current.y},
                    {x: current.x, y: current.y + 1},
                    {x: current.x, y: current.y - 1}
                ];

                moves.forEach(move => {
                    if (this.isValidMove(move, gameState)) {
                        queue.push(move);
                    }
                });
            }

            return { accessibleSpace };
        },

        isValidMove: function(pos, gameState) {
            return STRATEGIES.COLLISION.checkAll(pos, gameState).safe;
        }
    },

    // Keep all our original working strategies
    ORIGINAL: {
        willHitSnake: function(pos, gameState) {
            return gameState.board.snakes.some(snake => 
                snake.body.some(segment => 
                    segment.x === pos.x && segment.y === pos.y
                )
            );
        },

        isValidPosition: function(pos, gameState) {
            return pos.x >= 0 && 
                   pos.x < gameState.board.width && 
                   pos.y >= 0 && 
                   pos.y < gameState.board.height;
        },

        getValidMoves: function(pos, gameState) {
            const moves = [
                {x: pos.x, y: pos.y + 1},
                {x: pos.x, y: pos.y - 1},
                {x: pos.x - 1, y: pos.y},
                {x: pos.x + 1, y: pos.y}
            ];

            return moves.filter(move => {
                if (!this.isValidPosition(move, gameState)) return false;
                if (this.willHitSnake(move, gameState)) return false;
                return true;
            });
        }
    },

    // A* Pathfinding System
    PATHFINDING: {
        aStar: function(start, goal, gameState) {
            const openSet = [start];
            const cameFrom = new Map();
            const gScore = new Map();
            const fScore = new Map();
            
            const startKey = JSON.stringify(start);
            gScore.set(startKey, 0);
            fScore.set(startKey, this.heuristic(start, goal));

            while (openSet.length > 0) {
                const current = this.getLowestFScore(openSet, fScore);
                const currentKey = JSON.stringify(current);
                
                if (current.x === goal.x && current.y === goal.y) {
                    return this.reconstructPath(cameFrom, current);
                }

                openSet.splice(openSet.indexOf(current), 1);
                const neighbors = this.getValidNeighbors(current, gameState);

                for (const neighbor of neighbors) {
                    const neighborKey = JSON.stringify(neighbor);
                    const tentativeGScore = gScore.get(currentKey) + 1;
                    
                    if (tentativeGScore < (gScore.get(neighborKey) || Infinity)) {
                        cameFrom.set(neighborKey, current);
                        gScore.set(neighborKey, tentativeGScore);
                        fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, goal));
                        
                        if (!openSet.some(pos => pos.x === neighbor.x && pos.y === neighbor.y)) {
                            openSet.push(neighbor);
                        }
                    }
                }
            }
            return null;
        },

        getLowestFScore: function(openSet, fScore) {
            let lowest = openSet[0];
            let lowestScore = fScore.get(JSON.stringify(lowest)) || Infinity;

            for (let i = 1; i < openSet.length; i++) {
                const score = fScore.get(JSON.stringify(openSet[i])) || Infinity;
                if (score < lowestScore) {
                    lowest = openSet[i];
                    lowestScore = score;
                }
            }

            return lowest;
        },

        reconstructPath: function(cameFrom, current) {
            const path = [current];
            let currentKey = JSON.stringify(current);

            while (cameFrom.has(currentKey)) {
                current = cameFrom.get(currentKey);
                currentKey = JSON.stringify(current);
                path.unshift(current);
            }

            return path;
        },

        heuristic: function(a, b) {
            return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        },

        getValidNeighbors: function(pos, gameState) {
            const neighbors = [
                {x: pos.x + 1, y: pos.y},
                {x: pos.x - 1, y: pos.y},
                {x: pos.x, y: pos.y + 1},
                {x: pos.x, y: pos.y - 1}
            ];

            return neighbors.filter(neighbor => 
                STRATEGIES.COLLISION.checkAll(neighbor, gameState).safe
            );
        },

        findPath: function(start, goal, gameState) {
            return this.aStar(start, goal, gameState);
        }
    },

    // Body Hugging Strategy (from our working version)
    BODY_HUGGING: {
        calculateScore: function(pos, gameState) {
            let score = 0;
            const myBody = gameState.you.body;
            
            // Check for body segments nearby
            myBody.forEach(segment => {
                const distance = Math.abs(segment.x - pos.x) + 
                               Math.abs(segment.y - pos.y);
                if (distance === 1) {
                    score += 50; // Bonus for hugging
                }
            });

            return score;
        }
    },

    // Combine all strategies for move scoring
    calculateTotalScore: function(pos, gameState) {
        let scores = {
            // Base survival is most important
            survival: STRATEGIES.ORIGINAL.willHitSnake(pos, gameState) ? 0 : 1000,
            
            // Space analysis next
            space: STRATEGIES.SPACE.calculateScore(pos, gameState),
            
            // Body hugging for tactical advantage
            bodyHugging: STRATEGIES.BODY_HUGGING.calculateScore(pos, gameState),
            
            // Health management last
            health: STRATEGIES.HEALTH.calculateScore(pos, gameState)
        };

        console.log(`\n💯 Position ${JSON.stringify(pos)} scores:`, scores);

        // Only boost health score if really necessary
        if (gameState.you.health <= 25) {
            const nearestFood = STRATEGIES.HEALTH.findNearestFood(pos, gameState);
            if (nearestFood && nearestFood.distance <= 3) {
                scores.health *= 2;
                console.log(`🚨 Boosting close food score to: ${scores.health}`);
            }
        }

        const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
        console.log(`📊 Total score: ${totalScore}`);
        return totalScore;
    }
};

module.exports = STRATEGIES; 