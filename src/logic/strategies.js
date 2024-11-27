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
            if (this.isWallCollision(pos, gameState.board)) {
                return { safe: false, reason: 'wall' };
            }

            // Check ALL snake body collisions (including our own) with extra safety buffer
            for (const snake of gameState.board.snakes) {
                // Check every segment of every snake
                for (let i = 0; i < snake.body.length; i++) {
                    const segment = snake.body[i];
                    
                    // Direct collision check
                    if (pos.x === segment.x && pos.y === segment.y) {
                        return { 
                            safe: false, 
                            reason: snake.id === gameState.you.id ? 'self' : 'enemy'
                        };
                    }

                    // Add safety buffer around snake bodies
                    const dangerouslyClose = Math.abs(pos.x - segment.x) + Math.abs(pos.y - segment.y) <= 1;
                    if (dangerouslyClose && i !== 0) { // Don't apply buffer to heads
                        console.log(`⚠️ Too close to ${snake.id}'s body at ${JSON.stringify(segment)}`);
                        return { 
                            safe: false, 
                            reason: 'tooClose'
                        };
                    }
                }

                // Special head-to-head logic
                if (snake.id !== gameState.you.id) {
                    const headCollisionRisk = this.checkHeadToHead(pos, snake, gameState.you);
                    if (headCollisionRisk) {
                        return { safe: false, reason: 'headRisk' };
                    }
                }
            }

            // Extra safety: check for potential trap situations
            if (this.isPotentialTrap(pos, gameState)) {
                return { safe: false, reason: 'trap' };
            }

            return { safe: true, reason: 'clear' };
        },

        isPotentialTrap: function(pos, gameState) {
            // Count available exits from this position
            let exits = 0;
            const moves = [
                {x: pos.x + 1, y: pos.y},
                {x: pos.x - 1, y: pos.y},
                {x: pos.x, y: pos.y + 1},
                {x: pos.x, y: pos.y - 1}
            ];

            for (const move of moves) {
                let isBlocked = false;

                // Check if move is off board
                if (move.x < 0 || move.x >= gameState.board.width ||
                    move.y < 0 || move.y >= gameState.board.height) {
                    isBlocked = true;
                    continue;
                }

                // Check if move hits any snake
                for (const snake of gameState.board.snakes) {
                    for (const segment of snake.body) {
                        if (move.x === segment.x && move.y === segment.y) {
                            isBlocked = true;
                            break;
                        }
                    }
                    if (isBlocked) break;
                }

                if (!isBlocked) exits++;
            }

            // If there's only one exit, it's a potential trap
            const isTrap = exits < 2;
            if (isTrap) {
                console.log(`🚫 Potential trap detected at ${JSON.stringify(pos)} - only ${exits} exits`);
            }
            return isTrap;
        },

        checkHeadToHead: function(pos, enemySnake, ourSnake) {
            // Calculate possible enemy head positions
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
                    // Only safe if we're strictly longer (not equal)
                    const isSafe = ourSnake.length > enemySnake.length;
                    console.log(`🐍 Head-to-head with ${enemySnake.id}: ${isSafe ? 'safe' : 'unsafe'}`);
                    return !isSafe;
                }
            }

            return false;
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
                console.log("⚠️ Medium Health: Balanced strategy");
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
        try {
            const scores = {
                survival: STRATEGIES.COLLISION.checkAll(pos, gameState).safe ? 1000 : -Infinity,
                space: STRATEGIES.SPACE.calculateScore(pos, gameState),
                aggression: STRATEGIES.AGGRESSION.calculateScore(pos, gameState),
                food: STRATEGIES.FOOD.calculateFoodValue(pos, gameState),
                risk: -STRATEGIES.FOOD.calculateRiskFactor(pos, null, gameState)
            };

            console.log(`💯 Position ${JSON.stringify(pos)} scores:`, scores);

            // If survival is -Infinity, return it immediately
            if (scores.survival === -Infinity) {
                return -Infinity;
            }

            const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
            console.log(`📊 Total score: ${totalScore}`);

            return totalScore;
        } catch (error) {
            console.error(`❌ Error calculating total score: ${error.message}`);
            return -Infinity;
        }
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
            if (!gameState.board.food || gameState.board.food.length === 0) {
                console.log("🍽️ No food on board");
                return 0;
            }

            // Find nearest food
            let nearestFood = null;
            let shortestDistance = Infinity;

            for (const food of gameState.board.food) {
                const distance = Math.abs(food.x - pos.x) + Math.abs(food.y - pos.y);
                if (distance < shortestDistance) {
                    shortestDistance = distance;
                    nearestFood = food;
                }
            }

            if (!nearestFood) return 0;

            // Calculate base value
            let value = 1000;

            // Distance penalty
            value -= shortestDistance * 50;

            // Competition check
            gameState.board.snakes.forEach(snake => {
                if (snake.id === gameState.you.id) return;
                
                const enemyDistance = Math.abs(nearestFood.x - snake.head.x) + 
                                    Math.abs(nearestFood.y - snake.head.y);
                
                if (enemyDistance <= shortestDistance) {
                    console.log("🏃 Competition for food detected");
                    value -= 300;
                }
            });

            // Edge food bonus
            if (nearestFood.x === 0 || nearestFood.x === gameState.board.width - 1 ||
                nearestFood.y === 0 || nearestFood.y === gameState.board.height - 1) {
                console.log("🎯 Edge food bonus");
                value += 200;
            }

            // Health urgency modifier
            if (gameState.you.health < 30) {
                console.log("⚠️ Low health bonus");
                value *= 1.5;
            }

            console.log(`🍎 Food value: ${value} (distance: ${shortestDistance})`);
            return value;
        },

        calculateRiskFactor: function(pos, food, gameState) {
            let risk = 0;

            // Check if near walls
            if (pos.x === 0 || pos.x === gameState.board.width - 1 ||
                pos.y === 0 || pos.y === gameState.board.height - 1) {
                risk += 100;
            }

            // Check proximity to other snakes
            gameState.board.snakes.forEach(snake => {
                if (snake.id === gameState.you.id) return;
                
                snake.body.forEach(segment => {
                    const distanceToSegment = Math.abs(pos.x - segment.x) + 
                                            Math.abs(pos.y - segment.y);
                    if (distanceToSegment <= 2) {
                        risk += 150;
                    }
                });
            });

            console.log(`⚠️ Risk factor: ${risk}`);
            return risk;
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
        }
    },

    calculateBestMove: function(gameState) {
        console.log("🎲 Calculating best immediate move");
        const possibleMoves = ['up', 'down', 'left', 'right'];
        let bestMove = null;
        let bestScore = -Infinity;

        for (const move of possibleMoves) {
            const newPos = this.getNewPosition(gameState.you.head, move);
            console.log(`\n🔍 Evaluating ${move} to ${JSON.stringify(newPos)}`);

            // Check if move is safe
            const safetyCheck = this.COLLISION.checkAll(newPos, gameState);
            if (!safetyCheck.safe) {
                console.log(`❌ ${move} is unsafe: ${safetyCheck.reason}`);
                continue;
            }

            // Calculate total score for this move
            const score = this.calculateTotalScore(newPos, gameState);
            console.log(`📊 ${move} score: ${score}`);

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return { move: bestMove, score: bestScore };
    },

    getNewPosition: function(head, move) {
        switch(move) {
            case 'up': return {x: head.x, y: head.y + 1};
            case 'down': return {x: head.x, y: head.y - 1};
            case 'left': return {x: head.x - 1, y: head.y};
            case 'right': return {x: head.x + 1, y: head.y};
        }
    }
};

module.exports = STRATEGIES; 