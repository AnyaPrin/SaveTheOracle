// Minfilia JS SAVE THE ORACLE Web Edition
// puzzle.js version.1.8.1
const IS_DEBUG = true;

const CELL = 100;
const W = 4, H = 5;
const BRD_LEN = W * H;
const GOAL_X = 1, GOAL_Y = 3;
const CLR_GOAL_X = 1, CLR_GOAL_Y = 5;

const SCRN_W = 600;
const SCRN_H = 800;
console.log("screen width x height: ", SCRN_W, " x ", SCRN_H);

const BLKBDR = 6; // 枠線の太さ
const BLKBDR_COL = "#1c1c1c"; // 枠線の色
const BLKBDR_R = 8; // 角丸の半径
const BLK_COL = "#1564C8";
const BDOFFX = CELL + BLKBDR / 2;
const BDOFFY = CELL / 2 + BLKBDR / 2;
const BDRECT = [0, 0, SCRN_W, SCRN_H];
const BBRECT = [10, SCRN_H - 210, 200, 48];
const ULRECT = [0, 620, 200, 200];

const SHADOW = "rgba(0, 0, 0, 1)";
const BLUR = 14;

let canvas = document.getElementById('puzzlecanvas');
let style = getComputedStyle(canvas);

const SELECTEDCOL = "rgba(215,225,2,0.5)";
const TRANSPARENT = "rgba(0,0,0,0)";

const GOAL_COL = "#00FF00";


const CELL_COL = "#282801";
const FLR_COL = "#0A0A0A";  // floor
const ORCL_COL = "#C8C8B4";
const TXT_DARK = "#002828";
const TXT_LIGHT = "#FFFFFF";
const CLR_TXT_COL = TXT_LIGHT;

const DRAG_THLD = CELL / 2; // mouse drag sensibility 0<fast<->slow >1

const SPRITE = "img/imagesheet.webp" // sprites sheet
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
    'hint': [600, 600, 100, 100],
    'rtry': [700, 600, 100, 100],
    'mrcl': [600, 500, 100, 100],
    'undo': [700, 500, 100, 100],
    'mrcl2': [700, 500, 100, 100],
    'wall': [0, 400, 600, 800],
    'auto': [600, 600, 100, 100],
    'grph': [700, 600, 100, 100],
    'quit': [700, 700, 100, 100],
    'bble': [600, 965, 200, 48],
    'urianger': [600, 1014, 200, 200],
    'cursor': [600, 700, 200, 250],
};

let SPRITE_MAP = [];

const SND_ROOT ='../snd/ffxiv_sps05001_mp3/'
const SND_START = `${SND_ROOT}/FFXIV_Start_Game.mp3`
const SND_SEL = `${SND_ROOT}/FFXIV_Confirm.mp3`
const SND_MOV = `${SND_ROOT}/FFXIV_Obtain_Item.mp3`
const SND_UNDO = `${SND_ROOT}/FFXIV_Untarget.mp3` // 一手戻す
const SND_MRCL = `${SND_ROOT}/FFXIV_Limit_Break_Activated.mp3`
const SND_CLR = `${SND_ROOT}/FFXIV_Enlist_Twin_Adders.mp3`

const SND_MASTER_VOL = 0.1
const SND_START_VOL = SND_MASTER_VOL/2
const SND_SEL_VOL = SND_MASTER_VOL/2
const SND_MOV_VOL = SND_MASTER_VOL/4
const SND_MRCL_VOL = SND_MASTER_VOL/2
const SND_CLR_VOL = SND_MASTER_VOL/2

const MRCL_ROT_DUR = 500; // Miracle
const MRCL_BUST_DELAY = 200;
const MRCL_FX_DUR = 20;
const MRCL_COL = "rgba(255,100,100,";
const initStr = "BAACBAACDFFEDIJEG..H";
let stateInt; // ゲーム状態をBigIntで管理
let statStr;  // デバッグ表示や互換性のために保持

let voidflag;
//let pazzleCanvas, pctx, offCanvas;
let snd_select, snd_move, snd_mrcl, snd_clr, snd_start;
let imgSheet = null;

