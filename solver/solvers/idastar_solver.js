class IDAstarSolver {
    constructor(options) {
        this.initialState = options.initialState;
        this.onSuccess = options.onSuccess;
        this.onProgress = options.onProgress;
        this.onFailure = options.onFailure;
        this.onUpdateStatus = options.onUpdateStatus;
        this.pruningOptions = options.pruningOptions;

        this.CHUNK_SIZE = 500;
        this.currentDepthLimit = 0;
        this.foundSolution = false;
        this.queue = []; // { state, path, visitedInPath }
        // 全ての深さで探索したユニークな正規化済み盤面を記録する
        this.visited = new Set();
    }

    start() {
        if (this.foundSolution) return;

        this.currentDepthLimit++;
        this.onUpdateStatus(`探索中... (深さ制限: ${this.currentDepthLimit})`);

        // 探索キューを初期化。パス内のサイクル検出のため、正規化済み盤面のSetも一緒に管理する
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
        setTimeout(() => this.processChunk(), 0);
    }

    processChunk() {
        let processedInChunk = 0;
        while (this.queue.length > 0 && processedInChunk < this.CHUNK_SIZE) {
            const { state: currentState, path: currentPath, gScore, visitedInPath } = this.queue.pop();
            processedInChunk++;

            const fScore = gScore + this._heuristic(currentState, gScore);

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
                // サイクル検出に加え、グローバルな探索済みリストもチェックして枝刈りする
                if (!visitedInPath.has(normalizedNextState) && !this.visited.has(normalizedNextState)) {
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
