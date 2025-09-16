document.addEventListener('DOMContentLoaded', () => {
    // --- Global State and DOM Elements ---
    let INITIAL_STATE = "BAACBAACDFFEDIJEG..H";
    let optimalPathData = { rawSet: null, normalizedSet: null, array: null };
    let searchStartTime, timerInterval;
    let currentSolver = null;

    const statusDiv = document.getElementById('status');
    const progressDetailsDiv = document.getElementById('progress-details');
    const startBtn = document.getElementById('start-btn');
    const saveBtn = document.getElementById('save-btn');
    const saveStatusDiv = document.getElementById('save-status');
    const solutionPathDiv = document.getElementById('solution-path');
    const algorithmRadios = document.getElementsByName('algorithm');
    const initialStateInput = document.getElementById('initial-state-input');
    const setStateBtn = document.getElementById('set-state-btn');
    const setStateStatusDiv = document.getElementById('set-state-status');
    const pruningCheckbox = document.getElementById('pruning-enabled');
    const pruningStatus = document.getElementById('pruning-status');

    initialStateInput.value = INITIAL_STATE;

    // --- Event Listeners ---
    startBtn.addEventListener('click', startSearch);
    setStateBtn.addEventListener('click', handleSetState);
    saveBtn.addEventListener('click', handleSave);

    // --- Functions ---

    function startSearch() {
        const selectedAlgorithm = Array.from(algorithmRadios).find(r => r.checked).value;
        const usePruning = pruningCheckbox.checked && optimalPathData.normalizedSet !== null;

        // isStartOnOptimalPathの判定を、駒の名前に依存しない「正規化」状態で行う
        const normalizedInitialState = COMMON.normalizeState(INITIAL_STATE);
        const isStartOnOptimalPath = usePruning && optimalPathData.normalizedSet.has(normalizedInitialState);

        setUIState(true); // Disable UI for search
        
        const options = {
            initialState: INITIAL_STATE,
            pruningOptions: {
                usePruning,
                isStartOnOptimalPath,
                optimalPathSet: optimalPathData.normalizedSet,
                optimalPathArray: optimalPathData.array,
            },
            onSuccess: handleSuccess,
            onFailure: handleFailure,
            onProgress: handleProgress,
            onUpdateStatus: (text) => { statusDiv.textContent = text; },
        };

        switch (selectedAlgorithm) {
            case 'bfs':
                currentSolver = new BfsSolver(options);
                break;
            case 'astar':
                currentSolver = new AstarSolver(options);
                break;
            case 'iddfs':
                currentSolver = new IddfsSolver(options);
                break;
        }
        currentSolver.start();
    }

    function handleSuccess(result) {
        const selectedAlgorithm = Array.from(algorithmRadios).find(r => r.checked).value;
        const totalTime = (performance.now() - searchStartTime) / 1000;
        displaySolution(result.path, selectedAlgorithm);
        statusDiv.textContent = `${result.message} (${result.path.length - 1}手, ${totalTime.toFixed(2)}秒)`;
        setUIState(false);
    }

    function handleFailure() {
        const totalTime = (performance.now() - searchStartTime) / 1000;
        statusDiv.textContent = `解が見つかりませんでした。 (探索時間: ${totalTime.toFixed(2)}秒)`;
        setUIState(false);
    }

    function handleProgress(progress) {
        const { visited, queue, head, algorithm } = progress;
        const exploredNodes = visited ? visited.size.toLocaleString() : 'N/A';
        const queueSize = queue ? (queue.length - (head || 0)) : 0;
        
        let html = `探索アルゴリズム: ${algorithm.toUpperCase()} | 探索済みノード数: <span class="num">${exploredNodes}</span> | キューの長さ: <span class="num">${queueSize.toLocaleString()}</span>`;

        if (searchStartTime) {
            const elapsedSeconds = (performance.now() - searchStartTime) / 1000;
            html += ` | 経過時間: <span class="num">${elapsedSeconds.toFixed(1)}</span>秒`;
        }
        progressDetailsDiv.innerHTML = html;
    }

    function setUIState(isSearching) {
        if (isSearching) {
            searchStartTime = performance.now();
            if (timerInterval) clearInterval(timerInterval);
            // Progress is updated via onProgress callback
        } else {
            clearInterval(timerInterval);
        }

        startBtn.disabled = isSearching;
        saveBtn.disabled = isSearching;
        setStateBtn.disabled = isSearching;
        initialStateInput.disabled = isSearching;
        pruningCheckbox.disabled = isSearching || !optimalPathData.set;

        if (isSearching) {
            saveStatusDiv.textContent = '';
            statusDiv.textContent = '探索中...';
            solutionPathDiv.innerHTML = '';
        }
    }

    function displaySolution(path, algorithm) {
        // BFSとA*(許容的ヒューリスティックを持つ場合)は最短を保証する
        const isOptimal = (algorithm === 'bfs' || algorithm === 'astar');
        const title = isOptimal ? '最短手数' : '発見した手数';
        let html = `<h2>${title}: ${path.length - 1}手</h2>`;
        path.forEach((state, index) => {
            let board = '';
            for (let i = 0; i < COMMON.HEIGHT; i++) {
                board += state.substring(i * COMMON.WIDTH, (i + 1) * COMMON.WIDTH) + '\n';
            }
            html += `<div class="step"><div class="step-number">${index === 0 ? 'Start' : index}</div><div class="step-board">${board.trim()}</div></div>`;
        });
        solutionPathDiv.innerHTML = html;
    }

    function handleSetState() {
        const newState = initialStateInput.value.trim().toUpperCase();
        setStateStatusDiv.textContent = '';

        if (newState.length !== COMMON.WIDTH * COMMON.HEIGHT) {
            setStateStatusDiv.style.color = '#d32f2f';
            setStateStatusDiv.textContent = `エラー: 盤面の文字列は${COMMON.WIDTH * COMMON.HEIGHT}文字である必要があります。`;
            return;
        }
        if (!/^[A-Z\.]+$/.test(newState)) {
            setStateStatusDiv.style.color = '#d32f2f';
            setStateStatusDiv.textContent = 'エラー: 使用できる文字は英大文字(A-Z)とピリオド(.)のみです。';
            return;
        }

        INITIAL_STATE = newState;
        setStateStatusDiv.style.color = '#4CAF50';
        setStateStatusDiv.textContent = '初期盤面が更新されました。';
        setTimeout(() => { setStateStatusDiv.textContent = ''; }, 3000);

        if (optimalPathData.normalizedSet) {
            const normalizedState = COMMON.normalizeState(INITIAL_STATE);
            if (optimalPathData.normalizedSet.has(normalizedState)) {
                pruningStatus.textContent = `(最短経路上: ${optimalPathData.normalizedSet.size.toLocaleString()}件のデータ利用可)`;
            } else {
                pruningStatus.textContent = `(注意: 初期盤面は最短経路上にありません)`;
            }
        }
    }
    
    function handleSave() {
        if (!currentSolver || !currentSolver.visited || currentSolver.visited.size === 0) {
            saveStatusDiv.textContent = '保存する探索データがありません。';
            return;
        }
        try {
            const visitedArray = Array.from(currentSolver.visited);
            const visitedJson = JSON.stringify(visitedArray);
            localStorage.setItem('klotskiVisitedStates', visitedJson);
            saveStatusDiv.textContent = `探索済みノード ${currentSolver.visited.size}個をlocalStorageに保存しました。`;
        } catch (e) {
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                saveStatusDiv.textContent = 'エラー: localStorageの容量制限を超えました。';
            } else {
                saveStatusDiv.textContent = `保存中にエラーが発生しました: ${e.message}`;
            }
            console.error('Failed to save to localStorage:', e);
        }
    }

    // --- Initial Load ---
    pruningStatus.textContent = '(最短解データを読込中...)';
    fetch('data.json')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            optimalPathData.rawSet = new Set(data);
            optimalPathData.array = data;
            optimalPathData.normalizedSet = new Set(data.map(state => COMMON.normalizeState(state)));
            pruningCheckbox.disabled = false;
            pruningStatus.textContent = `(データ読込完了: ${optimalPathData.rawSet.size.toLocaleString()}件)`;
        })
        .catch(error => {
            pruningStatus.textContent = '(データ読込失敗)';
            console.error('Error loading optimal path data:', error);
        });
});
