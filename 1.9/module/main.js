// Minfilia JS SAVE THE ORACLE Web Edition
import { COMMON } from "./common.js";
import {
    SCRN_W, SCRN_H, BDOFFX, BDOFFY, BRDW, BRDH, BRD_LEN, CELL,
    pctx, puzzleCanvas,
    initGameState, updateGameState, drawAll, checkGameClear,
    updateStateInt, getMsbPosition,
    toGridXY, canMove, move, undoMove,
    activateMiracle, blkBuster, startExitAnim,
    stateInt,
    isFadingOut, isFadingIn, fadeStartTime,
    exitAnim, mrclAnim,
    Selected, rtryRect, pixyRect, BTNSIZ,
} from "./puzzle.js";

import { BFSSolver } from './solvers/bfs.js';
import { AStarSolver } from './solvers/astar.js';
import { IDAStarSolver } from './solvers/idastar.js';

const SND_ROOT ='./snd'
const SND_START = `${SND_ROOT}/start.mp3`
const SND_SEL = `${SND_ROOT}/ffxiv_sps05001_mp3/FFXIV_Obtain_Item.mp3`
const SND_MOV = `${SND_ROOT}/ffxiv_sps05001_mp3/FFXIV_Confirm.mp3`
const SND_UNDO = `${SND_ROOT}/ffxiv_sps05001_mp3/FFXIV_Untarget.mp3` // 一手戻す
const SND_MRCL = `${SND_ROOT}/ffxiv_sps05001_mp3/FFXIV_Limit_Break_Activated.mp3`
const SND_CLR = `${SND_ROOT}/ffxiv_sps05001_mp3/FFXIV_Enlist_Twin_Adders.mp3`
const SND_SOLVER = `${SND_ROOT}/ffxiv_sps05001_mp3/FFXIV_Linkshell_Transmission.mp3`
const SND_MASTER_VOL = 1
const SND_START_VOL = SND_MASTER_VOL/2
const SND_SEL_VOL = SND_MASTER_VOL/2
const SND_MOV_VOL = SND_MASTER_VOL
const SND_MRCL_VOL = SND_MASTER_VOL/4
const SND_CLR_VOL = SND_MASTER_VOL/4
const SND_SOLVER_VOL = SND_MASTER_VOL/4
const FADE_DURATION = 400; // 0.4秒
let snd_select, snd_mrcl, snd_clr, snd_start, snd_undo, snd_solver;
let  snd_move;

let isMouseOverCanvas = false; // マウスがcanvas上にあるかを追跡するフラグ

const initStr = "BAACBAACDFFEDIJEG..H";
let stateStr=initStr;  // デバッグ表示や互換性のために保持
let Start_Pos=stateStr; // for solver
let crntSolver = null;

const solPath = document.querySelector('.sol-path');
const solPanel = document.querySelector('.sol-panel');

let isCommandTyping = false; // Flag to check if user is typing a command
let commandSequence = []; // For command input

// --- Fade Effect ---
const mrclCmd = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown',
                 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a', ' '];
const bsbCmd = ['arrowdown', 'arrowup', 'x', 'y', ' '];  // BSB:Blight Soil Break

let commandInputTimer = null; // Timer for command input
const COMMAND_TIMEOUT = 500; // 0.5 seconds
const infoDiv = document.getElementById('info');

export let cursorBlk = 7;
let isDrag = false;
let DSMP = [0, 0];
const onMouseDown = (e) => {
    let rect = puzzleCanvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    let { gx, gy } = toGridXY(x, y);
    let grid_x = gx;
    let grid_y = gy;
    if (!(exitAnim || mrclAnim)) {
        if (0 <= grid_x && grid_x < BRDW && 0 <= grid_y && grid_y < BRDH) {
            const idx = (BRD_LEN - 1) - (grid_y * BRDW + grid_x);
            const clicked_blkId = Number((stateInt >> BigInt(idx * 4)) & 0xFn);
            if (clicked_blkId !== 0) {
                if (Selected != clicked_blkId && snd_select) snd_select.currentTime = 0, snd_select.play();
                cursorBlk = clicked_blkId;
                isDrag = true;
                DSMP = [x, y];
            }
        }
    }
}

let onMouseUp = (e) => isDrag = false;

