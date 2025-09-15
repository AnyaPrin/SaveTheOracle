class AstarSolver {
    constructor(options) {
        this.initialState = options.initialState;
        this.onSuccess = options.onSuccess;
        this.onProgress = options.onProgress;
        this.onFailure = options.onFailure;
        this.pruningOptions = options.pruningOptions;

        this.CHUNK_SIZE = 500;
        const startNode = {
            state: this.initialState, g: 0, h: this.heuristic(this.initialState),
            f: this.heuristic(this.initialState)
        };
        this.queue = [startNode];
        this.visited = new Set([this.initialState]);
        this.parentMap = new Map([[this.initialState, null]]);
        this.head = 0;
        this.foundSolution = false;
    }

    heuristic(state) {
        const GOAL_X = 1;
        const GOAL_Y = 3;
        let currentX = -1, currentY = -1;
        for (let i = 0; i < state.length; i++) {
            if (state[i] === 'A') {
                currentX = i % COMMON.WIDTH;
                currentY = Math.floor(i / COMMON.WIDTH);
                break;
            }
        }
        const dx = Math.abs(currentX - GOAL_X);
        const dy = Math.abs(currentY - GOAL_Y);
        
        const uniqueBlockers = new Set();
        if (currentY < GOAL_Y) {
            for (let y = currentY + 2; y <= GOAL_Y; y++) {
                const index1 = y * COMMON.WIDTH + currentX;
                const index2 = y * COMMON.WIDTH + currentX + 1;
                if (state[index1] !== '.' && state[index1] !== 'A') uniqueBlockers.add(state[index1]);
                if (state[index2] !== '.' && state[index2] !== 'A') uniqueBlockers.add(state[index2]);
            }
        }
        return dx + dy + uniqueBlockers.size;
    }

    start() {
        this.onProgress({ visited: this.visited, queue: this.queue, head: this.head, algorithm: 'astar' });
        setTimeout(() => this.processChunk(), 0);
    }

    processChunk() {
        let processedInChunk = 0;
        while (this.head < this.queue.length && processedInChunk < this.CHUNK_SIZE) {
            let bestNodeIndex = this.head;
            for (let i = this.head + 1; i < this.queue.length; i++) {
                if (this.queue[i].f < this.queue[bestNodeIndex].f) {
                    bestNodeIndex = i;
                }
            }
            [this.queue[this.head], this.queue[bestNodeIndex]] = [this.queue[bestNodeIndex], this.queue[this.head]];
            
            const currentNode = this.queue[this.head++];
            const { state: currentState, g: currentG } = currentNode;

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
                    const nextG = currentG + 1;
                    const nextH = this.heuristic(nextState);
                    this.queue.push({ state: nextState, g: nextG, h: nextH, f: nextG + nextH });
                }
            }
            processedInChunk++;
        }

        this.onProgress({ visited: this.visited, queue: this.queue, head: this.head, algorithm: 'astar' });

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
            if (!optimalPathSet.has(nextState)) return true;
        } else {
            if (optimalPathSet.has(nextState)) {
                this.parentMap.set(nextState, currentState);
                const pathToJunction = COMMON.reconstructPath(nextState, this.parentMap);
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
