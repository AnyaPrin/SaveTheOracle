import { COMMON } from "./common.js";
import { snd_move, cursorBlk, initStr } from "./main.js"

export const CELL = 100;  // graphical pixel
const BLKBDR = 6;              // block frame depth

const BLKBDR_COL = "#1c1c1c";  // block border color
const BLKBDR_R = 8;            // block corner round

export const BDOFFX = CELL + BLKBDR / 2;
export const BDOFFY = CELL / 2 + BLKBDR / 2;
export const BRDW = 4, BRDH = 5;  // logical board size
export const BRD_LEN = BRDW * BRDH;
const GOAL_X = 1, GOAL_Y = 3;// パズルのゴール
const EXIT_X = 1, EXIT_Y = 5;// ボードの外
export const SCRN_W = 600;
export const SCRN_H = 800;

const ULRECT =   [14, 620, 200, 200];  // Ulianger
const ULBBRECT = [ULRECT[0]+114, ULRECT[1]-23, ULRECT[2], 48]; // Ulianger bubble rect
const IS_DEBUG = true;
const BDRECT = [0, 0, SCRN_W, SCRN_H];      // board rect

const MRCL_ROT_DUR = 500; // Miracle
const MRCL_BUST_DELAY = 200;
const MRCL_FX_DUR = 20;
const MRCL_COL = "rgba(255,100,100,";
const SHADOW = "rgba(0, 0, 0, 1)";
const BLUR = 14;
const GOAL_COL = "#00FF00";
const CELL_COL = "#282801";
const FLR_COL = "rgba(5,22,25,0.5)";
const TXT_DARK = "#002828";
const SPRITE = "img/imagesheet.webp" // sprites sheet
export const BTNSIZ = CELL * 7 / 8;
export const rtryRect = [SCRN_W - CELL * 7 / 8, SCRN_H - CELL * 2, BTNSIZ, BTNSIZ];

const PIXY_Y = SCRN_H - 170;
let pixyFlap = 0;
export let pixyRect = [14, PIXY_Y, CELL*0.57, CELL*0.57];

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
let UriangerSays = URIANGER_QUOTES['start']; // 初期値

let imgSheet = null;
let snd_clr; // puzzle.js内でクリア音を再生するために追加
let SPRITE_MAP = [];

export const puzzleCanvas = document.getElementById('puzzlecanvas');
export let pctx = puzzleCanvas.getContext("2d");

export let stateInt; // ゲーム状態をBigIntで管理

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

let OrclIdx = {
    "down": "ryneD",
    "left": "ryneL",
    "right": "ryneR",
    "up": "ryneU"
};

export let gameClr;
export let Selected = 7;
export let exitAnim;
export let DSMP;
export let mrclAnim;
export let isFadingOut = false;
export let isFadingIn = false;
export let fadeStartTime = 0;


let exitAnimMod;
let mrclBtn, mrclPhase, mrclPhMod;
let mrclBust = [];    // 破壊される駒(blkId)の配列
let mrclFx, mrclFxMod;
let Freedom = 0;
let gameTurn = 0;
let gameHistory = [];

// --- Fade Effect ---
const FADE_DURATION = 400; // 0.4秒

const UP = 0b11110000000000000000n;
const DOWN = 0b00000000000000001111n;
const LEFT = 0b10001000100010001000n;
const RIGHT = 0b00010001000100010001n;

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
 * Blight Soil Break
 */
const thancredId = 7;
export function activateBSB() {
    if (Selected != thancredId) return;

    const thancredBitmap = getBlkBitmap(thancredId);
    if (thancredBitmap === 0n) return; // サンクレッドがいない

    // サンクレッドの隣接マスを計算
    const adjacentArea =
          ((thancredBitmap & ~UP) << 4n) |    // 上
          ((thancredBitmap & ~DOWN) >> 4n) |  // 下
          ((thancredBitmap & ~LEFT) << 1n) |  // 左
          ((thancredBitmap & ~RIGHT) >> 1n); // 右

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
            const msbPos = BigInt(getMsbPosition(bm)); // getMsbPosition is in main.js
            const newbm = 1n << msbPos;
            updateStateInt(bm,newbm,blkId);

            if (snd_mrcl) snd_mrcl.currentTime = 0, snd_mrcl.play(); // ミラクルと同じ音を再生
            break; // 1体見つけたら終了
        }
    }

}

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


