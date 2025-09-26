class IDAstarSolver {
    constructor(options) {
        // main.jsからBigIntに変換された状態で渡される
        this.initialBigInt = options.initialState;
        this.onSuccess = options.onSuccess;
        this.onProgress = options.onProgress;
        this.onFailure = options.onFailure;
        this.onUpdateStatus = options.onUpdateStatus;
        this.algorithm = options.algorithm || 'idastar'; // 'idastar' or 'iddfs'
        this.pruningOptions = options.pruningOptions;

        this.CHUNK_SIZE = 500;
        this.foundSolution = false;
        this.stopped = false;

        // IDA*用のプロパティ
        this.costLimit = 0; // 現在のf(n) = g(n) + h(n) の上限値
        this.nextCostLimit = Infinity; // 次のイテレーションで使う上限値

        this.queue = []; // { state: BigInt, path: BigInt[], gScore, visitedInPath: Set<BigInt> }
        // 全ての深さで探索したユニークな正規化済み盤面を記録する
        const preloadedVisited = options.preloadedVisited || new Set();
        this.visited = preloadedVisited;
    }

    /**
     * ヒューリスティック関数。ゴールまでの推定コストを計算する。
     * IDDFSの場合は常に0を返す。
     */
    _heuristic(stateBigInt) {
        if (this.algorithm === 'iddfs') {
            return 0;
        }
        // IDA* のヒューリスティック計算
        const normalizedString = COMMON.bigIntToState(COMMON.normalizeStateBigInt(stateBigInt));
        const piecePos = normalizedString.indexOf(COMMON.GOAL_PIECE);
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
                if (normalizedString[belowPos1] !== '.' || normalizedString[belowPos2] !== '.') {
                    penalty = 2;
                }
            }
        }
        return manhattanDistance + penalty;
    }

    stop() {
        this.stopped = true;
    }

    start() {
        if (this.foundSolution || this.stopped) return;

        this.costLimit = (this.costLimit === 0) ? this._heuristic(this.initialBigInt) : this.nextCostLimit;
        this.nextCostLimit = Infinity;
        const limitType = this.algorithm === 'iddfs' ? '深さ制限' : 'コスト制限';
        this.onUpdateStatus(`探索中... (${limitType}: ${this.costLimit})`);

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
              const message = this.algorithm.toUpperCase() + ': ';
              this.onSuccess({ path: currentPath, message: message });
                this.foundSolution = true;
                return;
            }

            // 子ノードを展開。pop()と組み合わせるため、reverse()で自然な探索順にする
            const nextStates = [...COMMON.getPossibleNextStatesBigInt(currentBigInt)].reverse();
            for (const nextBigInt of nextStates) {
                const normalizedNextBigInt = COMMON.normalizeStateBigInt(nextBigInt);
                // IDA*では、より深い探索で同じノードを再訪問する必要があるため、
                // グローバルな訪問済みセット(this.visited)で枝刈りを行うと、正しい解を見つけられなくなる。
                // そのため、現在の探索パス内でのサイクル検出(visitedInPath)のみを行う。
                // this.visited は探索した全ノードの記録・レポート目的でのみ使用する。
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
                const message = `${this.algorithm.toUpperCase()}: (最適経路に合流)`;
                this.onSuccess({ path: finalPath, message: message });
                this.foundSolution = true;
                return true;
            }
        }
        return false;
    }
}
