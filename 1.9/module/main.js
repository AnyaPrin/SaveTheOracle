// Minfilia JS SAVE THE ORACLE Web Edition
import { COMMON } from "./common.js";
import { BFSSolver } from './solvers/bfs.js';
import { AStarSolver } from './solvers/astar.js';
import { IDAStarSolver } from './solvers/idastar.js';

const CELL = 100;  // graphical pixel
const BLKBDR = 6;              // block frame depth
const BLKBDR_COL = "#1c1c1c";  // block border color
const BLKBDR_R = 8;            // block corner round
const BDOFFX = CELL + BLKBDR / 2;
const BDOFFY = CELL / 2 + BLKBDR / 2;
const BRDW = 4, BRDH = 5;  // logical board size
const BRD_LEN = BRDW * BRDH;
const GOAL_X = 1, GOAL_Y = 3;// パズルのゴール
const EXIT_X = 1, EXIT_Y = 5;// ボードの外
export const SCRN_W = 600;
export const SCRN_H = 800;
const ULRECT =   [14, 620, 200, 200];  // Ulianger
const ULBBRECT = [ULRECT[0]+114, ULRECT[1]-23, ULRECT[2], 48]; // Ulianger bubble rect
const IS_DEBUG = true;
const BDRECT = [0, 0, SCRN_W, SCRN_H];      // board rect
const SND_ROOT ='../snd/ffxiv_sps05001_mp3/'
const SND_START = `${SND_ROOT}/FFXIV_Start_Game.mp3`
const SND_SEL = `${SND_ROOT}/FFXIV_Obtain_Item.mp3`
const SND_MOV = `${SND_ROOT}/FFXIV_Confirm.mp3`
const SND_UNDO = `${SND_ROOT}/FFXIV_Untarget.mp3` // 一手戻す
const SND_MRCL = `${SND_ROOT}/FFXIV_Limit_Break_Activated.mp3`
const SND_CLR = `${SND_ROOT}/FFXIV_Enlist_Twin_Adders.mp3`
const SND_SOLVER = `${SND_ROOT}/FFXIV_Linkshell_Transmission.mp3`
const SND_MASTER_VOL = 1
const SND_START_VOL = SND_MASTER_VOL/2
const SND_SEL_VOL = SND_MASTER_VOL/2
const SND_MOV_VOL = SND_MASTER_VOL/2
const SND_MRCL_VOL = SND_MASTER_VOL/4
const SND_CLR_VOL = SND_MASTER_VOL/4
const SND_SOLVER_VOL = SND_MASTER_VOL/4
const MRCL_ROT_DUR = 500; // Miracle
const MRCL_BUST_DELAY = 200;
const MRCL_FX_DUR = 20;
const MRCL_COL = "rgba(255,100,100,";
const SHADOW = "rgba(0, 0, 0, 1)";
const BLUR = 14;
const SELECTEDCOL = "rgba(215,225,2,0.5)";
const TRANSPARENT = "rgba(0,0,0,0)";
const GOAL_COL = "#00FF00";
const CELL_COL = "#282801";
const FLR_COL = "rgba(5,22,25,0.5)";
const ORCL_COL = "#C8C8B4";
const TXT_DARK = "#002828";
const TXT_LIGHT = "#FFFFFF";
const CLR_TXT_COL = TXT_LIGHT;
const DRAG_THLD = CELL / 2; // mouse drag sensibility 0<fast<->slow >1
const SPRITE = "img/imagesheet.webp" // sprites sheet
const BTNSIZ = CELL * 7 / 8;
const rtryRect = [SCRN_W - CELL * 7 / 8, SCRN_H - CELL * 2, BTNSIZ, BTNSIZ];

const PIXY_Y = SCRN_H - 170;
let pixyFlap = 0;
let pixyRect = [14, PIXY_Y, CELL*0.57, CELL*0.57];

const URIANGER_QUOTES = {
    'start': "かけがえのないものを守れるように",
    'default1': "世界は未だ混迷のなか",
    'default2': "師は「智を用いよ」と教えました",
    'default3': "心が揺れたのです",
    'stuck': "心が揺れたのです",
    'clear': "道は開かれました",
    'miracle': "天の巡りはやがて暁の日を導かん",
    'commandSuccessMiracle': "あなたは昔から無茶をする",
    'commandSuccessBSB': "あなたは昔から無茶をする",
    'thancredSelected': "かけがえのないものを守れるように",
};
const defaultUriangerSays = URIANGER_QUOTES['0'];
let UriangerSays = defaultUriangerSays; // 初期値

let imgSheet = null;
let voidflag;
let snd_select, snd_move, snd_mrcl, snd_clr, snd_start, snd_undo, snd_solver;
let SPRITE_MAP = [];
let isMouseOverCanvas = false; // マウスがcanvas上にあるかを追跡するフラグ

