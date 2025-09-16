class IDAstarSolver {
    constructor(options) {
        this.initialState = options.initialState;
        this.onSuccess = options.onSuccess;
        this.onProgress = options.onProgress;
        this.onFailure = options.onFailure;
        this.onUpdateStatus = options.onUpdateStatus;
        this.pruningOptions = options.pruningOptions;

        this.CHUNK_SIZE = 500;
        this.foundSolution = false;
        this.visited = new Set();

        this.pruningOptions = options.pruningOptions;

        this.CHUNK_SIZE = 500;
        this.foundSolution = false;

        // IDA*用のプロパティ
        this.costLimit = 0; // 現在のf(n) = g(n) + h(n) の上限値
        this.nextCostLimit = Infinity; // 次のイテレーションで使う上限値

        this.queue = []; // { state, path, gScore, visitedInPath }
        // 全ての深さで探索したユニークな正規化済み盤面を記録する
        this.visited = new Set();
    }

    /**
     * ヒューリスティック関数。ゴールまでの推定コストを計算する。
     * A*ソルバーから流用。
     */
    _heuristic(state) {
        const normalized = COMMON.normalizeState(state);
        const piecePos = normalized.indexOf(COMMON.GOAL_PIECE);
        if (piecePos === -1) return Infinity;

        const currentX = piecePos % COMMON.WIDTH;
        const currentY = Math.floor(piecePos / COMMON.WIDTH);
        const goalX = 1;
        const goalY = 3;

        const manhattanDistance = Math.abs(currentX - goalX) + Math.abs(currentY - goalY);

        let penalty = 0;
        if (currentY < goalY) {
            const belowY = currentY + 2;
            if (belowY < COMMON.HEIGHT) {
                const belowPos1 = belowY * COMMON.WIDTH + currentX;
                const belowPos2 = belowY * COMMON.WIDTH + (currentX + 1);
                if (normalized[belowPos1] !== '.' || normalized[belowPos2] !== '.') {
                    penalty = 2;
                }
            }
        }
        return manhattanDistance + penalty;
    }

    start() {
        if (this.foundSolution) return;

        this.costLimit = (this.costLimit === 0) ? this._heuristic(this.initialState) : this.nextCostLimit;
        this.nextCostLimit = Infinity;
        this.onUpdateStatus(`探索中... (コスト制限: ${this.costLimit})`);

        const normalizedInitial = COMMON.normalizeState(this.initialState);
        this.queue = [{
            state: this.initialState,
            path: [this.initialState],
            gScore: 0,
            visitedInPath: new Set([normalizedInitial])
        }];

        // 探索済みセットに初期盤面を追加
        this.visited.add(normalizedInitial);

        this.onProgress({ visited: this.visited, queue: this.queue, head: 0, algorithm: 'iddfs' });

        this.visited.add(normalizedInitial);

        this.onProgress({ visited: this.visited, queue: this.queue, head: 0, algorithm: 'idastar' });
        setTimeout(() => this.processChunk(), 0);
    }

    processChunk() {
        let processedInChunk = 0;
        while (this.queue.length > 0 && processedInChunk < this.CHUNK_SIZE) {
            const { state: currentState, path: currentPath, gScore, visitedInPath } = this.queue.pop();
            processedInChunk++;

            const fScore = gScore + this._heuristic(currentState);

            if (fScore > this.costLimit) {
                this.nextCostLimit = Math.min(this.nextCostLimit, fScore);
                continue;
            }

            if (COMMON.isGoalState(COMMON.normalizeState(currentState))) {
                this.onSuccess({ path: currentPath, message: 'ゴールに到達しました！' });
                this.foundSolution = true;
                return;
            }

            // 子ノードを展開。pop()と組み合わせるため、reverse()で自然な探索順にする
            const nextStates = [...COMMON.getPossibleNextStates(currentState)].reverse();
            for (const nextState of nextStates) {
                const normalizedNextState = COMMON.normalizeState(nextState);
                if (!visitedInPath.has(normalizedNextState)) {
                    if (this.handlePruning(currentState, nextState, currentPath)) {
                        if (this.foundSolution) return;
                        continue;
                    }

                    this.visited.add(normalizedNextState);
                    const newVisitedInPath = new Set(visitedInPath);
                    newVisitedInPath.add(normalizedNextState);

                    this.queue.push({
                        state: nextState,
                        path: [...currentPath, nextState],
                        gScore: gScore + 1,
                        visitedInPath: newVisitedInPath
                    });
                }
            }
        }

        this.onProgress({ visited: this.visited, queue: this.queue, head: 0, algorithm: 'idastar' });

        if (this.foundSolution) return;

        if (this.queue.length > 0) {
            setTimeout(() => this.processChunk(), 0);
        } else {
            // このコスト上限では解が見つからなかった。次のイテレーションを開始する。
            if (this.nextCostLimit === Infinity) {
                this.onFailure(); // 解が存在しない
            } else {
                setTimeout(() => this.start(), 0);
            }
        }
    }



    handlePruning(currentState, nextState, currentPath) {
        const { usePruning, isStartOnOptimalPath, optimalPathSet, optimalPathArray } = this.pruningOptions;
        if (!usePruning) return false;

        const normalizedNextState = COMMON.normalizeState(nextState);

        if (isStartOnOptimalPath) {
            if (!optimalPathSet.has(normalizedNextState)) return true;
        } else {
            if (optimalPathSet.has(normalizedNextState)) {
                const pathToJunction = [...currentPath, nextState];

                // 最適経路の中から、現在の局面と等価な局面（合流点）を探す
                const junctionIndex = optimalPathArray.findIndex(state => COMMON.normalizeState(state) === normalizedNextState);

                if (junctionIndex === -1) return false;

                const pathFromJunction = optimalPathArray.slice(junctionIndex);
                const finalPath = [...pathToJunction.slice(0, -1), ...pathFromJunction];

                this.onSuccess({ path: finalPath, message: 'ゴールに到達しました！ (最適経路に合流)' });
                this.foundSolution = true;
                return true;
            }
        }
        return false;
    }
}
