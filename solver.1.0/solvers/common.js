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

    /**
     * 盤面状態を正規化する。
     * 駒の文字表現（A, B, C...）が異なっても、駒の形状と配置が同じなら
     * 同一の文字列に変換する。
     * @param {string} state - 盤面状態の文字列
     * @returns {string} 正規化された盤面状態の文字列
     */
    normalizeState(state) {
        // 1. 盤面に出現する駒の情報を収集する（文字、サイズ、最初の出現位置）
        const pieceInfo = {};
        for (let i = 0; i < state.length; i++) {
            const char = state[i];
            if (char !== '.' && !pieceInfo[char]) {
                pieceInfo[char] = { size: 0, pos: i };
            }
            if (char !== '.') {
                pieceInfo[char].size++;
            }
        }

        // 2. 駒を「サイズが大きい順」、同じサイズなら「出現位置が早い順」でソートする。
        // これにより、例えば2x2の駒は常にリストの先頭に来るため、必ず 'A' にマッピングされる。
        const sortedPieces = Object.keys(pieceInfo).sort((a, b) => {
            const sizeDiff = pieceInfo[b].size - pieceInfo[a].size;
            if (sizeDiff !== 0) return sizeDiff;
            return pieceInfo[a].pos - pieceInfo[b].pos;
        });

        // 3. ソートされた順に、新しい駒の名前（A, B, C...）を割り当てるマッピングを作成する。
        const mapping = {};
        let nextCharCode = 'A'.charCodeAt(0);
        for (const char of sortedPieces) {
            mapping[char] = String.fromCharCode(nextCharCode++);
        }

        // 4. 作成したマッピングを元に、新しい盤面文字列を生成して返す。
        const normalizedChars = state.split('').map(char => (char === '.' ? '.' : mapping[char]));
        return normalizedChars.join('');
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
