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
            if (!this.isValidPosition(pos, gameState)) {
                return { safe: false, reason: 'wall' };
            }

            const bodyCheck = this.checkSnakeCollision(pos, gameState);
            if (bodyCheck.willCollide) {
                return { safe: false, reason: bodyCheck.collisionType };
            }

            const headCheck = this.checkHeadCollision(pos, gameState);
            if (headCheck.dangerous) {
                return { safe: false, reason: 'head' };
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
            const health = gameState.you.health;
            let score = 0;

            const nearestFood = this.findNearestFood(pos, gameState);
            
            if (health <= this.THRESHOLDS.CRITICAL) {
                score += nearestFood ? (1000 - (nearestFood.distance * 50)) : -2000;
            } 
            else if (health <= this.THRESHOLDS.LOW) {
                score += nearestFood ? (500 - (nearestFood.distance * 30)) : -1000;
            }
            else if (health <= this.THRESHOLDS.SAFE) {
                score += nearestFood ? (200 - (nearestFood.distance * 10)) : 0;
            }

            return score;
        },

        findNearestFood: function(pos, gameState) {
            if (!gameState.board.food.length) return null;

            let nearest = null;
            let minDistance = Infinity;

            gameState.board.food.forEach(food => {
                const distance = Math.abs(food.x - pos.x) + 
                               Math.abs(food.y - pos.y);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearest = { food, distance };
                }
            });

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
        console.log("\nCalculating total score for position:", pos);
        let totalScore = 0;

        try {
            // Original strategies
            console.log("Checking collision...");
            if (!this.ORIGINAL.willHitSnake(pos, gameState)) {
                totalScore += 100;
                console.log("No collision: +100");
            }

            // Body hugging
            console.log("Calculating body hugging...");
            const huggingScore = this.BODY_HUGGING.calculateScore(pos, gameState);
            totalScore += huggingScore;
            console.log(`Body hugging score: +${huggingScore}`);

            // Health management
            console.log("Calculating health strategy...");
            if (gameState.you.health < 50) {
                const nearestFood = this.HEALTH.findNearestFood(pos, gameState);
                if (nearestFood) {
                    const foodScore = Math.max(0, 200 - (nearestFood.distance * 10));
                    totalScore += foodScore;
                    console.log(`Food proximity score: +${foodScore}`);
                }
            }

            // Space analysis
            console.log("Calculating space score...");
            const spaceScore = this.SPACE.calculateScore(pos, gameState);
            totalScore += spaceScore;
            console.log(`Space score: +${spaceScore}`);

            console.log(`Final total score: ${totalScore}`);
            return totalScore;

        } catch (error) {
            console.error("Error in calculateTotalScore:", error);
            throw error;
        }
    }
};

module.exports = STRATEGIES; 