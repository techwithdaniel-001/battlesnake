const axios = require('axios');

async function runMassTest() {
    console.log("🚀 Starting Mass Test - 100+ Snake Instances\n");

    const testScenarios = [
        // Scenario 1: Basic Safety
        {
            name: "Basic Safety Test",
            data: {
                game: { id: "test-game" },
                turn: 1,
                board: {
                    height: 11,
                    width: 11,
                    food: [{x: 5, y: 5}],
                    snakes: [
                        {
                            id: "you",
                            health: 100,
                            body: [{x: 1, y: 1}, {x: 1, y: 2}, {x: 1, y: 3}],
                            head: {x: 1, y: 1},
                            length: 3
                        },
                        {
                            id: "enemy1",
                            body: [{x: 2, y: 1}, {x: 2, y: 2}, {x: 2, y: 3}],
                            head: {x: 2, y: 1},
                            length: 3
                        }
                    ]
                },
                you: {
                    id: "you",
                    health: 100,
                    body: [{x: 1, y: 1}, {x: 1, y: 2}, {x: 1, y: 3}],
                    head: {x: 1, y: 1},
                    length: 3
                }
            }
        },
        // Add other scenarios with complete data structure
    ];

    const results = {
        total: 0,
        safe: 0,
        unsafe: 0,
        errors: 0
    };

    // Run each scenario multiple times
    for (let i = 0; i < 34; i++) {
        for (const scenario of testScenarios) {
            results.total++;
            try {
                console.log(`\n🧪 Running Test ${results.total} (${scenario.name})`);
                
                const response = await axios.post('http://localhost:8080/move', {
                    ...scenario.data,
                    game: { 
                        ...scenario.data.game,
                        id: `mass-test-${i}-${scenario.name}`
                    }
                });

                console.log(`Response received:`, response.data);

                if (response.data && response.data.move) {
                    const move = response.data.move;
                    const isSafe = validateMove(move, scenario.data.you, scenario.data.board);

                    if (isSafe) {
                        results.safe++;
                        console.log(`✅ Safe move: ${move}`);
                    } else {
                        results.unsafe++;
                        console.log(`❌ Unsafe move: ${move}`);
                    }
                } else {
                    throw new Error('No move in response');
                }

            } catch (error) {
                results.errors++;
                console.error(`🚨 Error in test ${results.total} (${scenario.name}):`);
                console.error(`Request failed:`, error.message);
                if (error.response) {
                    console.error(`Response status:`, error.response.status);
                    console.error(`Response data:`, error.response.data);
                }
            }

            // Add small delay between tests
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    // Print final results
    console.log("\n=== Final Results ===");
    console.log(`Total tests: ${results.total}`);
    console.log(`Safe moves: ${results.safe} (${(results.safe/results.total*100).toFixed(2)}%)`);
    console.log(`Unsafe moves: ${results.unsafe} (${(results.unsafe/results.total*100).toFixed(2)}%)`);
    console.log(`Errors: ${results.errors} (${(results.errors/results.total*100).toFixed(2)}%)`);
}

function validateMove(move, snake, board) {
    const head = snake.head;
    let newPos;
    
    switch(move) {
        case 'up':
            newPos = {x: head.x, y: head.y + 1};
            break;
        case 'down':
            newPos = {x: head.x, y: head.y - 1};
            break;
        case 'left':
            newPos = {x: head.x - 1, y: head.y};
            break;
        case 'right':
            newPos = {x: head.x + 1, y: head.y};
            break;
        default:
            return false;
    }

    // Check boundaries
    if (newPos.x < 0 || newPos.x >= board.width || 
        newPos.y < 0 || newPos.y >= board.height) {
        console.log(`❌ Move would go out of bounds: ${JSON.stringify(newPos)}`);
        return false;
    }

    // Check self-collision
    for (const segment of snake.body) {
        if (newPos.x === segment.x && newPos.y === segment.y) {
            console.log(`❌ Move would hit self: ${JSON.stringify(newPos)}`);
            return false;
        }
    }

    return true;
}

// Run the mass test
console.log("Ensuring server is running on http://localhost:8080");
runMassTest().catch(error => {
    console.error("Fatal error in test suite:", error);
}); 