const puzzleCanvas = document.getElementById('puzzlecanvas');
let pctx = puzzleCanvas.getContext("2d");


const initStr = "BAACBAACDFFEDIJEG..H";
let stateStr=initStr;  // デバッグ表示や互換性のために保持
let stateInt; // ゲーム状態をBigIntで管理
let Start_Pos=stateStr; // for solver
let crntSolver = null;

const solPath = document.querySelector('.sol-path');

let isCommandTyping = false; // Flag to check if user is typing a command

const INIT_SPRITE_MAP = {
    'ryneD': [0, 0, 199, 199],
    'ryneR': [200, 0, 199, 199],
    'ryneU': [400, 0, 199, 199],
    'ryneL': [600, 0, 199, 199],
    'b1': [0, 0, 200, 200],
    'b2': [0, 200, 100, 200],
    'b3': [100, 200, 100, 200],
    'b4': [200, 200, 100, 200],
    'b5': [300, 200, 100, 200],
    'b6': [400, 200, 200, 100],
    'b7': [600, 300, 100, 100],
    'b8': [700, 300, 100, 100],
    'b9': [600, 200, 100, 100],
    'b10': [700, 200, 100, 100],
    'meol': [700, 300, 100, 100],
    'hint': [600, 600, 100, 99],
    'rtry': [700, 600, 100, 99],
    'wall': [0, 400, 600, 800],
    'auto': [600, 600, 100, 100],
    'grph': [700, 600, 100, 100],
    'quit': [700, 700, 100, 100],
    'bbbl': [600, 965, 200, 48],
    'urianger': [600, 1014, 200, 200],
    'pixy0': [600, 500, 100, 100],  // turns piller
    'pixy1': [700, 500, 100, 100],  //
    'undo': [700, 500, 100, 100],
    'cursor': [600, 700, 200, 250],
};

let cursorRect = [];
let Selected;
let gameClr;
let exitAnim;
let exitAnimMod;
let isDrag;
let DSMP;

let blkPos;       // Block Posttion
let mrclBtn, mrclAnim, mrclPhase, mrclPhMod;
let mrclBust = [];    // 破壊される駒(blkId)の配列
let mrclFx, mrclFxMod;
let Freedom = 0;
let gameTurn = 0;
let gameHistory = [];
let cursor = false;
let commandSequence = []; // For command input

// --- Fade Effect ---
let isFadingOut = false;
let isFadingIn = false;
let fadeStartTime = 0;

const FADE_DURATION = 400; // 0.4秒
const mrclCmd = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown',
                 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a', ' '];
const bsbCmd = ['arrowdown', 'arrowup', 'x', 'y', ' '];  // BSB:Blight Soil Break

let commandInputTimer = null; // Timer for command input
const COMMAND_TIMEOUT = 500; // 0.5 seconds
const infoDiv = document.getElementById('info');

let OrclIdx = {
    "down": "ryneD",
    "left": "ryneL",
    "right": "ryneR",
    "up": "ryneU"
};

// 各マスに対応する20ビットマスクのテーブル (例: BIT_MASKS[0] は最下位ビット)
const BIT_MASKS = Array.from({ length: BRD_LEN }, (_, i) => 1n << BigInt(i));
// 各マスに対応する80ビット stateInt 上のニブルマスクのテーブル
const NIBBLE_MASKS = Array.from({ length: BRD_LEN }, (_, i) => {
    const shift = BigInt(i * 4);
    return {
        clear: ~(0xFn << shift),      // そのマスを0にするためのクリアマスク
        set: (id) => BigInt(id) << shift // そのマスに駒IDをセットするための値
    };
});

/**
 * stateInt から指定した駒のビットマスクを生成します。
 * @param {number} blkId - 駒のID (1-10 for A-J)
 * @returns {BigInt} 駒の位置を示すビットマスク
 */
function getBlkBitmap(blkId) {
    const blkCode = BigInt(blkId);
    let bitmap = 0n;
    let shift = 0n;
    for (let i = 0; i < BRD_LEN; i++) {
        // stateIntはLSBから4bitずつ読んでいく。i=0は盤面の右下に対応する。
        if (((stateInt >> shift) & 0xFn) === blkCode) {
            // 盤面の左上をMSB(ビット19)、右下をLSB(ビット0)とするビットマップを生成する。
            // i=0(右下) -> bit 0, i=19(左上) -> bit 19
            bitmap |= (1n << BigInt(i));
        }
        shift += 4n;
    }
    return bitmap;
}

/**
 * BigIntの最上位ビット（MSB）の位置を返します。
 * @param {BigInt} n - 対象のBigInt
 * @returns {number} MSBの位置（LSBが0）。nが0nの場合は-1を返す。
 */