const BTNSIZ = CELL * 7 / 8;

const mrclRect = [CELL / 7, SCRN_H - CELL * 5 / 4, BTNSIZ, BTNSIZ];
const rtryRect = [SCRN_W - CELL * 7 / 8, SCRN_H - CELL * 2, BTNSIZ, BTNSIZ];
const hintRect = [SCRN_W - CELL * 7 / 8, SCRN_H - CELL, BTNSIZ, BTNSIZ];
const undoRect = [SCRN_W - CELL * 15 / 8, SCRN_H - CELL * 2, BTNSIZ, BTNSIZ];

let crsrRect = [];

let Selected;
let gameClr;
let clrAnim;
let clrAnimMod;
let isDrag;
let DSMP;

let blkPos;       // Block Posttion
let mrclBtn, mrclAnim, mrclPhase, mrclPhMod;
let mrclBust = [];    // 破壊される駒(blkId)の配列
let mrclFx, mrclFxMod, clr_mrclPlayed;
let Freedom = 0;
let gameTurns = 0;
let gameHistory = [];
let cursor = false;
let commandSequence = []; // For command input

// --- Retry Fade Effect ---
let isFadingOut = false;
let isFadingIn = false;
let fadeStartTime = 0;
const FADE_DURATION = 400; // 0.4秒

const mrclCmd = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown',
    'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a', ' '];
const bsbCmd = ['arrowdown', 'arrowup', 'x', 'y', ' '];  // Blight Soil Break

let commandInputTimer = null; // Timer for command input
const COMMAND_TIMEOUT = 500; // 0.5 seconds

let OrclIdx = {
    "down": "ryneD",
    "left": "ryneL",
    "right": "ryneR",
    "up": "ryneU"
};

// --- Bitwise Operation Helpers ---

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
    const x = idx % W;
    const y = Math.floor(idx / W);

    // ブロックのサイズを取得
    const [bw, bh] = BLK_SIZE_BY_ID[blkId];

    // 描画座標
    const drawX = BDOFFX + x * CELL;
    const drawY = BDOFFY + y * CELL;

    return [drawX, drawY, bw * CELL, bh * CELL];
}