export function getMsbPosition(n) {
    if (n === 0n) return -1;
    return n.toString(2).length - 1;
}

export function updateStateInt(oldBitmap, newBitmap, blkId) {
    let tempState = stateInt;
    const blkCode = BigInt(blkId);
    for (let i = 0; i < BRD_LEN; i++) {
        const bitPosition = BigInt(BRD_LEN - 1 - i);
        const bitMask = 1n << bitPosition;
        const nibbleShift = bitPosition * 4n;
        if ((oldBitmap & bitMask) !== 0n) {
            tempState &= ~(0xFn << nibbleShift);
        }
        if ((newBitmap & bitMask) !== 0n) {
            tempState |= (blkCode << nibbleShift);
        }
    }
    stateInt = tempState;
}

export function move(blkId, mv) {
    gameHistory.push(stateInt);
    const blkBm = getBlkBitmap(blkId);
    let shiftedBlkBm;
    switch (mv) {
        case "up": shiftedBlkBm = blkBm << 4n; break;
        case "down": shiftedBlkBm = blkBm >> 4n; break;
        case "left": shiftedBlkBm = blkBm << 1n; break;
        case "right": shiftedBlkBm = blkBm >> 1n; break;
        default: return;
    }
    updateStateInt(blkBm, shiftedBlkBm, blkId);
    gameTurn++;
    pixyRect[1] -= 0.001 * gameTurn;
    if (pixyRect[1] < 0) pixyRect[1] = PIXY_Y;
    Freedom = freedom();
    if (snd_move)
        snd_move.currentTime = 0, snd_move.play();
}

export function undoMove() {
    if (gameHistory.length > 0) {
        stateInt = gameHistory.pop();
        gameTurn--;
        if (getBlkBitmap(Selected) === 0n) {
            Selected = 7;
        }
    }
}

export function activateMiracle() {
    if (mrclAnim) return;
    mrclBtn = true;
    mrclAnim = true;
    mrclPhase = 1;
    mrclPhMod = performance.now();
    const crBlks = new Set();
    for (let i = 0; i < BRD_LEN; i++) {
        const blkId = Number((stateInt >> BigInt(i * 4)) & 0xFn);
        if (blkId > 0) crBlks.add(blkId);
    }
    const destructibleBlkIds = [2, 3, 4, 5, 6];
    mrclBust = Array.from(crBlks).filter(blkId => destructibleBlkIds.includes(blkId));
    for (let i = mrclBust.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [mrclBust[i], mrclBust[j]] = [mrclBust[j], mrclBust[i]];
    }
}

export function blkBuster(blkId) {
    const blkBm = getBlkBitmap(blkId);
    updateStateInt(blkBm, 0n, blkId);
    mrclFx = true;
    mrclFxMod = performance.now();
    return true;
}

export function startExitAnim() {
    exitAnim = true;
    exitAnimMod = performance.now();
    // クリア音の再生もここに集約
    if (snd_clr) {
        snd_clr.currentTime = 0;
        snd_clr.play().catch(e => console.error("Clear sound play failed:", e));
    }
}

export function canMove(blkId, mv) {
    const blkBm = getBlkBitmap(blkId);
    if (blkBm === 0n) return false;
    const walkableAreaBm = getBlkBitmap(0) | blkBm;
    let shiftedBlkBm;
    switch (mv) {
        case "up":
            if ((blkBm & UP) !== 0n) return false;
            shiftedBlkBm = blkBm << 4n;
            break;
        case "down":
            if ((blkBm & DOWN) !== 0n) return false;
            shiftedBlkBm = blkBm >> 4n;
            break;
        case "left":
            if ((blkBm & LEFT) !== 0n) return false;
            shiftedBlkBm = blkBm << 1n;
            break;
        case "right":
            if ((blkBm & RIGHT) !== 0n) return false;
            shiftedBlkBm = blkBm >> 1n;
            break;
        default: return false;
    }
    return (shiftedBlkBm & walkableAreaBm) === shiftedBlkBm;
}

function freedom() {
    let freedomCount = 0;
    const directions = ["up", "down", "left", "right"];
    for (let blkId = 1; blkId <= 10; blkId++) {
        if (getBlkBitmap(blkId) === 0n) continue;
        for (const direction of directions) {
            if (canMove(blkId, direction)) freedomCount++;
        }
    }
    return freedomCount;
}

