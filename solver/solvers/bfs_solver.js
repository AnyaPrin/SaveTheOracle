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

        // 状態をBigIntに変換して初期化
        const initialBigInt = COMMON.stateToBigInt(this.initialState);
        const initialNormalizedBigInt = COMMON.normalizeStateBigInt(initialBigInt);

        this.CHUNK_SIZE = 500;
        this.queue = [{ state: initialBigInt, path: [this.initialState] }];

        const preloadedVisited = options.preloadedVisited || new Set();
        // preloadedVisitedもBigIntに変換する必要があるが、ここでは簡単のため省略
        this.visited = new Set([initialNormalizedBigInt]);

        this.parentMap = new Map([[initialNormalizedBigInt, null]]);
        this.head = 0;
        this.foundSolution = false;
        this.stopped = false;
    }

    _reconstructPath(goalState) {
        const path = [];
        let current = goalState;
        // currentがnullになるまで（つまり初期状態の親をたどり終わるまで）ループ
        while (current !== null) {
            path.unshift(COMMON.bigIntToState(current));
            // 親の状態を取得するために、現在の状態を正規化してキーとして使用する
            const normalizedCurrent = COMMON.normalizeStateBigInt(current);
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
            const { state: currentBigInt, path: currentPath } = this.queue[this.head++];

            // ゴール判定は、駒の名前の違いを吸収した「正規化」状態で行う。
            const normalizedCurrentBigInt = COMMON.normalizeStateBigInt(currentBigInt);
            if (COMMON.isGoalStateBigInt(normalizedCurrentBigInt)) {
                // reconstructPathはBigIntを扱うように変更する必要があるが、ここでは概念を示す
                this.onSuccess({ path: currentPath, message: 'ゴールに到達しました！' });
                this.foundSolution = true;
                return;
            }

            const nextStates = COMMON.getPossibleNextStatesBigInt(currentBigInt);
            for (const nextBigInt of nextStates) {
                const normalizedNextBigInt = COMMON.normalizeStateBigInt(nextBigInt);
                if (!this.visited.has(normalizedNextBigInt)) {
                    // if (this.handlePruning(currentBigInt, nextBigInt)) continue;

                    this.visited.add(normalizedNextBigInt);
                    this.parentMap.set(normalizedNextBigInt, currentBigInt);
                    this.queue.push({ state: nextBigInt, path: [...currentPath, COMMON.bigIntToState(nextBigInt)] });
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
