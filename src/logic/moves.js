const { getSafeMoves } = require('./survival')
const { scoreMoves } = require('./scoring')
const { shouldCoil } = require('./tactics')

function getMoveResponse(gameState) {
  // Check if we should coil
  if (shouldCoil(gameState)) {
    return getCoilMove(gameState)
  }

  // Get safe moves
  const safeMoves = getSafeMoves(gameState)
  
  // If no safe moves, try emergency moves
  if (safeMoves.length === 0) {
    return getEmergencyMove(gameState)
  }
  
  // Score and sort moves
  const scoredMoves = scoreMoves(gameState, safeMoves)
  
  // Return highest scored move
  return scoredMoves[0].move
}

function getCoilMove(gameState) {
  const head = gameState.you.head
  const neck = gameState.you.body[1]
  
  // Try to move in a way that brings head closer to tail
  const tail = gameState.you.body[gameState.you.body.length - 1]
  const possibleMoves = getSafeMoves(gameState)
  
  return possibleMoves.reduce((best, move) => {
    const nextPos = getNextPosition(head, move)
    const distanceToTail = getDistance(nextPos, tail)
    
    if (!best || distanceToTail < best.distance) {
      return { move, distance: distanceToTail }
    }
    return best
  }, null)?.move || possibleMoves[0]
}

function getEmergencyMove(gameState) {
  // Try to find any move that doesn't result in immediate death
  const head = gameState.you.head
  return Object.values(DIRECTIONS).find(move => {
    const nextPos = getNextPosition(head, move)
    return !willHitWall(nextPos, gameState.board)
  }) || DIRECTIONS.UP // Last resort
}

module.exports = {
  getMoveResponse
} 