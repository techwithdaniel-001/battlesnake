function getMoveResponse(gameState) {
  const possibleMoves = ['up', 'down', 'left', 'right']
  return possibleMoves[Math.floor(Math.random() * possibleMoves.length)]
}

module.exports = {
  getMoveResponse
} 