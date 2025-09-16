/**
 * 優先度付きキュー（最小ヒープ）の実装。
 * A*アルゴリズムのopenSetを効率的に管理するために使用する。
 */
class PriorityQueue {
    constructor() {
        this.heap = [];
    }

    enqueue(item) { // itemは { state, fScore } のようなオブジェクト
        this.heap.push(item);
        this._bubbleUp(this.heap.length - 1);
    }

    dequeue() {
        if (this.isEmpty()) return null;
        this._swap(0, this.heap.length - 1);
        const min = this.heap.pop();
        if (!this.isEmpty()) {
            this._bubbleDown(0);
        }
        return min;
    }

    isEmpty() {
        return this.heap.length === 0;
    }

    get length() {
        return this.heap.length;
    }

    _getParentIndex(i) { return Math.floor((i - 1) / 2); }
    _getLeftChildIndex(i) { return 2 * i + 1; }
    _getRightChildIndex(i) { return 2 * i + 2; }
    _swap(i, j) { [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]]; }

    _bubbleUp(index) {
        let i = index;
        while (i > 0 && this.heap[i].fScore < this.heap[this._getParentIndex(i)].fScore) {
            const parentIndex = this._getParentIndex(i);
            this._swap(i, parentIndex);
            i = parentIndex;
        }
    }

    _bubbleDown(index) {
        let i = index;
        while (this._getLeftChildIndex(i) < this.heap.length) {
            let smallestChildIndex = this._getLeftChildIndex(i);
            const rightChildIndex = this._getRightChildIndex(i);
            if (rightChildIndex < this.heap.length && this.heap[rightChildIndex].fScore < this.heap[smallestChildIndex].fScore) {
                smallestChildIndex = rightChildIndex;
            }
            if (this.heap[i].fScore <= this.heap[smallestChildIndex].fScore) break;
            this._swap(i, smallestChildIndex);
            i = smallestChildIndex;
        }
    }
}

class AstarSolver {
    constructor(options) {
        this.initialState = options.initialState;
        this.onSuccess = options.onSuccess;
        this.onProgress = options.onProgress;
        this.onFailure = options.onFailure;

        this.pruningOptions = { ...options.pruningOptions };
        // A*アルゴリズム用のデータ構造
        // openSet: 効率的な優先度付きキューを使用する
        this.openSet = new PriorityQueue();

        // gScore: スタートから各盤面までの実コスト（手数）。キーは正規化済み盤面。
        this.gScore = new Map();

        // parentMap: 最短経路を復元するための親子関係マップ。
        // キーは正規化済み盤面、値は正規化されていない親の盤面。
        this.parentMap = new Map();

        // closedSet: 探索済みの盤面を記録する。キーは正規化済み盤面。
        const preloadedVisited = options.preloadedVisited || new Set();
        const normalizedInitial = COMMON.normalizeState(this.initialState);
        // プリロードされたデータに現在の初期盤面が含まれていると探索が即終了するため、削除しておく
        preloadedVisited.delete(normalizedInitial);
        this.closedSet = preloadedVisited;

        // 初期状態を設定
        this.gScore.set(normalizedInitial, 0);
        const initialFScore = this._heuristic(this.initialState);
        this.openSet.enqueue({ state: this.initialState, fScore: initialFScore });
        this.parentMap.set(normalizedInitial, null);

        this.CHUNK_SIZE = 250; // A*はノード毎の処理が重いので、チャンクサイズを少し小さめに
        this.foundSolution = false;
        this.stopped = false;
    }

    /**
     * ヒューリスティック関数。ゴールまでの推定コストを計算する。
     * マンハッタン距離に加え、ゴールへの直接的な経路が他の駒でブロックされている場合に
     * ペナルティを追加し、より現実に近いコストを推定する。
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

        // 1. 基本となるマンハッタン距離
        const manhattanDistance = Math.abs(currentX - goalX) + Math.abs(currentY - goalY);

        // 2. ゴールへの垂直経路がブロックされている場合のペナルティ
        let penalty = 0;
        // 'A'がまだゴールより上にあり、垂直方向に動く必要がある場合
        if (currentY < goalY) {
            // 'A'の真下にある2マスを確認
            const belowY = currentY + 2;
            if (belowY < COMMON.HEIGHT) {
                const belowPos1 = belowY * COMMON.WIDTH + currentX;
                const belowPos2 = belowY * COMMON.WIDTH + (currentX + 1);
                // 2マスのうち、どちらか一方でも空白でなければブロックされているとみなす
                if (normalized[belowPos1] !== '.' || normalized[belowPos2] !== '.') {
                    // ブロックを解消するには、最低でもブロッカーを動かす(1手)＋'A'を動かす(1手)で2手かかると推定。
                    // この「+2」のペナルティにより、A*はブロックされていない経路をより賢く優先するようになる。
                    penalty = 2;
                }
            }
        }

        return manhattanDistance + penalty;
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

    stop() {
        this.stopped = true;
    }

    start() {
        this.onProgress({ visited: this.closedSet, queue: this.openSet, head: 0, algorithm: 'astar' });
        setTimeout(() => this.processChunk(), 0);
    }

    processChunk() {
        if (this.stopped) return;

        let processedInChunk = 0;
        while (!this.openSet.isEmpty() && processedInChunk < this.CHUNK_SIZE) {
            // 優先度付きキューからfScoreが最小の盤面を効率的に取り出す
            const { state: currentState } = this.openSet.dequeue();
            const normalizedCurrentState = COMMON.normalizeState(currentState);

            // 既に処理済みの、より良い経路が見つかっている盤面はスキップ
            if (this.closedSet.has(normalizedCurrentState)) continue;

            if (COMMON.isGoalState(normalizedCurrentState)) {
                const path = this._reconstructPath(currentState);
                this.onSuccess({ path, message: '探索成功 '});
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
                    this.openSet.enqueue({ state: nextState, fScore });
                }
            }
        }

        this.onProgress({ visited: this.closedSet, queue: this.openSet, head: 0, algorithm: 'astar' });

        // 探索が終了（成功 or 停止）していれば、次のチャンクは実行しない
        if (this.foundSolution || this.stopped) return;

        if (!this.openSet.isEmpty()) {
            setTimeout(() => this.processChunk(), 0);
        } else {
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