class AstarSolver {
    constructor(options) {
        this.initialState = options.initialState;
        this.onSuccess = options.onSuccess;
        this.onProgress = options.onProgress;
        this.onFailure = options.onFailure;

        this.pruningOptions = { ...options.pruningOptions };

        // A*アルゴリズム用のデータ構造
        // openSet: これから探索する盤面の優先度付きキュー。{ state, fScore } を格納。
        // ここでは単純な配列を使い、毎回fScoreが最小のものを探す。
        this.openSet = [];

        // gScore: スタートから各盤面までの実コスト（手数）。キーは正規化済み盤面。
        this.gScore = new Map();

        // parentMap: 最短経路を復元するための親子関係マップ。
        // キーは正規化済み盤面、値は正規化されていない親の盤面。
        this.parentMap = new Map();

        // closedSet: 探索済みの盤面を記録する。キーは正規化済み盤面。
        this.closedSet = new Set();

        // 初期状態を設定
        const normalizedInitial = COMMON.normalizeState(this.initialState);
        this.gScore.set(normalizedInitial, 0);
        const initialFScore = this._heuristic(this.initialState);
        this.openSet.push({ state: this.initialState, fScore: initialFScore });
        this.parentMap.set(normalizedInitial, null);

        this.CHUNK_SIZE = 250; // A*はノード毎の処理が重いので、チャンクサイズを少し小さめに
        this.foundSolution = false;
    }

    /**
     * ヒューリスティック関数。ゴールまでの推定コストを計算する。
     * ここでは、ゴールすべき駒の左上隅からゴール位置までのマンハッタン距離を使用。
     * @param {string} state - 盤面状態
     * @returns {number} 推定コスト
     */
    _heuristic(state) {
        const normalized = COMMON.normalizeState(state);
        // 正規化後のゴール駒 'A' の左上隅を探す
        const piecePos = normalized.indexOf(COMMON.GOAL_PIECE);
        if (piecePos === -1) return Infinity;

        const currentX = piecePos % COMMON.WIDTH;
        const currentY = Math.floor(piecePos / COMMON.WIDTH);

        // ゴール位置の左上隅は (1, 3)
        const goalX = 1;
        const goalY = 3;

        return Math.abs(currentX - goalX) + Math.abs(currentY - goalY);
    }

    _reconstructPath(goalState) {
        const path = [];
        let current = goalState;
        while (current !== null) {
            path.unshift(current);
            const normalizedCurrent = COMMON.normalizeState(current);
            current = this.parentMap.get(normalizedCurrent);
        }
        return path;
    }

    start() {
        this.onProgress({ visited: this.closedSet, queue: this.openSet, head: 0, algorithm: 'astar' });
        setTimeout(() => this.processChunk(), 0);
    }

    processChunk() {
        let processedInChunk = 0;
        while (this.openSet.length > 0 && processedInChunk < this.CHUNK_SIZE) {
            // openSetの中からfScoreが最も低い盤面を探す
            let lowestFScoreIndex = 0;
            for (let i = 1; i < this.openSet.length; i++) {
                if (this.openSet[i].fScore < this.openSet[lowestFScoreIndex].fScore) {
                    lowestFScoreIndex = i;
                }
            }

            const { state: currentState } = this.openSet.splice(lowestFScoreIndex, 1)[0];
            const normalizedCurrentState = COMMON.normalizeState(currentState);

            if (this.closedSet.has(normalizedCurrentState)) {
                continue;
            }

            if (COMMON.isGoalState(normalizedCurrentState)) {
                const path = this._reconstructPath(currentState);
                this.onSuccess({ path, message: 'ゴールに到達しました！' });
                this.foundSolution = true;
                return;
            }

            this.closedSet.add(normalizedCurrentState);
            processedInChunk++;

            const currentGScore = this.gScore.get(normalizedCurrentState);
            const nextStates = COMMON.getPossibleNextStates(currentState);

            for (const nextState of nextStates) {
                const normalizedNextState = COMMON.normalizeState(nextState);
                if (this.closedSet.has(normalizedNextState)) continue;

                if (this.handlePruning(currentState, nextState)) {
                    continue;
                }

                const tentativeGScore = currentGScore + 1;
                const knownGScore = this.gScore.get(normalizedNextState) ?? Infinity;

                if (tentativeGScore < knownGScore) {
                    // より良い経路が見つかった
                    this.parentMap.set(normalizedNextState, currentState);
                    this.gScore.set(normalizedNextState, tentativeGScore);
                    const fScore = tentativeGScore + this._heuristic(nextState);
                    this.openSet.push({ state: nextState, fScore });
                }
            }
        }

        this.onProgress({ visited: this.closedSet, queue: this.openSet, head: 0, algorithm: 'astar' });

        if (this.openSet.length > 0 && !this.foundSolution) {
            setTimeout(() => this.processChunk(), 0);
        } else if (!this.foundSolution) {
            this.onFailure();
        }
    }

    handlePruning(currentState, nextState) {
        const { usePruning, isStartOnOptimalPath, optimalPathSet } = this.pruningOptions;
        if (!usePruning) return false;

        const normalizedNextState = COMMON.normalizeState(nextState);

        // もし探索開始地点が既知の最短経路上にある場合、その経路から外れる手はすべて枝刈りできる。
        if (isStartOnOptimalPath) {
            if (!optimalPathSet.has(normalizedNextState)) {
                return true; // この枝は探索しない
            }
        }

        // A*では「最短経路への合流」による早期終了はバグの原因となるため、実装しない。
        return false;
    }
}