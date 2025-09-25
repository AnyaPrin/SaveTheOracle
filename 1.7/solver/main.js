document.addEventListener('DOMContentLoaded', () => {

  // --- Global State and DOM Elements ---
  const COLORS = {
    error: '#d32f2f',
    success: '#4CAF50',
    info: '#666',
    warning: '#d32f2f' // エラーと同じ色だが、意味合いとして定義
  };
  const ASSET_PATHS = {
    BG_IMAGES: {
      bfs: '../img/bg_bfs.jpg',
      astar: '../img/bg_astar.jpg',
      idastar: '../img/bg_idastar.jpg'
    },
    ICONS: {
      stop: '../img/icon/stop.png',
      getAlgoIcon: (algo) => `../img/icon/${algo}.png`
    },
    DATA_FILES: {
      optimalPath: 'data/optimal_path.json',
      sharedVisited: 'data/shared_visited.dat'
    },
    MIKOTO_SLIDES: [
      '../img/mikoto_speech/slide_0.webp',
      '../img/mikoto_speech/slide_1.webp',
      '../img/mikoto_speech/slide_2.webp',
      '../img/mikoto_speech/slide_3.webp',
      '../img/mikoto_speech/slide_4.webp',
      '../img/mikoto_speech/slide_5.webp'
    ]
  };

  let INITIAL_STATE = "BAACBAACDFFEDIJEG..H";
  const FULL_SET_SIGNATURE = COMMON.getPiecesSignature(INITIAL_STATE);

  let optimalPathData = { rawSet: null, normalizedSet: null, array: null };
  let localVisitedData = {
    fullset: { set: new Set(), status: '未読込' },
    subset: { set: new Set(), status: '未読込' }
  };
  let searchStartTime, timerInterval, mikotoTimer = null;
  let currentSolver = null;

  const MIKOTO_SPEECH_WAIT = 5000; // デバッグ用に5秒に設定
  const topContainer = document.querySelector('.ui-panel .controls-container');
  const statusDiv = document.getElementById('status');
  const searchSummaryDiv = document.getElementById('search-summary');
  const resultPanelDiv = document.querySelector('.solution-panel');

  const progressDetailsDiv = document.getElementById('progress-details');
  const actionButtonsDiv = document.querySelector('.action-buttons');


  const saveBtn = document.getElementById('save-btn');
  const saveStatusDiv = document.getElementById('save-status');
  const solutionPathDiv = document.getElementById('solution-path');

  const initialStateInput = document.getElementById('initial-state-input');
  const setStateBtn = document.getElementById('set-state-btn');
  const setStateStatusDiv = document.getElementById('set-state-status');

  const pruningCheckbox = document.getElementById('pruning-enabled');
  const useLocalVisitedCheckbox = document.getElementById('use-local-visited');
  const pruningDataStatus = document.getElementById('pruning-data-status');
  const localVisitedDataStatus = document.getElementById('local-visited-data-status');
  const checkDataBtn = document.getElementById('check-data-btn');
  const idaOptionLabel = document.getElementById('ida-option-label');

  initialStateInput.value = INITIAL_STATE;

  // --- URLパラメータから初期盤面を読み込む ---
  const urlParams = new URLSearchParams(window.location.search);
  const stateFromUrl = urlParams.get('state');
  if (stateFromUrl) {
    // URLに 'state' パラメータがあれば、その値を初期盤面として設定
    initialStateInput.value = stateFromUrl.toUpperCase();
    // 既存の盤面設定処理を呼び出して、検証とUI更新を行う
    handleSetState();
  }



  // --- Event Listeners ---


  topContainer.addEventListener('click', (e) => {
    // イベント委譲(Event Delegation)パターン:
    // 個々のボタンにイベントリスナーを設定する代わりに、親要素(topContainer)でイベントを一度に受け取る。
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
      } else if (button.id === 'save-btn') {
        handleSave();
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

    if (algo && ASSET_PATHS.BG_IMAGES[algo]) {
      // CSS変数(--after-bg-image)を動的に設定し、CSS側で::after擬似要素の背景画像として利用する。
      // これにより、opacityを使った滑らかなフェードイン・アウトが可能になる。
      topContainer.style.setProperty('--after-bg-image', `url(${ASSET_PATHS.BG_IMAGES[algo]})`);
      topContainer.classList.add('bg-active');
    } else {
      // マウスが離れた場合(algoがnull)は、デフォルトの背景に戻す
      topContainer.classList.remove('bg-active');
    }
  }

  // --- Tooltip Handling ---
  document.querySelectorAll('.icon-btn-label').forEach(label => {
    const tooltip = label.querySelector('.tooltip-text');
    const startBtn = label.querySelector('.start-algorithm-btn');

    const arrowMargin = 12; // 矢印の高さ(5px) + アイコンとの隙間

    label.addEventListener('mouseenter', () => {
      if (startBtn) {
        // IDA*にホバーした時だけオプションを表示
        if (idaOptionLabel) {
          idaOptionLabel.hidden = (startBtn.value !== 'idastar');
        }

        setContainerBackground(startBtn.value);
      }
      if (tooltip) {
        // ツールチップの位置を動的に計算し、画面からはみ出さないように調整する。
        // CSSの:hoverだけでは実現が難しいため、JavaScriptで位置を計算する。

        // 1. ツールチップを一旦表示状態にして、そのサイズ(tooltipRect)を取得する
        tooltip.classList.add('visible');
        tooltip.classList.remove('arrow-up', 'arrow-down'); // 向きをリセット

        const iconRect = label.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;

        let top, left;

        // 2. 画面上部にはみ出すかチェックし、ツールチップをアイコンの上か下に表示するか決定
        if (iconRect.top - tooltipRect.height - arrowMargin > 0) {
          // 上に表示するスペースがある場合
          top = iconRect.top - tooltipRect.height - arrowMargin;
          tooltip.classList.add('arrow-down'); // 下向きの矢印を表示
        } else {
          // 上にスペースがない場合は下に表示
          top = iconRect.bottom + arrowMargin;
          tooltip.classList.add('arrow-up'); // 上向きの矢印を表示
        }

        const pad = 0; // ツールチップとアイコンの位置調整用の微小な余白
        // 3. 左右の位置をアイコン基準で中央揃えに計算
        left = iconRect.left + (iconRect.width / 2) - (tooltipRect.width / 2) + pad;

        // 4. 画面の左右にはみ出さないように位置を補正
        if (left < 5) { left = 5; }
        if (left + tooltipRect.width > viewportWidth - 5) { left = viewportWidth - tooltipRect.width - 5; }

        // 5. 矢印の位置を、補正後のツールチップ位置に合わせて再計算し、アイコンの中央を指すように調整
        const arrowLeft = iconRect.left + (iconRect.width / 2) - left;
        tooltip.style.setProperty('--arrow-left', `${arrowLeft}px`);

        // 6. 計算した最終的な位置をスタイルとして適用
        tooltip.style.top = `${top}px + 4px`; // 4pxは微調整用の余白
        tooltip.style.left = `${left}px + 4px`; // 4pxは微調整用の余白
      }
    });

    label.addEventListener('mouseleave', () => {
      if (tooltip) {
        tooltip.classList.remove('visible');
      }
      if (startBtn) {
        // マウスが離れたらオプションを隠す（探索中でなければ）
        if (idaOptionLabel && !actionButtonsDiv.classList.contains('searching')) {
          idaOptionLabel.hidden = true;
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

    const currentSignature = COMMON.getPiecesSignature(INITIAL_STATE);
    const isFullSet = (currentSignature === FULL_SET_SIGNATURE);
    const dataType = isFullSet ? 'fullset' : 'subset';
    const dataStore = localVisitedData[dataType];

    const usePruning = pruningCheckbox.checked && optimalPathData.normalizedSet !== null;
    const useLocalVisited = useLocalVisitedCheckbox.checked && dataStore.set !== null;
    const initialStateBigInt = COMMON.stateToBigInt(INITIAL_STATE);
    const normalizedInitialStateBigInt = COMMON.normalizeStateBigInt(initialStateBigInt);

    let preloadedDataForSolver = null;
    if (useLocalVisited) {
      // 開始局面が保存済みデータに含まれている場合、そのデータセットを使うと探索が即座に終了してしまう可能性がある。
      // (開始局面の隣接ノードが全て探索済みになり、探索が広がらないため)。この場合、安全策として保存済みデータの利用を一時的に無効にする。
      if (dataStore.set.has(normalizedInitialStateBigInt)) {
        console.warn('初期盤面が保存済みデータに含まれているため、この探索では保存済みデータを利用しません。');
        statusDiv.textContent = '情報: 初期盤面が保存済みデータに含まれていたため、保存データは利用されません。';
      } else {
        preloadedDataForSolver = dataStore.set;
      }
    }

    const isStartOnOptimalPath = usePruning && optimalPathData.normalizedSet.has(normalizedInitialStateBigInt);
    setUIState(true, uiSelectedAlgorithm); // UIを「探索中」の状態に切り替える

    // IDA*探索が選択された場合、ミコトさんのスライドショーを開始する
    if (uiSelectedAlgorithm === 'idastar') {
      let slideIndex = 0;
      const transitionDuration = 1000; // CSSのtransition-durationと合わせる

      // 1. 最初のスライドを下のレイヤー('::before')に即時表示する
      const initialSlide = `url(${ASSET_PATHS.MIKOTO_SLIDES[slideIndex]})`;
      const initialBgComposite = `
                linear-gradient(to right, rgba(0, 0, 0, 1), rgba(255, 255, 255, 0)),
                ${initialSlide}
            `;
      topContainer.style.setProperty('--before-bg-image', initialBgComposite);
      topContainer.style.setProperty('--after-bg-image', 'none'); // 上のレイヤーは透明に
      topContainer.classList.remove('bg-active');
      lockedBgUrl = initialSlide;

      mikotoTimer = setInterval(() => {
        // 2. 次のスライドを上のレイヤー('::after')にセットし、フェードインさせる
        //    この時、下のレイヤーには前のスライドが表示されているため、クロスフェードのように見える
        slideIndex = (slideIndex + 1) % ASSET_PATHS.MIKOTO_SLIDES.length;
        const nextSlide = `url(${ASSET_PATHS.MIKOTO_SLIDES[slideIndex]})`;
        topContainer.style.setProperty('--after-bg-image', nextSlide);
        topContainer.classList.add('bg-active');

        // 3. フェード完了後、次のサイクルのためにレイヤーをリセットする
        setTimeout(() => {
          // 現在表示されたスライドを下のレイヤーに移動
          const nextBgComposite = `
                        linear-gradient(to right, rgba(0, 0, 0, 1), rgba(255, 255, 255, 0)),
                        ${nextSlide}
                    `;
          topContainer.style.setProperty('--before-bg-image', nextBgComposite);
          topContainer.classList.remove('bg-active'); // 上のレイヤーを再び透明に
          lockedBgUrl = nextSlide;
        }, transitionDuration);
      }, MIKOTO_SPEECH_WAIT);
    } else {
      // 他アルゴリズムの場合は、キャラクター画像を固定表示
      lockedBgUrl = `url(${ASSET_PATHS.BG_IMAGES[uiSelectedAlgorithm]})`;
      topContainer.style.setProperty('--after-bg-image', lockedBgUrl);
      topContainer.classList.add('bg-active');
    }

    const options = {
      initialState: initialStateBigInt,
      algorithm: solverAlgorithm, // ソルバーにアルゴリズム名を渡す
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
    statusDiv.textContent = '探索を停止しました。';
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
    const isOptimal = (solverAlgorithm === 'bfs' || solverAlgorithm === 'astar')
      || (solverAlgorithm === 'idastar' && !isJunctionSolution);
    const title = isOptimal ? '最短手数' : '発見した手数';

    // --- 駒の一貫性を保つためのパス修正処理 ---
    // ソルバーは駒の形状のみを考慮するため、駒の名前（文字）がステップごとに入れ替わることがある。
    // ここでは、1手ずつ経路をたどり、駒の移動を追跡して正しい名前を復元する。
    const correctedPathStrings = [];
    if (result.path && result.path.length > 0) {
      const initialString = COMMON.bigIntToState(result.path[0]);
      correctedPathStrings.push(initialString);
      // 基準となる最初の盤面の駒リストを作成
      let prevPieces = stateToPieces(initialString);

      for (let i = 1; i < result.path.length; i++) {
        const currentRawString = COMMON.bigIntToState(result.path[i]);
        const currentPiecesRaw = stateToPieces(currentRawString);

        const correctedCurrentPieces = [];
        const unmatchedPrevPieces = [...prevPieces];
        const unmatchedCurrentPieces = [];

        // 1. 静止している駒を特定する。
        //    前のステップと同じ位置にある駒は、名前（char）を引き継ぐ。
        for (const currentPiece of currentPiecesRaw) {
          const currentPosSignature = currentPiece.positions.join(',');
          const matchIndex = unmatchedPrevPieces.findIndex(p => p.positions.join(',') === currentPosSignature);

          if (matchIndex > -1) {
            // この駒は動いていない。前のステップの駒情報（特にchar）を引き継ぐ。
            const [prevPiece] = unmatchedPrevPieces.splice(matchIndex, 1);
            correctedCurrentPieces.push({ ...currentPiece, char: prevPiece.char });
          } else {
            // この駒は移動した駒の可能性がある。
            unmatchedCurrentPieces.push(currentPiece);
          }
        }

        // 2. 移動した駒を特定する。
        //    前のステップから「消えた」駒と、新しい位置に「現れた」駒がそれぞれ1つだけのはず。
        if (unmatchedPrevPieces.length === 1 && unmatchedCurrentPieces.length === 1 &&
          unmatchedPrevPieces[0].width === unmatchedCurrentPieces[0].width &&
          unmatchedPrevPieces[0].height === unmatchedCurrentPieces[0].height) {
          // 「消えた」駒の名前を、「新しい位置」の駒に引き継がせる。
          correctedCurrentPieces.push({ ...unmatchedCurrentPieces[0], char: unmatchedPrevPieces[0].char });
        } else {
          // このケースは通常発生しない。安全策として、未修正の盤面を使い、次のステップのためにリセットする。
          console.warn(`Path correction failed at step ${i}. Found ${unmatchedPrevPieces.length} old and ${unmatchedCurrentPieces.length} new pieces.`);
          correctedPathStrings.push(currentRawString);
          prevPieces = stateToPieces(currentRawString); // 状態をリセット
          continue;
        }

        // 3. 修正された駒情報から盤面文字列を再構築し、次のループのために駒情報を更新する。
        const correctedStateString = piecesToState(correctedCurrentPieces);
        correctedPathStrings.push(correctedStateString);
        prevPieces = correctedCurrentPieces;
      }
    }
    const pathAsStrings = correctedPathStrings;

    SolutionDisplay.displaySolution(pathAsStrings);
    statusDiv.textContent = `${result.message} 　 ${title}: ${pathAsStrings.length - 1} 　 探索時間: ${totalTime.toFixed(2)}秒`;
    setUIState(false);
  }

  function handleFailure() {
    if (mikotoTimer) {
      clearInterval(mikotoTimer);
      mikotoTimer = null;
    }
    const totalTime = (performance.now() - searchStartTime) / 1000;
    statusDiv.textContent = `解が見つかりませんでした。 (探索時間: ${totalTime.toFixed(2)}秒)`;
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
    progressDetailsDiv.innerHTML = html;
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
      topContainer.style.setProperty('--before-bg-image', '');
      setContainerBackground(null);

      // 探索終了後、IDA*オプションを隠す
      if (idaOptionLabel) {
        idaOptionLabel.hidden = true;
      }
    }

    // 'searching'クラスを親要素に付け外しすることで、CSS側でまとめてスタイルを制御する
    actionButtonsDiv.classList.toggle('searching', isSearching);

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
        activeBtn.querySelector('img').src = ASSET_PATHS.ICONS.stop;
      }
    } else { // Reverting
      const stopBtn = document.querySelector('.stop-btn');
      if (stopBtn) {
        const algo = stopBtn.value; // ボタンのvalue属性から元のアルゴリズム名を取得
        stopBtn.parentElement.classList.remove('active-search');
        // 役割を「停止」から「探索開始」に戻す
        stopBtn.classList.replace('stop-btn', 'start-algorithm-btn');
        // アイコン画像を元のアルゴリズムのアイコンに戻す
        stopBtn.querySelector('img').src = ASSET_PATHS.ICONS.getAlgoIcon(algo);
      }
    }

    // 他のボタンの有効/無効状態を切り替える
    saveBtn.disabled = isSearching;
    checkDataBtn.disabled = isSearching;
    setStateBtn.disabled = isSearching;
    initialStateInput.disabled = isSearching;
    pruningCheckbox.disabled = isSearching || !optimalPathData.normalizedSet;

    const currentSignature = COMMON.getPiecesSignature(INITIAL_STATE);
    const isFullSet = (currentSignature === FULL_SET_SIGNATURE);
    const dataStore = localVisitedData[isFullSet ? 'fullset' : 'subset'];
    useLocalVisitedCheckbox.disabled = isSearching || dataStore.status !== '読込完了';

    if (isSearching) {
      resultPanelDiv.hidden = false;
      searchSummaryDiv.hidden = false;
      saveStatusDiv.textContent = '';
      statusDiv.textContent = 'Searching...';
      solutionPathDiv.innerHTML = '';
    }
  }

  const hideSummaryBtn = document.getElementById('hide-summary-btn');
  if (hideSummaryBtn) {
    hideSummaryBtn.addEventListener('click', () => {
      if (resultPanelDiv.hidden == true)
        resultPanelDiv.hidden = false;
      else
        resultPanelDiv.hidden = true;
    });
  }


  function handleSetState() {
    const newState = initialStateInput.value.trim().toUpperCase();
    setStateStatusDiv.textContent = '';

    if (newState.length !== COMMON.WIDTH * COMMON.HEIGHT) {
      setStateStatusDiv.style.color = COLORS.error;
      setStateStatusDiv.textContent = `エラー: 盤面の文字列は${COMMON.WIDTH * COMMON.HEIGHT}文字である必要があります。`;
      return;
    }
    if (!/^[A-Z\.]+$/.test(newState)) {
      setStateStatusDiv.style.color = COLORS.error;
      setStateStatusDiv.textContent = 'エラー: 使用できる文字は英大文字(A-Z)とピリオド(.)のみです。';
      return;
    }

    INITIAL_STATE = newState;
    setStateStatusDiv.style.color = COLORS.success;
    setStateStatusDiv.textContent = '初期盤面が更新されました。';
    setTimeout(() => { setStateStatusDiv.textContent = ''; }, 3000);

    if (optimalPathData.normalizedSet) {
      const normalizedStateBigInt = COMMON.normalizeStateBigInt(COMMON.stateToBigInt(INITIAL_STATE));
      if (optimalPathData.normalizedSet.has(normalizedStateBigInt)) {
        pruningDataStatus.textContent = `(最短経路上: ${optimalPathData.normalizedSet.size.toLocaleString()}件のデータ利用可)`;
      } else {
        pruningDataStatus.textContent = `(注意: 初期盤面は最短経路上にありません)`;
      }
    }

    const currentSignature = COMMON.getPiecesSignature(INITIAL_STATE);
    const isFullSet = (currentSignature === FULL_SET_SIGNATURE);
    const dataType = isFullSet ? 'fullset' : 'subset';
    const dataStore = localVisitedData[dataType];
    useLocalVisitedCheckbox.disabled = dataStore.status !== '読込完了';
  }

  function handleSave() {
    if (!currentSolver || !currentSolver.visited || currentSolver.visited.size === 0) {
      saveStatusDiv.textContent = '保存するデータがありません。';
      return;
    }

    try {
      const currentSignature = getPiecesSignature(INITIAL_STATE);
      const isFullSet = (currentSignature === FULL_SET_SIGNATURE);
      const dataType = isFullSet ? 'fullset' : 'subset';
      const dataStore = localVisitedData[dataType];
      const storageKey = isFullSet ? 'STQVisited_fullset' : 'STQVisited_subset';

      const existingSet = dataStore.set || new Set();
      const existingSize = existingSet.size;

      const mergedSet = new Set([...existingSet, ...currentSolver.visited]);

      // 1. 新しく追加するデータがあるかチェック
      if (mergedSet.size === existingSize) {
        saveStatusDiv.style.color = COLORS.info;
        // メッセージをより具体的にし、何と比較して追加データがなかったのかを明確にする
        saveStatusDiv.textContent = '今回の探索結果は、読み込み済みのデータ(共有データ含む)に全て含まれていました。';
        setTimeout(() => { saveStatusDiv.textContent = ''; }, 5000); // 少し長めに表示
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
      saveStatusDiv.style.color = COLORS.success;
      saveStatusDiv.textContent = `探索済みノードをlocalStorageに保存しました。(合計: ${mergedSet.size.toLocaleString()}件)`;

      const fullSetSize = localVisitedData.fullset.set.size;
      const subsetSize = localVisitedData.subset.set.size;
      let statusText = [];
      if (fullSetSize > 0) statusText.push(`Full: ${fullSetSize.toLocaleString()}`);
      if (subsetSize > 0) statusText.push(`Sub: ${subsetSize.toLocaleString()}`);
      localVisitedDataStatus.textContent = `(${statusText.join(', ')}件)`;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        saveStatusDiv.textContent = `エラー: localStorageの容量制限を超えました。`;
      } else {
        saveStatusDiv.textContent = `保存中にエラーが発生しました: ${e.message}`;
      }
      console.error('Failed to save to localStorage:', e);
    }
  }

  function handleCheckData() {
    saveStatusDiv.textContent = 'データチェック中...';
    saveStatusDiv.style.color = COLORS.info;

    // 以前のクリーンアップボタンが残っていれば削除
    const oldCleanupBtn = document.getElementById('cleanup-btn');
    if (oldCleanupBtn) oldCleanupBtn.parentElement.removeChild(oldCleanupBtn);

    try {
      const currentSignature = getPiecesSignature(INITIAL_STATE);
      const isFullSet = (currentSignature === FULL_SET_SIGNATURE);
      const dataType = isFullSet ? 'fullset' : 'subset';
      const dataStore = localVisitedData[dataType];
      const storageKey = isFullSet ? 'STQVisited_fullset' : 'STQVisited_subset';

      const savedVisitedJson = localStorage.getItem(storageKey);
      if (!savedVisitedJson) {
        saveStatusDiv.textContent = `チェックするlocalStorageデータ(${dataType})がありません。`;
        return;
      }

      // localStorageにはBigIntを文字列化したものが保存されている
      const savedVisitedStrings = JSON.parse(savedVisitedJson);
      const originalCount = savedVisitedStrings.length;
      // 文字列のSetを作成して重複をチェック
      const uniqueSetOfStrings = new Set(savedVisitedStrings);
      const uniqueCount = uniqueSetOfStrings.size;

      if (originalCount === uniqueCount) {
        saveStatusDiv.style.color = COLORS.success;
        saveStatusDiv.textContent = `データは正常です。重複するノードはありませんでした。(${originalCount.toLocaleString()}件)`;
      } else {
        // 重複が見つかった場合の処理
        const duplicateCount = originalCount - uniqueCount;
        saveStatusDiv.style.color = COLORS.warning;

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
          saveStatusDiv.style.color = COLORS.success;
          saveStatusDiv.textContent = `データをクリーンアップしました。 (重複${duplicateCount.toLocaleString()}件を削除 → ${uniqueCount.toLocaleString()}件)`;
          // UIのステータス表示を更新
          const fullSetSize = localVisitedData.fullset.set.size;
          const subsetSize = localVisitedData.subset.set.size;
          let statusText = [];
          if (fullSetSize > 0) statusText.push(`Full: ${fullSetSize.toLocaleString()}`);
          if (subsetSize > 0) statusText.push(`Sub: ${subsetSize.toLocaleString()}`);
          localVisitedDataStatus.textContent = `(${statusText.join(', ')}件)`;
        };
        saveStatusDiv.textContent = '';
        saveStatusDiv.appendChild(messageSpan);
        saveStatusDiv.appendChild(cleanupBtn);
      }
    } catch (e) {
      saveStatusDiv.style.color = COLORS.error;
      saveStatusDiv.textContent = `データチェック中にエラーが発生しました: ${e.message}`;
      console.error('Error during data check:', e);
    }
  }

  // --- Initial Load ---
  pruningDataStatus.textContent = '(読込中...)';
  fetch(ASSET_PATHS.DATA_FILES.optimalPath)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then(data => {
      optimalPathData.rawSet = new Set(data);
      optimalPathData.array = data;
      optimalPathData.normalizedSet = new Set(data.map(state => COMMON.normalizeStateBigInt(COMMON.stateToBigInt(state))));
      pruningCheckbox.disabled = false;
      pruningDataStatus.textContent = `(${optimalPathData.rawSet.size.toLocaleString()}件)`;
    })
    .catch(error => {
      pruningDataStatus.textContent = '(読込失敗)';
      console.error('Error loading optimal path data:', error);
    });

  // --- 共有＆ローカルの探索済みデータを読み込む ---
  localVisitedDataStatus.textContent = '(読込中...)';
  // 1. まず共有された探索済みデータ(shared_visited.dat)を非同期で読み込む
  fetch(ASSET_PATHS.DATA_FILES.sharedVisited)
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
        localVisitedData.fullset.set = new Set(sharedBigInts);
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
          const savedVisitedJson = localStorage.getItem(key);
          if (savedVisitedJson) {
            const localVisitedStrings = JSON.parse(savedVisitedJson);
            localBigInts = localVisitedStrings.map(s => BigInt(s)); // 新フォーマットのみ想定
          }
        } catch (e) {
          console.error(`localStorageからのデータ(${key})読み込みに失敗しました。`, e);
        }

        if (localBigInts.length > 0) {
          // 既存のSetにマージ
          localVisitedData[type].set = new Set([...localVisitedData[type].set, ...localBigInts]);
        }
      }

      // 4. UIの更新
      const fullSetSize = localVisitedData.fullset.set.size;
      const subsetSize = localVisitedData.subset.set.size;

      if (fullSetSize > 0 || subsetSize > 0) {
        useLocalVisitedCheckbox.disabled = false;
        let statusText = [];
        if (fullSetSize > 0) {
          localVisitedData.fullset.status = '読込完了';
          statusText.push(`Full: ${fullSetSize.toLocaleString()}`);
        }
        if (subsetSize > 0) {
          localVisitedData.subset.status = '読込完了';
          statusText.push(`Sub: ${subsetSize.toLocaleString()}`);
        }
        localVisitedDataStatus.textContent = `(${statusText.join(', ')}件)`;
      } else {
        localVisitedDataStatus.textContent = '(データなし)';
      }
    });

  function stateToPieces(state) {
    const pieces = [];
    const processed = new Set();
    let pieceIdCounter = 0;

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

      pieces.push({ // 2. 見つかった駒の情報を保存
        id: pieceIdCounter++,
        char: char,
        positions: positions.sort((a, b) => a - b), // 常にソートして一貫性を保つ
        width: maxX - minX + 1,
        height: maxY - minY + 1
      });
    }
    return pieces;
  }

  function piecesToState(pieces) {
    const state = Array(20).fill('.');
    for (const piece of pieces) {
      for (const pos of piece.positions) {
        state[pos] = piece.char;
      }
    }
    return state.join('');
  }

  // --- Board Editor Logic ---
  function initializeBoardEditor() {
    const sourceGrid = document.getElementById('source-grid');
    const targetGrid = document.getElementById('target-grid');

    const applyBtn = document.getElementById('apply-editor-btn');
    const resetBtn = document.getElementById('reset-editor-btn');
    const allowSubsetCheckbox = document.getElementById('allow-subset-pieces');

    const highlightOverlay = document.createElement('div');
    highlightOverlay.id = 'selection-highlight';
    highlightOverlay.hidden = true;

    const INITIAL_SOURCE_STATE = "BAACBAACDFFEDIJEG..H";
    const initialPiecesForMap = stateToPieces(INITIAL_SOURCE_STATE);
    const originalPositionsMap = new Map(initialPiecesForMap.map(p => [p.id, p.positions]));

    let sourcePieces = [];
    let targetPieces = [];
    let selectedPiece = null;
    let previewPositions = [];
    let lastPreviewIndex = -1;
    let lastHoveredPieceInfo = { piece: null, grid: null };
    function createGridCells(gridElement) {
      gridElement.innerHTML = '';
      for (let i = 0; i < 20; i++) {
        const cell = document.createElement('div');
        cell.classList.add('editor-grid-cell');
        cell.dataset.index = i;
        gridElement.appendChild(cell);
      }
    }
    function renderGridWithPieces(gridElement, pieces) {
      const pieceMap = Array(20).fill(null);
      for (const piece of pieces) {
        for (const pos of piece.positions) {
          pieceMap[pos] = piece;
        }
      }

      gridElement.querySelectorAll('.editor-grid-cell').forEach((cell, i) => {
        const piece = pieceMap[i];
        let classList = ['editor-grid-cell'];

        if (piece) {
          classList.push(`piece-${piece.char}`);
          cell.textContent = (i === piece.positions[0]) ? piece.char : '';
          const x = i % COMMON.WIDTH;
          const y = Math.floor(i / COMMON.WIDTH);
          if (x < COMMON.WIDTH - 1 && pieceMap[i + 1] === piece) classList.push('piece-inner-right');
          if (y < COMMON.HEIGHT - 1 && pieceMap[i + COMMON.WIDTH] === piece)
            classList.push('piece-inner-bottom');
        } else {
          classList.push('piece-dot');
          cell.textContent = '';
        }
        cell.className = classList.join(' ');
      });
    }

    function clearPreview() {
      if (previewPositions.length > 0) {
        previewPositions.forEach(pos => {
          const cell = targetGrid.querySelector(`.editor-grid-cell[data-index='${pos}']`);
          if (cell) cell.classList.remove('preview-piece');
        });
        previewPositions = [];
      }
    }

    function showPreview(positions) {
      positions.forEach(pos => {
        const cell = targetGrid.querySelector(`.editor-grid-cell[data-index='${pos}']`);
        if (cell) cell.classList.add('preview-piece');
      });
      previewPositions = positions;
    }

    function updateAllRenders() {
      renderGridWithPieces(sourceGrid, sourcePieces);
      renderGridWithPieces(targetGrid, targetPieces);
      updateHighlightOverlay();
    }

    function resetEditor() {
      sourcePieces = stateToPieces(INITIAL_SOURCE_STATE);
      targetPieces = [];
      selectedPiece = null;
      clearPreview();
      updateAllRenders();
    }

    function clearHover() {
      if (lastHoveredPieceInfo.piece) {
        lastHoveredPieceInfo.piece.positions.forEach(pos => {
          const cellEl = lastHoveredPieceInfo.grid.querySelector(`.editor-grid-cell[data-index='${pos}']`);
          if (cellEl) cellEl.classList.remove('hovered-piece');
        });
        lastHoveredPieceInfo.piece = null;
        lastHoveredPieceInfo.grid = null;
      }
    }

    function handleGridMouseOver(e, pieces, grid) {
      const cell = e.target.closest('.editor-grid-cell');
      if (!cell) return;

      const index = parseInt(cell.dataset.index, 10);
      const hoveredPiece = pieces.find(p => p.positions.includes(index));

      if (hoveredPiece === lastHoveredPieceInfo.piece) return;

      clearHover();

      if (hoveredPiece) {
        hoveredPiece.positions.forEach(pos => {
          const cellEl = grid.querySelector(`.editor-grid-cell[data-index='${pos}']`);
          if (cellEl) cellEl.classList.add('hovered-piece');
        });
        lastHoveredPieceInfo.piece = hoveredPiece;
        lastHoveredPieceInfo.grid = grid;
      }
    }

    sourceGrid.addEventListener('mouseover', e => handleGridMouseOver(e, sourcePieces, sourceGrid));
    targetGrid.addEventListener('mouseover', e => handleGridMouseOver(e, targetPieces, targetGrid));

    sourceGrid.addEventListener('mouseout', clearHover);
    targetGrid.addEventListener('mouseout', clearHover);

    function updateHighlightOverlay() {
      if (!selectedPiece) {
        highlightOverlay.hidden = true;
        return;
      }
      const originIndex = selectedPiece.positions[0];
      const cellElement = sourceGrid.querySelector(`.editor-grid-cell[data-index='${originIndex}']`);
      if (cellElement) {
        const cellWidth = 24;
        const cellHeight = 24;
        const gap = 0; // グリッドのgapが0なので、こちらも0に合わせます
        highlightOverlay.style.top = `${cellElement.offsetTop}px`;
        highlightOverlay.style.left = `${cellElement.offsetLeft}px`;
        highlightOverlay.style.width = `${selectedPiece.width * cellWidth + (selectedPiece.width - 1) * gap}px`;
        highlightOverlay.style.height = `${selectedPiece.height * cellHeight + (selectedPiece.height - 1) * gap}px`;
        highlightOverlay.hidden = false;
      } else {
        highlightOverlay.hidden = true;
      }
    }

    sourceGrid.addEventListener('click', e => {
      const cell = e.target.closest('.editor-grid-cell');
      if (!cell) return;
      const index = parseInt(cell.dataset.index, 10);
      const clickedPiece = sourcePieces.find(p => p.positions.includes(index));

      if (clickedPiece) {
        if (selectedPiece && selectedPiece.id === clickedPiece.id) {
          selectedPiece = null; // Deselect
          clearPreview();
        } else {
          selectedPiece = clickedPiece;
        }
        updateAllRenders();
      }
    });

    targetGrid.addEventListener('mousemove', e => {
      const cell = e.target.closest('.editor-grid-cell');
      if (!cell) return;

      const targetIndex = parseInt(cell.dataset.index, 10);
      if (targetIndex === lastPreviewIndex) return;

      lastPreviewIndex = targetIndex;
      clearPreview();

      if (!selectedPiece) return;

      const targetX = targetIndex % COMMON.WIDTH;
      const targetY = Math.floor(targetIndex / COMMON.WIDTH);
      const currentTargetState = piecesToState(targetPieces).split('');

      let canPlace = true;
      if (targetX + selectedPiece.width > COMMON.WIDTH || targetY + selectedPiece.height > COMMON.HEIGHT) {
        canPlace = false;
      } else {
        for (let py = 0; py < selectedPiece.height; py++) {
          for (let px = 0; px < selectedPiece.width; px++) {
            if (currentTargetState[(targetY + py) * COMMON.WIDTH + (targetX + px)] !== '.') {
              canPlace = false;
              break;
            }
          }
          if (!canPlace) break;
        }
      }

      if (canPlace) {
        const newPositions = [];
        const originIndex = selectedPiece.positions[0];
        const originX = originIndex % COMMON.WIDTH;
        const originY = Math.floor(originIndex / COMMON.WIDTH);

        for (const pos of selectedPiece.positions) {
          const dx = (pos % COMMON.WIDTH) - originX;
          const dy = Math.floor(pos / COMMON.WIDTH) - originY;
          newPositions.push((targetY + dy) * COMMON.WIDTH + (targetX + dx));
        }
        showPreview(newPositions);
      }
    });

    targetGrid.addEventListener('mouseleave', () => {
      clearPreview();
      lastPreviewIndex = -1;
    });

    targetGrid.addEventListener('click', e => {
      const cell = e.target.closest('.editor-grid-cell');
      if (!cell || !selectedPiece) return;

      const targetIndex = parseInt(cell.dataset.index, 10);
      const targetX = targetIndex % COMMON.WIDTH;
      const targetY = Math.floor(targetIndex / COMMON.WIDTH);
      const currentTargetState = piecesToState(targetPieces).split('');

      let canPlace = true;
      if (targetX + selectedPiece.width > COMMON.WIDTH || targetY + selectedPiece.height > COMMON.HEIGHT) {
        canPlace = false;
      } else {
        for (let py = 0; py < selectedPiece.height; py++) {
          for (let px = 0; px < selectedPiece.width; px++) {
            if (currentTargetState[(targetY + py) * COMMON.WIDTH + (targetX + px)] !== '.') {
              canPlace = false;
              break;
            }
          }
          if (!canPlace) break;
        }
      }

      if (canPlace) {
        sourcePieces = sourcePieces.filter(p => p.id !== selectedPiece.id);

        const newPositions = [];
        const originIndex = selectedPiece.positions[0];
        const originX = originIndex % COMMON.WIDTH;
        const originY = Math.floor(originIndex / COMMON.WIDTH);

        for (const pos of selectedPiece.positions) {
          const dx = (pos % COMMON.WIDTH) - originX;
          const dy = Math.floor(pos / COMMON.WIDTH) - originY;
          newPositions.push((targetY + dy) * COMMON.WIDTH + (targetX + dx));
        }
        selectedPiece.positions = newPositions;
        targetPieces.push(selectedPiece);

        selectedPiece = null;
        updateAllRenders();
      }
    });

    targetGrid.addEventListener('contextmenu', e => {
      e.preventDefault();
      const cell = e.target.closest('.editor-grid-cell');
      if (!cell) return;

      const index = parseInt(cell.dataset.index, 10);
      const clickedPiece = targetPieces.find(p => p.positions.includes(index));

      if (clickedPiece) {
        // Restore original positions before moving it back to source
        clickedPiece.positions = originalPositionsMap.get(clickedPiece.id);

        targetPieces = targetPieces.filter(p => p.id !== clickedPiece.id);
        sourcePieces.push(clickedPiece);
        updateAllRenders();
      }
    });

    applyBtn.addEventListener('click', () => {
      // "サブセットを許す"がチェックされていない場合、全ての駒が配置されているかチェック
      if (!allowSubsetCheckbox.checked && sourcePieces.length > 0) {
        alert(`配置していない駒があります。全ての駒を右の盤面に配置してください。`);
        return;
      }

      // A（大駒2x2の駒）は必須)。さもないとゴール条件が無くなってしまう。
      if (!targetPieces.some(p => p.char === 'A')) {
        alert(`大駒"A"が配置されていません。Aは必ず右の盤面に配置してください。`);
        return;
      }

      const finalState = piecesToState(targetPieces);
      const finalStateArray = finalState.split('');
      const emptyCount = finalStateArray.filter(c => c === '.').length;
      // パズルとして成立するための最低条件をチェック (空きマスが2つ以上か)
      // (現在のボードエディターの仕様では空きマスが２つ以下になることはないが、念のため)
      if (emptyCount < 2) {
        alert(`空きマスが2つ未満です。駒を右クリックで盤面から取り除いてください。`);
        return;
      }

      initialStateInput.value = finalState;
      handleSetState();
    });
    resetBtn.addEventListener('click', resetEditor);

    // Initial render
    createGridCells(sourceGrid);
    sourceGrid.appendChild(highlightOverlay);
    createGridCells(targetGrid);
    resetEditor();
  }

  SolutionDisplay.init({
    solutionPathDiv: document.getElementById('solution-path'),
    initialStateInput: document.getElementById('initial-state-input'),
    handleSetState: handleSetState,
    stateToPieces: stateToPieces,
    COMMON: COMMON
  });

  initializeBoardEditor();

  // --- Draggable Panel Logic ---
  function initializeDraggablePanel() {
    const panel = document.querySelector('.solution-panel');

    let isDragging = false;
    let offsetX, offsetY;

    panel.addEventListener('mousedown', (e) => {
      // ドラッグを開始する要素（サマリー部か、下のハンドル）
      const dragTarget = e.target.closest('#search-summary, .drag-handle');
      // ドラッグ対象外の要素（ボタンやクリック可能な盤面など）
      const nonDraggable = e.target.closest('button, .clickable-board, input, a, .close-btn');

      // ドラッグ対象であり、かつドラッグ対象外の要素でなければドラッグ開始
      if (dragTarget && !nonDraggable) {
        isDragging = true;
        offsetX = e.clientX - panel.offsetLeft;
        offsetY = e.clientY - panel.offsetTop;

        // ドラッグ中のカーソルスタイルとテキスト選択防止を設定
        dragTarget.style.cursor = 'grabbing';
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
