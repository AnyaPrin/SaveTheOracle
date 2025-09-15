const COMMON = {
    WIDTH: 4,
    HEIGHT: 5,
    GOAL_PIECE: 'A',

    isGoalState(state) {
        return state[13] === this.GOAL_PIECE && state[14] === this.GOAL_PIECE &&
               state[17] === this.GOAL_PIECE && state[18] === this.GOAL_PIECE;
    },

    reconstructPath(goalState, parentMap) {
        const path = [];
        let current = goalState;
        while (current !== null) {
            path.unshift(current);
            current = parentMap.get(current);
        }
        return path;
    },

    getPossibleNextStates(state) {
        const nextStates = new Set();
        const processedPieces = new Set();
        for (let i = 0; i < state.length; i++) {
            const piece = state[i];
            if (piece !== '.' && !processedPieces.has(piece)) {
                processedPieces.add(piece);
                const positions = [];
                for (let j = 0; j < state.length; j++) {
                    if (state[j] === piece) {
                        positions.push({ x: j % this.WIDTH, y: Math.floor(j / this.WIDTH) });
                    }
                }
                const directions = [
                    { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
                    { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
                ];
                for (const dir of directions) {
                    if (this.canMove(state, positions, dir)) {
                        nextStates.add(this.movePiece(state, positions, dir));
                    }
                }
            }
        }
        return nextStates;
    },

    canMove(state, positions, dir) {
        for (const pos of positions) {
            const nextX = pos.x + dir.dx;
            const nextY = pos.y + dir.dy;
            if (nextX < 0 || nextX >= this.WIDTH || nextY < 0 || nextY >= this.HEIGHT) return false;
            const targetCell = state[nextY * this.WIDTH + nextX];
            const isPartOfSelf = positions.some(p => p.x === nextX && p.y === nextY);
            if (targetCell !== '.' && !isPartOfSelf) return false;
        }
        return true;
    },

    movePiece(state, positions, dir) {
        const newBoard = state.split('');
        const pieceChar = state[positions[0].y * this.WIDTH + positions[0].x];
        for (const pos of positions) {
            newBoard[pos.y * this.WIDTH + pos.x] = '.';
        }
        for (const pos of positions) {
            const newIndex = (pos.y + dir.dy) * this.WIDTH + (pos.x + dir.dx);
            newBoard[newIndex] = pieceChar;
        }
        return newBoard.join('');
    }
};
