class IDAstarSolver {
    constructor(options) {
        // main.jsからBigIntに変換された状態で渡される
        this.initialBigInt = options.initialState;
        this.onSuccess = options.onSuccess;
        this.onProgress = options.onProgress;
        this.onFailure = options.onFailure;
        this.onUpdateStatus = options.onUpdateStatus;
        this.pruningOptions = options.pruningOptions;

        this.CHUNK_SIZE = 500;
        this.foundSolution = false;
        this.stopped = false;

        // IDA*用のプロパティ
        this.costLimit = 0; // 現在のg(n) の上限値（深さ制限）
        this.nextCostLimit = Infinity; // 次のイテレーションで使う上限値

        this.queue = []; // { state: BigInt, path: BigInt[], gScore, visitedInPath: Set<BigInt> }
        // 全ての深さで探索したユニークな正規化済み盤面を記録する
        const preloadedVisited = options.preloadedVisited || new Set();
        this.visited = preloadedVisited;
    }

    /**
     * ヒューリスティック関数。IDDFSではヒューリスティックを使用しないため、常に0を返す。
     * これにより、f(n) = g(n) + h(n) が f(n) = g(n) となり、探索は純粋な深さ（手数）で制限される。
     */
    _heuristic(stateBigInt) {
        return 0;
    }

    stop() {
        this.stopped = true;
    }

    start() {
        if (this.foundSolution || this.stopped) return;

        this.costLimit = (this.costLimit === 0) ? this._heuristic(this.initialBigInt) : this.nextCostLimit;
        this.nextCostLimit = Infinity;
        this.onUpdateStatus(`探索中... (深さ制限: ${this.costLimit})`);

        // 探索キューを初期化。パス内のサイクル検出のため、正規化済み盤面のSetも一緒に管理する
        const normalizedInitialBigInt = COMMON.normalizeStateBigInt(this.initialBigInt);
        this.queue = [{
            state: this.initialBigInt,
            path: [this.initialBigInt],
            gScore: 0,
            visitedInPath: new Set([normalizedInitialBigInt])
        }];

        // 探索済みセットに初期盤面を追加
        this.visited.add(normalizedInitialBigInt);

        this.onProgress({ visited: this.visited, queue: this.queue, head: 0, algorithm: 'idastar' });
        setTimeout(() => this.processChunk(), 0);
    }

    processChunk() {
        if (this.stopped) return;

        let processedInChunk = 0;
        while (this.queue.length > 0 && processedInChunk < this.CHUNK_SIZE) {
            const { state: currentBigInt, path: currentPath, gScore, visitedInPath } = this.queue.pop();
            processedInChunk++;

            const fScore = gScore + this._heuristic(currentBigInt);

            if (fScore > this.costLimit) {
                this.nextCostLimit = Math.min(this.nextCostLimit, fScore);
                continue;
            }

            // ゴール判定は正規化された状態で行う
            if (COMMON.isGoalStateBigInt(COMMON.normalizeStateBigInt(currentBigInt))) {
              this.onSuccess({ path: currentPath, message: 'IDDFS: ' });
                this.foundSolution = true;
                return;
            }

            // 子ノードを展開。pop()と組み合わせるため、reverse()で自然な探索順にする
            const nextStates = [...COMMON.getPossibleNextStatesBigInt(currentBigInt)].reverse();
            for (const nextBigInt of nextStates) {
                const normalizedNextBigInt = COMMON.normalizeStateBigInt(nextBigInt);
                // 現在の探索パス内でのサイクル検出のみを行う。
                if (!visitedInPath.has(normalizedNextBigInt)) {
                    if (this.handlePruning(currentBigInt, nextBigInt, currentPath)) {
                        if (this.foundSolution) return;
                        continue;
                    }

                    this.visited.add(normalizedNextBigInt);
                    const newVisitedInPath = new Set(visitedInPath);
                    newVisitedInPath.add(normalizedNextBigInt);

                    this.queue.push({
                        state: nextBigInt,
                        path: [...currentPath, nextBigInt],
                        gScore: gScore + 1,
                        visitedInPath: newVisitedInPath
                    });
                }
            }
        }

        this.onProgress({ visited: this.visited, queue: this.queue, head: 0, algorithm: 'idastar' });

        if (this.foundSolution || this.stopped) return;

        if (this.queue.length > 0) {
            setTimeout(() => this.processChunk(), 0);
        } else {
            // このコスト上限では解が見つからなかった。次のイテレーションを開始する。
            if (this.nextCostLimit === Infinity) {
                if (!this.stopped) this.onFailure(); // 解が存在しない
            } else {
                setTimeout(() => this.start(), 0);
            }
        }
    }

    handlePruning(currentBigInt, nextBigInt, currentPath) {
        const { usePruning, isStartOnOptimalPath, optimalPathSet, optimalPathArray } = this.pruningOptions;
        if (!usePruning) return false;

        const normalizedNextBigInt = COMMON.normalizeStateBigInt(nextBigInt);

        if (isStartOnOptimalPath) {
            if (!optimalPathSet.has(normalizedNextBigInt)) return true; // 枝刈り
        } else {
            // 最短経路データとの合流を試みる（クイック回答モード）
            if (optimalPathSet.has(normalizedNextBigInt)) {
                const pathToJunction = [...currentPath, nextBigInt];
                // optimalPathArrayは文字列の配列なので、BigIntに変換して比較する
                const junctionIndex = optimalPathArray.findIndex(state => COMMON.normalizeStateBigInt(COMMON.stateToBigInt(state)) === normalizedNextBigInt);

                if (junctionIndex === -1) return false; // 安全策

                const pathFromJunctionStrings = optimalPathArray.slice(junctionIndex);
                const pathFromJunctionBigInts = pathFromJunctionStrings.map(s => COMMON.stateToBigInt(s));
                const finalPath = [...pathToJunction.slice(0, -1), ...pathFromJunctionBigInts];

                // この合流は最短を保証しないが、高速に解を見つけるために探索を打ち切る
                this.onSuccess({ path: finalPath, message: 'IDDFS: (最適経路に合流)' });
                this.foundSolution = true;
                return true;
            }
        }
        return false;
    }
}
