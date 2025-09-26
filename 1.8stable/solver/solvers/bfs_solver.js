class BfsSolver {
    constructor(options) {
        // main.jsからBigIntに変換された状態で渡される
        this.initialBigInt = options.initialState;
        this.onSuccess = options.onSuccess;
        this.onProgress = options.onProgress;
        this.onFailure = options.onFailure;

        this.pruningOptions = { ...options.pruningOptions };

        const initialNormalizedBigInt = COMMON.normalizeStateBigInt(this.initialBigInt);

        this.CHUNK_SIZE = 500;
        // キューには状態(BigInt)のみを保持し、パス全体は保持しない（メモリ効率化）
        this.queue = [this.initialBigInt];

        const preloadedVisited = options.preloadedVisited || new Set();
        this.visited = new Set([initialNormalizedBigInt, ...preloadedVisited]);

        // 親の状態を記録するマップ。キー:正規化済みBigInt, 値:非正規化親BigInt
        this.parentMap = new Map([[initialNormalizedBigInt, null]]);
        this.head = 0;
        this.foundSolution = false;
        this.stopped = false;
    }

    _reconstructPath(goalStateBigInt) {
        const path = [];
        let current = goalStateBigInt;
        // currentがnullになるまで（つまり初期状態の親をたどり終わるまで）ループ
        while (current !== null) {
            // BigIntのままパスの先頭に追加
            path.unshift(current);
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
            const currentBigInt = this.queue[this.head++];

            // ゴール判定は、駒の名前の違いを吸収した「正規化」状態で行う。
            const normalizedCurrentBigInt = COMMON.normalizeStateBigInt(currentBigInt);
            if (COMMON.isGoalStateBigInt(normalizedCurrentBigInt)) {
                // ゴールに到達したら、parentMapを辿ってパスを復元する
                const path = this._reconstructPath(currentBigInt);
                this.onSuccess({ path: path, message: 'BFS: ' });
                this.foundSolution = true;
                return;
            }

            const nextStates = COMMON.getPossibleNextStatesBigInt(currentBigInt);
            for (const nextBigInt of nextStates) {
                const normalizedNextBigInt = COMMON.normalizeStateBigInt(nextBigInt);
                if (!this.visited.has(normalizedNextBigInt)) {
                    if (this.handlePruning(currentBigInt, nextBigInt)) continue;

                    this.visited.add(normalizedNextBigInt);
                    this.parentMap.set(normalizedNextBigInt, currentBigInt);
                    this.queue.push(nextBigInt);
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

    handlePruning(currentBigInt, nextBigInt) {
        const { usePruning, isStartOnOptimalPath, optimalPathSet, optimalPathArray } = this.pruningOptions;
        if (!usePruning) return false;

        const normalizedNextBigInt = COMMON.normalizeStateBigInt(nextBigInt);

        if (isStartOnOptimalPath) {
            if (!optimalPathSet.has(normalizedNextBigInt)) return true; // 枝刈り
        }

        // isStartOnOptimalPathがfalseの場合の「合流」ロジックは、最短性を破壊する可能性があるため削除。
        // このロジックは、最初に見つかった合流点で探索を打ち切るが、その経路が最適である保証がないため、
        // より手数の多い解を返してしまう可能性があった。
        return false;
    }
}
