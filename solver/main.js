document.addEventListener('DOMContentLoaded', () => {
    // --- Global State and DOM Elements ---
    let INITIAL_STATE = "BAACBAACDFFEDIJEG..H";
    let optimalPathData = { rawSet: null, normalizedSet: null, array: null };
    let localVisitedData = { set: null, status: '未読込' };
    let searchStartTime, timerInterval;
    let currentSolver = null;

    const statusDiv = document.getElementById('status');
    const progressDetailsDiv = document.getElementById('progress-details');
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const saveBtn = document.getElementById('save-btn');
    const saveStatusDiv = document.getElementById('save-status');
    const solutionPathDiv = document.getElementById('solution-path');
    const algorithmRadios = document.getElementsByName('algorithm');
    const initialStateInput = document.getElementById('initial-state-input');
    const setStateBtn = document.getElementById('set-state-btn');
    const setStateStatusDiv = document.getElementById('set-state-status');
    const pruningCheckbox = document.getElementById('pruning-enabled');
    const pruningStatus = document.getElementById('pruning-status');
    const useLocalVisitedCheckbox = document.getElementById('use-local-visited-enabled');
    const checkDataBtn = document.getElementById('check-data-btn');

    initialStateInput.value = INITIAL_STATE;

    // --- Event Listeners ---
    startBtn.addEventListener('click', startSearch);
    stopBtn.addEventListener('click', handleStop);
    setStateBtn.addEventListener('click', handleSetState);
    saveBtn.addEventListener('click', handleSave);
    checkDataBtn.addEventListener('click', handleCheckData);
    solutionPathDiv.addEventListener('click', (e) => {
        const boardDiv = e.target.closest('.clickable-board');
        if (boardDiv) {
            const state = boardDiv.dataset.state;
            if (state) {
                initialStateInput.value = state;
                handleSetState();
                // ユーザーが新しい盤面を設定したことを分かりやすくするため、ページ上部にスクロールする
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    });

    // --- Functions ---

    function startSearch() {
        const selectedAlgorithm = Array.from(algorithmRadios).find(r => r.checked).value;
        const usePruning = pruningCheckbox.checked && optimalPathData.normalizedSet !== null;
        const useLocalVisited = useLocalVisitedCheckbox.checked && localVisitedData.set !== null;
        const normalizedInitialState = COMMON.normalizeState(INITIAL_STATE);

        let preloadedDataForSolver = null;
        if (useLocalVisited) {
            // 開始局面が保存済みデータに含まれている場合、そのデータを使うと探索が即失敗する可能性がある。
            // (開始局面の隣接ノードが全て探索済みになり、探索が広がらないため)
            // この場合、安全策として保存済みデータの利用を一時的に無効にする。
            if (localVisitedData.set.has(normalizedInitialState)) {
                console.warn("初期盤面が保存済みデータに含まれているため、この探索では保存済みデータを利用しません。");
                statusDiv.textContent = '情報: 初期盤面が保存済みデータに含まれていたため、保存データは利用されません。';
            } else {
                preloadedDataForSolver = localVisitedData.set;
            }
        }
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
            preloadedVisited: preloadedDataForSolver,
        };

        switch (selectedAlgorithm) {
            case 'bfs':
                currentSolver = new BfsSolver(options);
                break;
            case 'astar':
                currentSolver = new AstarSolver(options);
                break;
            case 'idastar':
                currentSolver = new IDAstarSolver(options);
                break;
        }
        currentSolver.start();
    }

    function handleStop() {
        if (currentSolver) {
            currentSolver.stop();
            currentSolver = null;
        }
        setUIState(false);
        statusDiv.textContent = '探索を停止しました。';
    }

    function handleSuccess(result) {
        const selectedAlgorithm = Array.from(algorithmRadios).find(r => r.checked).value;
        const totalTime = (performance.now() - searchStartTime) / 1000;
        displaySolution(result.path, selectedAlgorithm, result.message);
        statusDiv.textContent = `${result.message} (${result.path.length - 1}手, ${totalTime.toFixed(2)}秒)`;
        setUIState(false);
        currentSolver = null;
    }

    function handleFailure() {
        const totalTime = (performance.now() - searchStartTime) / 1000;
        statusDiv.textContent = `解が見つかりませんでした。 (探索時間: ${totalTime.toFixed(2)}秒)`;
        setUIState(false);
        currentSolver = null;
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
            if (timerInterval) clearInterval(timerInterval);
            clearInterval(timerInterval);
            searchStartTime = null;
        }

        startBtn.disabled = isSearching;
        stopBtn.disabled = !isSearching;
        saveBtn.disabled = isSearching;
        checkDataBtn.disabled = isSearching;
        setStateBtn.disabled = isSearching;
        initialStateInput.disabled = isSearching;
        pruningCheckbox.disabled = isSearching || !optimalPathData.normalizedSet;
        useLocalVisitedCheckbox.disabled = isSearching || localVisitedData.status !== '読込完了';
        algorithmRadios.forEach(radio => {
            radio.closest('label').style.pointerEvents = isSearching ? 'none' : 'auto';
            radio.disabled = isSearching;
        });

        if (isSearching) {
            saveStatusDiv.textContent = '';
            statusDiv.textContent = '探索中...';
            solutionPathDiv.innerHTML = '';
        }
    }

    function displaySolution(path, algorithm, message) {
        // 「合流」による解は最短性を保証しない
        const isJunctionSolution = message && message.includes('合流');
        // BFSとA*は常に最短を保証。IDA*は合流しない場合のみ最短を保証。
        const isOptimal = (algorithm === 'bfs' || algorithm === 'astar') || (algorithm === 'idastar' && !isJunctionSolution);
        
        const title = isOptimal ? '最短手数' : '発見した手数 (最短ではない可能性あり)';
        let html = `<h4>${title}: ${path.length - 1}手</h4>`;

        function findMovedPiece(prev, curr) {
            if (!prev) return null;
            for (let i = 0; i < prev.length; i++) {
                // 以前は駒があったが、今は空白になっている場所を探す
                if (prev[i] !== curr[i] && prev[i] !== '.') {
                    return prev[i]; // 動いた駒の文字を返す
                }
            }
            return null;
        }

        path.forEach((state, index) => {
            const prevState = path[index - 1] || null;
            const movedPiece = findMovedPiece(prevState, state);

            let boardHtml = '';
            for (let i = 0; i < state.length; i++) {
                const char = state[i];
                boardHtml += (movedPiece && char === movedPiece)
                    ? `<span class="moved-piece">${char}</span>`
                    : char;
                if ((i + 1) % COMMON.WIDTH === 0) boardHtml += '\n';
            }
            html += `<div class="step"><div class="step-number">${index === 0 ? 'Start' : index}</div><div class="step-board clickable-board" data-state="${state}">${boardHtml.trim()}</div></div>`;
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
            // 既存のデータと新しいデータをマージする
            const existingData = localVisitedData.set ? [...localVisitedData.set] : [];
            const newData = [...currentSolver.visited];
            const mergedSet = new Set([...existingData, ...newData]);

            const visitedArray = Array.from(mergedSet);
            const visitedJson = JSON.stringify(visitedArray);
            localStorage.setItem('klotskiVisitedStates', visitedJson);

            // 保存後、グローバル変数も更新
            localVisitedData.set = mergedSet;
            localVisitedData.status = '読込完了';
            saveStatusDiv.textContent = `探索済みノードをlocalStorageに保存しました。(合計: ${mergedSet.size.toLocaleString()}件)`;
        } catch (e) {
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                saveStatusDiv.textContent = 'エラー: localStorageの容量制限を超えました。';
            } else {
                saveStatusDiv.textContent = `保存中にエラーが発生しました: ${e.message}`;
            }
            console.error('Failed to save to localStorage:', e);
        }
    }

    function handleCheckData() {
        saveStatusDiv.textContent = 'データチェック中...';
        saveStatusDiv.style.color = '#666';

        // 以前のクリーンアップボタンが残っていれば削除
        const oldCleanupBtn = document.getElementById('cleanup-btn');
        if (oldCleanupBtn) oldCleanupBtn.parentElement.removeChild(oldCleanupBtn);

        try {
            const savedVisitedJson = localStorage.getItem('klotskiVisitedStates');
            if (!savedVisitedJson) {
                saveStatusDiv.textContent = 'チェックするlocalStorageデータがありません。';
                return;
            }

            const savedVisitedArray = JSON.parse(savedVisitedJson);
            const originalCount = savedVisitedArray.length;
            const uniqueSet = new Set(savedVisitedArray);
            const uniqueCount = uniqueSet.size;

            if (originalCount === uniqueCount) {
                saveStatusDiv.style.color = '#4CAF50';
                saveStatusDiv.textContent = `データは正常です。重複するノードはありませんでした。(${originalCount.toLocaleString()}件)`;
            } else {
                const duplicateCount = originalCount - uniqueCount;
                saveStatusDiv.style.color = '#d32f2f';
                
                const messageSpan = document.createElement('span');
                messageSpan.textContent = `警告: ${duplicateCount.toLocaleString()}件の重複ノードが見つかりました。データをクリーンアップしますか？ `;
                
                const cleanupBtn = document.createElement('button');
                cleanupBtn.id = 'cleanup-btn';
                cleanupBtn.textContent = 'はい';
                cleanupBtn.style.marginLeft = '10px';
                cleanupBtn.style.padding = '2px 8px';
                cleanupBtn.onclick = () => {
                    localStorage.setItem('klotskiVisitedStates', JSON.stringify(Array.from(uniqueSet)));
                    localVisitedData.set = uniqueSet; // メモリ上のデータも更新
                    saveStatusDiv.style.color = '#4CAF50';
                    saveStatusDiv.textContent = `データをクリーンアップしました。 (重複${duplicateCount.toLocaleString()}件を削除 → ${uniqueCount.toLocaleString()}件)`;
                };
                saveStatusDiv.textContent = '';
                saveStatusDiv.appendChild(messageSpan);
                saveStatusDiv.appendChild(cleanupBtn);
            }
        } catch (e) {
            saveStatusDiv.style.color = '#d32f2f';
            saveStatusDiv.textContent = `データチェック中にエラーが発生しました: ${e.message}`;
            console.error('Error during data check:', e);
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

    // --- 共有＆ローカルの探索済みデータを読み込む ---
    // 1. まず共有された探索済みデータ(shared_visited.json)を非同期で読み込む
    fetch('shared_visited.json')
        .then(response => {
            // ファイルが存在し、レスポンスが正常ならJSONとして解析する
            if (response.ok) return response.json();
            // ファイルが存在しない等の場合は、空の配列として扱う
            return [];
        })
        .catch(error => {
            // ネットワークエラーなど、読み込み自体に失敗した場合
            console.warn('shared_visited.jsonの読み込みに失敗しました。', error);
            return [];
        })
        .then(sharedVisited => {
            // 2. 次に個人のlocalStorageからデータを読み込む
            let localVisited = [];
            try {
                const savedVisitedJson = localStorage.getItem('klotskiVisitedStates');
                if (savedVisitedJson) {
                    localVisited = JSON.parse(savedVisitedJson);
                }
            } catch (e) {
                console.error('localStorageからのデータ読み込みに失敗しました。', e);
            }

            // 3. 共有データと個人データをマージして、ユニークなSetを作成する
            const mergedSet = new Set([...sharedVisited, ...localVisited]);

            if (mergedSet.size > 0) {
                localVisitedData.set = mergedSet;
                localVisitedData.status = '読込完了';
                useLocalVisitedCheckbox.disabled = false;
                // メッセージを追記して、マージ後の合計件数を表示
                pruningStatus.textContent += ` | 保存済みデータ: ${mergedSet.size.toLocaleString()}件`;
            } else {
                localVisitedData.status = 'データなし';
            }
        });
});
