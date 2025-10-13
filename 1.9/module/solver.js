import { SolDisp } from "./soldisp.js";
import { COMMON } from "./common.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- Global State and DOM Elements ---
    const ui = document.querySelector('.ui-panel');
    const sol = document.querySelector('.sol-panel');
    const actBtn = document.querySelector('.action-buttons');
    const status = document.getElementById('status');
    const summary = document.getElementById('search-summary');
    const progress = document.getElementById('progress-details');
    const solPath = document.getElementById('sol-path');
    const defStart = document.getElementById('start-pos');
    const svBtn = document.getElementById('sv-btn');
    const setStBtn = document.getElementById('set-state-btn');
    const ckDtBtn = document.getElementById('check-data-btn');
    const prunCb = document.getElementById('prun-enabled');
    const loVstCb = document.getElementById('use-local-visited');
    const loVstDtSt = document.getElementById('local-visited-data-status');
    const svStts = document.getElementById('sv-status');
    const setSt = document.getElementById('set-state-status');
    const prunDt = document.getElementById('prun-data-status');
    const idaOpt = document.getElementById('ida-opt-label');
    const COLORS = {
        error: '#d32f2f',
        warning: '#e34f4f',
        success: '#4CAF50',
        info: '#666',
    };
    const ASSET_PATH = {
        BG_IMAGES: {
            bfs: '../img/bg_bfs.webp',
            astar: '../img/bg_astar.webp',
            idastar: '../img/bg_idastar.webp'
        },
        ICONS: {
            stop: '../img/icon/stop.png',
            getAlgoIcon: (algo) => `../img/icon/${algo}.png`
        },
        DATA_FILES: {
            optPath: '../../data/opt_path.json',
            sharedVisited: '../../data/shared_visited.dat'
        },
        MIKOTO_SLIDES: [
            '../img/mikoto/slide_0.webp',
            '../img/mikoto/slide_1.webp',
            '../img/mikoto/slide_2.webp',
            '../img/mikoto/slide_3.webp',
            '../img/mikoto/slide_4.webp',
            '../img/mikoto/slide_5.webp'
        ]
    };
    let START_POS = "BAACBAACDFFEDIJEG..H";  // 探索開始の配置状態
    let optPathData = { rawSet: null, normalizedSet: null, array: null };
    let loVstDt = {
        fullset: { set: new Set(), status: '未読込' },
        subset: { set: new Set(), status: '未読込' }
    };
    let searchStartTime, timerInterval, mikotoTimer = null;
    let currentSolver = null;

    const MIKOTO_SPEECH_WAIT = 5000; // デバッグ用に5秒に設定

    defStart.value = START_POS;
    const FULL_SET_SIGN = COMMON.getBlksSign(START_POS);


    //// --- URLパラメータから探索開始状態を読み込む ---
    //const urlParams = new URLSearchParams(window.location.search);
    //const stateFromUrl = urlParams.get('state');
    //if (stateFromUrl) {
        //// URLに 'state' パラメータがあれば、その値を探索開始状態として設定
        // defStart.value = stateFromUrl.toUpperCase();
        //// 既存の盤面設定処理を呼び出して、検証とUI更新を行う
    // handleSetState();
    //}

    // --- Event Listeners ---
    ui.addEventListener('click', (e) => {
        // イベント委譲(Event Delegation)パターン:
        // 個々のボタンにイベントリスナーを設定する代わりに、親要素(ui)でイベントを一度に受け取る。
        // これにより、動的にボタンが変化（探索→停止）しても、イベント処理が正しく機能する。
        const button = e.target.closest('button'); // クリックされた要素、またはその親からボタンを探す
        if (!button || button.disabled) return;

        // Handle set state button
        if (button.id === 'set-state-btn') {
            handleSetState();
            return;
        }

        // Handle action buttons
        if (button.closest('.action-buttons')) {
            if (button.classList.contains('start-algorithm-btn')) {
                let algorithm = button.value;
                // IDA*の場合、チェックボックスの状態に応じてアルゴリズムを決定
                if (algorithm === 'idastar' && document.getElementById('ida-no-heuristic').checked) {
                    algorithm = 'iddfs';
                }
                startSearch(algorithm);
            } else if (button.classList.contains('stop-btn')) {
                handleStop();
            } else if (button.id === 'sv-btn') {
                handleSv();
            } else if (button.id === 'check-data-btn') {
                handleCheckData();
            }
        }
    });

    // --- Background Image Handling ---
    let lockedBgUrl = null;
    function setContainerBackground(algo) {
        // lockedBgUrlが設定されている（＝探索中）場合は、ホバーによる背景変更を無視する
        if (lockedBgUrl) return;
        if (algo && ASSET_PATH.BG_IMAGES[algo]) {
            // CSS変数(--after-bg-image)を動的に設定し、CSS側で::after擬似要素の背景画像として利用する。
            // これにより、opacityを使った滑らかなフェードイン・アウトが可能になる。
            ui.style.setProperty('--after-bg-image', `url(${ASSET_PATH.BG_IMAGES[algo]})`);
            ui.classList.add('bg-active');
        } else {
            // マウスが離れた場合(algoがnull)は、デフォルトの背景に戻す
            ui.classList.remove('bg-active');
        }
    }

    // --- Tltip Handling ---
    document.querySelectorAll('.icon-btn-label').forEach(label => {
        const tltip = label.querySelector('.tltip-text');
        const startBtn = label.querySelector('.start-algorithm-btn');
        const arrowMargin = 12; // 矢印の高さ(5px) + アイコンとの隙間

        label.addEventListener('mouseenter', () => {
            if (startBtn) {
                // IDA*にホバーした時だけオプションを表示
                if (idaOpt) {
                    idaOpt.hidden = (startBtn.value !== 'idastar');
                }

                setContainerBackground(startBtn.value);
            }
            if (tltip) {
                // ツールチップの位置を動的に計算し、画面からはみ出さないように調整する。
                // CSSの:hoverだけでは実現が難しいため、JavaScriptで位置を計算する。

                // 1. ツールチップを一旦表示状態にして、そのサイズ(tltipRect)を取得する
                tltip.classList.add('visible');
                tltip.classList.remove('arrow-up', 'arrow-down'); // 向きをリセット

                const iconRect = label.getBoundingClientRect();
                const tltipRect = tltip.getBoundingClientRect();
                const viewportWidth = window.innerWidth;

                let top, left;

                // 2. 画面上部にはみ出すかチェックし、ツールチップをアイコンの上か下に表示するか決定
                if (iconRect.top - tltipRect.height - arrowMargin > 0) {
                    // 上に表示するスペースがある場合
                    top = iconRect.top - tltipRect.height - arrowMargin;
                    tltip.classList.add('arrow-down'); // 下向きの矢印を表示
                } else {
                    // 上にスペースがない場合は下に表示
                    top = iconRect.bottom + arrowMargin;
                    tltip.classList.add('arrow-up'); // 上向きの矢印を表示
                }

                const pad = 0; // ツールチップとアイコンの位置調整用の微小な余白
                // 3. 左右の位置をアイコン基準で中央揃えに計算
                left = iconRect.left + (iconRect.width / 2) - (tltipRect.width / 2) + pad;

                // 4. 画面の左右にはみ出さないように位置を補正
                if (left < 5) { left = 5; }
                if (left + tltipRect.width > viewportWidth - 5) { left = viewportWidth - tltipRect.width - 5; }

                // 5. 矢印の位置を、補正後のツールチップ位置に合わせて再計算し、アイコンの中央を指すように調整
                const arrowLeft = iconRect.left + (iconRect.width / 2) - left;
                tltip.style.setProperty('--arrow-left', `${arrowLeft}px`);

                // 6. 計算した最終的な位置をスタイルとして適用
                tltip.style.top = `${top}px + 4px`; // 4pxは微調整用の余白
                tltip.style.left = `${left}px + 4px`; // 4pxは微調整用の余白
            }
        });

        label.addEventListener('mouseleave', () => {
            if (tltip) {
                tltip.classList.remove('visible');
            }
            if (startBtn) {
                // マウスが離れたらオプションを隠す（探索中でなければ）
                if (idaOpt && !actBtn.classList.contains('searching')) {
                    idaOpt.hidden = true;
                }
                setContainerBackground(null);
            }
        });
    });

    // --- Functions ---
    function startSearch(selectedAlgorithm) {
        // 新しい探索を開始する前に、以前の探索セッションが残っていればクリアする。
        // これにより、探索成功後に別の探索を開始した場合でも、前のソルバーが正しく破棄される。
        if (currentSolver) {
            currentSolver.stop(); // 念のため停止
            currentSolver = null;
            console.log('currentSolverを初期化(null)');
        }
        // 実際のソルバーに渡すアルゴリズム名（'bfs', 'astar', 'idastar' or 'iddfs'）
        const solverAlgorithm = selectedAlgorithm;
        console.log('solverAlgorithm:', solverAlgorithm);
        // UI上の選択アルゴリズム名（'idastar' or 'bfs' or 'astar'）
        const uiSelectedAlgorithm = (solverAlgorithm === 'iddfs') ? 'idastar' : solverAlgorithm;
        console.log('uiSelectedAlgorithm:', uiSelectedAlgorithm);
        const currentSign = COMMON.getBlksSign(START_POS);
        const isFullSet = (currentSign === FULL_SET_SIGN);
        const dataType = isFullSet ? 'fullset' : 'subset';
        const dataStore = loVstDt[dataType];

        const usePrun = prunCb.checked && optPathData.normalizedSet !== null;
        const useLocalVisited = loVstCb.checked && dataStore.set !== null;
        const startStBI = COMMON.stateToBigInt(START_POS);
        const normalizedInitialStateBigInt = COMMON.normalizeStateBigInt(startStBI);

        let preloadedDataForSolver = null;
        if (useLocalVisited) {
            // 探索開始局面が保存済みデータに含まれている場合、そのデータセットを使うと探索が即座に終了してしまう可能性がある。
            // (探索開始局面の隣接ノードが全て探索済みになり、探索が広がらないため)。この場合、安全策として保存済みデータの利用を一時的に無効にする。
            if (dataStore.set.has(normalizedInitialStateBigInt)) {
                console.warn('探索開始盤面が保存済みデータに含まれているため、この探索では保存済みデータを利用しません。');
                status.textContent = '情報: 探索開始盤面が保存済みデータに含まれていたため保存データは利用されません。';
            } else {
                preloadedDataForSolver = dataStore.set;
            }
        }

        const isStartOnOptPath = usePrun && optPathData.normalizedSet.has(normalizedInitialStateBigInt);
        setUIState(true, uiSelectedAlgorithm); // UIを「探索中」の状態に切り替える

        // IDA*探索が選択された場合、ミコトさんのスライドショーを開始する
        if (uiSelectedAlgorithm === 'idastar') {
            let slideIndex = 0;
            const transitionDuration = 1000; // CSSのtransition-durationと合わせる

            // 1. 最初のスライドを下のレイヤー('::before')に即時表示する
            const initialSlide = `url(${ASSET_PATH.MIKOTO_SLIDES[slideIndex]})`;
            const initialBgComposite = `
                linear-gradient(to right, rgba(0, 0, 0, 1), rgba(255, 255, 255, 0)),
                ${initialSlide}
            `;
            ui.style.setProperty('--before-bg-image', initialBgComposite);
            ui.style.setProperty('--after-bg-image', 'none'); // 上のレイヤーは透明に
            ui.classList.remove('bg-active');
            lockedBgUrl = initialSlide;

            mikotoTimer = setInterval(() => {
                // 2. 次のスライドを上のレイヤー('::after')にセットし、フェードインさせる
                //    この時、下のレイヤーには前のスライドが表示されているため、クロスフェードのように見える
                slideIndex = (slideIndex + 1) % ASSET_PATH.MIKOTO_SLIDES.length;
                const nextSlide = `url(${ASSET_PATH.MIKOTO_SLIDES[slideIndex]})`;
                ui.style.setProperty('--after-bg-image', nextSlide);
                ui.classList.add('bg-active');

                // 3. フェード完了後、次のサイクルのためにレイヤーをリセットする
                setTimeout(() => {
                    // 現在表示されたスライドを下のレイヤーに移動
                    const nextBgComposite = `
                        linear-gradient(to right, rgba(0, 0, 0, 1), rgba(255, 255, 255, 0)),
                        ${nextSlide}
                    `;
                    ui.style.setProperty('--before-bg-image', nextBgComposite);
                    ui.classList.remove('bg-active'); // 上のレイヤーを再び透明に
                    lockedBgUrl = nextSlide;
                }, transitionDuration);
            }, MIKOTO_SPEECH_WAIT);
        } else {
            // 他アルゴリズムの場合は、キャラクター画像を固定表示
            lockedBgUrl = `url(${ASSET_PATH.BG_IMAGES[uiSelectedAlgorithm]})`;
            ui.style.setProperty('--after-bg-image', lockedBgUrl);
            ui.classList.add('bg-active');
        }

        const options = {
            initialState: startStBI,
            algorithm: solverAlgorithm, // ソルバーにアルゴリズム名を渡す
            prunOpt: {
                usePrun,
                isStartOnOptPath,
                optPathSet: optPathData.normalizedSet,
                optPathArray: optPathData.array,
            },
            onSuccess: handleSuccess,
            onFailure: handleFailure,
            onProgress: handleProgress,
            onUpdateStts: (text) => { status.textContent = text; },
            preloadedVisited: preloadedDataForSolver,
        };

        switch (solverAlgorithm) {
        case 'bfs':
            currentSolver = new BfsSolver(options);
            console.log('currentSolverに代入:', currentSolver, 'アルゴリズム:', solverAlgorithm);
            break;
        case 'astar':
            currentSolver = new AstarSolver(options);
            break;
        case 'idastar':
            currentSolver = new IDAstarSolver(options);
            break;
        case 'iddfs':
            currentSolver = new IDAstarSolver(options); // IDDFSもIDAstarSolverクラスを使用
            break;
        default:
            console.error('Unknown algorithm:', solverAlgorithm);
            break;
        }
        currentSolver.algorithm = solverAlgorithm;
        currentSolver.start();
    }

    function handleStop() {
        if (mikotoTimer) {
            clearInterval(mikotoTimer);
            mikotoTimer = null;
        }
        if (currentSolver) {
            currentSolver.stop();
            currentSolver = null;
        }
        setUIState(false);
        status.textContent = '探索を停止しました。';
    }

    function handleSuccess(result) {
        if (mikotoTimer) {
            clearInterval(mikotoTimer);
            mikotoTimer = null;
        }
        const solverAlgorithm = currentSolver.algorithm;
        const totalTime = (performance.now() - searchStartTime) / 1000;

        // 解の性質（最短かどうか）を判定し、サマリーメッセージを作成
        const isJunctionSolution = result.message && result.message.includes('合流');
        const isOpt = (solverAlgorithm === 'bfs' || solverAlgorithm === 'astar')
              || (solverAlgorithm === 'idastar' && !isJunctionSolution);
        const title = isOpt ? '最短手数' : '発見した手数';

        // --- 駒の一貫性を保つためのパス修正処理 ---
        // ソルバーは駒の形状のみを考慮するため、駒の名前（文字）がステップごとに入れ替わることがある。
        // ここでは、1手ずつ経路をたどり、駒の移動を追跡して正しい名前を復元する。
        const correctedPathStrings = [];
        if (result.path && result.path.length > 0) {
            const initialString = COMMON.bigIntToState(result.path[0]);
            correctedPathStrings.push(initialString);
            // 基準となる最初の盤面の駒リストを作成
            let prevBlks = stateToBlks(initialString);

            for (let i = 1; i < result.path.length; i++) {
                const currentRawString = COMMON.bigIntToState(result.path[i]);
                const currentBlksRaw = stateToBlks(currentRawString);

                const correctedCurrentBlks = [];
                const unmatchedPrevBlks = [...prevBlks];
                const unmatchedCurrentBlks = [];

                // 1. 静止している駒を特定する。
                //    前のステップと同じ位置にある駒は、名前（char）を引き継ぐ。
                for (const currentBlk of currentBlksRaw) {
                    const currentPosSign = currentBlk.positions.join(',');
                    const matchIndex = unmatchedPrevBlks.findIndex(p => p.positions.join(',') === currentPosSign);

                    if (matchIndex > -1) {
                        // この駒は動いていない。前のステップの駒情報（特にchar）を引き継ぐ。
                        const [prevBlk] = unmatchedPrevBlks.splice(matchIndex, 1);
                        correctedCurrentBlks.push({ ...currentBlk, char: prevBlk.char });
                    } else {
                        // この駒は移動した駒の可能性がある。
                        unmatchedCurrentBlks.push(currentBlk);
                    }
                }

                // 2. 移動した駒を特定する。
                //    前のステップから「消えた」駒と、新しい位置に「現れた」駒がそれぞれ1つだけのはず。
                if (unmatchedPrevBlks.length === 1 && unmatchedCurrentBlks.length === 1 &&
                    unmatchedPrevBlks[0].width === unmatchedCurrentBlks[0].width &&
                    unmatchedPrevBlks[0].height === unmatchedCurrentBlks[0].height) {
                    // 「消えた」駒の名前を、「新しい位置」の駒に引き継がせる。
                    correctedCurrentBlks.push({ ...unmatchedCurrentBlks[0], char: unmatchedPrevBlks[0].char });
                } else {
                    // このケースは通常発生しない。安全策として、未修正の盤面を使い、次のステップのためにリセットする。
                    console.warn(`Path correction failed at step ${i}. Found ${unmatchedPrevBlks.length} old and ${unmatchedCurrentBlks.length} new Blks.`);
                    correctedPathStrings.push(currentRawString);
                    prevBlks = stateToBlks(currentRawString); // 状態をリセット
                    continue;
                }

                // 3. 修正された駒情報から盤面文字列を再構築し、次のループのために駒情報を更新する。
                const correctedStateString = BlksToState(correctedCurrentBlks);
                correctedPathStrings.push(correctedStateString);
                prevBlks = correctedCurrentBlks;
            }
        }
        const pathAsStrings = correctedPathStrings;

        SolDisp.displaySolution(pathAsStrings);
        status.textContent = `${result.message} 　 ${title}: ${pathAsStrings.length - 1} 　 探索時間: ${totalTime.toFixed(2)}秒`;
        setUIState(false);
    }

    function handleFailure() {
        if (mikotoTimer) {
            clearInterval(mikotoTimer);
            mikotoTimer = null;
        }
        const totalTime = (performance.now() - searchStartTime) / 1000;
        status.textContent = `解が見つかりませんでした。 (探索時間: ${totalTime.toFixed(2)}秒)`;
        setUIState(false);
    }

    function handleProgress(progress) {
        const { visited, queue, head, algorithm } = progress;
        const exploredNodes = visited ? visited.size.toLocaleString() : 'N/A';
        const queueSize = queue ? (queue.length - (head || 0)) : 0;

        let html = `探索済みノード数: <span class="num">${exploredNodes}</span>| キューの長さ: <span class="num">${queueSize.toLocaleString()}</span>`;

        if (searchStartTime) {
            const elapsedSeconds = (performance.now() - searchStartTime) / 1000;
            html += ` | 経過時間: <span class="num">${elapsedSeconds.toFixed(1)}</span>秒`;
        }
        progress.innerHTML = html;
    }

    function setUIState(isSearching, algorithm = null) {
        if (isSearching) {
            searchStartTime = performance.now();
            if (timerInterval) clearInterval(timerInterval);
            // 探索中の経過時間は onProgress コールバック内で更新される
        } else {
            if (timerInterval) clearInterval(timerInterval);
            searchStartTime = null;
            // 探索終了後、背景画像のロックを解除し、デフォルトに戻す
            lockedBgUrl = null;
            // IDA*探索用に設定したベース背景をリセット
            ui.style.setProperty('--before-bg-image', '');
            setContainerBackground(null);

            // 探索終了後、IDA*オプションを隠す
            if (idaOpt) {
                idaOpt.hidden = true;
            }
        }

        // 'searching'クラスを親要素に付け外しすることで、CSS側でまとめてスタイルを制御する
        actBtn.classList.toggle('searching', isSearching);

        if (isSearching) {
            // --- 探索開始時のUI変更 ---
            const algo = algorithm; // startSearchから渡されたアルゴリズム名
            const activeBtn = document.querySelector(`.start-algorithm-btn[value="${algo}"]`);
            if (activeBtn) {
                // 押されたボタンを特定し、目印となるクラスを付与
                activeBtn.parentElement.classList.add('active-search');
                // 役割を「探索開始」から「停止」に変更
                activeBtn.classList.replace('start-algorithm-btn', 'stop-btn');
                // アイコン画像を「停止」アイコンに差し替える
                activeBtn.querySelector('img').src = ASSET_PATH.ICONS.stop;
            }
        } else { // Reverting
            const stopBtn = document.querySelector('.stop-btn');
            if (stopBtn) {
                const algo = stopBtn.value; // ボタンのvalue属性から元のアルゴリズム名を取得
                stopBtn.parentElement.classList.remove('active-search');
                // 役割を「停止」から「探索開始」に戻す
                stopBtn.classList.replace('stop-btn', 'start-algorithm-btn');
                // アイコン画像を元のアルゴリズムのアイコンに戻す
                stopBtn.querySelector('img').src = ASSET_PATH.ICONS.getAlgoIcon(algo);
            }
        }

        // 他のボタンの有効/無効状態を切り替える
        svBtn.disabled = isSearching;
        ckDtBtn.disabled = isSearching;
        setStBtn.disabled = isSearching;
        defStart.disabled = isSearching;
        prunCb.disabled = isSearching || !optPathData.normalizedSet;

        const currentSign = getBlksSign(START_POS);
        const isFullSet = (currentSign === FULL_SET_SIGN);
        const dataStore = loVstDt[isFullSet ? 'fullset' : 'subset'];
        loVstCb.disabled = isSearching || dataStore.status !== '読込完了';

        if (isSearching) {
            sol.hidden = false;
            summary.hidden = false;
            svStts.textContent = '';
            status.textContent = 'Searching...';
            solPath.innerHTML = '';
        }
    }

    const hideSummaryBtn = document.getElementById('hide-summary-btn');
    if (hideSummaryBtn) {
        hideSummaryBtn.addEventListener('click', () => {
            if (sol.hidden == true)
                sol.hidden = false;
            else
                sol.hidden = true;
        });
    }

    function handleSetState() {
        const newState = defStart.value.trim().toUpperCase();
        setSt.textContent = '';
        if (newState.length !== COMMON.WIDTH * COMMON.HEIGHT) {
            setSt.style.color = COLORS.error;
            setSt.textContent = `エラー: 状態文字列は${COMMON.WIDTH * COMMON.HEIGHT}文字である必要があります。`;
            return;
        }
        if (!/^[A-Z\.]+$/.test(newState)) {
            setSt.style.color = COLORS.error;
            setSt.textContent = 'エラー: 使用できる文字は英大文字(A-Z)とピリオド(.)のみです。';
            return;
        }
        START_POS = newState;
        setSt.style.color = COLORS.success;
        setSt.textContent = '探索開始状態が更新されました。';
        setTimeout(() => { setSt.textContent = ''; }, 3000);


        if (optPathData.normalizedSet) {
            const normalizedStateBigInt = COMMON.normalizeStateBigInt(COMMON.stateToBigInt(START_POS));
            if (optPathData.normalizedSet.has(normalizedStateBigInt)) {
                prunDt.textContent = `(最短経路上: ${optPathData.normalizedSet.size.toLocaleString()}件のデータ利用可)`;
            } else {
                prunDt.textContent = `(注意: 探索開始状態は最短経路上にありません)`;
            }
        }

        const currentSign = COMMON.getBlksSign(START_POS);
        const isFullSet = (currentSign === FULL_SET_SIGN);
        const dataType = isFullSet ? 'fullset' : 'subset';
        const dataStore = loVstDt[dataType];
        loVstCb.disabled = dataStore.status !== '読込完了';
    }

    function handleSv() {
        if (!currentSolver || !currentSolver.visited || currentSolver.visited.size === 0) {
            svStts.textContent = '保存するデータがありません。';
            return;
        }

        try {
            const currentSign = getBlksSign(START_POS);
            const isFullSet = (currentSign === FULL_SET_SIGN);
            const dataType = isFullSet ? 'fullset' : 'subset';
            const dataStore = loVstDt[dataType];
            const storageKey = isFullSet ? 'STQVisited_fullset' : 'STQVisited_subset';

            const existingSet = dataStore.set || new Set();
            const existingSize = existingSet.size;

            const mergedSet = new Set([...existingSet, ...currentSolver.visited]);

            // 1. 新しく追加するデータがあるかチェック
            if (mergedSet.size === existingSize) {
                svStts.style.color = COLORS.info;
                // メッセージをより具体的にし、何と比較して追加データがなかったのかを明確にする
                svStts.textContent = '今回の探索結果は、読み込み済みのデータ(共有データ含む)に全て含まれていました。';
                setTimeout(() => { svStts.textContent = ''; }, 5000); // 少し長めに表示
                return;
            }

            // 2. BigIntは直接JSONに変換できないため、文字列に変換
            //    (例: 12345n -> "12345")
            const visitedArray = Array.from(mergedSet).map(bigint => bigint.toString());

            // 3. 文字列の配列としてJSONに変換し、localStorageに保存
            const visitedJson = JSON.stringify(visitedArray);
            localStorage.setItem(storageKey, visitedJson);

            // 4. メモリ上のデータもマージ後のもので更新
            dataStore.set = mergedSet;
            dataStore.status = '読込完了';
            svStts.style.color = COLORS.success;
            svStts.textContent = `探索済みノードをlocalStorageに保存しました。(合計: ${mergedSet.size.toLocaleString()}件)`;

            const fullSetSize = loVstDt.fullset.set.size;
            const subsetSize = loVstDt.subset.set.size;
            let statusText = [];
            if (fullSetSize > 0) statusText.push(`Full: ${fullSetSize.toLocaleString()}`);
            if (subsetSize > 0) statusText.push(`Sub: ${subsetSize.toLocaleString()}`);
            loVstDtSt.textContent = `(${statusText.join(', ')}件)`;
        } catch (e) {
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                svStts.textContent = `エラー: localStorageの容量制限を超えました。`;
            } else {
                svStts.textContent = `保存中にエラーが発生しました: ${e.message}`;
            }
            console.error('Failed to sv to localStorage:', e);
        }
    }

    function handleCheckData() {
        svStts.textContent = 'データチェック中...';
        svStts.style.color = COLORS.info;

        // 以前のクリーンアップボタンが残っていれば削除
        const oldCleanupBtn = document.getElementById('cleanup-btn');
        if (oldCleanupBtn) oldCleanupBtn.parentElement.removeChild(oldCleanupBtn);

        try {
            const currentSign = COMMON.getBlksSign(START_POS);
            const isFullSet = (currentSign === FULL_SET_SIGN);
            const dataType = isFullSet ? 'fullset' : 'subset';
            const dataStore = loVstDt[dataType];
            const storageKey = isFullSet ? 'STQVisited_fullset' : 'STQVisited_subset';

            const svdVisitedJson = localStorage.getItem(storageKey);
            if (!svdVisitedJson) {
                svStts.textContent = `チェックするlocalStorageデータ(${dataType})がありません。`;
                return;
            }

            // localStorageにはBigIntを文字列化したものが保存されている
            const svdVisitedStrings = JSON.parse(svdVisitedJson);
            const originalCount = svdVisitedStrings.length;
            // 文字列のSetを作成して重複をチェック
            const uniqueSetOfStrings = new Set(svdVisitedStrings);
            const uniqueCount = uniqueSetOfStrings.size;

            if (originalCount === uniqueCount) {
                svStts.style.color = COLORS.success;
                svStts.textContent = `データは正常です。重複するノードはありませんでした。(${originalCount.toLocaleString()}件)`;
            } else {
                // 重複が見つかった場合の処理
                const duplicateCount = originalCount - uniqueCount;
                svStts.style.color = COLORS.warning;

                const messageSpan = document.createElement('span');
                messageSpan.textContent = `警告: ${duplicateCount.toLocaleString()}件の重複ノードが見つかりました。データをクリーンアップしますか？ `;

                const cleanupBtn = document.createElement('button');
                cleanupBtn.id = 'cleanup-btn';
                cleanupBtn.textContent = 'はい';
                cleanupBtn.style.marginLeft = '10px';
                cleanupBtn.style.padding = '2px 8px';
                cleanupBtn.onclick = () => {
                    localStorage.setItem(storageKey, JSON.stringify(Array.from(uniqueSetOfStrings)));
                    // メモリ上のデータもクリーンアップ後のもので更新する
                    // localStorageから読み込み直すのと同じように、文字列からBigIntのSetに変換する
                    dataStore.set = new Set(Array.from(uniqueSetOfStrings).map(s => BigInt(s)));
                    svStts.style.color = COLORS.success;
                    svStts.textContent = `データをクリーンアップしました。 (重複${duplicateCount.toLocaleString()}件を削除 → ${uniqueCount.toLocaleString()}件)`;
                    // UIのステータス表示を更新
                    const fullSetSize = loVstDt.fullset.set.size;
                    const subsetSize = loVstDt.subset.set.size;
                    let statusText = [];
                    if (fullSetSize > 0) statusText.push(`Full: ${fullSetSize.toLocaleString()}`);
                    if (subsetSize > 0) statusText.push(`Sub: ${subsetSize.toLocaleString()}`);
                    loVstDtSt.textContent = `(${statusText.join(', ')}件)`;
                };
                svStts.textContent = '';
                svStts.appendChild(messageSpan);
                svStts.appendChild(cleanupBtn);
            }
        } catch (e) {
            svStts.style.color = COLORS.error;
            svStts.textContent = `データチェック中にエラーが発生しました: ${e.message}`;
            console.error('Error during data check:', e);
        }
    }

    // --- Initial Load ---
    prunDt.textContent = '読込中...';
    fetch(ASSET_PATH.DATA_FILES.optPath)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            optPathData.rawSet = new Set(data);
            optPathData.array = data;
            optPathData.normalizedSet = new Set(data.map(state => COMMON.normalizeStateBigInt(COMMON.stateToBigInt(state))));
            prunCb.disabled = false;
            prunDt.textContent = `(${optPathData.rawSet.size.toLocaleString()})`;
        })
        .catch(error => {
            prunDt.textContent = '読込失敗';
            console.error('Error loading opt path data:', error);
        });

    // --- 共有＆ローカルの探索済みデータを読み込む ---
    loVstDtSt.textContent = '読込中...';
    // 1. まず共有された探索済みデータ(shared_visited.dat)を非同期で読み込む
    fetch(ASSET_PATH.DATA_FILES.sharedVisited)
        .then(response => {
            // ファイルが存在し、レスポンスが正常ならArrayBufferとして解析する
            if (response.ok) return response.arrayBuffer();
            // ファイルが存在しない等の場合は、空のArrayBufferとして扱う
            return Promise.resolve(new ArrayBuffer(0));
        })
        .catch(error => {
            // ネットワークエラーなど、読み込み自体に失敗した場合
            console.warn('shared_visited.datの読み込みに失敗しました。', error);
            return new ArrayBuffer(0);
        })
        .then(buffer => { // shared_visited.datから読み込んだArrayBuffer
            // 1. 共有バイナリデータ(fullset)をBigIntの配列に変換
            const sharedBigInts = [];
            if (buffer.byteLength > 0 && buffer.byteLength % 10 === 0) {
                const dataView = new DataView(buffer);
                const numStates = buffer.byteLength / 10;
                for (let i = 0; i < numStates; i++) {
                    const offset = i * 10;
                    const high_part = dataView.getBigUint64(offset, false); // Big-endian
                    const low_part = BigInt(dataView.getUint16(offset + 8, false)); // Big-endian
                    const bigIntValue = (high_part << 16n) | low_part;
                    sharedBigInts.push(bigIntValue);
                }
                loVstDt.fullset.set = new Set(sharedBigInts);
            } else if (buffer.byteLength > 0) {
                console.error('shared_visited.datのファイルサイズが不正です。');
            }

            // 2. localStorageから個人データを読み込む
            const keys = {
                fullset: 'STQVisited_fullset',
                subset: 'STQVisited_subset'
            };

            // 旧キーからの移行処理
            const oldKey = 'klotskiVisitedStates';
            const oldDataJSON = localStorage.getItem(oldKey);
            if (oldDataJSON) {
                console.log('古いキー "klotskiVisitedStates" のデータを検出しました。STQVisited_fullset に移行します。');
                localStorage.setItem(keys.fullset, oldDataJSON);
                localStorage.removeItem(oldKey);
            }

            // 3. 各セットを読み込んでマージする
            for (const type in keys) { // 'fullset', 'subset'
                const key = keys[type];
                let localBigInts = [];
                try {
                    const svdVisitedJson = localStorage.getItem(key);
                    if (svdVisitedJson) {
                        const localVisitedStrings = JSON.parse(svdVisitedJson);
                        localBigInts = localVisitedStrings.map(s => BigInt(s)); // 新フォーマットのみ想定
                    }
                } catch (e) {
                    console.error(`localStorageからのデータ(${key})読み込みに失敗しました。`, e);
                }
                if (localBigInts.length > 0) {
                    // 既存のSetにマージ
                    loVstDt[type].set = new Set([...loVstDt[type].set, ...localBigInts]);
                }
            }

            // 4. UIの更新
            const fullSetSize = loVstDt.fullset.set.size;
            const subsetSize = loVstDt.subset.set.size;

            if (fullSetSize > 0 || subsetSize > 0) {
                loVstCb.disabled = false;
                let statusText = [];
                if (fullSetSize > 0) {
                    loVstDt.fullset.status = '読込完了';
                    statusText.push(`Full: ${fullSetSize.toLocaleString()}`);
                }
                if (subsetSize > 0) {
                    loVstDt.subset.status = '読込完了';
                    statusText.push(`Sub: ${subsetSize.toLocaleString()}`);
                }
                loVstDtSt.textContent = `(${statusText.join(', ')}件)`;
            } else {
                loVstDtSt.textContent = '(データなし)';
            }
        });

    function stateToBlks(state) {
        const Blks = [];
        const processed = new Set();
        let BlkIdCounter = 0;

        for (let i = 0; i < state.length; i++) {
            const char = state[i];  // 1. 盤面の各位置の文字を取得
            if (char === '.' || processed.has(i)) {
                continue;
            }

            // BFSで同じ文字の連結成分を探す
            const positions = [];
            const queue = [i];
            processed.add(i);

            let minX = COMMON.WIDTH, minY = COMMON.HEIGHT, maxX = -1, maxY = -1;

            while (queue.length > 0) {
                const curr = queue.shift();
                positions.push(curr);
                const x = curr % COMMON.WIDTH;
                const y = Math.floor(curr / COMMON.WIDTH);

                // 駒のバウンディングボックスを計算
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);

                const neighbors = [
                    (y > 0) ? curr - COMMON.WIDTH : -1,                      // 上
                    (y < COMMON.HEIGHT - 1) ? curr + COMMON.WIDTH : -1,   // 下
                    (x > 0) ? curr - 1 : -1,                                 // 左
                    (x < COMMON.WIDTH - 1) ? curr + 1 : -1,               // 右
                ];

                for (const neighbor of neighbors) {
                    if (neighbor !== -1 && !processed.has(neighbor) && state[neighbor] === char) {
                        processed.add(neighbor);
                        queue.push(neighbor);
                    }
                }
            }

            Blks.push({ // 2. 見つかった駒の情報を保存
                id: BlkIdCounter++,
                char: char,
                positions: positions.sort((a, b) => a - b), // 常にソートして一貫性を保つ
                width: maxX - minX + 1,
                height: maxY - minY + 1
            });
        }
        return Blks;
    }

    function BlksToState(Blks) {
        const state = Array(20).fill('.');
        for (const Blk of Blks) {
            for (const pos of Blk.positions) {
                state[pos] = Blk.char;
            }
        }
        return state.join('');
    }

    // --- Board Editor Logic ---
    function initializeBoardEditor() {
        const srcGrid = document.getElementById('src-grid');
        const tgtGrid = document.getElementById('tgt-grid');
        const applyBtn = document.getElementById('apply-editor-btn');
        const resetBtn = document.getElementById('reset-editor-btn');
        const allowSubsetCB = document.getElementById('allow-subset-Blks');
        const highlightOl = document.createElement('div');
        highlightOl.id = 'selection-highlight';
        highlightOl.hidden = true;
        const INITIAL_SRC_STATE = "BAACBAACDFFEDIJEG..H";
        const initialBlksForMap = stateToBlks(INITIAL_SRC_STATE);
        const originalPositionsMap = new Map(initialBlksForMap.map(p => [p.id, p.positions]));
        let srcBlks = [];
        let tgtBlks = [];
        let slctBlk = null;
        let previewPositions = [];
        let lastPreviewIndex = -1;
        let lastHvrBlkInfo = { Blk: null, grid: null };
        function createGrid(gridElement) {
            gridElement.innerHTML = '';
            for (let i = 0; i < 20; i++) {
                const cell = document.createElement('div');
                cell.classList.add('editor-grid-cell');
                cell.dataset.index = i;
                gridElement.appendChild(cell);
            }
        }
        function renderGridWithBlks(gridElement, Blks) {
            const BlkMap = Array(20).fill(null);
            for (const Blk of Blks) {
                for (const pos of Blk.positions) {
                    BlkMap[pos] = Blk;
                }
            }

            gridElement.querySelectorAll('.editor-grid-cell').forEach((cell, i) => {
                const Blk = BlkMap[i];
                let classList = ['editor-grid-cell'];

                if (Blk) {
                    classList.push(`Blk-${Blk.char}`);
                    cell.textContent = (i === Blk.positions[0]) ? Blk.char : '';
                    const x = i % COMMON.WIDTH;
                    const y = Math.floor(i / COMMON.WIDTH);
                    if (x < COMMON.WIDTH - 1 && BlkMap[i + 1] === Blk) classList.push('Blk-inner-right');
                    if (y < COMMON.HEIGHT - 1 && BlkMap[i + COMMON.WIDTH] === Blk)
                        classList.push('Blk-inner-bottom');
                } else {
                    classList.push('Blk-dot');
                    cell.textContent = '';
                }
                cell.className = classList.join(' ');
            });
        }

        function clearPreview() {
            if (previewPositions.length > 0) {
                previewPositions.forEach(pos => {
                    const cell = tgtGrid.querySelector(`.editor-grid-cell[data-index='${pos}']`);
                    if (cell) cell.classList.remove('preview-Blk');
                });
                previewPositions = [];
            }
        }

        function showPreview(positions) {
            positions.forEach(pos => {
                const cell = tgtGrid.querySelector(`.editor-grid-cell[data-index='${pos}']`);
                if (cell) cell.classList.add('preview-Blk');
            });
            previewPositions = positions;
        }

        function updateAllRenders() {
            renderGridWithBlks(srcGrid, srcBlks);
            renderGridWithBlks(tgtGrid, tgtBlks);
            updateHighlightOverlay();
        }

        function resetEditor() {
            srcBlks = stateToBlks(INITIAL_SRC_STATE);
            tgtBlks = [];
            slctBlk = null;
            clearPreview();
            updateAllRenders();
        }

        function clearHvr() {
            if (lastHvrBlkInfo.Blk) {
                lastHvrBlkInfo.Blk.positions.forEach(pos => {
                    const cellEl = lastHvrBlkInfo.grid.querySelector(`.editor-grid-cell[data-index='${pos}']`);
                    if (cellEl) cellEl.classList.remove('Hvr-Blk');
                });
                lastHvrBlkInfo.Blk = null;
                lastHvrBlkInfo.grid = null;
            }
        }

        function handleGridMouseOver(e, Blks, grid) {
            const cell = e.target.closest('.editor-grid-cell');
            if (!cell) return;

            const index = parseInt(cell.dataset.index, 10);
            const HvrBlk = Blks.find(p => p.positions.includes(index));

            if (HvrBlk === lastHvrBlkInfo.Blk) return;

            clearHvr();

            if (HvrBlk) {
                HvrBlk.positions.forEach(pos => {
                    const cellEl = grid.querySelector(`.editor-grid-cell[data-index='${pos}']`);
                    if (cellEl) cellEl.classList.add('Hvr-Blk');
                });
                lastHvrBlkInfo.Blk = HvrBlk;
                lastHvrBlkInfo.grid = grid;
            }
        }

        srcGrid.addEventListener('mouseover', e => handleGridMouseOver(e, srcBlks, srcGrid));
        tgtGrid.addEventListener('mouseover', e => handleGridMouseOver(e, tgtBlks, tgtGrid));

        srcGrid.addEventListener('mouseout', clearHvr);
        tgtGrid.addEventListener('mouseout', clearHvr);

        function updateHighlightOverlay() {
            if (!slctBlk) {
                highlightOl.hidden = true;
                return;
            }
            const originIndex = slctBlk.positions[0];
            const cellElement = srcGrid.querySelector(`.editor-grid-cell[data-index='${originIndex}']`);
            if (cellElement) {
                const cellWidth = 24;
                const cellHeight = 24;
                const gap = 0; // グリッドのgapが0なので、こちらも0に合わせます
                highlightOl.style.top = `${cellElement.offsetTop}px`;
                highlightOl.style.left = `${cellElement.offsetLeft}px`;
                highlightOl.style.width = `${slctBlk.width * cellWidth + (slctBlk.width - 1) * gap}px`;
                highlightOl.style.height = `${slctBlk.height * cellHeight + (slctBlk.height - 1) * gap}px`;
                highlightOl.hidden = false;
            } else {
                highlightOl.hidden = true;
            }
        }

        srcGrid.addEventListener('click', e => {
            const cell = e.target.closest('.editor-grid-cell');
            if (!cell) return;
            const index = parseInt(cell.dataset.index, 10);
            const clickedBlk = srcBlks.find(p => p.positions.includes(index));

            if (clickedBlk) {
                if (slctBlk && slctBlk.id === clickedBlk.id) {
                    slctBlk = null; // Deselect
                    clearPreview();
                } else {
                    slctBlk = clickedBlk;
                }
                updateAllRenders();
            }
        });

        tgtGrid.addEventListener('mousemove', e => {
            const cell = e.target.closest('.editor-grid-cell');
            if (!cell) return;

            const tgtIndex = parseInt(cell.dataset.index, 10);
            if (tgtIndex === lastPreviewIndex) return;

            lastPreviewIndex = tgtIndex;
            clearPreview();

            if (!slctBlk) return;

            const tgtX = tgtIndex % COMMON.WIDTH;
            const tgtY = Math.floor(tgtIndex / COMMON.WIDTH);
            const crntTgtState = BlksToState(tgtBlks).split('');

            let canPlace = true;
            if (tgtX + slctBlk.width > COMMON.WIDTH || tgtY + slctBlk.height > COMMON.HEIGHT) {
                canPlace = false;
            } else {
                for (let py = 0; py < slctBlk.height; py++) {
                    for (let px = 0; px < slctBlk.width; px++) {
                        if (crntTgtState[(tgtY + py) * COMMON.WIDTH + (tgtX + px)] !== '.') {
                            canPlace = false;
                            break;
                        }
                    }
                    if (!canPlace) break;
                }
            }

            if (canPlace) {
                const newPositions = [];
                const originIndex = slctBlk.positions[0];
                const originX = originIndex % COMMON.WIDTH;
                const originY = Math.floor(originIndex / COMMON.WIDTH);

                for (const pos of slctBlk.positions) {
                    const dx = (pos % COMMON.WIDTH) - originX;
                    const dy = Math.floor(pos / COMMON.WIDTH) - originY;
                    newPositions.push((tgtY + dy) * COMMON.WIDTH + (tgtX + dx));
                }
                showPreview(newPositions);
            }
        });

        tgtGrid.addEventListener('mouseleave', () => {
            clearPreview();
            lastPreviewIndex = -1;
        });

        tgtGrid.addEventListener('click', e => {
            const cell = e.target.closest('.editor-grid-cell');
            if (!cell || !slctBlk) return;

            const tgtIndex = parseInt(cell.dataset.index, 10);
            const tgtX = tgtIndex % COMMON.WIDTH;
            const tgtY = Math.floor(tgtIndex / COMMON.WIDTH);
            const crntTgtState = BlksToState(tgtBlks).split('');

            let canPlace = true;
            if (tgtX + slctBlk.width > COMMON.WIDTH || tgtY + slctBlk.height > COMMON.HEIGHT) {
                canPlace = false;
            } else {
                for (let py = 0; py < slctBlk.height; py++) {
                    for (let px = 0; px < slctBlk.width; px++) {
                        if (crntTgtState[(tgtY + py) * COMMON.WIDTH + (tgtX + px)] !== '.') {
                            canPlace = false;
                            break;
                        }
                    }
                    if (!canPlace) break;
                }
            }

            if (canPlace) {
                srcBlks = srcBlks.filter(p => p.id !== slctBlk.id);

                const newPositions = [];
                const originIndex = slctBlk.positions[0];
                const originX = originIndex % COMMON.WIDTH;
                const originY = Math.floor(originIndex / COMMON.WIDTH);

                for (const pos of slctBlk.positions) {
                    const dx = (pos % COMMON.WIDTH) - originX;
                    const dy = Math.floor(pos / COMMON.WIDTH) - originY;
                    newPositions.push((tgtY + dy) * COMMON.WIDTH + (tgtX + dx));
                }
                slctBlk.positions = newPositions;
                tgtBlks.push(slctBlk);

                slctBlk = null;
                updateAllRenders();
            }
        });

        tgtGrid.addEventListener('contextmenu', e => {
            e.preventDefault();
            const cell = e.target.closest('.editor-grid-cell');
            if (!cell) return;

            const index = parseInt(cell.dataset.index, 10);
            const clickedBlk = tgtBlks.find(p => p.positions.includes(index));

            if (clickedBlk) {
                // Restore original positions before moving it back to src
                clickedBlk.positions = originalPositionsMap.get(clickedBlk.id);

                tgtBlks = tgtBlks.filter(p => p.id !== clickedBlk.id);
                srcBlks.push(clickedBlk);
                updateAllRenders();
            }
        });

        applyBtn.addEventListener('click', () => {
            // "サブセットを許す"がチェックされていない場合、全ての駒が配置されているかチェック
            if (!allowSubsetCB.checked && srcBlks.length > 0) {
                alert(`配置していない駒があります。全ての駒を右のボードに配置してください。`);
                return;
            }

            // A（大駒2x2の駒）は必須)。さもないとゴール条件が無くなってしまう。
            if (!tgtBlks.some(p => p.char === 'A')) {
                alert(`Aの駒は必須です。必ず右のボードに配置してください。`);
                return;
            }

            const finalState = BlksToState(tgtBlks);
            const finalStateArray = finalState.split('');
            const emptyCount = finalStateArray.filter(c => c === '.').length;
            // パズルとして成立するための最低条件をチェック (空きマスが2つ以上か)
            // (現在のボードエディターの仕様では空きマスが２つ以下になることはないが、念のため)
            if (emptyCount < 2) {
                alert(`空きマスが2つ未満です。駒を右クリックして盤面から取り除いてください。`);
                return;
            }

            defStart.value = finalState;
            handleSetState();
        });
        resetBtn.addEventListener('click', resetEditor);

        // Initial render
        createGrid(srcGrid);
        srcGrid.appendChild(highlightOl);
        createGrid(tgtGrid);
        resetEditor();
    }

    SolDisp.init({
        solPath: document.getElementById('sol-path'),
        defStart: document.getElementById('start-pos'),
        handleSetState: handleSetState,
        stateToBlks: stateToBlks,
        COMMON: COMMON
    });

    initializeBoardEditor();
    // --- Draggable Panel Logic ---
    function initializeDraggablePanel() {
        const panel = document.querySelector('.sol-panel');
        let isDragging = false;
        let offsetX, offsetY;
        panel.addEventListener('mousedown', (e) => {
            // ドラッグを開始する要素（サマリー部か、下のハンドル）
            const dragTgt = e.target.closest('#search-summary, .drag-handle');
            // ドラッグ対象外の要素（ボタンやクリック可能な盤面など）
            const nonDraggable = e.target.closest('button, .clickable-board, input, a, .close-btn');

            // ドラッグ対象であり、かつドラッグ対象外の要素でなければドラッグ開始
            if (dragTgt && !nonDraggable) {
                isDragging = true;
                offsetX = e.clientX - panel.offsetLeft;
                offsetY = e.clientY - panel.offsetTop;

                // ドラッグ中のカーソルスタイルとテキスト選択防止を設定
                dragTgt.style.cursor = 'grabbing';
                document.body.style.userSelect = 'none';

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            }
        });

        function onMouseMove(e) {
            if (!isDragging) return;
            panel.style.left = `${e.clientX - offsetX}px`;
            panel.style.top = `${e.clientY - offsetY}px`;
        }

        function onMouseUp() {
            isDragging = false;
            // スタイルを元に戻す
            const header = document.getElementById('search-summary');
            if (header) header.style.cursor = 'grab';
            document.querySelectorAll('.drag-handle').forEach(handle => {
                handle.style.cursor = 'grab';
            });
            document.body.style.userSelect = '';

            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
    }

    initializeDraggablePanel();
});