function getMsbPosition(n) {
    if (n === 0n) return -1;
    return n.toString(2).length - 1;
}

let infoBm, infoShift, infoC, infoHall;
const UP = 0b11110000000000000000;
const DOWN = 0b00000000000000001111;
const LEFT = 0b10001000100010001000;
const RIGHT = 0b00010001000100010001;

/**
 * 盤面インデックスとブロック文字から描画用の矩形 [x, y, w, h] を返す
 */
function getBlkRect(idx, blkId) {
    // 盤面上の左上座標
    const x = idx % BRDW;
    const y = Math.floor(idx / BRDW);
    // ブロックのサイズを取得
    const [bw, bh] = BLK_SIZE_BY_ID[blkId];
    // 描画座標
    const drawX = BDOFFX + x * CELL;
    const drawY = BDOFFY + y * CELL;
    return [drawX, drawY, bw * CELL, bh * CELL];
}

const toGridXY = (x, y) => {
    let gx = Math.floor((x - BDOFFX) / CELL);
    let gy = Math.floor((y - BDOFFY) / CELL);
    return { gx, gy };
}

const INIT_BLK_SIZE_BY_ID = [
    null,    // 0: dummy
    [2, 2],  // 1: A
    [1, 2],  // 2: B
    [1, 2],  // 3: C
    [1, 2],  // 4: D
    [1, 2],  // 5: E
    [2, 1],  // 6: F
    [1, 1],  // 7: G
    [1, 1],  // 8: H
    [1, 1],  // 9: I
    [1, 1],  // 10: J
];
let BLK_SIZE_BY_ID = [];

/**
 * ビット演算でstateIntを更新します。
 * @param {BigInt} oldBitmap - 更新前の駒の位置を示すビットマスク
 * @param {BigInt} newBitmap - 更新後の駒の位置を示すビットマスク
 * @param {number} blkId - 駒のID
 */
function updateStateInt(oldBitmap, newBitmap, blkId) {
    let tempState = stateInt;
    const blkCode = BigInt(blkId);
    for (let i = 0; i < BRD_LEN; i++) {
        // i=0は盤面の左上、i=19は盤面の右下
        // stateIntの更新とビットマップのチェック方向を揃える
        const bitPosition = BigInt(BRD_LEN - 1 - i);
        const bitMask = 1n << bitPosition; // ビットマップ上のマスク (左上=MSB)
        const nibbleShift = bitPosition * 4n; // stateInt上のニブル位置
        if ((oldBitmap & bitMask) !== 0n) {
            tempState &= ~(0xFn << nibbleShift); // 古い位置をクリア
        }
        if ((newBitmap & bitMask) !== 0n) {
            tempState |= (blkCode << nibbleShift); // 新しい位置にセット
        }
    }
    stateInt = tempState;
}

function move(blkId, mv) {
    // 移動前の状態を履歴に保存
    gameHistory.push(stateInt);

    const blkBm = getBlkBitmap(blkId);
    let shiftedBlkBm;

    switch (mv) {
    case "up": shiftedBlkBm = blkBm << 4n; break;
    case "down": shiftedBlkBm = blkBm >> 4n; break;
    case "left": shiftedBlkBm = blkBm << 1n; break;
    case "right": shiftedBlkBm = blkBm >> 1n; break;
    default:
        return; // 不正な移動方向なら何もしない
    }
    updateStateInt(blkBm, shiftedBlkBm, blkId);
    pixyRect[1] = pixyRect[1] - (++gameTurn)/1000;
    if (pixyRect[1] < 0) pixyRect[1] = PIXY_Y;

    stateStr = COMMON.bigIntToState(stateInt); // for debug display

    if (snd_move)
        snd_move.currentTime = 0, snd_move.play();
}

function undoMove() {
    if (gameHistory.length > 0) {
        stateInt = gameHistory.pop();
        gameTurn--; // ターン数も戻す
        stateStr = COMMON.bigIntToState(stateInt); // デバッグ表示用

        // 選択中の駒が消えていたら選択を解除（例：Thancredを選択）
        if (getBlkBitmap(Selected) === 0n) {
            Selected = 7;
        }


    }
}


function activateMiracle() {
    if (mrclAnim) return;
    mrclBtn = true;
    mrclAnim = true;
    mrclPhase = 1;
    mrclPhMod = performance.now();

    // stateIntから現在の駒リストを取得
    const crBlks = new Set();
    for (let i = 0; i < BRD_LEN; i++) {
        const blkId = Number((stateInt >> BigInt(i * 4)) & 0xFn);
        if (blkId > 0) { // 0は空白なので除外
            crBlks.add(blkId);
        }
    }

    // 破壊対象の駒IDリスト (B, C, D, E, F)
    const destructibleBlkIds = [2, 3, 4, 5, 6];
    mrclBust = Array.from(crBlks).filter(blkId => destructibleBlkIds.includes(blkId));

    for (let i = mrclBust.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [mrclBust[i], mrclBust[j]] = [mrclBust[j], mrclBust[i]];
    }
    if (snd_mrcl) snd_mrcl.currentTime = 0, snd_mrcl.play();
}