const ldSprite = (path) => {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image from ${src}`));
        img.src = path;
    });
}

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
    } catch (e) {
        console.error("Failed to load sound resources:", e);
    }
}

function initGameState() {
    console.log("initialize game")

    BLK_SIZE_BY_ID = [...INIT_BLK_SIZE_BY_ID];  // 配列の*浅い*コピー （INIT_を変えない）

    SPRITE_MAP = {...INIT_SPRITE_MAP};         // オブジェクトの＊浅い＊コピー （INIT_を変えない）

    console.log('table reset');

    stateInt = COMMON.stateToBigInt(initStr);
    statStr = initStr; // for debug display
    Selected = 7;    // when game start cursor set Suncred(blkId:7)
    cursorRect = [BDOFFX, BDOFFY + CELL * 4, CELL, CELL];


    gameTurns = 0;
    gameClr = false;           // game clear flag
    clrAnim = false;        // clear animation flag
    clrAnimMod = 0;         //
    isDrag = false;
    DSMP = [0, 0];
    blkPos = [0, 0];        // blk position

    // Miracle Flash
    mrclBtn = false;    // Miracle Flash button flag
    mrclAnim = false;  // Miracle Flash Animation Activate
    mrclPhase = 0;         // phase flag
    mrclST = 0;           // start flag
    mrclBust = [];     // 破壊するブロックのリスト
    mrclFx = false;
    mrclFxMod = 0;
    clr_mrclPlayed = false;

    // Freedom degree = the number of movable nodes(statStr) from current nodes(statStr)
    Freedom = 0;
    cursor = true;
    gameHistory = [];
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

        if (blkId == 1) { // メインブロックのアニメーション処理
            if (clrAnim) { // クリアアニメーション
                const elapsed = performance.now() - clrAnimMod;
                if (elapsed < 500) {
                    const progress = elapsed / 500;
                    const startY = GOAL_Y * CELL + BDOFFY; // 元のY
                    const endY = CLR_GOAL_Y * CELL + BDOFFY; // 目的のY
                    drawY = startY + (endY - startY) * progress;
                }
            } else if (mrclAnim && mrclPhase == 1) { // ミラクルフラッシュ回転
                const elapsed = performance.now() - mrclPhMod;
                const frame_duration = MRCL_ROT_DUR / 4;
                const idx = Math.floor((elapsed / frame_duration) % 4);
                orclKey = ["up", "left", "down", "right"][idx];
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
        pctx.shadowColor = "rgba(255, 255, 224, 0.5)";
        pctx.shadowBlur = 8;
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
            pctx.shadowOffsetX = 14;
            pctx.shadowOffsetY = 14;
            pctx.drawImage(imgSheet, ...SPRITE_MAP['cursor'], x, drawY, w, h);
            pctx.restore();
            // --- インライン化ここまで ---
        }
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

function speakUrianger(str) {
    const BUBBLE_CHAR_WIDTH = 14; // 1文字あたりの幅
    const BUBBLE_MAX_CHARS = 30; // 最大文字数
    const BUBBLE_MAX_WIDTH = BUBBLE_MAX_CHARS * BUBBLE_CHAR_WIDTH;
    const BUBBLE_MIN_WIDTH = BUBBLE_MAX_WIDTH * 0.5; // 最小幅 (50%)

    // 文字数から幅を計算し、最小・最大幅の範囲に収める
    let bubbleWidth = str.length * BUBBLE_CHAR_WIDTH;
    bubbleWidth = Math.max(BUBBLE_MIN_WIDTH, Math.min(bubbleWidth, BUBBLE_MAX_WIDTH));

    pctx.drawImage(imgSheet, ...SPRITE_MAP["bble"], BBRECT[0], BBRECT[1], bubbleWidth, BBRECT[3]);
    pctx.textAlign = "left";
    pctx.font = "14px IPAGothic";
    pctx.fillStyle = TXT_DARK;
    pctx.fillText(str, ULRECT[0] + 34, ULRECT[1] - 5);
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

const URIANGER_QUOTES = [
    "Goodspeed Thancred...",
    "計略を披露しましょう",
    "世界は未だ混迷のなかに...",
    "おや、わたくしとしたことが",
    "暁のとき、ほどなく...",
    "puzzle.js version {{ this.version }}",
];
let defaultUriangerSays = URIANGER_QUOTES[0];
let UriangerSays = defaultUriangerSays; // 初期値
let isCommandTyping = false; // Flag to check if user is typing a command

function drawAll() {
    pctx.fillStyle = FLR_COL;
    pctx.drawImage(imgSheet, ...SPRITE_MAP["wall"], ...BDRECT);

    drawCanvasBorder();
    drawBlks();
    drawButtons();
    drawEffects();
    let str, x, y;

    // Draw thus speaks Urianger

    // 10ターンごとにデフォルトのセリフを変更
    const quoteIndex = Math.floor(gameTurns / 10) % URIANGER_QUOTES.length;
    defaultUriangerSays = URIANGER_QUOTES[quoteIndex];
    if (!isCommandTyping) {
        UriangerSays = defaultUriangerSays;
    }
    Freedom = freedom();
    speakUrianger(UriangerSays);

    // --- Retry Fade Effect ---
    if (isFadingOut || isFadingIn) {
        let alpha = 0;
        const elapsed = performance.now() - fadeStartTime;
        if (isFadingOut) {
            // フェードアウト
            alpha = Math.min(1, elapsed / FADE_DURATION);
        } else if (isFadingIn) {
            // フェードイン
            alpha = Math.max(0, 1 - (elapsed / FADE_DURATION));
        }
        pctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        pctx.fillRect(0, 0, SCRN_W, SCRN_H);
    }


    // 追加するデバッグ情報
    let infoStr = `Infomation\n`;
    infoStr += `Game Turns k   : ${gameTurns}\n`;
    infoStr += `Miracle Used   : ${mrclBtn ? 'Yes' : 'No'}\n`;
    infoStr += `Freedom Degree : ${Freedom}\n`;
    infoStr += `Selected Blk   : blkId ${Selected}  charCode ${".ABCDEFGHIJ"[Selected]}\n`;
    infoStr += `stateStr       : ${statStr ?? 'N/A'} (${statStr?.length ?? 0})\n`;
    infoStr += `stateInt(0x)   : ${stateInt?.toString(16).padStart(20, '0') ?? 'N/A'} (${statStr?.length ?? 0})\n`;
    infoStr += `Shifted        : ${infoShift?.toString(2).padStart(20, "0") ?? '---'}\n`;
    infoStr += `Block bitmap   : ${infoBm?.toString(2).padStart(20, "0") ?? '---'}\n`;
    infoStr += `Hall bitmask   : ${infoHall?.toString(2).padStart(20, "0") ?? '---'}\n`;
    infoStr += `blkPos   : ${blkPos}\n`;
    infoStr += `cursor   : ${cursor}\n`;
    if (IS_DEBUG) drInfo(infoStr);
}

function drInfo(str) {
    const infoDiv = document.getElementById('info');
    infoDiv.textContent = str;
    infoDiv.style.whiteSpace = 'pre-wrap'; // この行を追加
}

function drawButtons() {
    pctx.drawImage(imgSheet, ...SPRITE_MAP['rtry'], ...rtryRect);
    pctx.drawImage(imgSheet, ...SPRITE_MAP['hint'], ...hintRect);
    pctx.drawImage(imgSheet, ...SPRITE_MAP['mrcl'], ...mrclRect);
    pctx.drawImage(imgSheet, ...SPRITE_MAP['undo'], ...undoRect);
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
        default: return; // 不正な移動方向なら何もしない
    }

    updateStateInt(blkBm, shiftedBlkBm, blkId);
    gameTurns++;
    statStr = COMMON.bigIntToState(stateInt); // for debug display

    if (snd_move)
        snd_move.currentTime = 0, snd_move.play();
}

function undoMove() {
    if (gameHistory.length > 0) {
        stateInt = gameHistory.pop();
        gameTurns--; // ターン数も戻す
        statStr = COMMON.bigIntToState(stateInt); // デバッグ表示用

        // 選択中の駒が消えていたら選択を解除（例：Thancredを選択）
        if (getBlkBitmap(Selected) === 0n) {
            Selected = 7;
        }

        if (snd_undo) snd_undo.currentTime = 0, snd_undo.play();
    }
}

function blkBuster(blkId) {
    const blkBm = getBlkBitmap(blkId);
    // 駒を盤上から消す (新しいビットマップは0)
    updateStateInt(blkBm, 0n, blkId);

    if (snd_select) snd_select.currentTime = 0, snd_select.play();
    statStr = COMMON.bigIntToState(stateInt); // for debug display
    mrclFx = true;
    mrclFxMod = performance.now();
    return true;
}

function activateMiracle() {
    if (mrclAnim) return;
    mrclBtn = true;
    mrclAnim = true;
    mrclPhase = 1;
    mrclPhMod = performance.now();

    // stateIntから現在の駒リストを取得
    const currentBlks = new Set();
    for (let i = 0; i < BRD_LEN; i++) {
        const blkId = Number((stateInt >> BigInt(i * 4)) & 0xFn);
        if (blkId > 0) { // 0は空白なので除外
            currentBlks.add(blkId);
        }
    }

    // 破壊対象の駒IDリスト (B, C, D, E, F)
    const destructibleBlkIds = [2, 3, 4, 5, 6];
    mrclBust = Array.from(currentBlks).filter(blkId => destructibleBlkIds.includes(blkId));

    for (let i = mrclBust.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [mrclBust[i], mrclBust[j]] = [mrclBust[j], mrclBust[i]];
    }
    if (snd_mrcl) snd_mrcl.currentTime = 0, snd_mrcl.play();
}

let startClrAnim = () => {
    clrAnim = true;
    clrAnimModM = performance.now();
    if (snd_clr) snd_clr.currentTime = 0, snd_clr.play();
}

const onMouseMove = (e) => {
    if (!isDrag || !Selected || clrAnim || mrclAnim) return;
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
        // クリア可能状態で、オラクル(1)を下に動かした場合
        if (judgeClear() && Selected == 1 && mv == "down") {
            startClrAnim();
        } else if (canMove(Selected, mv)) {
            move(Selected, mv);
            DSMP = [x, y];                   //  Selected position
        } else {
        }
    }
}

// save statStr in windows clipboard
async function statStrClipboard() {
    try {
        await navigator.clipboard.writeText(statStr);
        console.log('statStr copied to windows clipboard successfully!');
    } catch (err) {
        console.error('Failed to copy statStr:', err);
    }
}

const onMouseDown = (e) => {
    let rect = puzzleCanvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    let { gx, gy } = toGridXY(x, y);
    let grid_x = gx;
    let grid_y = gy;

    // retry button
    if (x >= rtryRect[0] && x <= rtryRect[0] + CELL && y >= rtryRect[1] && y <= rtryRect[1] + CELL) {
        // フェードアニメーションを開始
        if (!isFadingOut && !isFadingIn) {
            isFadingOut = true;
            fadeStartTime = performance.now();
            if (snd_start) snd_start.currentTime = 0, snd_start.play(); // フェード開始と同時に再生
        }

        initGameState();

        return;
    }

    // Undo button
    if (x >= undoRect[0] && x <= undoRect[0] + BTNSIZ && y >= undoRect[1] && y <= undoRect[1] + BTNSIZ) {
        if (isFadingOut || isFadingIn) return; // フェード中は操作不可
        undoMove();
        return;
    }

    if (!(clrAnim || gameClr || mrclAnim)) {
        if (0 <= grid_x && grid_x < W && 0 <= grid_y && grid_y < H) {
            const idx = (BRD_LEN - 1) - (grid_y * W + grid_x);
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
    if (isFadingOut) {
        const elapsed = now - fadeStartTime;
        if (elapsed >= FADE_DURATION) {
            isFadingOut = false;
            isFadingIn = true;
            fadeStartTime = now;

        }
    } else if (isFadingIn) {
        const elapsed = now - fadeStartTime;
        if (elapsed >= FADE_DURATION) {
            isFadingIn = false; // フェードイン完了
        }
    }

    if (clrAnim) {
        let elapsed = now - clrAnimMod;
        if (elapsed >= 500) {
            // アニメーション終了後、最終状態に更新
            // move(1, "down") を呼び出すなどして stateInt を更新する
            gameClr = true;
            clrAnim = false;
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

// clear or preclear Judje
function judgeClear() {
    // 'A'の駒 (ID:1) がゴール位置 (x=1, y=3) にある状態のビットマスク。
    const goalMask = 0b00000000000001100110n;

    // 現在の'A'の駒のビットマスクを取得
    const blkABitmap = getBlkBitmap(1);

    // ゴール状態と一致するか判定
    return blkABitmap === goalMask;
}

function mainLoop() {
    updateGameState();
    drawAll();

    requestAnimationFrame(mainLoop);
}

/** ブラウザ「ユーザーが操作してないじゃん」エラーのコンソール表示抑制
 */
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

let puzzleCanvas, pctx;
let isMouseOverCanvas = false; // マウスがcanvas上にあるかを追跡するフラグ

window.onload = async function () {
    document.getElementById('close-modal').addEventListener('click', () => {
        document.getElementById('modal').classList.remove('is-active');
    });

    puzzleCanvas = document.getElementById('puzzlecanvas');
    pctx = puzzleCanvas.getContext("2d");
    puzzleCanvas.width = SCRN_W;
    puzzleCanvas.height = SCRN_H;

    // 先にリソースを全て読み込む
    await loadAllResources();
    initGameState();

    // --- ページロード時のフェードイン演出 ---
    isFadingIn = true;
    fadeStartTime = performance.now();
    safePlay(snd_start);

    puzzleCanvas.addEventListener("mouseenter", () => isMouseOverCanvas = true);
    puzzleCanvas.addEventListener("mouseleave", () => isMouseOverCanvas = false);

    window.addEventListener("keydown", (e) => {
        const modal = document.getElementById('modal');
        const key = e.key.toLowerCase();

        if (key === "m") {
            modal.classList.toggle('is-active');
            return; // モーダル表示時は他のキー操作を無効化
        }

        // --- Command and Speech Input Logic ---
        if (commandInputTimer) {
            clearTimeout(commandInputTimer);
        }

        const arrowMap = {
            'arrowup': '↑',
            'arrowdown': '↓',
            'arrowleft': '←',
            'arrowright': '→'
        };
        const displayChar = arrowMap[key] || (key.length === 1 ? key : null);

        // コマンド入力の開始または継続
        if (displayChar) {
            if (!isCommandTyping) {
                isCommandTyping = true;
                UriangerSays = ""; // 最初の入力で吹き出しをクリア
            }
            if (UriangerSays.length < 24) {
                UriangerSays += displayChar;
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
            UriangerSays = "発達した技術は魔法に見えるものです"; // 成功メッセージ
            if (commandInputTimer) clearTimeout(commandInputTimer); // Clear timer on success
            setTimeout(() => { if (UriangerSays === "Miracle!") UriangerSays = defaultUriangerSays; }, 2000);
            // 2秒後に戻す
        } else if (JSON.stringify(commandSequence) === JSON.stringify(bsbCmd)) {
            console.log("Bright Soil Break Entered!");
            activateBSB();
            commandSequence = []; // Reset the sequence
            isCommandTyping = false;
            UriangerSays = "見事なスキル回しです"; // 成功メッセージ
            if (commandInputTimer) clearTimeout(commandInputTimer); // Clear timer on success
            setTimeout(() => { if (UriangerSays === "Soil Break!") UriangerSays = defaultUriangerSays; }, 2000);
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


    const windowsClipboard = document.getElementById('clipboard');
    if (windowsClipboard) {
        windowsClipboard.addEventListener('click', statStrClipboard);
    }

    puzzleCanvas.addEventListener("mousedown", onMouseDown);
    puzzleCanvas.addEventListener("mousemove", onMouseMove);
    puzzleCanvas.addEventListener("mouseup", onMouseUp);
    mainLoop();
}

//////////////////////

/**
 * Blight Soil Break
 */
const thancredId = 7;
function activateBSB() {
    if (Selected != thancredId) return;

    const thancredBitmap = getBlkBitmap(thancredId);
    if (thancredBitmap === 0n) return; // サンクレッドがいない

    // サンクレッドの隣接マスを計算
    const adjacentArea =
        ((thancredBitmap & ~BigInt(UP)) << 4n) |    // 上
        ((thancredBitmap & ~BigInt(DOWN)) >> 4n) |  // 下
        ((thancredBitmap & ~BigInt(LEFT)) << 1n) |  // 左
        ((thancredBitmap & ~BigInt(RIGHT)) >> 1n); // 右

    // 1x2の中駒IDリスト
    const targetBlkIds = [2, 3, 4, 5]; // 縦長の駒のみ。

    for (const blkId of targetBlkIds) {
        const bm = getBlkBitmap(blkId);
        // 隣接しているかチェック
        if ((bm & adjacentArea) !== 0n) {
            console.log(`Blight Soil Break activated on blkId: ${blkId}`);

            // 駒を1x1に変化させる （テーブルを直接書き換える）
            BLK_SIZE_BY_ID[blkId] = [1, 1];
            SPRITE_MAP[`b${blkId}`] = INIT_SPRITE_MAP['meol'];

            // stateInt update
            const msbPos = BigInt(getMsbPosition(bm));
            const newbm = 1n << msbPos;
            updateStateInt(bm,newbm,blkId);

            if (snd_mrcl) snd_mrcl.currentTime = 0, snd_mrcl.play(); // ミラクルと同じ音を再生
            break; // 1体見つけたら終了
        }
    }
}