function safePlay(audio) {
    try {
        audio.currentTime = 0;
        audio.play().catch((e) => {
            if (e.name !== 'NotAllowedError') console.error(e);
        });
    } catch (e) {
        console.error(e);
    }
}

function getStrokeStyle(ch) {
    const base = 'z-index:0; outline-offset:-1px; outline: 1px solid var(--grey);';
    switch (ch) {
    case 'A':
        return `${base} width: calc(var(--blk-w) * 2); height: calc(var(--blk-h) * 2);`;
    case 'B': case 'C': case 'D': case 'E':
        return `${base} height: calc(var(--blk-h) * 2);`;
    case 'F':
        return `${base} width: calc(var(--blk-w) * 2);`;
    case 'G': case 'H': case 'I': case 'J':
        return `${base}`;
    default:
        return '';
    }
}

function tglPanel() {
    const sol = document.getElementById('solver');
    const o = document.getElementById('sndOpen');
    const c = document.getElementById('sndClose');
    const isO =!sol.classList.contains('active');
    if (o) o.volume =0.1;
    if (c) c.volume =0.1;
    sol.classList.toggle('active');
    if (isO) {
        if (o) o.play();
    }else{
        if (c) c.play();
    }
}

function toggleFade() {
    const canvas = document.getElementById("graphcanvas");
    if (canvas) {
        canvas.classList.toggle("visible");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const puzzleCanvas = document.getElementById('puzzlecanvas');
    // --- Global State and DOM Elements ---
    const status = document.getElementById('status');
    const progress = document.getElementById('progress-details');
    const startPos = document.getElementById('start-pos');
    const startPosStts = document.getElementById('start-pos-stts');
    const setStateBtn = document.getElementById('set-state-btn');
    const svBtn = document.getElementById('sv-btn');
    const ckDataBtn = document.getElementById('ck-data-btn');
    const prun = document.getElementById('prun');  // pruningCheckbox
    const visit = document.getElementById('visit'); //
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

    let optPathData = { rawSet: null, normSet: null, array: null };

    let visitData = {
        fullset: { set: new Set(), status: '未読込' },
        subset: { set: new Set(), status: '未読込' }
    };

    let searchStartTime, timerInterval, mikotoTimer = null;

    let crSolver = null; // current solver

    const ldSprite = (path) => {
        return new Promise((resolve, reject) => {
            const img = new window.Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image from ${src}`));
            img.src = path;
        });
    }


    window.onload = async function () {
        puzzleCanvas.width = SCRN_W;
        puzzleCanvas.height = SCRN_H;
        await loadAllResources();
        await initGameState();

        document.getElementById('hint')?.addEventListener('click', tglPanel);
        document.getElementById('retry')?.addEventListener('click', () => {
            if (!isFadingOut && !isFadingIn) {
                isFadingOut = true;
                fadeStartTime = performance.now();
                if (snd_start) snd_start.currentTime = 0, snd_start.play();
            }
        });
        document.getElementById('undo')?.addEventListener('click', () => {
            if (isFadingOut || isFadingIn) return;
            if (snd_undo) snd_undo.currentTime = 0, snd_undo.play();
            undoMove();
        });

        document.getElementById('lightSwitch')?.addEventListener('change', toggleFade);

        // fadeStartTime = performance.now();
        puzzleCanvas.addEventListener("mouseenter", () => isMouseOverCanvas = true);
        puzzleCanvas.addEventListener("mouseleave", () => isMouseOverCanvas = false);
        window.addEventListener("keydown", (e) => {
            // --- Command and Speech Input Logic ---
            if (commandInputTimer) {
                clearTimeout(commandInputTimer);
            }
            const key = e.key.toLowerCase();
            const arrowMap = { // for command
                'arrowup': '↑',
                'arrowdown': '↓',
                'arrowleft': '←',
                'arrowright': '→'
            };
            const dispChar = arrowMap[key] || (key.length === 1 ? key : null);

            // コマンド入力の開始または継続
            if (dispChar) {
                if (!isCommandTyping) {
                    isCommandTyping = true;
                    UriangerSays = ""; // 最初の入力で吹き出しをクリア
                }
                if (UriangerSays.length < 24) {
                    UriangerSays += dispChar;
                }
                commandSequence.push(key);
            } else if (e.key === 'Backspace') {
                UriangerSays = UriangerSays.slice(0, -1);
                commandSequence.pop();
                if (UriangerSays.length === 0) { // 全て消したらリセット
                    isCommandTyping = false;
                    UriangerSays = defaultUriangerSays;
                    commandSequence = [];
                }
            } else if (e.key === 'Enter') {
                isCommandTyping = false;
                UriangerSays = defaultUriangerSays;
                commandSequence = [];
                return; // Enterキーではコマンド判定を行わない
            }

            // Keep the sequence array at the length of the command
            if (commandSequence.length > mrclCmd.length) {
                commandSequence.shift(); // Remove the oldest key press
            }

            // Check if the sequence matches
            if (JSON.stringify(commandSequence) === JSON.stringify(mrclCmd)) {
                console.log("Miracle Command Entered!");
                activateMiracle();
                commandSequence = []; // Reset the sequence
                isCommandTyping = false;
                UriangerSays = URIANGER_QUOTES['commandSuccessMiracle']; // 成功メッセージ
                if (commandInputTimer) clearTimeout(commandInputTimer); // Clear timer on success
                setTimeout(() => { UriangerSays = defaultUriangerSays; }, 2000);
                // 2秒後に戻す
            } else if (JSON.stringify(commandSequence) === JSON.stringify(bsbCmd)) {
                console.log("Bright Soil Break Entered!");
                activateBSB();
                commandSequence = []; // Reset the sequence
                isCommandTyping = false;
                UriangerSays = URIANGER_QUOTES['commandSuccessBSB']; // 成功メッセージ
                if (commandInputTimer) clearTimeout(commandInputTimer); // Clear timer on success
                setTimeout(() => { UriangerSays = defaultUriangerSays; }, 2000);
                // 2秒後に戻す
            } else {
                // Reset the sequence if no key is pressed for the timeout duration
                commandInputTimer = setTimeout(() => {
                    commandSequence = [];
                    if (isCommandTyping) {
                        isCommandTyping = false;
                        UriangerSays = defaultUriangerSays;
                    }
                }, COMMAND_TIMEOUT);
            }
        });

        puzzleCanvas.addEventListener("mousedown", onMouseDown);
        puzzleCanvas.addEventListener("mousemove", onMouseMove);
        puzzleCanvas.addEventListener("mouseup", onMouseUp);
        mainLoop();
    }

    function mainLoop() {
        updateGameState();
        drawAll();
        checkGameClear(); // クリア判定をpuzzle.jsに委譲

        requestAnimationFrame(mainLoop);
    }
    const onMouseMove = (e) => {
        if (!isDrag || !Selected || exitAnim || mrclAnim) return;
        let rect = puzzleCanvas.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        let [sx, sy] = DSMP;
        let dx = x - sx;
        let dy = y - sy;
        let mv = null;
        if (Math.abs(dx) > DRAG_THLD) mv = dx > 0 ? "right" : "left";
        if (Math.abs(dy) > DRAG_THLD && Math.abs(dy) > Math.abs(dx)) mv = dy > 0 ? "down" : "up";
        if (mrclAnim) return;

        if (mv) {
            // ゴール位置にいるオラクル(blkId=1)を下に動かすと、外へでるアニメーションがはじまる
            if (Selected == 1 && gameClr && mv == "down") {
                startExitAnim();
            } else if (canMove(Selected, mv)) { // 普通の駒の動き
                move(Selected, mv);
                DSMP = [x, y];                   //  Selected position
            } else {
                // 動けない方向
                // snd_doshin.play() 衝突音
            }
        }
    }

    const ui = document.querySelector('.ui-panel');
    const DRAG_THLD = CELL / 2; // mouse drag sensibility 0<fast<->slow >1
    const ldSound = (path) => {
        return new Promise((resolve, reject) => {
            const audio = new window.Audio(path);
            audio.addEventListener('canplaythrough', () => {
                resolve(audio);
            });
            audio.addEventListener('error', (e) => {
                reject(new Error(`Failed to load audio from ${path}`));
            });
            audio.load();
        });
    };

    async function loadAllResources() {
        // imgSheetの読み込みはpuzzle.jsに移動
        try {
            snd_start = await ldSound(SND_START);
            snd_start.volume = SND_START_VOL;
            snd_select = await ldSound(SND_SEL);
            snd_select.volume = SND_SEL_VOL;
            snd_move = await ldSound(SND_MOV);
            snd_move.volume = SND_MOV_VOL;
            snd_mrcl = await ldSound(SND_MRCL);
            snd_mrcl.volume = SND_MRCL_VOL;
            snd_clr = await ldSound(SND_CLR);
            snd_clr.volume = SND_CLR_VOL;
            snd_undo = await ldSound(SND_UNDO);
            snd_undo.volume = SND_MOV_VOL; // 同じくらいの音量で
            snd_solver = await ldSound(SND_SOLVER);
            snd_solver.volume = SND_SOLVER_VOL; // 同じくらいの音量で
        } catch (e) {
            console.error("Failed to load sound resources:", e);
        }
    }

    // save stateStr in windows clipboard
    async function stateStrClipboard() {
        try {
            await navigator.clipboard.writeText(stateStr);
            console.log('stateStr copied to windows clipboard successfully!');
        } catch (err) {
            console.error('Failed to copy stateStr:', err);
        }
    }

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


    document.onselectstart = () => false;
    let dragged = null;
    let offsetX = 0, offsetY = 0;
    document.addEventListener('mousedown', (e) => {
        const target = e.target.closest('.drag-handle');
        if (!target) return;
        dragged = target;
        offsetX = e.clientX - dragged.offsetLeft;
        offsetY = e.clientY - dragged.offsetTop;
        dragged.style.position = 'absolute';
        dragged.style.zIndex = 1000;
    });
    document.addEventListener('mousemove', (e) => {
        if (!dragged) return;
        dragged.style.left = `${e.clientX - offsetX}px`;
        dragged.style.top = `${e.clientY - offsetY}px`;
    });
    document.addEventListener('mouseup', () => {
        dragged = null;
    });
    document.getElementById('close-solver').addEventListener('click', () => {
        document.getElementById('solver').classList.remove('active');
    });

    // solver-tabのイベントリスナーもこちらに集約
    document.getElementById('solver-tab')?.addEventListener('click', tglPanel);

    // --- Event Listeners ---
    ui.addEventListener('click', (e) => {
        // イベント委譲(Event Delegation)パターン:
        // 親要素(ui)でイベントを受け取り、クリックされた要素がボタンか判定する
        const button = e.target.closest('.icon-btn, #set-state-btn');
        if (!button || button.disabled) return;


        // Handle set state button
        if (button.id === 'set-state-btn') {
            handleSetState();
            return;
        }
        // Handle action buttons
        if (button.classList.contains('icon-btn')) {
            if (button.classList.contains('start-algo-btn')) {
                let algorithm = button.value;
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

    const MIKOTO_SPEECH_WAIT = 5000; // デバッグ用に5秒に設定

    startPos.value = stateStr;
    const FULL_SET_SIGN = COMMON.getBlksSign(Start_Pos);

    // --- Tltip Handling ---
    let tooltipData = {};
    fetch('tooltip.json')
        .then(response => response.json())
        .then(data => {
            tooltipData = data;
        })
        .catch(error => console.error('Error loading tooltip data:', error));

    document.querySelectorAll('.icon-btn, #hint, #retry, #undo').forEach(element => {
        const tltip = element.querySelector('.tltip') || document.createElement('span');
        if (!element.querySelector('.tltip')) {
            tltip.className = 'tltip';
            element.appendChild(tltip);
        }
        const arrowMargin = 12; // 矢印の高さ(5px) + アイコンとの隙間

        element.addEventListener('mouseenter', () => {
            const lang = 'ja'; // TODO: 言語切り替え機能
            const key = element.id;
            if (tooltipData[lang] && tooltipData[lang][key]) {
                tltip.textContent = tooltipData[lang][key];
            }
            if (tltip) {
                // ツールチップの位置を動的に計算し、画面からはみ出さないように調整する。
                // CSSの:hoverだけでは実現が難しいため、JavaScriptで位置を計算する。
                // 1. ツールチップを一旦表示状態にして、そのサイズ(tltipRect)を取得する
                tltip.classList.add('visible');
                tltip.classList.remove('arrow-up', 'arrow-down'); // 向きをリセット
                const iconRect = element.getBoundingClientRect();
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
        element.addEventListener('mouseleave', () => {
            if (tltip) {
                tltip.classList.remove('visible');
            }
            const startBtn = element.classList.contains('start-algo-btn') ? element : null;
            if (startBtn) {
                // マウスが離れたらオプションを隠す（探索中でなければ）
                if (idaOpt && !startBtn.closest('.icon-btn-label')?.classList.contains('searching')) {
                    idaOpt.hidden = true;
                }
                setContainerBackground(null);
            }
        });
    });

    // --- Functions ---
    function startSearch(a) {
        // 新しい探索を開始する前に、以前の探索セッションが残っていればクリアする。
        // これにより、探索成功後に別の探索を開始した場合でも、前のソルバーが正しく破棄される。
        if (crntSolver) {
            crntSolver.stop(); // 念のため停止
            crntSolver = null;
            console.log('crntSolverを初期化(null)');
        }
        // 実際のソルバーに渡すアルゴリズム名（'bfs', 'astar', 'idastar' or 'iddfs'）
        const solverAlgo = a;
        // UI上の選択アルゴリズム名（'idastar' or 'bfs' or 'astar'）
        const uiAlgo = (solverAlgo === 'iddfs') ? 'idastar' : solverAlgo;
        const crSign = COMMON.getBlksSign(Start_Pos);
        const isFullSet = (crSign === FULL_SET_SIGN);
        const dataType = isFullSet ? 'fullset' : 'subset';
        const dataStore = visitData[dataType];
        const usePrun = prun.checked && optPathData.normSet !== null;
        const useLocalVisit = loVstCb.checked && dataStore.set !== null;
        const startStBI = COMMON.stateToBigInt(stateStr);
        const normInitialStateBigInt = COMMON.normalizeStateBigInt(startStBI);
        let preloadedDataForSolver = null;
        if (useLocalVisited) {
            // 探索開始局面が保存済みデータに含まれている場合、そのデータセットを使うと探索が即座に終了してしまう可能性がある。
            // (探索開始局面の隣接ノードが全て探索済みになり、探索が広がらないため)。この場合、安全策として保存済みデータの利用を一時的に無効にする。
            if (dataStore.set.has(normInitialStateBigInt)) {
                console.warn('探索開始盤面が保存済みデータに含まれているため、この探索では保存済みデータを利用しません。');
                status.textContent = '情報: 探索開始盤面が保存済みデータに含まれていたため保存データは利用されません。';
            } else {
                preloadedDataForSolver = dataStore.set;
            }
        }

        const isStartOnOptPath = usePrun && optPathData.normSet.has(normInitialStateBigInt);
        setUIState(true, uiAlgo); // UIを「探索中」の状態に切り替える

        // IDA*探索が選択された場合、ミコトさんのスライドショーを開始する
        if (uiAlgo === 'idastar') {
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
            lockedBgUrl = `url(${ASSET_PATH.BG_IMAGES[uiAlgo]})`;
            ui.style.setProperty('--after-bg-image', lockedBgUrl);
            ui.classList.add('bg-active');
        }
        const options = {
            initialState: startStBI,
            algorithm: solverAlgo, // ソルバーにアルゴリズム名を渡す
            prunOpt: {
                usePrun,
                isStartOnOptPath,
                optPathSet: optPathData.normSet,
                optPathArray: optPathData.array,
            },
            onSuccess: handleSuccess,
            onFailure: handleFailure,
            onProgress: handleProgress,
            onUpdateStts: (text) => { status.textContent = text; },
            preloadedVisited: preloadedDataForSolver,
        };

        switch (solverAlgo) {
        case 'bfs':
            crntSolver = new BFSSolver(options);
            console.log('start:',COMMON.bigIntToState(startStBI),'crntSolverに代入:', crntSolver, 'アルゴリズム:', solverAlgo);
            break;
        case 'astar':
            crntSolver = new AStarSolver(options);
            break;
        case 'idastar':
            crntSolver = new IDAStarSolver(options);
            break;
        case 'iddfs':
            crntSolver = new IDAStarSolver(options); // IDDFSもIDAstarSolverクラスを使用
            break;
        default:
            console.error('Unknown algorithm:', solverAlgo);
            break;
        }
        crntSolver.algorithm = solverAlgo;
        crntSolver.start();
    }

    function handleStop() {
        if (mikotoTimer) {
            clearInterval(mikotoTimer);
            mikotoTimer = null;
        }
        if (crntSolver) {
            crntSolver.stop();
            crntSolver = null;
        }
        setUIState(false);
        status.textContent = '探索を停止しました。';
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
        console.log( "探索済みノード数:",exploredNodes, "キューの長さ:",queueSize.toLocaleString());
        if (searchStartTime) {
            const elapsedSeconds = (performance.now() - searchStartTime) / 1000;
            console.log("経過時間:", elapsedSeconds.toFixed(1));
        }
        progress.innerHTML = html;
    }

    // --- Initial Load ---
    status.textContent = 'Pruning Data Loading...';
    fetch(ASSET_PATH.DATA_FILES.optPath)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            optPathData.rawSet = new Set(data);
            optPathData.array = data;
            optPathData.normSet = new Set(data.map(state => COMMON.normalizeStateBigInt(COMMON.stateToBigInt(state))));
            prun.disabled = false;
            status.textContent = `(${optPathData.rawSet.size.toLocaleString()})`;
        })
        .catch(error => {
            status.textContent = 'Pruning Data loading failure';
            console.error('Error loading opt path data:', error);
        });

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
        // 全てのアルゴリズム選択ボタンの親(<label>)に対して'searching'クラスを付け外しする
        document.querySelectorAll('.start-algo-btn, .stop-btn').forEach(btn => {
            const label = btn.closest('.icon-btn-label');
            if (label) label.classList.toggle('searching', isSearching);
        });
        if (isSearching) {
            // --- 探索開始時のUI変更 ---
            const algo = algorithm; // startSearchから渡されたアルゴリズム名
            const activeButton = document.querySelector(`.icon-btn.start-algo-btn[value="${algo}"]`);
            if (activeButton) {
                // 押されたボタンを特定し、目印となるクラスを付与
                activeButton.closest('.icon-btn-label').classList.add('active-search');
                // 役割を「探索開始」から「停止」に変更
                activeButton.classList.replace('start-algo-btn', 'stop-btn');
                // アイコン画像を「停止」アイコンに差し替える
                activeButton.querySelector('img').src = ASSET_PATH.ICONS.stop;
            }
        } else { // Reverting
            const stopBtn = document.querySelector('.stop-btn');
            if (stopBtn) {
                const algo = stopBtn.value; // ボタンのvalue属性から元のアルゴリズム名を取得
                stopBtn.closest('.icon-btn-label').classList.remove('active-search');
                // 役割を「停止」から「探索開始」に戻す
                stopBtn.classList.replace('stop-btn', 'start-algo-btn');
                // アイコン画像を元のアルゴリズムのアイコンに戻す
                stopBtn.querySelector('img').src = ASSET_PATH.ICONS.getAlgoIcon(algo);
            }
        }

        svBtn.disabled = isSearching;
        ckDtBtn.disabled = isSearching;
        setStBtn.disabled = isSearching;
        startPos.disabled = isSearching;
        prun.disabled = isSearching || !optPathData.normSet;

        const crSign = COMMON.getBlksSign(Start_Pos);
        const isFullSet = (crSign === FULL_SET_SIGN);
        const dataStore = visitData[isFullSet ? 'fullset' : 'subset'];
        loVstCb.disabled = isSearching || dataStore.status !== 'Loaded';
        if (isSearching) {
            svStts.textContent = '';
            status.textContent = 'Searching...';
        }
    }

    function handleSetState() {
        const newState = startPos.value.trim().toUpperCase();
        status.textContent = '';
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
        Start_Pos = newState;
        status.textContent = '探索開始状態が更新されました。';
        setTimeout(() => { setSt.textContent = ''; }, 3000);
        if (optPathData.normSet) {
            const normStateBigInt = COMMON.normalizeStateBigInt(COMMON.stateToBigInt(Start_Pos));
            if (optPathData.normSet.has(normStateBigInt)) {
                status.textContent = `(最短経路上: ${optPathData.normSet.size.toLocaleString()}件のデータ利用可)`;
            } else {
                status.textContent = `(注意: 探索開始状態は最短経路上にありません)`;
            }
        }
        const crSign = COMMON.getBlksSign(Start_Pos);
        const isFullSet = (crSign === FULL_SET_SIGN);
        const dataType = isFullSet ? 'fullset' : 'subset';
        const dataStore = visitData[dataType];
        visit.disabled = dataStore.status !== 'Loaded.';
    }


    function handleSv() {
        if (!crntSolver || !crntSolver.visited || crntSolver.visited.size === 0) {
            svStts.textContent = '保存するデータがありません。';
            return;
        }

        try {
            const crSign = getBlksSign(Start_Pos);
            const isFullSet = (crSign === FULL_SET_SIGN);
            const dataType = isFullSet ? 'fullset' : 'subset';
            const dataStore = visitData[dataType];
            const storageKey = isFullSet ? 'STQVisited_fullset' : 'STQVisited_subset';

            const existingSet = dataStore.set || new Set();
            const existingSize = existingSet.size;

            const mergedSet = new Set([...existingSet, ...crntSolver.visited]);

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

            const fullSetSize = visitData.fullset.set.size;
            const subsetSize = visitData.subset.set.size;
            let statusText = [];
            if (fullSetSize > 0) statusText.push(`Full: ${fullSetSize.toLocaleString()}`);
            if (subsetSize > 0) statusText.push(`Sub: ${subsetSize.toLocaleString()}`);
            status.textContent = `(${statusText.join(', ')}件)`;
        } catch (e) {
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                status.textContent = `エラー: localStorageの容量制限を超えました。`;
            } else {
                status.textContent = `保存中にエラーが発生しました: ${e.message}`;
            }
            console.error('Failed to sv to localStorage:', e);
        }
    }

    function handleSuccess(result) {
        solPath.hidden=false;
        solPanel.hidden=false;
        if (mikotoTimer) {
            clearInterval(mikotoTimer);
            mikotoTimer = null;
        }
        const solverAlgo = crntSolver.algorithm;
        const totalTime = (performance.now() - searchStartTime) / 1000;


        // 解の性質（最短かどうか）を判定し、サマリーメッセージを作成
        const isJunctionSolution = result.message && result.message.includes('合流');
        const isOpt = (solverAlgo === 'bfs' || solverAlgo === 'astar')
              || (solverAlgo === 'idastar' && !isJunctionSolution);
        const title = isOpt ? '最短手数' : '発見した手数';
        // --- 駒の一貫性を保つためのパス修正処理 ---
        // ソルバーは駒の形状のみを考慮するため、駒の名前（文字）がステップごとに入れ替わることがある。
        // ここでは、1手ずつ経路をたどり、駒の移動を追跡して正しい名前を復元する。
        const crPathStrs = [];
        if (result.path && result.path.length > 0) {
            const initialString = COMMON.bigIntToState(result.path[0]);
            crPathStrs.push(initialString);
            // 基準となる最初の盤面の駒リストを作成
            let prevBlks = stateToBlks(initialString);
            for (let i = 1; i < result.path.length; i++) {
                const crRawString = COMMON.bigIntToState(result.path[i]);
                const crBlksRaw = stateToBlks(crRawString);
                const crCrBlks = [];
                const unmatchedPrevBlks = [...prevBlks];
                const unmatchedCrBlks = [];
                // 1. 静止している駒を特定する。
                //    前のステップと同じ位置にある駒は、名前（char）を引き継ぐ。
                for (const crBlk of crBlksRaw) {
                    const crPosSign = crBlk.positions.join(',');
                    const matchIndex = unmatchedPrevBlks.findIndex(p => p.positions.join(',') === crPosSign);
                    if (matchIndex > -1) {
                        // この駒は動いていない。前のステップの駒情報（特にchar）を引き継ぐ。
                        const [prevBlk] = unmatchedPrevBlks.splice(matchIndex, 1);
                        crCrBlks.push({ ...crBlk, char: prevBlk.char });
                    } else {
                        // この駒は移動した駒の可能性がある。
                        unmatchedCrBlks.push(crBlk);
                    }
                }
                // 2. 移動した駒を特定する。
                //    前のステップから「消えた」駒と、新しい位置に「現れた」駒がそれぞれ1つだけのはず。
                if (unmatchedPrevBlks.length === 1 && unmatchedCrBlks.length === 1 &&
                    unmatchedPrevBlks[0].width === unmatchedCrBlks[0].width &&
                    unmatchedPrevBlks[0].height === unmatchedCrBlks[0].height) {
                    // 「消えた」駒の名前を、「新しい位置」の駒に引き継がせる。
                    crCrBlks.push({ ...unmatchedCrBlks[0], char: unmatchedPrevBlks[0].char });
                } else {
                    // このケースは通常発生しない。安全策として、未修正の盤面を使い、次のステップのためにリセットする。
                    console.warn(`Path correction failed at step ${i}. Found ${unmatchedPrevBlks.length} old and ${unmatchedCrBlks.length} new Blks.`);
                    crPathStrs.push(crRawString);
                    prevBlks = stateToBlks(crRawString); // 状態をリセット
                    continue;
                }

                // 3. 修正された駒情報から盤面文字列を再構築し、次のループのために駒情報を更新する。
                const crStStr = BlksToState(crCrBlks);

                crPathStrs.push(crStStr);
                prevBlks = crCrBlks;
            }
        }
        const pathStrs = crPathStrs;

        dispSolPath(pathStrs);
        status.textContent = `${result.message} 　 ${title}: ${pathStrs.length - 1} 　 探索時間: ${totalTime.toFixed(2)}秒`;
        setUIState(false);
    }
    function dispSolPath(path) {
        for (let step = 0; step < path.length; step++) {
            const str = path[step];
            const prevStr = step > 0 ? path[step - 1] : null;
            const mvCh = new Set();
            if (prevStr) {
                for (let i = 0; i < str.length; i++) {
                    const ch = str[i];
                    const prevCh = prevStr[i];
                    if (ch !== '.' && ch !== prevCh) {
                        mvCh.add(ch);
                    }
                }
            }
            const wrapper = document.createElement('div');
            wrapper.className = 'step-wrapper';
            const bd = document.createElement('div');
            bd.className = 'pBrd';
            const idx = document.createElement('div');
            idx.className = 'pIdx';
            const shown = new Set();
            for (let i = 0; i < str.length; i++) {
                const ch = str[i];
                const blk = document.createElement('div');
                blk.className = 'blk';
                if (ch !== '.' && !shown.has(ch)) {
                    blk.textContent = ch;
                    blk.style.cssText += getStrokeStyle(ch);
                } else {
                    blk.textContent = '';
                }
                shown.add(ch);
                blk.style.backgroundColor =
                    ch === '.' ? 'none' : (mvCh.has(ch) ?  '#12e4c8' : '#625258' );
                blk.style.color =
                    ch === '.' ? 'none' : (mvCh.has(ch) ? '#000' : '#8c8c8c' );
                bd.appendChild(blk);
            }
            idx.textContent = step;
            wrapper.appendChild(bd);
            wrapper.appendChild(idx);
            solPath.appendChild(wrapper);
        }
    }

    function handleCheckData() {
        svStts.textContent = 'データチェック中...';
        svStts.style.color = COLORS.info;

        // 以前のクリーンアップボタンが残っていれば削除
        const oldCleanupBtn = document.getElementById('cleanup-btn');
        if (oldCleanupBtn) oldCleanupBtn.parentElement.removeChild(oldCleanupBtn);

        try {
            const crSign = COMMON.getBlksSign(Start_Pos);
            const isFullSet = (crSign === FULL_SET_SIGN);
            const dataType = isFullSet ? 'fullset' : 'subset';
            const dataStore = visitData[dataType];
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
                    const fullSetSize = visitData.fullset.set.size;
                    const subsetSize = visitData.subset.set.size;
                    let statusText = [];
                    if (fullSetSize > 0) statusText.push(`Full: ${fullSetSize.toLocaleString()}`);
                    if (subsetSize > 0) statusText.push(`Sub: ${subsetSize.toLocaleString()}`);
                    status.textContent = `(${statusText.join(', ')}件)`;
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

    // --- 共有＆ローカルの探索済みデータを読み込む ---
    status.textContent = 'Loading...';
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
                visitData.fullset.set = new Set(sharedBigInts);
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
                    visitData[type].set = new Set([...visitData[type].set, ...localBigInts]);
                }
            }

            // 4. UIの更新
            const fullSetSize = visitData.fullset.set.size;
            const subsetSize = visitData.subset.set.size;

            if (fullSetSize > 0 || subsetSize > 0) {
                visit.disabled = false;
                let statusText = [];
                if (fullSetSize > 0) {
                    visitData.fullset.status = '読込完了';
                    statusText.push(`Full: ${fullSetSize.toLocaleString()}`);
                }
                if (subsetSize > 0) {
                    visitData.subset.status = '読込完了';
                    statusText.push(`Sub: ${subsetSize.toLocaleString()}`);
                }
                status.textContent = `(${statusText.join(', ')}件)`;
            } else {
                status.textContent = '(データなし)';
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
});
export { snd_move, initStr, stateStr };
