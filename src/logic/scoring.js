const { WEIGHTS } = require('../utils/constants')
const { shouldSeekFood, evaluateFood } = require('./tactics')

function scoreMoves(gameState, safeMoves) {
  return safeMoves.map(move => {
    const nextPos = getNextPosition(gameState.you.head, move)
    let score = 0

    // Survival scoring
    score += scoreEscapeRoutes(nextPos, gameState) * WEIGHTS.ESCAPE_ROUTES
    score += scoreSpaceControl(nextPos, gameState) * WEIGHTS.SPACE_CONTROL
    score += scoreDefensivePosition(nextPos, gameState) * WEIGHTS.DEFENSIVE_POSITION

    // Food scoring if needed
    if (shouldSeekFood(gameState)) {
      const bestFood = evaluateFood(nextPos, gameState)
      score += scoreFoodApproach(nextPos, bestFood.pos) * WEIGHTS.FOOD_SCORE
    }

    // Tricky tactics scoring
    score += scoreTrapPotential(nextPos, gameState)
    score += scoreDeceptiveMove(nextPos, gameState)

    return { move, score }
  }).sort((a, b) => b.score - a.score)
}

function scoreSpaceControl(pos, gameState) {
  let score = 0
  const floodFillResult = floodFill(pos, gameState)
  
  score += floodFillResult.accessibleSpaces
  score += floodFillResult.deadEnds * -2
  
  return score
}

function scoreDeceptiveMove(pos, gameState) {
  let score = 0
  
  // Prefer moves that look dangerous to others but are safe for us
  if (isApparentTrap(pos, gameState)) {
    score += 5
  }

  // Bonus for moves that could bait other snakes
  if (couldBaitOthers(pos, gameState)) {
    score += 3
  }

  return score
}

function scoreTrapPotential(pos, gameState) {
  let score = 0
  const otherSnakes = gameState.board.snakes.filter(s => s.id !== gameState.you.id)
  
  otherSnakes.forEach(snake => {
    if (couldTrapSnake(pos, snake, gameState)) {
      score += 10
    }
  })
  
  return score
}

module.exports = {
  scoreMoves
} 