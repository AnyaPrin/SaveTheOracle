class BfsSolver {
    constructor(options) {
        this.initialState = options.initialState;
        this.onSuccess = options.onSuccess;
        this.onProgress = options.onProgress;
        this.onFailure = options.onFailure;
        this.pruningOptions = options.pruningOptions;

        this.CHUNK_SIZE = 500;
        this.queue = [this.initialState];
        this.visited = new Set([this.initialState]);
        this.parentMap = new Map([[this.initialState, null]]);
        this.head = 0;
        this.foundSolution = false;
    }

    start() {
        this.onProgress({ visited: this.visited, queue: this.queue, head: this.head, algorithm: 'bfs' });
        setTimeout(() => this.processChunk(), 0);
    }

    processChunk() {
        let processedInChunk = 0;
        while (this.head < this.queue.length && processedInChunk < this.CHUNK_SIZE) {
            const currentState = this.queue[this.head++];

            if (COMMON.isGoalState(currentState)) {
                const path = COMMON.reconstructPath(currentState, this.parentMap);
                this.onSuccess({ path, message: 'ゴールに到達しました！' });
                this.foundSolution = true;
                return;
            }

            const nextStates = COMMON.getPossibleNextStates(currentState);
            for (const nextState of nextStates) {
                if (!this.visited.has(nextState)) {
                    if (this.handlePruning(currentState, nextState)) continue;

                    this.visited.add(nextState);
                    this.parentMap.set(nextState, currentState);
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

        if (isStartOnOptimalPath) {
            if (!optimalPathSet.has(nextState)) return true; // 枝刈り
        } else {
            if (optimalPathSet.has(nextState)) {
                this.parentMap.set(nextState, currentState);
                const pathToJunction = COMMON.reconstructPath(nextState, this.parentMap);
                const junctionIndex = optimalPathArray.indexOf(nextState);
                const pathFromJunction = optimalPathArray.slice(junctionIndex);
                const finalPath = [...pathToJunction.slice(0, -1), ...pathFromJunction];

                this.onSuccess({ path: finalPath, message: 'ゴールに到達しました！ (最短経路に合流)' });
                this.foundSolution = true;
                return true; // 探索を止める
            }
        }
        return false;
    }
}
