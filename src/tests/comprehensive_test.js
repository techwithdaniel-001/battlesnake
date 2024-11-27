const STRATEGIES = require('../logic/strategies');

console.log("🚀 Starting Final Comprehensive Test Suite\n");

const testScenarios = {
    survivalTest: {
        game: { id: "survival-test" },
        turn: 1,
        board: {
            height: 11,
            width: 11,
            food: [{x: 9, y: 9}],
            snakes: [
                {
                    id: "you",
                    health: 100,
                    length: 3,
                    body: [{x: 5, y: 5}, {x: 5, y: 4}, {x: 5, y: 3}],
                    head: {x: 5, y: 5}
                },
                {
                    id: "enemy1",
                    length: 4,
                    body: [{x: 7, y: 5}, {x: 7, y: 4}, {x: 7, y: 3}, {x: 7, y: 2}],
                    head: {x: 7, y: 5}
                }
            ]
        }
    },
    
    // ... (keeping other test scenarios) ...
};

function runTest(scenario, name) {
    console.log(`\n=== Testing ${name} ===`);
    
    try {
        // Prepare gameState
        const gameState = {
            game: scenario.game,
            turn: scenario.turn,
            board: scenario.board,
            you: scenario.board.snakes.find(s => s.id === 'you')
        };

        // Test immediate strategy
        console.log("\n📊 Testing Immediate Strategy:");
        const result = STRATEGIES.calculateBestMove(gameState);
        
        console.log(`\n🎯 Final Decision:`);
        console.log(`Move: ${result.move}`);
        console.log(`Score: ${result.score}`);
        
        // Validate move
        validateMove(name, result, gameState);
        
    } catch (error) {
        console.error(`❌ Test failed for ${name}:`, error);
    }
}

function validateMove(testName, result, gameState) {
    console.log(`\n✅ Validating ${testName}:`);
    
    // Validate move is safe
    const newPos = STRATEGIES.getNewPosition(gameState.you.head, result.move);
    const isSafe = STRATEGIES.COLLISION.checkAll(newPos, gameState).safe;
    
    console.log(`Safe move: ${isSafe ? '✅' : '❌'}`);
    console.log(`Score reasonable: ${result.score > 0 ? '✅' : '❌'}`);
}

// Run all tests
Object.entries(testScenarios).forEach(([name, scenario]) => {
    runTest(scenario, name);
    console.log("\n" + "=".repeat(50));
}); 