let startExitAnim = () => {
    exitAnim = true;
    exitAnimMod = performance.now();
    if (snd_clr) snd_clr.currentTime = 0, snd_clr.play();
}


const onMouseDown = (e) => {
    let rect = puzzleCanvas.getBoundingClientRect();

    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    let { gx, gy } = toGridXY(x, y);
    let grid_x = gx;
    let grid_y = gy;

    // retry button
    if (x>= rtryRect[0] && x <= rtryRect[0] + CELL && y >= rtryRect[1] && y <= rtryRect[1] + CELL) {
        if (!isFadingOut && !isFadingIn) {
            isFadingOut = true;
            fadeStartTime = performance.now(); // time stamp
            if (snd_start) snd_start.currentTime = 0, snd_start.play(); // フェード開始と同時に再生
        }
        return;
    }

    // Undo button
    if (x >= pixyRect[0] && x <= pixyRect[0] + BTNSIZ && y >= pixyRect[1] && y <= pixyRect[1] + BTNSIZ) {
        if (isFadingOut || isFadingIn) return; // フェード中は操作不可
        if (snd_undo) snd_undo.currentTime = 0, snd_undo.play();
        undoMove();
        return;
    }

    if (!(exitAnim || gameClr || mrclAnim)) {
        if (0 <= grid_x && grid_x < BRDW && 0 <= grid_y && grid_y < BRDH) {
            const idx = (BRD_LEN - 1) - (grid_y * BRDW + grid_x);
            const clicked_blkId = Number((stateInt >> BigInt(idx * 4)) & 0xFn);

            if (clicked_blkId !== 0) {
                if (Selected != clicked_blkId && snd_select) snd_select.currentTime = 0, snd_select.play();
                Selected = clicked_blkId;
                isDrag = true;
                DSMP = [x, y];
            }
        }

    }
}

let onMouseUp = (e) => isDrag = false;

function updateGameState() {
    let now = performance.now();

    // --- Retry Fade Logic ---
    let isFading = isFadingOut || isFadingIn;
    if (isFadingOut) {
        const elapsed = now - fadeStartTime;
        if (elapsed >= FADE_DURATION) {
            isFadingOut = false;
            isFadingIn = true;
            fadeStartTime = now;
            // フェードアウト完了時にゲーム状態をリセット
            initGameState();

        }
        safePlay(snd_start);
    } else if (isFadingIn) {
        const elapsed = now - fadeStartTime;
        if (elapsed >= FADE_DURATION) {
            isFadingIn = false; // フェードイン完了
        }

    }

    if (exitAnim) {
        let elapsed = now - exitAnimMod;
        if (elapsed >= 500) {
            // アニメーション完了後、オラクルをゲーム状態から削除
            if (getBlkBitmap(1) !== 0n) {
                const oracleBitmap = getBlkBitmap(1);
                updateStateInt(oracleBitmap, 0n, 1); // 駒を盤上から消す
                stateStr = COMMON.bigIntToState(stateInt);
            }
        }
    }

    // Miracle Flsh
    if (mrclAnim) {
        let elapsed = now - mrclPhMod;
        if (mrclPhase == 1 && elapsed >= MRCL_ROT_DUR) {
            if (mrclBust.length) {
                mrclPhase = 2;
                mrclPhMod = now;

            } else {
                mrclAnim = false;
            }
        } else if (mrclPhase == 2 && elapsed >= MRCL_BUST_DELAY) {
            if (mrclBust.length) {
                let blkId = mrclBust.shift();
                blkBuster(blkId);
                if (mrclBust.length) {
                    mrclPhase = 1;
                    mrclPhMod = now;
                } else {
                    mrclAnim = false;
                }
            } else {
                mrclAnim = false;
            }
        }
    }
    if (mrclFx) {
        let elapsed = now - mrclFxMod;
        if (elapsed >= MRCL_FX_DUR) mrclFx = false;
    }
}

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

