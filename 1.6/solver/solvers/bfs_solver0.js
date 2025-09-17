class BfsSolver {
    constructor(options) {
        this.initialState = options.initialState;
        this.onSuccess = options.onSuccess;
        this.onProgress = options.onProgress;
        this.onFailure = options.onFailure;

        // 駒の文字表現が異なっても、形状と配置が同じなら同一局面とみなすため、
        // 状態を正規化して扱う。
        // 外部のオプションオブジェクトを変更しないよう、シャローコピーして利用する。
        this.pruningOptions = { ...options.pruningOptions };

        this.CHUNK_SIZE = 500;
        this.queue = [this.initialState];
        this.visited = new Set([COMMON.normalizeState(this.initialState)]);
        this.parentMap = new Map([[COMMON.normalizeState(this.initialState), null]]);
        this.head = 0;
        this.foundSolution = false;
    }

    _reconstructPath(goalState) {
        const path = [];
        let current = goalState;
        // currentがnullになるまで（つまり初期状態の親をたどり終わるまで）ループ
        while (current !== null) {
            path.unshift(current);
            // 親の状態を取得するために、現在の状態を正規化してキーとして使用する
            const normalizedCurrent = COMMON.normalizeState(current);
            current = this.parentMap.get(normalizedCurrent);
        }
        return path;
    }

    start() {
        this.onProgress({ visited: this.visited, queue: this.queue, head: this.head, algorithm: 'bfs' });
        setTimeout(() => this.processChunk(), 0);
    }

    processChunk() {
        let processedInChunk = 0;
        while (this.head < this.queue.length && processedInChunk < this.CHUNK_SIZE) {
            const currentState = this.queue[this.head++];

            // ゴール判定は、駒の名前の違いを吸収した「正規化」状態で行う。
            const normalizedCurrentState = COMMON.normalizeState(currentState);
            if (COMMON.isGoalState(normalizedCurrentState)) {
                const path = this._reconstructPath(currentState);
                this.onSuccess({ path, message: 'ゴールに到達しました！' });
                this.foundSolution = true;
                return;
            }

            const nextStates = COMMON.getPossibleNextStates(currentState);
            for (const nextState of nextStates) {
                const normalizedNextState = COMMON.normalizeState(nextState);
                if (!this.visited.has(normalizedNextState)) {
                    if (this.handlePruning(currentState, nextState)) continue;

                    this.visited.add(normalizedNextState);
                    this.parentMap.set(normalizedNextState, currentState);
                    this.queue.push(nextState);
                }
            }
            processedInChunk++;
        }

        this.onProgress({ visited: this.visited, queue: this.queue, head: this.head, algorithm: 'bfs' });

        if (this.head < this.queue.length && !this.foundSolution) {
            setTimeout(() => this.processChunk(), 0);
        } else if (!this.foundSolution) {
            this.onFailure();
        }
    }

    handlePruning(currentState, nextState) {
        const { usePruning, isStartOnOptimalPath, optimalPathSet, optimalPathArray } = this.pruningOptions;
        if (!usePruning) return false;

        const normalizedNextState = COMMON.normalizeState(nextState);

        if (isStartOnOptimalPath) {
            if (!optimalPathSet.has(normalizedNextState)) return true; // 枝刈り
        } else {
            if (optimalPathSet.has(normalizedNextState)) {
                this.parentMap.set(normalizedNextState, currentState);
                const pathToJunction = this._reconstructPath(nextState);

                // 最適経路の中から、現在の局面と等価な局面（合流点）を探す
                const junctionIndex = optimalPathArray.findIndex(state => COMMON.normalizeState(state) === normalizedNextState);

                // 合流点が見つからなければ、この枝刈りロジックは適用しない
                if (junctionIndex === -1) return false;

                const pathFromJunction = optimalPathArray.slice(junctionIndex);
                const finalPath = [...pathToJunction.slice(0, -1), ...pathFromJunction];

                this.onSuccess({ path: finalPath, message: 'ゴールに到達しました！ (最適経路に合流)' });
                this.foundSolution = true;
                return true; // 探索を止める
            }
        }
        return false;
    }
}
