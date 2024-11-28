function aStarPathfinding(start, goal, board) {
    const openSet = new Set();
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    openSet.add(start);
    gScore.set(start, 0);
    fScore.set(start, heuristic(start, goal));

    while (openSet.size > 0) {
        const current = getLowestFScore(openSet, fScore);

        if (current === goal) {
            return reconstructPath(cameFrom, current);
        }

        openSet.delete(current);
        closedSet.add(current);

        for (const neighbor of getNeighbors(current, board)) {
            if (closedSet.has(neighbor) || isOutOfBounds(neighbor, board)) {
                continue; // Ignore the neighbor which is already evaluated or out of bounds
            }

            const tentativeGScore = gScore.get(current) + 1; // Assume cost is 1

            if (!openSet.has(neighbor)) {
                openSet.add(neighbor); // Discover a new node
            } else if (tentativeGScore >= (gScore.get(neighbor) || Infinity)) {
                continue; // This is not a better path
            }

            // This path is the best until now. Record it!
            cameFrom.set(neighbor, current);
            gScore.set(neighbor, tentativeGScore);
            fScore.set(neighbor, tentativeGScore + heuristic(neighbor, goal));
        }
    }

    return []; // Return an empty path if there is no path
}

function floodFill(start, board) {
    const visited = new Set();
    const queue = [start];
    let spaceCount = 0;

    while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current) || isOutOfBounds(current, board)) {
            continue;
        }

        visited.add(current);
        spaceCount++;

        for (const neighbor of getNeighbors(current, board)) {
            if (!visited.has(neighbor) && !isWall(neighbor, board)) {
                queue.push(neighbor);
            }
        }
    }

    return spaceCount; // Return the count of accessible spaces
} 