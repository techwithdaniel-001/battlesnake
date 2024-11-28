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
        isOutOfBounds: function(pos, board) {
            return pos.x < 0 || pos.x >= board.width || pos.y < 0 || pos.y >= board.height;
        },

        getSafePosition: function(head, move, board) {
            const newPos = this.getNewPosition(head, move);
            // If the new position is out of bounds, return the current position
            if (this.isOutOfBounds(newPos, board)) {
                console.log(`🚫 Move ${move} would go out of bounds. Staying in place.`);
                return head; // Stay in the current position
            }
            return newPos; // Safe to move
        },

        checkAll: function(pos, gameState) {
            // Check for out of bounds
            if (this.isOutOfBounds(pos, gameState.board)) {
                return { safe: false, reason: 'out of bounds' };
            }

            // Check for self collision
            const selfCollision = this.checkSelfCollision(pos, gameState.you);
            if (selfCollision.collision) {
                console.log("🚫 Would collide with self:", selfCollision.reason);
                return { safe: false, reason: selfCollision.reason };
            }

            // Check for wall collisions
            if (this.isWallCollision(pos, gameState.board)) {
                return { safe: false, reason: 'wall' };
            }

            // Check for enemy body collisions
            for (const snake of gameState.board.snakes) {
                if (snake.id !== gameState.you.id) {
                    for (const segment of snake.body) {
                        if (pos.x === segment.x && pos.y === segment.y) {
                            return { safe: false, reason: 'enemy snake body' };
                        }
                    }
                }
            }

            return { safe: true, reason: 'clear' };
        },

        checkSelfCollision: function(pos, selfSnake) {
            // Check EVERY segment of our own body
            for (let i = 0; i < selfSnake.body.length; i++) {
                const segment = selfSnake.body[i];
                
                // Skip the tail as it will move
                if (i === selfSnake.body.length - 1) continue;
                
                if (pos.x === segment.x && pos.y === segment.y) {
                    return {
                        collision: true,
                        reason: `self collision with body segment ${i}`
                    };
                }
            }

            return { collision: false };
        },

        isPotentialTrap: function(pos, gameState) {
            console.log("🔍 Checking for potential traps");
            const moves = this.getAvailableMoves(pos, gameState);
            
            if (moves.length < 2) {
                console.log("⚠️ Less than 2 exits available");
                return true;
            }

            // Check if all moves lead to smaller spaces
            for (const move of moves) {
                const space = this.calculateSpace(move, gameState);
                if (space < gameState.you.length) {
                    console.log(`🚫 Move leads to tight space: ${space} < ${gameState.you.length}`);
                    return true;
                }
            }
            return false;
        },

        checkHeadToHead: function(pos, enemySnake, ourSnake) {
            const enemyHead = enemySnake.head;
            const possibleEnemyMoves = [
                {x: enemyHead.x + 1, y: enemyHead.y},
                {x: enemyHead.x - 1, y: enemyHead.y},
                {x: enemyHead.x, y: enemyHead.y + 1},
                {x: enemyHead.x, y: enemyHead.y - 1}
            ];

            // Check if our move could result in head-to-head
            for (const enemyMove of possibleEnemyMoves) {
                if (pos.x === enemyMove.x && pos.y === enemyMove.y) {
                    // Avoid head-to-head with equal length snakes
                    if (ourSnake.length === enemySnake.length) {
                        console.log(`🚫 Avoiding head-to-head with equal length snake!`);
                        return true; // Indicates danger
                    }
                }
            }

            return false; // No head-to-head danger
        },

        isWallCollision: function(pos, board) {
            return pos.x < 0 || pos.x >= board.width || 
                   pos.y < 0 || pos.y >= board.height;
        },

        isValidPosition: function(pos, gameState) {
            // Check if position is within board bounds
            if (pos.x < 0 || pos.x >= gameState.board.width ||
                pos.y < 0 || pos.y >= gameState.board.height) {
                console.log("❌ Position out of bounds");
                return false;
            }

            // Check for collisions with all snake bodies (including our own)
            for (const snake of gameState.board.snakes) {
                for (let i = 0; i < snake.body.length; i++) {
                    const segment = snake.body[i];
                    
                    // Direct collision check
                    if (pos.x === segment.x && pos.y === segment.y) {
                        console.log(`❌ Collision with ${snake.id}'s body at position ${JSON.stringify(segment)}`);
                        return false;
                    }

                    // Safety buffer around snake bodies (except heads)
                    if (i !== 0) {  // Skip head for buffer check
                        const tooClose = Math.abs(pos.x - segment.x) + Math.abs(pos.y - segment.y) <= 1;
                        if (tooClose) {
                            console.log(`⚠️ Too close to ${snake.id}'s body at ${JSON.stringify(segment)}`);
                            return false;
                        }
                    }
                }

                // Special head-to-head check for enemy snakes
                if (snake.id !== gameState.you.id) {
                    const headToHead = this.checkHeadToHead(pos, snake, gameState.you);
                    if (headToHead) {
                        console.log(`🐍 Unsafe head-to-head with ${snake.id}`);
                        return false;
                    }
                }
            }

            return true;
        },

        // Additional safety check for move validation
        validateMove: function(move, gameState) {
            const newPos = this.getNewPosition(gameState.you.head, move);
            
            // Double-check self collision before any move
            const selfCheck = this.checkSelfCollision(newPos, gameState.you);
            if (selfCheck.collision) {
                console.log("🚨 CRITICAL: Prevented self collision!");
                return false;
            }

            return true;
        },

        calculateBestMove: function(gameState) {
            console.log("\n🎯 Starting move calculation");
            const head = gameState.you.head;
            const moves = ['up', 'down', 'left', 'right'];
            let bestMove = null;
            let bestScore = -Infinity;

            // Evaluate future moves to avoid being boxed in
            const futurePositions = this.evaluateFutureMoves(head, gameState);
            if (this.assessFutureRisk(futurePositions, gameState)) {
                console.log("⚠️ Avoiding moves that lead to being boxed in.");
                return 'stay'; // Stay in place if future moves are risky
            }

            for (const move of moves) {
                const newPos = this.getSafePosition(head, move, gameState.board);
                
                // Assess risk of the new position
                if (this.assessRisk(newPos, gameState)) {
                    console.log(`🚫 Avoiding risky move: ${move}`);
                    continue; // Skip risky moves
                }

                // Avoid moving near the heads of longer snakes
                if (this.avoidLongerSnakeHeads(newPos, gameState)) {
                    console.log(`🚫 Avoiding move near longer snake head: ${move}`);
                    continue; // Skip this move
                }

                const moveCheck = this.checkAll(newPos, gameState);
                if (moveCheck.safe) {
                    const score = this.calculateTotalScore(newPos, gameState);
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = move;
                    }
                }
            }

            return bestMove || 'stay'; // Stay in place if no safe moves
        },

        assessCollisionRisk: function(newPos, enemyPredictions) {
            for (const id in enemyPredictions) {
                const predictedMoves = enemyPredictions[id];
                for (const enemyMove of predictedMoves) {
                    if (newPos.x === enemyMove.x && newPos.y === enemyMove.y) {
                        console.log(`🚫 Avoiding move to ${newPos.x}, ${newPos.y} due to predicted collision with enemy ${id}`);
                        return true; // Indicates a collision risk
                    }
                }
            }
            return false; // No collision risk
        }
    },

    // Health Management System
    HEALTH: {
        THRESHOLDS: {
            CRITICAL: 40,    // Conservative
            LOW: 60,         // Stay well-fed
            SAFE: 80        // Maintain high health
        },

        calculateScore: function(pos, gameState) {
            const health = gameState.you.health;
            console.log(`🫀 Health Status: ${health}/100`);

            // Above SAFE threshold (>80) - Normal Strategy
            if (health > this.THRESHOLDS.SAFE) {
                console.log("💪 Health Good: Using normal strategy");
                return this.normalStrategy(pos, gameState);
            }
            // Critical Health (≤40) - Emergency Mode
            else if (health <= this.THRESHOLDS.CRITICAL) {
                console.log("💀 CRITICAL Health: Maximum food priority");
                return this.emergencyStrategy(pos, gameState);
            }
            // Low Health (41-60) - Urgent Mode
            else if (health <= this.THRESHOLDS.LOW) {
                console.log("🚨 Low Health: High food priority");
                return this.urgentStrategy(pos, gameState);
            }
            // Medium Health (61-80) - Balanced Mode
            else {
                console.log("⚠ Medium Health: Balanced strategy");
                return this.balancedStrategy(pos, gameState);
            }
        },

        normalStrategy: function(pos, gameState) {
            const nearestFood = this.findNearestFood(pos, gameState);
            if (!nearestFood) return 0;
            
            // Low food priority when healthy
            return 100 - (nearestFood.distance * 10);
        },

        emergencyStrategy: function(pos, gameState) {
            const nearestFood = this.findNearestFood(pos, gameState);
            if (!nearestFood) return 1500; // Force food search
            
            // Maximum food priority
            return 1500 - (nearestFood.distance * 100);
        },

        urgentStrategy: function(pos, gameState) {
            const nearestFood = this.findNearestFood(pos, gameState);
            if (!nearestFood) return 1000;
            
            // High food priority
            return 1000 - (nearestFood.distance * 75);
        },

        balancedStrategy: function(pos, gameState) {
            const nearestFood = this.findNearestFood(pos, gameState);
            if (!nearestFood) return 500;
            
            // Medium food priority
            let score = 500 - (nearestFood.distance * 50);

            // Consider space more in balanced mode
            const spaceScore = STRATEGIES.SPACE.calculateScore(pos, gameState);
            score += spaceScore * 0.5;

            return score;
        },

        findNearestFood: function(pos, gameState) {
            if (!gameState.board.food?.length) {
                console.log("❌ No food on board");
                return null;
            }

            let nearest = null;
            let shortestDistance = Infinity;

            for (const food of gameState.board.food) {
                const distance = Math.abs(food.x - pos.x) + Math.abs(food.y - pos.y);
                
                if (distance < shortestDistance) {
                    // Basic safety check first
                    const basicSafe = !this.isImmediatelyDangerous(pos, food, gameState);
                    if (basicSafe) {
                        shortestDistance = distance;
                        nearest = { food, distance };
                    }
                }
            }

            if (nearest) {
                console.log(`🍎 Found nearest food at distance: ${nearest.distance}`);
            } else {
                console.log("❌ No safe food found");
            }
            
            return nearest;
        },

        isImmediatelyDangerous: function(from, to, gameState) {
            // Check if path goes through any snake body
            for (const snake of gameState.board.snakes) {
                for (let i = 0; i < snake.body.length - 1; i++) {
                    const segment = snake.body[i];
                    if (this.isPointOnLine(from, to, segment)) {
                        return true;
                    }
                }
            }
            return false;
        },

        isPointOnLine: function(start, end, point) {
            // Check if point lies on direct path between start and end
            const d1 = Math.abs(point.x - start.x) + Math.abs(point.y - start.y);
            const d2 = Math.abs(end.x - point.x) + Math.abs(end.y - point.y);
            const lineLen = Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
            return d1 + d2 === lineLen;
        }
    },

    // Space Analysis System
    SPACE: {
        cache: new Map(),
        cacheTTL: 3,

        calculateScore: function(pos, gameState) {
            const cacheKey = `${pos.x},${pos.y},${gameState.turn}`;
            
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (gameState.turn - cached.turn < this.cacheTTL) {
                    console.log("🎯 Using cached space score");
                    return cached.score;
                }
            }

            const availableSpace = this.floodFill(pos, gameState);
            const score = this.evaluateSpace(availableSpace, gameState);
            
            this.cache.set(cacheKey, {
                turn: gameState.turn,
                score: score
            });

            return score;
        },

        floodFill: function(pos, gameState) {
            console.log("🌊 Starting flood fill from", pos);
            const visited = new Set();
            const queue = [pos];
            const board = gameState.board;

            while (queue.length > 0) {
                const current = queue.shift();
                const key = `${current.x},${current.y}`;

                if (visited.has(key)) continue;
                
                // Check boundaries
                if (current.x < 0 || current.x >= board.width ||
                    current.y < 0 || current.y >= board.height) {
                    continue;
                }

                // Check snake collisions
                let isSnakeBody = false;
                for (const snake of board.snakes) {
                    for (const segment of snake.body) {
                        if (segment.x === current.x && segment.y === current.y) {
                            isSnakeBody = true;
                            break;
                        }
                    }
                    if (isSnakeBody) break;
                }
                if (isSnakeBody) continue;

                // Mark as visited
                visited.add(key);

                // Add neighbors to queue
                queue.push(
                    {x: current.x + 1, y: current.y},
                    {x: current.x - 1, y: current.y},
                    {x: current.x, y: current.y + 1},
                    {x: current.x, y: current.y - 1}
                );
            }

            console.log(`🔍 Found ${visited.size} available spaces`);
            return visited.size;
        },

        evaluateSpace: function(spaceCount, gameState) {
            // Base score based on available spaces
            let score = spaceCount * 100;

            // Bonus for having more space than minimum required
            const minimumRequired = gameState.you.length * 2;
            if (spaceCount > minimumRequired) {
                score += 500;
                console.log(`✨ Space bonus: ${spaceCount} > ${minimumRequired}`);
            }

            // Penalty for very tight spaces
            if (spaceCount < gameState.you.length) {
                score -= 1000;
                console.log(`⚠️ Tight space penalty: ${spaceCount} < ${gameState.you.length}`);
            }

            return score;
        },

        cleanCache: function(currentTurn) {
            for (const [key, value] of this.cache.entries()) {
                if (currentTurn - value.turn >= this.cacheTTL) {
                    this.cache.delete(key);
                }
            }
        },

        getAvailableMoves: function(pos, gameState) {
            const moves = ['up', 'down', 'left', 'right'];
            return moves.filter(move => {
                const newPos = this.getNewPosition(pos, move);
                // Check boundaries first
                if (this.COLLISION.isOutOfBounds(newPos, gameState.board)) {
                    return false;
                }
                return this.COLLISION.checkAll(newPos, gameState).safe;
            });
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
        findPath: function(start, end, gameState) {
            console.log(`🔍 Finding path from ${JSON.stringify(start)} to ${JSON.stringify(end)}`);
            
            // Queue for BFS
            const queue = [{pos: start, path: []}];
            // Track visited positions
            const visited = new Set();
            
            while (queue.length > 0) {
                const {pos, path} = queue.shift();
                const posKey = `${pos.x},${pos.y}`;
                
                // Skip if visited
                if (visited.has(posKey)) continue;
                visited.add(posKey);
                
                // Found the end
                if (pos.x === end.x && pos.y === end.y) {
                    console.log(`✅ Path found! Length: ${path.length + 1}`);
                    return true;
                }
                
                // Get valid moves from current position
                const moves = this.getValidMoves(pos, gameState);
                
                // Add valid moves to queue
                for (const move of moves) {
                    if (!visited.has(`${move.x},${move.y}`)) {
                        queue.push({
                            pos: move,
                            path: [...path, pos]
                        });
                    }
                }
            }
            
            console.log("❌ No path found");
            return false;
        },

        getValidMoves: function(pos, gameState) {
            const moves = [
                {x: pos.x, y: pos.y + 1},  // up
                {x: pos.x, y: pos.y - 1},  // down
                {x: pos.x - 1, y: pos.y},  // left
                {x: pos.x + 1, y: pos.y}   // right
            ];
            
            return moves.filter(move => {
                // Check board boundaries
                if (move.x < 0 || move.x >= gameState.board.width ||
                    move.y < 0 || move.y >= gameState.board.height) {
                    return false;
                }
                
                // Check snake collisions (excluding current head position)
                for (const snake of gameState.board.snakes) {
                    for (let i = 0; i < snake.body.length - 1; i++) {
                        const segment = snake.body[i];
                        // Skip checking against current head position
                        if (segment.x === gameState.you.head.x && 
                            segment.y === gameState.you.head.y) {
                            continue;
                        }
                        if (segment.x === move.x && segment.y === move.y) {
                            return false;
                        }
                    }
                }
                
                return true;
            });
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
        console.log("\n💯 Calculating comprehensive score");
        
        const scores = {
            // Keep existing scores
            survival: this.COLLISION.checkAll(pos, gameState).safe ? 1000 : -Infinity,
            space: this.SPACE.calculateScore(pos, gameState),
            food: this.FOOD.calculateFoodValue(pos, gameState),
            
            // Add new scoring components
            competition: -this.FOOD.calculateFoodCompetition(pos, gameState) * 200,
            futureSpace: this.PREDICTION.analyzeFutureSpace(pos, gameState) * 100,
            emergency: this.SURVIVAL.findEmergencyEscape(gameState).length * 500
        };

        console.log("📊 Detailed scores:", scores);

        if (scores.survival === -Infinity) return -Infinity;
        return Object.values(scores).reduce((a, b) => a + b, 0);
    },

    TOURNAMENT: {
        THRESHOLDS: {
            CRITICAL: 40,    // Conservative health
            LOW: 60,
            SAFE: 80
        },

        calculateScore: function(pos, gameState) {
            // SURVIVAL CHECK FIRST - Always highest priority
            const collisionCheck = STRATEGIES.COLLISION.checkAll(pos, gameState);
            if (!collisionCheck.safe) {
                console.log("❌ Move rejected - unsafe");
                return -10000; // Never choose unsafe moves
            }

            const health = gameState.you.health;
            const longestSnake = Math.max(...gameState.board.snakes.map(s => s.length));
            const myLength = gameState.you.length;

            let score = 0;

            // 1. Health Management (Always Important)
            if (health <= this.THRESHOLDS.CRITICAL) {
                console.log("🚨 Health Critical - Finding Food");
                score += this.emergencyFoodScore(pos, gameState);
            }
            else if (health <= this.THRESHOLDS.LOW) {
                console.log("⚠️ Health Low - Should Eat Soon");
                score += this.foodScore(pos, gameState);
            }

            // 2. Game Phase Strategies
            if (gameState.turn < gameState.board.width * 0.25) {
                // Early Game: Safe Growth
                console.log("🌱 Early Game - Safe Growth");
                score += this.earlyGameScore(pos, gameState);
            }
            else if (myLength < longestSnake) {
                // Need to Grow: Catch up to longest
                console.log("📏 Need Growth - Catching Up");
                score += this.growthScore(pos, gameState);
            }
            else {
                // Dominant Position: Control Space
                console.log("👑 Dominant - Space Control");
                score += this.controlScore(pos, gameState);
            }

            // 3. Space Analysis (Always Consider)
            const spaceScore = STRATEGIES.SPACE.calculateScore(pos, gameState);
            score += spaceScore * 0.8; // Weight space less than survival

            console.log(`📊 Final Score for pos ${JSON.stringify(pos)}: ${score}`);
            return score;
        },

        emergencyFoodScore: function(pos, gameState) {
            const nearestFood = STRATEGIES.HEALTH.findNearestFood(pos, gameState);
            if (!nearestFood) return 0;
            
            // Check if path to food is safe
            const pathIsSafe = STRATEGIES.PATHFINDING.findPath(pos, nearestFood.food, gameState);
            if (!pathIsSafe) {
                console.log("⚠️ No safe path to nearest food");
                return 0;
            }

            return 1000 - (nearestFood.distance * 100);
        },

        foodScore: function(pos, gameState) {
            const nearestFood = STRATEGIES.HEALTH.findNearestFood(pos, gameState);
            if (!nearestFood) return 0;
            return 500 - (nearestFood.distance * 50);
        },

        earlyGameScore: function(pos, gameState) {
            let score = 0;
            const nearestFood = STRATEGIES.HEALTH.findNearestFood(pos, gameState);
            
            // Only go for very close food
            if (nearestFood && nearestFood.distance <= 3) {
                score += 300 - (nearestFood.distance * 50);
                console.log("🎯 Close food found in early game");
            }

            // Avoid edges in early game
            if (STRATEGIES.SPACE.isNearWall(pos, gameState)) {
                score -= 200;
                console.log("⚠️ Avoiding walls in early game");
            }

            return score;
        },

        growthScore: function(pos, gameState) {
            let score = 0;
            const nearestFood = STRATEGIES.HEALTH.findNearestFood(pos, gameState);
            
            if (nearestFood) {
                // More aggressive food seeking when smaller
                score += 400 - (nearestFood.distance * 40);
            }

            // But still maintain space
            const spaceAvailable = STRATEGIES.SPACE.analyzeAvailableSpace(pos, gameState);
            if (spaceAvailable.accessibleSpace < 8) {
                score -= 300;
                console.log("⚠️ Limited space available");
            }

            return score;
        },

        controlScore: function(pos, gameState) {
            let score = 0;
            
            // Prefer center control
            const centerDistance = Math.abs(pos.x - gameState.board.width/2) + 
                                 Math.abs(pos.y - gameState.board.height/2);
            score += 200 - (centerDistance * 20);

            // Check if we can trap smaller snakes
            gameState.board.snakes.forEach(snake => {
                if (snake.id !== gameState.you.id && snake.length < gameState.you.length) {
                    const distanceToSnake = Math.abs(pos.x - snake.head.x) + 
                                          Math.abs(pos.y - snake.head.y);
                    if (distanceToSnake <= 3) {
                        score += 100;
                        console.log("🎯 Potential to trap smaller snake");
                    }
                }
            });

            return score;
        }
    },

    AGGRESSION: {
        THRESHOLDS: {
            SIZE_ADVANTAGE: 1.2,  // 20% longer than opponent
            CRITICAL_HEALTH: 30   // Don't be aggressive when health is low
        },

        calculateScore: function(pos, gameState) {
            if (gameState.you.health <= this.THRESHOLDS.CRITICAL_HEALTH) {
                console.log("🚨 Health too low for aggression");
                return 0;
            }

            const myLength = gameState.you.length;
            const enemies = gameState.board.snakes.filter(s => s.id !== gameState.you.id);
            
            let aggressionScore = 0;
            
            enemies.forEach(enemy => {
                const lengthRatio = myLength / enemy.length;
                const distanceToHead = Math.abs(pos.x - enemy.head.x) + 
                                     Math.abs(pos.y - enemy.head.y);

                if (lengthRatio >= this.THRESHOLDS.SIZE_ADVANTAGE) {
                    // Aggressive when significantly larger
                    if (distanceToHead === 1) {
                        console.log(`🗡️ Potential head-to-head win vs ${enemy.id}`);
                        aggressionScore += 2000;
                    } else if (distanceToHead === 2) {
                        console.log(`🎯 Setting up attack vs ${enemy.id}`);
                        aggressionScore += 1000;
                    }
                } else if (distanceToHead <= 2) {
                    // Defensive when smaller
                    console.log(`⚠️ Avoiding stronger snake ${enemy.id}`);
                    aggressionScore -= 1000;
                }
            });

            return aggressionScore;
        }
    },

    FOOD: {
        calculateFoodValue: function(pos, gameState) {
            const food = gameState.board.food;
            let bestFoodValue = 0;

            for (const item of food) {
                const distance = this.calculateDistance(pos, item);
                const value = 10 / distance; // Example: closer food is more valuable
                bestFoodValue = Math.max(bestFoodValue, value);
            }

            return bestFoodValue;
        },

        assessFoodRisk: function(pos, gameState) {
            const head = pos;
            const food = gameState.board.food;

            for (const item of food) {
                const distance = this.calculateDistance(head, item);
                if (distance < 2) { // If food is very close
                    // Check for nearby enemies
                    for (const snake of gameState.board.snakes) {
                        if (snake.id !== gameState.you.id) {
                            const enemyDistance = this.calculateDistance(snake.head, item);
                            if (enemyDistance < 3) { // Enemy is also close to the food
                                console.log(`⚠️ Risky food situation: Food at ${item.x}, ${item.y} is contested.`);
                                return true; // Risky to go for this food
                            }
                        }
                    }
                }
            }
            return false; // No risk detected
        },

        calculateTotalScore: function(pos, gameState) {
            const foodValue = this.calculateFoodValue(pos, gameState);
            const survivalScore = this.calculateSurvivalScore(gameState);
            const foodRisk = this.assessFoodRisk(pos, gameState) ? 100 : 0; // Penalize risky food

            // Adjust the total score to prioritize survival over food
            const totalScore = foodValue - survivalScore - foodRisk; // Higher scores are better
            return totalScore;
        }
    },

    PREDICTION: {
        MAX_DEPTH: 4,  // How many moves to look ahead
        
        simulateMove: function(gameState, move, isOurSnake = true) {
            // Create deep copy of game state
            const newState = JSON.parse(JSON.stringify(gameState));
            const snake = isOurSnake ? newState.you : newState.board.snakes.find(s => s.id !== newState.you.id);
            
            // Update snake position
            const newHead = {
                x: snake.head.x + (move === 'right' ? 1 : move === 'left' ? -1 : 0),
                y: snake.head.y + (move === 'up' ? 1 : move === 'down' ? -1 : 0)
            };
            
            snake.body.unshift(newHead);
            snake.body.pop();
            snake.head = newHead;
            
            return newState;
        },

        minimax: function(gameState, depth, alpha, beta, isMaximizing) {
            if (depth === 0) {
                return this.evaluatePosition(gameState);
            }

            const possibleMoves = ['up', 'down', 'left', 'right'];
            
            if (isMaximizing) {
                let maxScore = -Infinity;
                for (const move of possibleMoves) {
                    const newState = this.simulateMove(gameState, move, true);
                    if (!STRATEGIES.COLLISION.checkAll(newState.you.head, newState).safe) {
                        continue;
                    }
                    const score = this.minimax(newState, depth - 1, alpha, beta, false);
                    maxScore = Math.max(maxScore, score);
                    alpha = Math.max(alpha, score);
                    if (beta <= alpha) break;
                }
                return maxScore;
            } else {
                let minScore = Infinity;
                for (const move of possibleMoves) {
                    // Simulate enemy snake moves
                    for (const enemy of gameState.board.snakes) {
                        if (enemy.id === gameState.you.id) continue;
                        const newState = this.simulateMove(gameState, move, false);
                        if (!STRATEGIES.COLLISION.checkAll(enemy.head, newState).safe) {
                            continue;
                        }
                        const score = this.minimax(newState, depth - 1, alpha, beta, true);
                        minScore = Math.min(minScore, score);
                        beta = Math.min(beta, score);
                        if (beta <= alpha) break;
                    }
                }
                return minScore;
            }
        },

        evaluatePosition: function(gameState) {
            const currentPos = gameState.you.head;
            
            // Combine immediate scoring with future position evaluation
            const immediateScore = STRATEGIES.calculateTotalScore(currentPos, gameState);
            
            // Additional future-looking factors
            let futureScore = 0;
            
            // 1. Path to food
            const nearestFood = this.findNearestFood(currentPos, gameState);
            if (nearestFood) {
                const pathToFood = this.getPathLength(currentPos, nearestFood, gameState);
                futureScore += (pathToFood ? 500 / pathToFood : 0);
            }
            
            // 2. Territory control
            const controlledTerritory = this.calculateControlledTerritory(gameState);
            futureScore += controlledTerritory * 100;
            
            // 3. Future threats
            const threatLevel = this.assessFutureThreats(gameState);
            futureScore -= threatLevel * 200;
            
            return immediateScore + futureScore;
        },

        findBestMove: function(gameState) {
            const possibleMoves = ['up', 'down', 'left', 'right'];
            let bestMove = null;
            let bestScore = -Infinity;
            
            console.log("🔮 Starting predictive analysis...");
            
            for (const move of possibleMoves) {
                const newState = this.simulateMove(gameState, move);
                const newPos = newState.you.head;
                
                // Check if move is immediately safe
                if (!STRATEGIES.COLLISION.checkAll(newPos, newState).safe) {
                    console.log(`❌ ${move} is immediately unsafe`);
                    continue;
                }
                
                // Calculate immediate score
                const immediateScore = STRATEGIES.calculateTotalScore(newPos, newState);
                
                // Calculate future score using minimax
                const futureScore = this.minimax(
                    newState, 
                    this.MAX_DEPTH - 1, 
                    -Infinity, 
                    Infinity, 
                    false
                );
                
                const totalScore = immediateScore + futureScore;
                console.log(`🎯 ${move}: Immediate=${immediateScore}, Future=${futureScore}, Total=${totalScore}`);
                
                if (totalScore > bestScore) {
                    bestScore = totalScore;
                    bestMove = move;
                }
            }
            
            console.log(`🏆 Best predicted move: ${bestMove} (Score: ${bestScore})`);
            return { move: bestMove, score: bestScore };
        },

        calculateControlledTerritory: function(gameState) {
            // Implement Voronoi diagram or simpler territory calculation
            let territory = 0;
            const ourHead = gameState.you.head;
            
            for (let x = 0; x < gameState.board.width; x++) {
                for (let y = 0; y < gameState.board.height; y++) {
                    const pos = {x, y};
                    if (this.isClosestSnake(pos, ourHead, gameState)) {
                        territory++;
                    }
                }
            }
            
            return territory;
        },

        isClosestSnake: function(pos, ourHead, gameState) {
            const ourDistance = Math.abs(pos.x - ourHead.x) + Math.abs(pos.y - ourHead.y);
            
            for (const snake of gameState.board.snakes) {
                if (snake.id === gameState.you.id) continue;
                const theirDistance = Math.abs(pos.x - snake.head.x) + Math.abs(pos.y - snake.head.y);
                if (theirDistance <= ourDistance) return false;
            }
            
            return true;
        },

        assessFutureThreats: function(gameState) {
            let threatLevel = 0;
            const ourHead = gameState.you.head;
            
            for (const snake of gameState.board.snakes) {
                if (snake.id === gameState.you.id) continue;
                
                const distance = Math.abs(ourHead.x - snake.head.x) + 
                               Math.abs(ourHead.y - snake.head.y);
                
                // Closer snakes are bigger threats
                if (distance < 3) threatLevel += 3;
                else if (distance < 5) threatLevel += 1;
                
                // Bigger snakes are bigger threats
                if (snake.length >= gameState.you.length) {
                    threatLevel += 2;
                }
            }
            
            return threatLevel;
        },

        analyzeFutureSpace: function(pos, gameState, depth = 2) {
            console.log("🔮 Analyzing future space");
            let minSpace = Infinity;
            const moves = this.getAvailableMoves(pos, gameState);
            
            for (const move of moves) {
                const newState = this.simulateMove(gameState, move);
                const space = this.SPACE.calculateSpace(move, newState);
                minSpace = Math.min(minSpace, space);
            }
            
            console.log(`📊 Minimum future space: ${minSpace}`);
            return minSpace;
        },

        simulateMove: function(gameState, move) {
            // Create a deep copy of gameState
            const newState = JSON.parse(JSON.stringify(gameState));
            
            // Update snake positions
            for (const snake of newState.board.snakes) {
                // Move head
                const oldHead = snake.body[0];
                let newHead;
                if (snake.id === newState.you.id) {
                    newHead = this.getNewPosition(oldHead, move);
                } else {
                    // Simple enemy prediction
                    newHead = this.predictEnemyMove(snake, newState);
                }
                
                // Update body
                snake.body.unshift(newHead);
                snake.body.pop();
                snake.head = newHead;
            }
            
            return newState;
        }
    },

    calculateBestMove: function(gameState) {
        const head = gameState.you.head;
        const moves = ['up', 'down', 'left', 'right'];
        let bestMove = null;
        let bestScore = -Infinity;

        // Track enemy positions and predict their moves
        const enemyPositions = this.trackEnemies(gameState);
        const enemyPredictions = this.predictEnemyMoves(enemyPositions);

        for (const move of moves) {
            const newPos = this.getSafePosition(head, move, gameState.board);
            
            // Assess risk of the new position
            if (this.assessRisk(newPos, gameState)) {
                console.log(`🚫 Avoiding risky move: ${move}`);
                continue; // Skip risky moves
            }

            // Assess collision risk with predicted enemy moves
            if (this.assessCollisionRisk(newPos, enemyPredictions)) {
                continue; // Skip this move if it leads to a collision
            }

            const moveCheck = this.checkAll(newPos, gameState);
            if (moveCheck.safe) {
                const score = this.calculateTotalScore(newPos, gameState);
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }
        }

        return bestMove || 'stay'; // Stay in place if no safe moves
    },

    getNewPosition: function(start, move) {
        let newPos;
        switch(move) {
            case 'up':
                newPos = { x: start.x, y: start.y + 1 };
                break;
            case 'down':
                newPos = { x: start.x, y: start.y - 1 };
                break;
            case 'left':
                newPos = { x: start.x - 1, y: start.y };
                break;
            case 'right':
                newPos = { x: start.x + 1, y: start.y };
                break;
            default:
                throw new Error(`Invalid move: ${move}`);
        }
        return newPos;
    },

    AVOID_BOXING: {
        isBoxedIn: function(pos, gameState) {
            const moves = ['up', 'down', 'left', 'right'];
            let safeMoves = 0;

            for (const move of moves) {
                const newPos = this.getNewPosition(pos, move);
                if (!this.isOutOfBounds(newPos, gameState.board) && 
                    !this.checkSelfCollision(newPos, gameState.you) &&
                    !this.checkEnemyCollision(newPos, gameState)) {
                    safeMoves++;
                }
            }

            return safeMoves < 2; // If less than 2 safe moves, it's likely boxed in
        }
    },

    LOOK_AHEAD: {
        evaluateFutureMoves: function(head, gameState) {
            const futurePositions = [head];
            let currentPos = head;

            for (let i = 0; i < 3; i++) {
                const bestMove = this.calculateBestMove(gameState); // Use existing best move logic
                currentPos = this.getNewPosition(currentPos, bestMove);
                futurePositions.push(currentPos);
            }

            return futurePositions;
        },

        assessFutureRisk: function(futurePositions, gameState) {
            for (const pos of futurePositions) {
                if (this.isBoxedIn(pos, gameState)) {
                    console.log(`⚠️ Future position ${pos.x}, ${pos.y} is boxed in.`);
                    return true; // Indicates a risky future position
                }
            }
            return false; // No risky future positions
        }
    },

    ENEMY_TRACKING: {
        trackEnemies: function(gameState) {
            const enemyPositions = {};

            for (const snake of gameState.board.snakes) {
                if (snake.id !== gameState.you.id) {
                    enemyPositions[snake.id] = {
                        head: snake.head,
                        body: snake.body,
                        length: snake.length
                    };
                }
            }

            return enemyPositions; // Return an object containing enemy positions
        }
    },

    ENEMY_PREDICTION: {
        predictEnemyMoves: function(enemyPositions) {
            const predictions = {};

            for (const id in enemyPositions) {
                const enemy = enemyPositions[id];
                const possibleMoves = [
                    {x: enemy.head.x + 1, y: enemy.head.y}, // right
                    {x: enemy.head.x - 1, y: enemy.head.y}, // left
                    {x: enemy.head.x, y: enemy.head.y + 1}, // down
                    {x: enemy.head.x, y: enemy.head.y - 1}  // up
                ];

                predictions[id] = possibleMoves; // Store predicted moves for each enemy
            }

            return predictions; // Return an object containing predicted moves
        }
    },

    AVOID_LONGER_SNAKES: {
        getLongerSnakes: function(gameState) {
            const longerSnakes = [];

            for (const snake of gameState.board.snakes) {
                if (snake.id !== gameState.you.id && snake.length > gameState.you.length) {
                    longerSnakes.push(snake);
                }
            }

            return longerSnakes; // Return an array of longer snakes
        },

        avoidLongerSnakeHeads: function(pos, gameState) {
            const longerSnakes = this.getLongerSnakes(gameState);
            const dangerousPositions = [];

            for (const snake of longerSnakes) {
                const enemyHead = snake.head;
                // Check positions adjacent to the enemy head
                const adjacentPositions = [
                    {x: enemyHead.x + 1, y: enemyHead.y}, // right
                    {x: enemyHead.x - 1, y: enemyHead.y}, // left
                    {x: enemyHead.x, y: enemyHead.y + 1}, // down
                    {x: enemyHead.x, y: enemyHead.y - 1}  // up
                ];

                dangerousPositions.push(...adjacentPositions);
            }

            // Check if the current position is near any dangerous positions
            return dangerousPositions.some(dangerPos => pos.x === dangerPos.x && pos.y === dangerPos.y);
        }
    }
};

module.exports = STRATEGIES; 