document.addEventListener('DOMContentLoaded', () => {
    // --- Global State and DOM Elements ---
    const actBtn = document.querySelector('.action-buttons');
    const status = document.getElementById('status');
    const progress = document.getElementById('progress-details');
    const startPos = document.getElementById('start-pos');
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

    let optPathData = { rawSet: null, normalizedSet: null, array: null };
    let loVstDt = {
        fullset: { set: new Set(), status: '未読込' },
        subset: { set: new Set(), status: '未読込' }
    };
    let searchStartTime, timerInterval, mikotoTimer = null;
    let crSolver = null;



    const ldSprite = (path) => {
        return new Promise((resolve, reject) => {
            const img = new window.Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image from ${src}`));
            img.src = path;
        });
    }


    function drawButtons() {
        pctx.drawImage(imgSheet, ...SPRITE_MAP['rtry'], ...rtryRect);
        pixyFlap = gameTurn % 2;
        if (pixyFlap == 0) {
            pctx.drawImage(imgSheet, ...SPRITE_MAP[`pixy0`], ...pixyRect);
        } else {
            pctx.drawImage(imgSheet, ...SPRITE_MAP['pixy1'], ...pixyRect);
        }

    }

    function freedom() {
        let freedomCount = 0;
        const directions = ["up", "down", "left", "right"];

        // 駒ID 1から10 (AからJ) までループ
        for (let blkId = 1; blkId <= 10; blkId++) {
            // 盤上に駒が存在するかチェック (Miracleで消された場合を考慮)
            if (getBlkBitmap(blkId) === 0n) {
                continue;
            }

            // 各方向への移動可能性をチェック
            for (const direction of directions) {
                if (canMove(blkId, direction)) {
                    freedomCount++;
                }
            }
        }
        return freedomCount;
    }


    const drawEffects = () => {
        if (mrclFx) {
            let elapsed = performance.now() - mrclFxMod;
            if (elapsed < MRCL_FX_DUR) {
                let alpha = Math.max(0, 1.0 - elapsed / MRCL_FX_DUR);
                pctx.fillStyle = MRCL_COL + (alpha * 0.7) + ")";
                pctx.fillRect(...BDRECT);
            }
        }
    }

    function drText(str, x, y, px) {
        const dw = 1;
        pctx.textAlign = "left";
        pctx.font = px + "px sans-serif";
        //    pctx.fillStyle = "rgba(0,0,0,1)";      // shadow
        //    pctx.fillText(str, x + dw, y + dw);
        //    pctx.fillStyle = "rgba(28,28,28,1)";     // pseudo3D-text
        //    pctx.fillText(str, x + dw, y + dw);
        pctx.fillStyle = TXT_DARK;
        pctx.fillText(str, x, y);
    }
    function drawAll() {
        pctx.drawImage(imgSheet, ...SPRITE_MAP["wall"], ...BDRECT);
        pctx.fillStyle = FLR_COL;

        //pctx.fillRect( BDOFFX, BDOFFY, BRDW*CELL, BRDH*CELL);

        drawCanvasBorder();
        drawBlks();
        drawButtons();
        drawEffects();
        let str, x, y;

        // Draw thus speaks Urianger
        // --- 状況に応じたセリフ選択ロジック ---
        Freedom = freedom();
        if (gameClr) {
            UriangerSays = URIANGER_QUOTES['clear'];
        } else if (mrclAnim) {
            UriangerSays = URIANGER_QUOTES['miracle'];
        } else if (Freedom === 0 && !mrclBtn) {
            UriangerSays = URIANGER_QUOTES['stuck'];
        } else if (Selected === 7) {
            UriangerSays = URIANGER_QUOTES['thancredSelected'];
        } else if (gameTurn === 0) {
            UriangerSays = URIANGER_QUOTES['start'];
        } else {        // 10ターンごとにデフォルトセリフを切り替え
            let q = (Math.floor(gameTurn / 10) % 3) ;
            switch (q) {
            case 0: UriangerSays = URIANGER_QUOTES['default1'];  break;
            case 1: UriangerSays = URIANGER_QUOTES['default2'];  break;
            case 2: UriangerSays = URIANGER_QUOTES['default3']; break;
            default: UriangerSays = URIANGER_QUOTES['default1']; break;
            }
        }
        speakUrianger(UriangerSays);
        // --- Fade Effect ---
        if (isFadingOut || isFadingIn) {
            let alpha = 0;
            const elapsed = performance.now() - fadeStartTime;
            // performance.now() タイムスタンプをミリ秒で返す。
            if (isFadingOut) {
                alpha = Math.min(1, elapsed / FADE_DURATION);
            } else if (isFadingIn) {
                alpha = Math.max(0, 1 - (elapsed / FADE_DURATION));
            }
            pctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            pctx.fillRect(0, 0, SCRN_W, SCRN_H);
        }

        // Debug Information
        let infoStr = `DEBUG INFORMATION\n\n`;
        infoStr += `Game Turn      : ${gameTurn}\n`;
        infoStr += `Miracle Used   : ${mrclBtn ? 'Yes' : 'No'}\n`;
        infoStr += `Freedom Degree : ${Freedom}\n`;
        infoStr += `Selected Block : blkId ${Selected}(${".ABCDEFGHIJ"[Selected]})\n`;
        infoStr += `State String   : ${stateStr ?? 'N/A'}\n`;
        infoStr += `State Integer  : ${stateInt?.toString(16).padStart(20, '0') ?? 'N/A'}\n`;
        if (IS_DEBUG) {
            infoDiv.textContent = infoStr;
            infoDiv.style.whiteSpace = 'pre-wrap';
        }
        // Solverの開始盤面入力欄に現在の盤面文字列をセットする
        let startPos = document.getElementById('start-pos');

        if (startPos) {
            startPos.value = stateStr;
        }
    }

    function canMove(blkId, mv) {
        const blkBm = getBlkBitmap(blkId);
        if (blkBm === 0n) return false; // 駒が存在しない場合は移動不可

        // 移動可能な領域 = 「空白マス」 OR 「自分自身のマス」
        const walkableAreaBm = getBlkBitmap(0) | blkBm;

        let shiftedBlkBm;
        switch (mv) {
        case "up":
            if ((blkBm & BigInt(UP)) !== 0n) return false;
            shiftedBlkBm = blkBm << 4n;
            break;
        case "down":
            if ((blkBm & BigInt(DOWN)) !== 0n) return false;
            shiftedBlkBm = blkBm >> 4n;
            break;
        case "left":
            if ((blkBm & BigInt(LEFT)) !== 0n) return false;
            shiftedBlkBm = blkBm << 1n;
            break;
        case "right":
            if ((blkBm & BigInt(RIGHT)) !== 0n) return false;
            shiftedBlkBm = blkBm >> 1n;
            break;
        default:
            return false;
        }

        // 移動後の位置が、移動可能な領域に完全に含まれているかチェック
        return (shiftedBlkBm & walkableAreaBm) === shiftedBlkBm;
    }

    function drawBlks() {
        // 駒ID 1から10 (AからJ) までループ
        for (let blkId = 1; blkId <= 10; blkId++) {
            const blkBitmap = getBlkBitmap(blkId);
            if (blkBitmap === 0n) {
                continue; // 盤上に駒が存在しない場合はスキップ
            }

            // ビットマスクから左上の位置を特定
            const msbPos = getMsbPosition(blkBitmap);
            const idx = BRD_LEN - 1 - msbPos;

            // 描画用の矩形情報を取得
            const rect = getBlkRect(idx, blkId);
            const [x, y, w, h] = rect;
            let drawY = y; // アニメーション用にY座標を別変数に

            let orclKey = "down"; // デフォルトの向き

            if (blkId == 1) {                     // メインブロックのアニメーション処理
                if (exitAnim) {                   // パズルをクリアしたらオラクルは城の外へ自動移動
                    const elapsed = performance.now() - exitAnimMod;
                    if (elapsed < 500) {
                        const progress = elapsed / 500;
                        const startY = GOAL_Y * CELL + BDOFFY;   // 元のY
                        const endY = EXIT_Y * CELL + BDOFFY; // 目的のY
                        drawY = startY + (endY - startY) * progress;
                    }
                } else if (mrclAnim && mrclPhase == 1) { // ミラクルフラッシュ回転
                    const elapsed = performance.now() - mrclPhMod;
                    const frame_duration = MRCL_ROT_DUR / 4;
                    const idx = Math.floor((elapsed / frame_duration) % 4);
                    orclKey = ["up", "left", "down", "right"][idx];
                } else {

                }

                pctx.drawImage(imgSheet, ...SPRITE_MAP[OrclIdx[orclKey]], x, drawY, w, h);
            } else {
                // 他の駒の描画
                pctx.drawImage(imgSheet, ...SPRITE_MAP[`b${blkId}`], ...rect);
            }

            // --- drawBlkBorderのインライン化 ---
            pctx.save();
            pctx.strokeStyle = BLKBDR_COL;
            pctx.lineWidth = BLKBDR - 0.5;
            pctx.shadowColor = "rgba(5, 25, 24, 0.1)";
            pctx.shadowBlur = 14;
            pctx.beginPath();
            pctx.roundRect( x + BLKBDR / 2, drawY + BLKBDR / 2 , w - BLKBDR , h - BLKBDR, BLKBDR_R);
            pctx.stroke();
            pctx.restore();

            // --- インライン化ここまで ---
            if (Selected == blkId) {
                // --- drImgShadowのインライン化 ---
                pctx.save();
                pctx.shadowColor = SHADOW;
                pctx.shadowBlur = BLUR;
                pctx.shadowOffsetX = 4;
                pctx.shadowOffsetY = 4;
                pctx.drawImage(imgSheet, ...SPRITE_MAP['cursor'], x, drawY, w, h);
                pctx.restore();
                // --- インライン化ここまで ---
            }
        }
    }

    function speakUrianger(str) {
        const letterSpacing = 0; // ★文字間の追加スペースをピクセルで指定
        const MAX = 400;    // bubble max pixel
        const MIN = 100;    // bubble min pixel

        pctx.font = "13px MeiryoUI"; // measureTextの前にフォントを設定
        let w = pctx.measureText(str).width + (str.length > 0 ? (str.length - 1) * letterSpacing : 0);
        w = Math.max(MIN, Math.min(w, MAX)) + 40;   //
        pctx.drawImage(imgSheet, ...SPRITE_MAP["bbbl"], ULBBRECT[0], ULBBRECT[1], w, ULBBRECT[3]);
        pctx.textAlign = "left";
        pctx.fillStyle = TXT_DARK;

        pctx.letterSpacing = `${letterSpacing}px`;
        pctx.fillText(str, ULBBRECT[0]+14, ULBBRECT[1]+25);

        pctx.letterSpacing = "0px";
        pctx.drawImage(imgSheet, ...SPRITE_MAP["urianger"], ...ULRECT);
    }

    function drawCanvasBorder() {
        const borderWidth = 8;
        const borderRadius = 10;
        const borderColor = CELL_COL; // #281800
        pctx.save();
        pctx.strokeStyle = borderColor;
        pctx.lineWidth = borderWidth;
        pctx.beginPath();
        // 角丸の四角形を描画
        pctx.roundRect(
            borderWidth / 2,
            borderWidth / 2,
            SCRN_W - borderWidth,
            SCRN_H - borderWidth,
            borderRadius
        );
        pctx.stroke();
        pctx.restore();
    }


    function initGameState() {
        console.log("initialize game")
        BLK_SIZE_BY_ID = [...INIT_BLK_SIZE_BY_ID];  // 配列の*浅い*コピー （INIT_を変えない）
        SPRITE_MAP = {...INIT_SPRITE_MAP};         // オブジェクトの＊浅い＊コピー （INIT_を変えない）
        console.log('table reset');
        stateInt = COMMON.stateToBigInt(initStr);
        stateStr = initStr; // for debug display
        Selected = 7;    // when game start cursor set Suncred(blkId:7)
        cursorRect = [BDOFFX, BDOFFY + CELL * 4, CELL, CELL];

        gameTurn = 0;
        gameClr = false;           // game clear flag
        exitAnim = false;        // clear animation flag
        exitAnimMod = 0;         //
        isDrag = false;
        DSMP = [0, 0];
        blkPos = [0, 0];        // blk position

        // Miracle Flash
        mrclBtn = false;    // Miracle Flash button flag
        mrclAnim = false;  // Miracle Flash Animation Activate
        mrclPhase = 0;         // phase flag
        mrclBust = [];     // 破壊するブロックのリスト
        mrclFx = false;
        mrclFxMod = 0;

        // Freedom degree = the number of movable nodes(stateStr) from current nodes(stateStr)
        Freedom = 0;
        cursor = true;
        gameHistory = [];
    }

    function blkBuster(blkId) {
        const blkBm = getBlkBitmap(blkId);
        // 駒を盤上から消す (新しいビットマップは0)
        updateStateInt(blkBm, 0n, blkId);

        if (snd_select) snd_select.currentTime = 0, snd_select.play();
        stateStr = COMMON.bigIntToState(stateInt); // for debug display
        mrclFx = true;
        mrclFxMod = performance.now();
        return true;
    }

    window.onload = async function () {

        puzzleCanvas.width = SCRN_W;
        puzzleCanvas.height = SCRN_H;
        // 先にリソースを全て読み込む
        await loadAllResources();
        initGameState();
        // --- ページロード時のフェードイン演出 ---
        isFadingIn = true;
        fadeStartTime = performance.now();
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

        const goalMask = 0b00000000000001100110n;
        const blkABitmap = getBlkBitmap(1);

        // puzzle clear Judje
        if (blkABitmap === goalMask) {
            gameClr = true;
        }

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
        let mv;
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
        imgSheet = await ldSprite(SPRITE); // spritesheet
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
        if (button.closest('.action-buttons') || button.classList.contains('icon-btn')) {
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
    document.querySelectorAll('.icon-btn-label').forEach(label => {
        const tltip = label.querySelector('.tltip-text');
        const startBtn = label.querySelector('.icon-btn.start-algo-btn');
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
    function startSearch(slctAlgo) {
        // 新しい探索を開始する前に、以前の探索セッションが残っていればクリアする。
        // これにより、探索成功後に別の探索を開始した場合でも、前のソルバーが正しく破棄される。
        if (crntSolver) {
            crntSolver.stop(); // 念のため停止
            crntSolver = null;
            console.log('crntSolverを初期化(null)');

        }

        // 実際のソルバーに渡すアルゴリズム名（'bfs', 'astar', 'idastar' or 'iddfs'）
        const solverAlgo = slctAlgo;
        // UI上の選択アルゴリズム名（'idastar' or 'bfs' or 'astar'）
        const uiSlctAlgo = (solverAlgo === 'iddfs') ? 'idastar' : solverAlgo;
        const crSign = COMMON.getBlksSign(Start_Pos);
        const isFullSet = (crSign === FULL_SET_SIGN);
        const dataType = isFullSet ? 'fullset' : 'subset';
        const dataStore = loVstDt[dataType];
        const usePrun = prunCb.checked && optPathData.normalizedSet !== null;
        const useLocalVisited = loVstCb.checked && dataStore.set !== null;
        const startStBI = COMMON.stateToBigInt(stateStr);
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
        setUIState(true, uiSlctAlgo); // UIを「探索中」の状態に切り替える

        // IDA*探索が選択された場合、ミコトさんのスライドショーを開始する
        if (uiSlctAlgo === 'idastar') {
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
            lockedBgUrl = `url(${ASSET_PATH.BG_IMAGES[uiSlctAlgo]})`;
            ui.style.setProperty('--after-bg-image', lockedBgUrl);
            ui.classList.add('bg-active');
        }

        const options = {
            initialState: startStBI,
            algorithm: solverAlgo, // ソルバーにアルゴリズム名を渡す
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

        let html = `探索済みノード数: <span class="num">${exploredNodes}</span>| キューの長さ: <span class="num">${queueSize.toLocaleString()}</span>`;

        if (searchStartTime) {
            const elapsedSeconds = (performance.now() - searchStartTime) / 1000;
            html += ` | 経過時間: <span class="num">${elapsedSeconds.toFixed(1)}</span>秒`;
        }
        progress.innerHTML = html;
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
            const activeBtn = document.querySelector(`.start-algo-btn[value="${algo}"]`);
            if (activeBtn) {
                // 押されたボタンを特定し、目印となるクラスを付与
                activeBtn.parentElement.classList.add('active-search');
                // 役割を「探索開始」から「停止」に変更
                activeBtn.classList.replace('start-algo-btn', 'stop-btn');
                // アイコン画像を「停止」アイコンに差し替える
                activeBtn.querySelector('img').src = ASSET_PATH.ICONS.stop;
            }
        } else { // Reverting
            const stopBtn = document.querySelector('.stop-btn');
            if (stopBtn) {
                const algo = stopBtn.value; // ボタンのvalue属性から元のアルゴリズム名を取得
                stopBtn.parentElement.classList.remove('active-search');
                // 役割を「停止」から「探索開始」に戻す
                stopBtn.classList.replace('stop-btn', 'start-algo-btn');
                // アイコン画像を元のアルゴリズムのアイコンに戻す
                stopBtn.querySelector('img').src = ASSET_PATH.ICONS.getAlgoIcon(algo);
            }
        }

        // 他のボタンの有効/無効状態を切り替える
        svBtn.disabled = isSearching;
        ckDtBtn.disabled = isSearching;
        setStBtn.disabled = isSearching;
        startPos.disabled = isSearching;
        prunCb.disabled = isSearching || !optPathData.normalizedSet;

        const crSign = COMMON.getBlksSign(Start_Pos);
        const isFullSet = (crSign === FULL_SET_SIGN);
        const dataStore = loVstDt[isFullSet ? 'fullset' : 'subset'];
        loVstCb.disabled = isSearching || dataStore.status !== '読込完了';

        if (isSearching) {
            sol.hidden = false;
            svStts.textContent = '';
            status.textContent = 'Searching...';
        }
    }

    function handleSetState() {
        const newState = startPos.value.trim().toUpperCase();
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
        Start_Pos = newState;
        setSt.style.color = COLORS.success;
        setSt.textContent = '探索開始状態が更新されました。';
        setTimeout(() => { setSt.textContent = ''; }, 3000);
        if (optPathData.normalizedSet) {
            const normalizedStateBigInt = COMMON.normalizeStateBigInt(COMMON.stateToBigInt(Start_Pos));
            if (optPathData.normalizedSet.has(normalizedStateBigInt)) {
                prunDt.textContent = `(最短経路上: ${optPathData.normalizedSet.size.toLocaleString()}件のデータ利用可)`;
            } else {
                prunDt.textContent = `(注意: 探索開始状態は最短経路上にありません)`;
            }
        }

        const crSign = COMMON.getBlksSign(Start_Pos);
        const isFullSet = (crSign === FULL_SET_SIGN);
        const dataType = isFullSet ? 'fullset' : 'subset';
        const dataStore = loVstDt[dataType];
        loVstCb.disabled = dataStore.status !== '読込完了';
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
            const dataStore = loVstDt[dataType];
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

    function handleSuccess(result) {
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
});




export { initStr, stateStr, stateInt};
