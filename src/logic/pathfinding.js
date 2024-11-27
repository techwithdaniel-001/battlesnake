class Node {
  constructor(pos, g = 0, h = 0) {
    this.pos = pos
    this.g = g // Cost from start to current node
    this.h = h // Estimated cost to goal
    this.f = g + h // Total cost
    this.parent = null
  }
}

function manhattanDistance(pos1, pos2) {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y)
}

function astar(start, goal, gameState) {
  const openSet = new Set([new Node(start)])
  const closedSet = new Set()
  
  while (openSet.size > 0) {
    // Get node with lowest f score
    let current = Array.from(openSet).reduce((min, node) => 
      node.f < min.f ? node : min
    )
    
    if (current.pos.x === goal.x && current.pos.y === goal.y) {
      return reconstructPath(current)
    }
    
    openSet.delete(current)
    closedSet.add(current)
    
    // Check neighbors
    const neighbors = getNeighbors(current.pos, gameState)
    for (let neighbor of neighbors) {
      if (Array.from(closedSet).some(node => 
        node.pos.x === neighbor.x && node.pos.y === neighbor.y
      )) continue
      
      const g = current.g + 1
      const h = manhattanDistance(neighbor, goal)
      const neighborNode = new Node(neighbor, g, h)
      neighborNode.parent = current
      
      if (!Array.from(openSet).some(node => 
        node.pos.x === neighbor.x && node.pos.y === neighbor.y
      )) {
        openSet.add(neighborNode)
      }
    }
  }
  
  return null // No path found
}

function reconstructPath(node) {
  const path = []
  let current = node
  
  while (current.parent) {
    path.unshift(current.pos)
    current = current.parent
  }
  
  return path
}

module.exports = {
  astar,
  manhattanDistance
} 