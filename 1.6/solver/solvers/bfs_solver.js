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

        const initialNormalized = COMMON.normalizeState(this.initialState);
        const preloadedVisited = options.preloadedVisited || new Set();
        this.visited = new Set([...preloadedVisited, initialNormalized]);

        this.parentMap = new Map([[initialNormalized, null]]);
        this.head = 0;
        this.foundSolution = false;
        this.stopped = false;
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

    stop() {
        this.stopped = true;
    }

    start() {
        this.onProgress({ visited: this.visited, queue: this.queue, head: this.head, algorithm: 'bfs' });
        setTimeout(() => this.processChunk(), 0);
    }

    processChunk() {
        if (this.stopped) return;

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

        // 探索が終了（成功 or 停止）していれば、次のチャンクは実行しない
        if (this.foundSolution || this.stopped) return;

        if (this.head < this.queue.length) {
            setTimeout(() => this.processChunk(), 0);
        } else {
            this.onFailure();
        }
    }

    handlePruning(currentState, nextState) {
        const { usePruning, isStartOnOptimalPath, optimalPathSet, optimalPathArray } = this.pruningOptions;
        if (!usePruning) return false;

        const normalizedNextState = COMMON.normalizeState(nextState);

        if (isStartOnOptimalPath) {
            if (!optimalPathSet.has(normalizedNextState)) return true; // 枝刈り
        }

        // isStartOnOptimalPathがfalseの場合の「合流」ロジックは、最短性を破壊するバグがあったため削除。
        // このロジックは、最初に見つかった合流点で探索を打ち切るが、その経路が最適である保証がないため、
        // より手数の多い解を返してしまう可能性があった。
        return false;
    }
}