export async function initGameState() {
    console.log("initialize game");
    if (!imgSheet) {
        imgSheet = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = SPRITE;
        });
        // main.jsからサウンドオブジェクトを受け取るか、ここで読み込む
        // ここでは簡単のため、main.jsから渡されることを想定せず、直接読み込みます。
        snd_clr = await new Promise((resolve, reject) => {
            const audio = new Audio('../snd/ffxiv_sps05001_mp3/FFXIV_Enlist_Twin_Adders.mp3');
            audio.addEventListener('canplaythrough', () => resolve(audio));
        }).catch(e => console.error(e));
    }
    BLK_SIZE_BY_ID = [...INIT_BLK_SIZE_BY_ID];
    SPRITE_MAP = {...INIT_SPRITE_MAP};
    stateInt = COMMON.stateToBigInt(initStr);
    Selected = 7;
    gameTurn = 0;
    gameClr = false;
    exitAnim = false;
    exitAnimMod = 0;
    mrclBtn = false;
    mrclAnim = false;
    mrclPhase = 0;
    mrclBust = [];
    mrclFx = false;
    mrclFxMod = 0;
    Freedom = 0;
    gameHistory = [];
    isFadingIn = true;
    fadeStartTime = performance.now();
}

export function updateGameState() {
    let now = performance.now();
    if (isFadingOut) {
        if (now - fadeStartTime >= FADE_DURATION) {
            isFadingOut = false;
            isFadingIn = true;
            fadeStartTime = now;
            initGameState();
        }
    } else if (isFadingIn) {
        if (now - fadeStartTime >= FADE_DURATION) {
            isFadingIn = false;
        }
    }
    if (exitAnim && now - exitAnimMod >= 500) {
        if (getBlkBitmap(1) !== 0n) {
            updateStateInt(getBlkBitmap(1), 0n, 1);
        }
    }
    if (mrclAnim) {
        let elapsed = now - mrclPhMod;
        if (mrclPhase === 1 && elapsed >= MRCL_ROT_DUR) {
            mrclPhase = mrclBust.length ? 2 : 0;
            mrclPhMod = now;
            if (!mrclBust.length) mrclAnim = false;
        } else if (mrclPhase === 2 && elapsed >= MRCL_BUST_DELAY) {
            if (mrclBust.length) {
                blkBuster(mrclBust.shift());
                mrclPhase = mrclBust.length ? 1 : 0;
                mrclPhMod = now;
                if (!mrclBust.length) mrclAnim = false;
            } else {
                mrclAnim = false;
            }
        }
    }
    if (mrclFx && now - mrclFxMod >= MRCL_FX_DUR) {
        mrclFx = false;
    }
}

export const toGridXY = (x, y) => {
    let gx = Math.floor((x - BDOFFX) / CELL);
    let gy = Math.floor((y - BDOFFY) / CELL);
    return { gx, gy };
}

export function checkGameClear() {
    if (gameClr) return; // 既にクリア済みなら何もしない
    const goalMask = 0b00000000000001100110n;
    const blkABitmap = getBlkBitmap(1);
    if (blkABitmap === goalMask) {
        gameClr = true;
    }
}

