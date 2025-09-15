class IddfsSolver {
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
        this.queue = [];
        this.visited = new Set(); // Visited is managed per depth level
    }

    start() {
        if (this.foundSolution) return;
        
        this.currentDepthLimit++;
        this.onUpdateStatus(`探索中... (深さ制限: ${this.currentDepthLimit})`);
        
        this.queue = [{ state: this.initialState, path: [this.initialState] }];
        this.visited.clear();
        this.visited.add(this.initialState);

        this.onProgress({ visited: this.visited, queue: this.queue, head: 0, algorithm: 'iddfs' });
        setTimeout(() => this.processChunk(), 0);
    }

    processChunk() {
        let processedInChunk = 0;
        while (this.queue.length > 0 && processedInChunk < this.CHUNK_SIZE) {
            const { state: currentState, path: currentPath } = this.queue.pop();
            
            if (COMMON.isGoalState(currentState)) {
                this.onSuccess({ path: currentPath, message: 'ゴールに到達しました！' });
                this.foundSolution = true;
                return;
            }

            if (currentPath.length - 1 < this.currentDepthLimit) {
                const nextStates = COMMON.getPossibleNextStates(currentState);
                for (const nextState of nextStates) {
                    if (!currentPath.includes(nextState)) { // Cycle check for current path
                        if (this.handlePruning(currentState, nextState, currentPath)) {
                            if (this.foundSolution) return;
                            continue;
                        }
                        this.queue.push({ state: nextState, path: [...currentPath, nextState] });
                    }
                }
            }
            processedInChunk++;
        }

        this.onProgress({ visited: this.visited, queue: this.queue, head: 0, algorithm: 'iddfs' });

        if (this.foundSolution) return;

        if (this.queue.length > 0) {
            setTimeout(() => this.processChunk(), 0);
        } else {
            // No solution at this depth, start next depth
            setTimeout(() => this.start(), 0);
        }
    }

    handlePruning(currentState, nextState, currentPath) {
        const { usePruning, isStartOnOptimalPath, optimalPathSet, optimalPathArray } = this.pruningOptions;
        if (!usePruning) return false;

        if (isStartOnOptimalPath) {
            if (!optimalPathSet.has(nextState)) return true;
        } else {
            if (optimalPathSet.has(nextState)) {
                const pathToJunction = [...currentPath, nextState];
                const junctionIndex = optimalPathArray.indexOf(nextState);
                const pathFromJunction = optimalPathArray.slice(junctionIndex);
                const finalPath = [...pathToJunction.slice(0, -1), ...pathFromJunction];
                
                this.onSuccess({ path: finalPath, message: 'ゴールに到達しました！ (最短経路に合流)' });
                this.foundSolution = true;
                return true;
            }
        }
        return false;
    }
}
