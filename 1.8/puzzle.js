// Minfilia JS version.1.8  SAVE THE ORACLE Web Edition
const IS_DEBUG = false;

const CELL = 100;
const W = 4, H = 5;
const BRD_LEN = W * H;
const GOAL_X = 1, GOAL_Y = 3;
const CLR_GOAL_X = 1, CLR_GOAL_Y = 5;
const BLK_BRDR = 8;

const WALL = CELL;
let canvas = document.getElementById('puzzlecanvas');
let style = getComputedStyle(canvas);
const SCRN_W = parseInt(style.width);//600
const SCRN_H = parseInt(style.height);// 800
console.log("w,h:", SCRN_W, SCRN_H)

const SELECTEDCOL = "rgba(215,225,2,0.5)";
const TRANSPARENT = "rgba(0,0,0,0)";

const GOAL_COL = "#00FF00";
const BLK_COL = "#1564C8";
const BLK_BRDR_COL = "#281818";
const WALL_COL = "#282801";
const FLR_COL = "#0A0A0A";  // floor
const ORCL_COL = "#C8C8B4";
const TXT_DARK = "#002828";
const TXT_LIGHT = "#FFFFFF";
const CLR_TXT_COL = TXT_LIGHT;

const DRAG_THLD = CELL * 0.5; // mouse drag sensibility 0<fast<->slow >1

const SPRITE = "img/imagesheet.webp" // sprites sheet
const SPRITE_MAP = {
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
  'hint': [600, 600, 100, 100],
  'rtry': [700, 600, 100, 100],
  'mrcl': [600, 500, 100, 100],
  'mrcl2': [700, 500, 100, 100],
  'wall': [0, 400, 600, 800],
  'auto': [600, 600, 100, 100],
  'grph': [700, 600, 100, 100],
  'quit': [700, 700, 100, 100],
  'bble': [600, 965, 200, 48],
  'urianger': [600, 1014, 200, 200],
  'cursor': [600, 700, 200, 250],
};
const BDOFFX = WALL + BLK_BRDR / 2;
const BDOFFY = WALL + BLK_BRDR / 2 - CELL / 2;
const BDRECT = [0, 0, SCRN_W, SCRN_H];
const BBRECT = [10, SCRN_H - 210, 200, 48];
const ULRECT = [0, 620, 200, 200];
const SND_SEL = 'snd/select.wav'
const SND_MOV = 'snd/move.wav'
const SND_MRCL = 'snd/mrcl.wav' // miracle sound
const SND_CLR = 'snd/clear.wav'
const SND_SEL_VOL = 1
const SND_MOV_VOL = 1
const SND_MRCL_VOL = 1
const SND_CLR_VOL = 0.8
const MRCL_ROT_DUR = 500; // Miracle
const MRCL_BUST_DELAY = 200;
const MRCL_FX_DUR = 20;
const MRCL_COL = "rgba(255,100,100,";
const initStr = "BAACBAACDFFEDIJEG..H";
let statStr = initStr;

let voidflag;

const BTNSIZ = CELL * 7 / 8;
const mrclRect = [CELL / 7, SCRN_H - CELL * 5 / 4, BTNSIZ, BTNSIZ];
const rtryRect = [SCRN_W - CELL * 7 / 8, SCRN_H - CELL * 2, BTNSIZ, BTNSIZ];
const hintRect = [SCRN_W - CELL * 7 / 8, SCRN_H - CELL, BTNSIZ, BTNSIZ];
let crsrRect = [];

let Selected;
let PClr;
let clrAnim;
let clrAnimMod;
let clr;

let isDrag;
let DSMP;

let blkPos;       // Block Posttion
let mrclBtn, mrclAnim, mrclPhase, mrclPhMod;
let mrclBust=[];    // 破壊される駒(bid)の配列
let mrclFx, mrclFxMod, clr_mrclPlayed;
let Freedom = 0;
let gameTurns = 0;
let gameHistory = [];
let cursor = false;

/**
 * statStr(状態文字列)からBlksオブジェクトを生成します。
 * @returns {object} Blksオブジェクト
 */