export function drawAll() {
    Selected = cursorBlk;
    pctx.drawImage(imgSheet, ...SPRITE_MAP["wall"], ...BDRECT);
    pctx.fillStyle = FLR_COL;

    //pctx.fillRect( BDOFFX, BDOFFY, BRDW*CELL, BRDH*CELL);

    drawCanvasBorder();
    drawBlks();
    drawEffects();

    // Draw thus speaks Urianger
    // --- 状況に応じたセリフ選択ロジック ---

    const defaultUriangerSays = URIANGER_QUOTES['start'];
    if (gameClr) {
        UriangerSays = URIANGER_QUOTES['clear'];
    } else if (mrclAnim) {
        UriangerSays = URIANGER_QUOTES['miracle'];
    } else if (Freedom === 0 && !mrclBtn) {
        UriangerSays = URIANGER_QUOTES['stuck'];
    } else if (Selected === 7) {
        UriangerSays = URIANGER_QUOTES['thancredSelected'];
    } else if (gameTurn === 0) {
        UriangerSays = defaultUriangerSays;
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
    infoStr += `State String   : ${COMMON.bigIntToState(stateInt) ?? 'N/A'}\n`;
    infoStr += `State Integer  : ${stateInt?.toString(16).padStart(20, '0') ?? 'N/A'}\n`;
    const infoDiv = document.getElementById('info');
    if (IS_DEBUG && infoDiv) {
        infoDiv.textContent = infoStr;
        infoDiv.style.whiteSpace = 'pre-wrap';
    }
    let startPos = document.getElementById('start-pos');
    if (startPos) {
        startPos.value = COMMON.bigIntToState(stateInt);
    }
}

function getBlkRect(idx, blkId) {
    // 盤面上の左上座標
    const x = idx % BRDW;
    const y = Math.floor(idx / BRDW);
    const [bw, bh] = BLK_SIZE_BY_ID[blkId];
    const dx = BDOFFX + x * CELL;
    const dy = BDOFFY + y * CELL;
    return [dx, dy, bw * CELL, bh * CELL];
}

function drawBlks() {
    for (let blkId = 1; blkId <= 10; blkId++) {
        const blkBitmap = getBlkBitmap(blkId);
        if (blkBitmap === 0n) continue;
        const msbPos = getMsbPosition(blkBitmap);
        const idx = BRD_LEN - 1 - msbPos;
        const rect = getBlkRect(idx, blkId);
        let [x, y, w, h] = rect;
        if (blkId === 1) {
            let orclKey = "down";
            if (exitAnim) {
                const elapsed = performance.now() - exitAnimMod;
                if (elapsed < 500) {
                    const progress = elapsed / 500;
                    y = (GOAL_Y * CELL + BDOFFY) + (CELL * progress);
                }
            } else if (mrclAnim && mrclPhase === 1) {
                const frame_idx = Math.floor((performance.now() - mrclPhMod) / (MRCL_ROT_DUR / 4)) % 4;
                orclKey = ["up", "left", "down", "right"][frame_idx];
            }
            pctx.drawImage(imgSheet, ...SPRITE_MAP[OrclIdx[orclKey]], x, y, w, h);
        } else {
            pctx.drawImage(imgSheet, ...SPRITE_MAP[`b${blkId}`], ...rect);
        }
        pctx.save();
        pctx.strokeStyle = BLKBDR_COL;
        pctx.lineWidth = BLKBDR - 0.5;
        pctx.shadowColor = "rgba(5, 25, 24, 0.1)";
        pctx.shadowBlur = 14;
        pctx.beginPath();
        pctx.roundRect(x + BLKBDR / 2, y + BLKBDR / 2, w - BLKBDR, h - BLKBDR, BLKBDR_R);
        pctx.stroke();
        pctx.restore();

        if (Selected === blkId) {
            pctx.save();
            pctx.shadowColor = SHADOW;
            pctx.shadowBlur = BLUR;
            pctx.shadowOffsetX = 4;
            pctx.shadowOffsetY = 4;
            pctx.drawImage(imgSheet, ...SPRITE_MAP['cursor'], x, y, w, h);
            pctx.restore();
        }
    }
}

function speakUrianger(str) {
    pctx.font = "13px MeiryoUI";
    let w = pctx.measureText(str).width + 40;
    pctx.drawImage(imgSheet, ...SPRITE_MAP["bbbl"], ULBBRECT[0], ULBBRECT[1], w, ULBBRECT[3]);
    pctx.textAlign = "left";
    pctx.fillStyle = TXT_DARK;
    pctx.fillText(str, ULBBRECT[0] + 14, ULBBRECT[1] + 25);
    pctx.drawImage(imgSheet, ...SPRITE_MAP["urianger"], ...ULRECT);
}

function drawCanvasBorder() {
    pctx.save();
    pctx.strokeStyle = CELL_COL;
    pctx.lineWidth = 8;
    pctx.beginPath();
    pctx.roundRect(4, 4, SCRN_W - 8, SCRN_H - 8, 10);
    pctx.stroke();
    pctx.restore();
}

function drawEffects() {
    if (mrclFx) {
        let elapsed = performance.now() - mrclFxMod;
        if (elapsed < MRCL_FX_DUR) {
            let alpha = Math.max(0, 1.0 - elapsed / MRCL_FX_DUR);
            pctx.fillStyle = MRCL_COL + (alpha * 0.7) + ")";
            pctx.fillRect(...BDRECT);
        }
    }
}