function getBlksFromStatStr() {
  const blks = {}; // { 1: { pos: [x,y], size: [w,h], code: 'A' }, ... }
  const seenChars = new Set();
  const charCodeA = 'A'.charCodeAt(0);

  for (let i = 0; i < statStr.length; i++) {
    const char = statStr[i];
    if (char === '.' || seenChars.has(char)) {
      continue;
    }

    seenChars.add(char);
    const bid = char.charCodeAt(0) - charCodeA + 1;

    let minX = W, maxX = -1, minY = H, maxY = -1;

    for (let j = 0; j < statStr.length; j++) {
      if (statStr[j] === char) {
        const x = j % W;
        const y = Math.floor(j / W);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
    blks[bid] = { pos: [minX, minY], size: [maxX - minX + 1, maxY - minY + 1], code: char };
  }
  return blks;
}

/**
 * statStrから2次元配列の盤面表現を生成します。
 * @returns {number[][]} 盤面状態を表す2D配列
 */
function getBrdFromStatStr() {
  const brd = Array(H).fill(null).map(() => Array(W).fill(0));
  const charCodeA = 'A'.charCodeAt(0);
  for (let i = 0; i < statStr.length; i++) {
    const char = statStr[i];
    const y = Math.floor(i / W);
    const x = i % W;
    if (char === '.') {
      brd[y][x] = 0;
    } else {
      brd[y][x] = char.charCodeAt(0) - charCodeA + 1;
    }
  }
  return brd;
}

// /**
//  * Converts a 2D array into a game state string using character code
//  * calculation for speed.
//  * Numbers 1-10 are converted to A-J, and 0 is converted to a period ".".
//  *
//  * @param {number[][]} board - The 2D array to convert.
//  * @returns {string} The converted string.
//  *
// function convertWithCharCode(board) {
//     let result = '';
//     const charCodeA = 'A'.charCodeAt(0);
//     for (let row = 0; row < board.length; row++) {
//         for (let col = 0; col < board[row].length; col++) {
//             const value = board[row][col];
//             if (value === 0) {
//                 result += '.';
//             } else if (value >= 1 && value <= 10) {
//                 // Calculate character code: 'A' + (value - 1)
//                 result += String.fromCharCode(charCodeA + value - 1);
//             } else {
//                 console.error(`Unknown value in board: ${value}`);
//                 // Fallback for unknown values
//                 result += '?';
//             }
//         }
//     }
//     return result;
// }
// */

let OrclIdx = {
  "down": "ryneD",
  "left": "ryneL",
  "right": "ryneR",
  "up": "ryneU"
};





//let pazzleCanvas, pctx, offCanvas;
let snd_select, snd_move, snd_mrcl, snd_clr;
let imgSheet = null;

function drHFlipImg(key, x, y, w, h) {
  pctx.save()
  pctx.translate(w, 0);
  pctx.scale(-1, 1);
  let k = SPRITE_MAP[key];
  pctx.drawImage(imgSheet, ...k, x, y, w, h);
  pctx.restore();
}

function drImg(key, x, y, w, h) {
  let m = SPRITE_MAP[key];
  pctx.drawImage(imgSheet, ...m, x, y, w, h);
}

function drImgLight(key, x, y, w, h) {
  let m = SPRITE_MAP[key];
  pctx.save(); // 現在の描画状態を保存
  // スプライト描画
  pctx.drawImage(imgSheet, ...m, x, y, w, h);
  // 光の設定
  pctx.shadowColor = "rgba(255, 255, 0, 1)";
  pctx.shadowBlur = 4;
  pctx.shadowOffsetX = 14;
  pctx.shadowOffsetY = 14;
  pctx.restore(); // 描画状態を元に戻す
}

function drImgShadow(key, x, y, w, h, shadow = "rgba(0, 0, 0, 1)", blur = 14) {
  let m = SPRITE_MAP[key];

  pctx.save(); // 現在の状態を保存

  pctx.shadowColor = shadow;
  pctx.shadowBlur = blur;
  pctx.shadowOffsetX = 14;
  pctx.shadowOffsetY = 14;
  pctx.drawImage(imgSheet, ...m, x, y, w, h);
  pctx.restore(); // 状態を元に戻す
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
    snd_select = await ldSound(SND_SEL);
    snd_select.volume = SND_SEL_VOL;
    snd_move = await ldSound(SND_MOV);
    snd_move.volume = SND_MOV_VOL;
    snd_mrcl = await ldSound(SND_MRCL);
    snd_mrcl.volume = SND_MRCL_VOL;
    snd_clr = await ldSound(SND_CLR);
    snd_clr.volume = SND_CLR_VOL;
  } catch (e) {
    console.error("Failed to load sound resources:", e);
  }
}

function initGameState() {
  console.log("initialize game")
  statStr = initStr;
  Selected = 7;    // when game start cursor set Suncred(bid:7)
  cursorRect = [BDOFFX, BDOFFY + CELL * 4, CELL, CELL];

  clr = false;           // game clear flag
  PClr = false;          // pre game clear flag
  clrAnim = false;        // clear animation flag
  clrAnimMod = 0;         //
  isDrag = false;
  DSMP = [0, 0];
  blkPos = [0, 0];        // block position

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
}

const toGridXY = (x, y) => {
  let gx = Math.floor((x - (WALL + BLK_BRDR / 2)) / CELL);
  let gy = Math.floor((y - (WALL + BLK_BRDR / 2 - CELL * 0.5)) / CELL);
  return { gx, gy };
}

const BLK_SIZE_TABLE = {
  'A': [2, 2],
  'B': [1, 2],
  'C': [1, 2],
  'D': [1, 2],
  'E': [1, 2],
  'F': [2, 1],
  'G': [1, 1],
  'H': [1, 1],
  'I': [1, 1],
  'J': [1, 1],
};

/**
 * 盤面インデックスとブロック文字から描画用の矩形 [x, y, w, h] を返す
 */
function getBlkRect(idx, char) {
  // 盤面上の左上座標
  const x = idx % W;
  const y = Math.floor(idx / W);

  // ブロックのサイズを取得
  const [bw, bh] = BLK_SIZE_TABLE[char] || [1, 1];

  // 描画座標
  const drawX = BDOFFX + x * CELL;
  const drawY = BDOFFY + y * CELL;

  return [drawX, drawY, bw * CELL, bh * CELL];
}



function drawBlocks() {
  const seenChars = new Set();
  const charCodeA = 'A'.charCodeAt(0);

  for (let i = 0; i < statStr.length; i++) {
    const char = statStr[i];
    if (char === '.' || seenChars.has(char)) {
      continue; // 空白マスと描画済みのブロックはスキップ
    }

    seenChars.add(char);
    const bid = char.charCodeAt(0) - charCodeA + 1;
    const rect = getBlkRect(i, statStr[i]);

    let orclKey = "down"; // デフォルトの向き

    if (bid == 1) { // メインブロックのアニメーション処理
      if (clrAnim) { // クリアアニメーション
        const elapsed = performance.now() - clrAnimMod;
        if (elapsed < 500) {
          const progress = elapsed / 500;
          const startY = GOAL_Y * CELL + BDOFFY;
          const endY = 5 * CELL + BDOFFY;
          drawY = startY + (endY - startY) * progress;
        }
      } else if (mrclAnim && mrclPhase == 1) { // ミラクルフラッシュ回転
        const elapsed = performance.now() - mrclPhMod;
        const frame_duration = MRCL_ROT_DUR / 4;
        const idx = Math.floor((elapsed / frame_duration) % 4);
        orclKey = ["up", "left", "down", "right"][idx];
      }
      drImg(OrclIdx[orclKey], ...rect);
    } else {
      drImg(`b${bid}`, ...rect);
    }

    // ブロックの枠線と選択カーソルを描画
    drawBlockBorder(...rect);
    if (Selected == bid) {
      drImgShadow('cursor', ...rect);
    }
  }
}

let mkStatStr = (character) => {
  let bm = 0;
  for (let i = 0; i < 20; i++) {
    if (statStr[i] === character) {
      const bitPos = 20 - 1 - i; // BRD_LEN:20... board size Width x Height =4x5
      bm |= 1 << bitPos;
    }
  }
  return bm;
}

/**
 * ブロックの枠線を描画します。
 * @param {number} x - X座標
 * @param {number} y - Y座標
 * @param {number} w - 幅
 * @param {number} h - 高さ
 */
function drawBlockBorder(x, y, w, h) {
  const BLKBDR_W = 6; // 枠線の太さ
  const BLKBDR_COL = "#1c1c1c"; // 枠線の色
  const BLKBDR_R = 8; // 角丸の半径

  pctx.save();
  pctx.strokeStyle = BLKBDR_COL;
  pctx.lineWidth = BLKBDR_W;
  pctx.shadowColor = "rgba(255, 255, 224, 0.5)"; // グロー効果
  pctx.shadowBlur = 8;
  pctx.beginPath();
  pctx.roundRect(x + BLKBDR_W / 2, y + BLKBDR_W / 2, w - BLKBDR_W, h - BLKBDR_W, BLKBDR_R);
  pctx.stroke();
  pctx.restore();
}

let infoBm, infoShift, infoC, infoHall;
const UP = 0b11110000000000000000;
const DOWN = 0b00000000000000001111;
const LEFT = 0b10001000100010001000;
const RIGHT = 0b00010001000100010001;
function freedom() {
  const block = 'ABCDEFGHIJ';
  let bm, shift;
  let res = 0;
  // WALL
  /** 1. make void position bitmask(bm) from statStr (ex. bmv=0b0000 0000 0000 0000 0110) */
  const hallbm = mkStatStr('.');
  infoHall = hallbm;
  for (let i = 0; i < 10; i++) { // A-J blocks
    const c = block[i]; // character;
    infoC = c;
    bm = mkStatStr(c); // bitmap
    infoBm = bm;
    if (IS_DEBUG) console.log(i, c, ":bm", bm.toString(2).padStart(20, '0'));
    /** 2. make a block bitmask each direction (ex.bm = 0b0110 0110 0000 0000 0000) */
    /** 3. shift the bitmask  to where the block want to go.*/
    /** 4. compare AND with bm */
    // UP
    if ((bm & UP) === 0) { // その駒は最上段にいない。
      shift = bm << 4;
      infoShift = shift;
      if ((shift & hallbm) === shift) {
        res++;
      }
    }
    // DOWN
    if ((bm & DOWN) === 0) {
      shift = bm >>> 4;
      if ((shift & hallbm) === shift) {
        res++;
      }
    }
    // LEFT
    if ((bm & LEFT) === 0) {
      shift = bm << 1;
      if ((shift & hallbm) === shift) {
        res++;
      }
    }
    // RIGHT
    if ((bm & RIGHT) === 0) {
      shift = bm >>> 1;
      if ((shift & hallbm) === shift) {
        res++;
      }
    }
    /** 5. loop in each block. */
  }
  return res;
}

function speakUrianger(str) {
  const bblewidth = str.length * 9;
  drImg("bble", BBRECT[0], BBRECT[1], bblewidth, BBRECT[3]);
  pctx.textAlign = "left";
  pctx.font = "14px IPAGothic";
  pctx.fillStyle = TXT_DARK;
  pctx.fillText(str, ULRECT[0] + 34, ULRECT[1] - 5);
  drImg("urianger", ...ULRECT);
}

function drawCanvasBorder() {
  const borderWidth = 8;
  const borderRadius = 10;
  const borderColor = WALL_COL; // #281800

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

function drawAll() {
  pctx.fillStyle = FLR_COL;
  drImg("wall", ...BDRECT);

  drawCanvasBorder();
  drawBlocks();
  drawButtons();
  drawEffects();
  let str, x, y;

  // Draw thus speaks Urianger

  Freedom = freedom();
  //str="Freedom Degree is ..."+ Freedom;
  str = "Goodspeed Sancred ...";
  speakUrianger(str);

  // 追加するデバッグ情報
  let infoStr = `Infomation\n`;
  infoStr += `Game Turns k   : ${gameTurns}\n`;
  infoStr += `Miracle Used   : ${mrclBtn ? 'Yes' : 'No'}\n`;
  infoStr += `Freedom Degree : ${Freedom}\n`;
  infoStr += `Selected Block : ${Selected} ${".ABCDEFGHIJ"[Selected]}\n`;
  infoStr += `Block: ${infoC}\n`;
  infoStr += `Current State  : ${statStr} (${statStr.length})\n`;
  infoStr += `Shift          : ${infoShift.toString(2).padStart(20, "0")}\n`;
  infoStr += `Block bitmap   : ${infoBm.toString(2).padStart(20, "0")}\n`;
  infoStr += `Hall bitmask   : ${infoHall.toString(2).padStart(20, "0")}\n`;
  infoStr += `blkPos   : ${blkPos}\n`;
  infoStr += `cursor   : ${cursor}\n`;
  drInfo(infoStr);


}

function drInfo(str) {
  const infoDiv = document.getElementById('info');
  infoDiv.textContent = str;
  infoDiv.style.whiteSpace = 'pre-wrap'; // この行を追加
}

function drawButtons() {
  drImg('rtry', ...rtryRect);
  drImg('hint', ...hintRect);
  drImg('mrcl', ...mrclRect);
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

function canMove(bid, mv) {
  const blockChar = ".ABCDEFGHIJ"[bid];
  const blockBm = mkStatStr(blockChar);
  const hallBm = mkStatStr('.') | mkStatStr(blockChar); // 自分自身との衝突を防ぐため一時的に空白とする
  let shiftedBlockBm;                        // 2. 移動方向に応じたシフトと、ボードの境界チェック
  switch (mv) {
    case "up":
      if ((blockBm & UP) !== 0) return false;
      shiftedBlockBm = blockBm << 4;
      break;
    case "down":
      if ((blockBm & DOWN) !== 0) return false;
      shiftedBlockBm = blockBm >>> 4;
      break;
    case "left":
      if ((blockBm & LEFT) !== 0) return false;
      shiftedBlockBm = blockBm << 1;
      break;
    case "right":
      if ((blockBm & RIGHT) !== 0) return false;
      shiftedBlockBm = blockBm >>> 1;
      break;
    default:
      return false;
  }

  const a = (shiftedBlockBm & hallBm);
  const b = a === shiftedBlockBm;


  return b;// 3. 移動後の位置がすべて空白マスであるか判定
}

/**
 * ビットマップに基づいてstatStrを更新します。
 * @param {number} oldBitmap - 更新前の駒の位置を示すビットマップ
 * @param {number} newBitmap - 更新後の駒の位置を示すビットマップ
 * @param {string} char - 駒を表す文字
 * @returns {string} 更新されたstatStr
 */
function updateStatStrFromBitmap(oldBitmap, newBitmap, char) {
  const chars = statStr.split('');
  // 1. 古い位置の駒を空白(ピリオド)にする
  for (let i = 0; i < BRD_LEN; i++) {
    if ((oldBitmap >> (BRD_LEN - 1 - i)) & 1) {
      chars[i] = '.';
    }
  }
  // 2. 新しい位置に駒を置く
  for (let i = 0; i < BRD_LEN; i++) {
    if ((newBitmap >> (BRD_LEN - 1 - i)) & 1) {
      chars[i] = char;
    }
  }
  return chars.join('');
}

function move(bid, mv) {
  gameTurns++;
  const blockChar = ".ABCDEFGHIJ"[bid];
  const blockBm = mkStatStr(blockChar);
  let shiftedBlockBm;
  console.log("check move", blockChar, mv);

  switch (mv) {
    case "up":
      shiftedBlockBm = blockBm << 4;
      break;
    case "down":
      shiftedBlockBm = blockBm >>> 4;
      break;
    case "left":
      shiftedBlockBm = blockBm << 1;
      break;
    case "right":
      shiftedBlockBm = blockBm >>> 1;
      break;
    default:
      return false;
  }

  // 古い駒の位置(blockBm)を消し、新しい位置(shiftedBlockBm)に駒を置く
  statStr = updateStatStrFromBitmap(blockBm, shiftedBlockBm, blockChar);

  if (snd_move)
    snd_move.currentTime = 0, snd_move.play();
}

function blkBuster(bid) {
  const blkChar = ".ABCDEFGHIJ"[bid];
  const blkBm = mkStatStr(blkChar);
  statStr = updateStatStrFromBitmap(blkBm, 0, '.');

  if (snd_select) snd_select.currentTime = 0, snd_select.play();
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
  let obid = 1;

  const Blks = getBlksFromStatStr();
  mrclBust = Object.keys(Blks).filter(bid => bid != obid);  // 破壊されるリスト

  for (let i = mrclBust.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [mrclBust[i], mrclBust[j]] = [mrclBust[j], mrclBust[i]];
  }
  if (snd_mrcl) snd_mrcl.currentTime = 0, snd_mrcl.play();
}

let startclrAnim = () => {
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
    if (PClr && Selected == 1 && mv == "down") {
      startclrAnim();
    } else if (canMove(Selected, mv)) {
      move(Selected, mv);
      DSMP = [x, y];                   //  Selected position
      //blkPos = [...Blks[Selected].pos];  //  Selected block position
    } else {
      DSMP = [x, y];                   //  Selected position
      //blkPos = [...Blks[Selected].pos];  //
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
  if (x >= rtryRect[0] && x <= rtryRect[0] + CELL && y >= rtryRect[1] && y <= rtryRect[1] + CELL) {
    loadAllResources().then(drawAll);
    initGameState();
    return;
  }
  const Blks = getBlksFromStatStr();
  if (!(clrAnim || (Blks[1] && Blks[1].pos[0] == CLR_GOAL_X && Blks[1].pos[1] == CLR_GOAL_Y)
    || mrclAnim)) {
    if (0 <= grid_x && grid_x < W && 0 <= grid_y && grid_y < H) {
      const Brd = getBrdFromStatStr();
      let clicked_bid = Brd[grid_y][grid_x];
      if (clicked_bid !== 0) {
        if (Selected != clicked_bid && snd_select) snd_select.currentTime = 0, snd_select.play();
        Selected = clicked_bid;
        isDrag = true;
        DSMP = [x, y];
        blkPos = [...Blks[Selected].pos];
      }
    }
    // Miracle btn
    if (x >= mrclRect[0] && x <= mrclRect[0] + CELL && y >= mrclRect[1] && y <= mrclRect[1] + CELL) {
      activateMiracle();
    }

  }
}

let onMouseUp = (e) => isDrag = false;

function updateGameState() {
  let now = performance.now();
  const Blks = getBlksFromStatStr();
  if (clrAnim) {
    let elapsed = now - clrAnimMod;
    if (elapsed >= 500) {
      //clrAnim = false; // This might be handled by move logic if we refactor further
      Blks[1].pos = [CLR_GOAL_X, CLR_GOAL_Y];
      clr = true;
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
        let bid = mrclBust.shift();
        blkBuster(bid);
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
  // ゴール位置(1,3)に2x2の'A'ブロックがある状態のビットマスク
  // 0b01100110
  const goalPattern = 0b01100110;
  const blkBm = mkStatStr('A');
  if (blkBm === goalPattern) {
    return true;
  }
  return false;
}

function mainLoop() {
  updateGameState();
  drawAll();
  if (judgeClear()) {
    startclrAnim();
    Clr = true;
  }

  requestAnimationFrame(mainLoop);
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
  initGameState();

  await loadAllResources();

  puzzleCanvas.addEventListener("mouseenter", () => isMouseOverCanvas = true);
  puzzleCanvas.addEventListener("mouseleave", () => isMouseOverCanvas = false);

  window.addEventListener("keydown", (e) => {
    const modal = document.getElementById('modal');
    if ((e.key === "m" || e.key === "M")) {
      modal.classList.toggle('is-active');
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
