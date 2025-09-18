// Minfilia JS version.1.5  SAVE THE ORACLE Web Edition
const IS_DEBUG = false;

const CELL = 100;
const W = 4, H = 5;
const BRD_LEN = W*H;
const GOAL_X = 1, GOAL_Y = 3;
const CLR_GOAL_X = 1, CLR_GOAL_Y = 5;
const BLK_BRDR = 8;

const WALL = CELL;
let canvas = document.getElementById('puzzlecanvas');
let style = getComputedStyle(canvas);
const SCRN_W = parseInt(style.width);//600
const SCRN_H = parseInt(style.height);// 800
console.log("w,h:",SCRN_W,SCRN_H)

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

const SPRITE = "../img/imagesheet.png" // sprites sheet
const SPRITE_MAP = {
    'ryneD': [   0,    0,  199,  199 ],
    'ryneR': [ 200,    0,  199,  199 ],
    'ryneU': [ 400,    0,  199,  199 ],
    'ryneL': [ 600,    0,  199,  199 ],
    'b1':    [   0,    0,  200,  200 ],
    'b2':    [   0,  200,  100,  200 ],
    'b3':    [ 100,  200,  100,  200 ],
    'b4':    [ 200,  200,  100,  200 ],
    'b5':    [ 300,  200,  100,  200 ],
    'b6':    [ 400,  200,  200,  100 ],
    'b7':    [ 600,  300,  100,  100 ],
    'b8':    [ 700,  300,  100,  100 ],
    'b9':    [ 600,  200,  100,  100 ],
    'b10':   [ 700,  200,  100,  100 ],
    'hint':  [ 600,  600,  100,  100 ],
    'rtry':  [ 700,  600,  100,  100 ],
    'mrcl':  [ 600,  500,  100,  100 ],
    'mrcl2': [ 700,  500,  100,  100 ],
    'wall':  [   0,  400,  600,  800 ],
    'auto':  [ 600,  600,  100,  100 ],
    'grph':  [ 700,  600,  100,  100 ],
    'quit':  [ 700,  700,  100,  100 ],
    'bble':  [ 600,  965,  200,  48 ],
    'urianger':  [ 600, 1014,  200,  200 ],
    'cursor':  [ 600, 700,  200,  250],
};
const BDOFFX = WALL + BLK_BRDR/2;
const BDOFFY = WALL + BLK_BRDR/2 - CELL/2;
const BDRECT = [0, 0, SCRN_W, SCRN_H];
const BBRECT = [10, SCRN_H-210, 200, 48];
const ULRECT = [0, 620, 200, 200];

const SND_SEL = '../snd/select.wav'
const SND_MOV = '../snd/move.wav'
const SND_MIR = '../snd/miracle.wav'
const SND_CLR = '../snd/clear.wav'
const SND_SEL_VOL = 1
const SND_MOV_VOL = 1
const SND_MIR_VOL = 1
const SND_CLR_VOL = 0.8

const MRFLSH_ROT_DUR = 500; // Miracle Flash
const MRFLSH_BUST_DELAY = 200;
const FLSH_EFF_DUR = 20;
const FLSH_COL = "rgba(255,255,200,";

const initStr="BAACBAACDFFEDIJEG..H";
let statStr=initStr;

const INIT_BRD = [
    [2, 1,   1, 3],
    [2, 1,   1, 3],
    [4, 6,   6, 5],
    [4, 9,  10, 5],
    [7, 0, 0, 8]
];
// 同じ数字は同じ駒で一つのブロック(ひとかたまりで動く)。しかし、
// 0 は穴を現している。0が並んでいてもひとつのブロック（ひとかたまり）ではないことに注意
// ２つの穴は、それぞれ場所を変えうる。

const INIT_BLKS = {
    1:  {size: [2,2], pos: [1,0], code: 'A', },
    2:  {size: [1,2], pos: [0,0], code: 'B', },
    3:  {size: [1,2], pos: [3,0], code: 'C', },
    4:  {size: [1,2], pos: [0,2], code: 'D', },
    5:  {size: [1,2], pos: [3,2], code: 'E', },
    6:  {size: [2,1], pos: [1,2], code: 'F', },
    7:  {size: [1,1], pos: [0,4], code: 'G', },
    8:  {size: [1,1], pos: [3,4], code: 'H', },
    9:  {size: [1,1], pos: [1,3], code: 'I', },
    10: {size: [1,1], pos: [2,3], code: 'J', },
};
let voidflag;

const BTNSIZ = CELL*7/8;
const mrclRect = [CELL/7, SCRN_H-CELL*5/4, BTNSIZ, BTNSIZ];
const rtryRect = [SCRN_W-CELL*7/8, SCRN_H-CELL*2, BTNSIZ, BTNSIZ];
const hintRect = [SCRN_W-CELL*7/8, SCRN_H-CELL, BTNSIZ, BTNSIZ];
let crsrRect = [];

let Brd;    // 盤面の状態を保持する
let Blks;
let AniIdx;
let Selected;
let PClr;
let clrAni;
let clrAniSTM;
let clr;
let isDrag;
let DSMP;
let blkPos;       // Block Posttion
let Mrbtn_used, MrflashAniAct, MrflshPh, MrflshPhST, MrflshBlkBust;
let FlshEffAct, FlshEffST, clr_Mrplayed;
let Freedom = 0;
let gameTurns = 0;
let cursor=false;

/**
 * Converts a 2D array into a game state string using character code
 * calculation for speed.
 * Numbers 1-10 are converted to A-J, and 0 is converted to a period ".".
 *
 * @param {number[][]} board - The 2D array to convert.
 * @returns {string} The converted string.
 */
function convertWithCharCode(board) {
    let result = '';
    const charCodeA = 'A'.charCodeAt(0);
    for (let row = 0; row < board.length; row++) {
        for (let col = 0; col < board[row].length; col++) {
            const value = board[row][col];
            if (value === 0) {
                result += '.';
            } else if (value >= 1 && value <= 10) {
                // Calculate character code: 'A' + (value - 1)
                result += String.fromCharCode(charCodeA + value - 1);
            } else {
                console.error(`Unknown value in board: ${value}`);
                // Fallback for unknown values
                result += '?';
            }
        }
    }
    return result;
}

let OrclIdx = {
    "down":  "ryneD",
    "left":  "ryneL",
    "right": "ryneR",
    "up":    "ryneU"
};

//let pazzleCanvas, pctx, offCanvas;
let snd_select, snd_move, snd_miracle, snd_clr;
let imgSheet = null;

function drHFlipImg(key,x,y,w,h){
    pctx.save()
    pctx.translate(w,0);
    pctx.scale(-1,1);
    let k = SPRITE_MAP[key];
    pctx.drawImage(imgSheet, ...k, x, y, w, h);
    pctx.restore();
}

function drImg(key,x,y,w,h){
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

function drImgShadow(key, x, y, w, h) {
    let m = SPRITE_MAP[key];

    pctx.save(); // 現在の状態を保存

    pctx.shadowColor = "rgba(0, 0, 0, 1)";
    pctx.shadowBlur = 14;
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
async function loadAllResources () {
    imgSheet = await ldSprite(SPRITE); // spritesheet
    try {
        snd_select = await ldSound(SND_SEL);
        snd_select.volume = SND_SEL_VOL;
        snd_move = await ldSound(SND_MOV);
        snd_move.volume = SND_MOV_VOL;
        snd_miracle = await ldSound(SND_MIR);
        snd_miracle.volume = SND_MIR_VOL;
        snd_clr = await ldSound(SND_CLR);
        snd_clr.volume = SND_CLR_VOL;
    } catch (e) {
        console.error("Failed to load sound resources:", e);
    }
}

function initGameState() {
    console.log("initialize game")
    Brd = INIT_BRD.map(row => row.slice());
    Blks = {};
    for (let k in INIT_BLKS) {
	Blks[k] = {
	    size: [...INIT_BLKS[k].size],
	    pos: [...INIT_BLKS[k].pos],
	    code: INIT_BLKS[k].code,
	};
    }
    if (IS_DEBUG) console.log(Blks);
    AniIdx = {};
    for (let k in Blks) AniIdx[k] = 0;

    Selected = Brd[0][4] || 7;    // when game start cursor set Suncred
    cursorRect = [BDOFFX, BDOFFY+CELL*4, CELL, CELL];

    clr = false;           // game clear flag
    PClr = false;          // pre game clear flag
    clrAni = false;        // clear animation flag
    clrAniSTM = 0;         //
    isDrag = false;
    DSMP = [0,0];
    blkPos = [0,0];        // block position
    Mrbtn_used = false;    // Miracle Flash button flag
    MrflshAniAct = false;
    MrflshPh = 0;
    MrflshPhST = 0;
    MrflshBlkBust = [];
    FlshEffAct = false;
    FlshEffST = 0;
    clr_Mrplayed = false;
    Freedom = 0;
    cursor=true;

}

const toGridXY = (x,y) => {
    let gx = Math.floor((x - (WALL + BLK_BRDR/2 )) / CELL);
    let gy = Math.floor((y - (WALL + BLK_BRDR/2 - CELL * 0.5)) / CELL);
    return {gx,gy};
}

function drawBlocks() {
    for (let bid in Blks) {
        let info = Blks[bid];
        let [bx, by] = info.pos;
        let [bw, bh] = info.size;
        let x = bx * CELL + BDOFFX;
	let y = by * CELL + BDOFFY;
	const rect = [x, y, bw*CELL, bh*CELL];
	cursor = true;

	if (bid==1 && AniIdx[1]) {
	    cursor = false;
	    if (clrAni) {
		let elapsed = performance.now() - clrAniSTM;
		if (elapsed < 500) {
		    let progress = elapsed / 500;
		    let startY = GOAL_Y * CELL + BDOFFY;
		    let endY = 5 * CELL + BDOFFY;
		    y = startY + (endY - startY) * progress;
		} else {
		    y = 5 * CELL + BDOFFY;
		}
		AniIdx[1] = OrclIdx["down"] || 0;
//		pctx.strokeStyle = TRANSPARENT;
	    } else if (MrflshAniAct && MrflshPh == 1) {        // rotation of miracle flash
		let elapsed = performance.now() - MrflshPhST;
		let num_frames = 4;
		let frame_duration = MRFLSH_ROT_DUR / num_frames;
		let idx = Math.floor((elapsed / frame_duration) % num_frames);
		let keys = ["up", "left", "down", "right"];
		AniIdx[1] = OrclIdx[keys[idx]] || 0;
//		pctx.strokeStyle = TRANSPARENT;
	    }
	    drImg(AniIdx[1], ...rect);
	} else {
	    drImg(`b${bid}`, ...rect);
	}

	// 主役(bid=1)以外のブロックに枠線を描画
	if (bid != 1) {
	    const borderWidth = 4;
	    const borderRadius = 8;
	    const borderColor = "rgba(255, 255, 224, 0.7)"; // 光をイメージした淡い黄色

	    pctx.save();
	    pctx.strokeStyle = borderColor;
	    pctx.lineWidth = borderWidth;
	    pctx.shadowColor = "rgba(255, 255, 224, 0.5)"; // 枠線にグロー効果を追加
	    pctx.shadowBlur = 8;
	    pctx.beginPath();
	    pctx.roundRect(
		x + borderWidth / 2, y + borderWidth / 2,
		bw * CELL - borderWidth, bh * CELL - borderWidth,
		borderRadius
	    );
	    pctx.stroke();
	    pctx.restore();
	}

	if (Selected == bid) {
	    // 主人公選択時は「闇」の紫色のオーラ、敵選択時は「光」の黄色のオーラ
	    if (bid == 1) {
		drImgShadow('cursor', ...rect, "rgba(150, 100, 255, 0.9)", 20);
	    } else {
		drImgShadow('cursor', ...rect, "rgba(255, 255, 0, 0.9)", 20);
	    }
	}
    }
}

let mkStatStr = (character) => {
    let bm = 0;
    for (let i = 0; i < 20; i++) {
	if (statStr[i] === character) {
	    const bitPos = 20 - 1 - i;   // BRD_LEN:20... board size Width x Height =4x5
	    bm |= (1 << bitPos);
	}
    }
    return bm;
}

let infoBm,infoShift,infoC,infoHall;
const UP =    0b11110000000000000000;
const DOWN =  0b00000000000000001111;
const LEFT =  0b10001000100010001000;
const RIGHT = 0b00010001000100010001;
function freedom() {
    const block = 'ABCDEFGHIJ';
    let bm,shift;
    let res=0;
    // WALL
    /** 1. make void position bitmask(bm) from statStr (ex. bmv=0b0000 0000 0000 0000 0110) */
    const hallbm = mkStatStr('.');
    infoHall=hallbm;
    for (let i = 0; i < 10 ; i++) { // A-J blocks
	const c = block[i]; // character;
	infoC = c;
	bm = mkStatStr(c); // bitmap
	infoBm=bm;
	if (IS_DEBUG) console.log(i,c,":bm",bm.toString(2).padStart(20,'0'));
	/** 2. make a block bitmask each direction (ex.bm = 0b0110 0110 0000 0000 0000)  */
	/** 3. shift the bitmask  to where the block want to go.*/
	/** 4. compare AND with bm */
	// UP
	if((bm & UP) === 0) { // その駒は最上段にいない。
	    shift = bm<<4;
	    infoShift=shift;
    	    if ((shift & hallbm) === shift ) {
		res++;
	    }
	}
    	// DOWN
	if((bm & DOWN) === 0) {
	    shift = bm>>>4;
    	    if ((shift & hallbm) === shift ) {
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
	if (IS_DEBUG){
	    if (c == Blks[Selected].code ){
		console.log("BLOCK ",c);
		console.log("statStr: \"", statStr, "\", freedom degree:", res);
		console.log("bm     :",bm.toString(2).padStart(20,"0"));
		console.log("shift  :",shift.toString(2).padStart(20,"0"));
		console.log("hall   :",hallbm.toString(2).padStart(20,"0"));
	    }
	}
	/** 5. loop in each block. */
    }
    return res;
}

function speakUrianger(str){
    const bblewidth = str.length * 9;
    drImg("bble", BBRECT[0],BBRECT[1], bblewidth, BBRECT[3]);
    pctx.textAlign = "left";
    pctx.font = "14px IPAGothic";
    pctx.fillStyle = TXT_DARK;
    pctx.fillText(str, ULRECT[0]+34,ULRECT[1]-5);
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
    drawMessage();
    let str,x,y;

    // Draw thus speaks Urianger

    Freedom = freedom();
    //str="Freedom Degree is ..."+ Freedom;
    str="Goodspeed Sancred ...";
    speakUrianger(str);


    // 追加するデバッグ情報
    let infoStr	= `Infomation\n`;
    infoStr += `Game Turns k   : ${gameTurns}\n`;
    infoStr += `Miracle Used   : ${Mrbtn_used ? 'Yes' : 'No'}\n`;
    infoStr += `Freedom Degree : ${Freedom}\n`;
    infoStr += `Selected Block : ${Selected} ${".ABCDEFGHIJ"[Selected]}\n`;
    infoStr += `Block: ${infoC}\n`;
    infoStr += `Current State  : ${statStr}\n`;
    infoStr += `Shift          : ${infoShift.toString(2).padStart(20,"0")}\n`;
    infoStr += `Block bitmap   : ${infoBm.toString(2).padStart(20,"0")}\n`;
    infoStr += `Hall bitmask   : ${infoHall.toString(2).padStart(20,"0")}\n`;
    infoStr += `blkPos   : ${blkPos}\n`;
    infoStr += `cursor   : ${cursor}\n`;
    drInfo (infoStr);
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
    if (FlshEffAct) {
        let elapsed = performance.now() - FlshEffST;
        if (elapsed < FLSH_EFF_DUR) {
	    let alpha = Math.max(0, 1.0 - elapsed / FLSH_EFF_DUR);
	    pctx.fillStyle = FLSH_COL + (alpha * 0.7) + ")";
	    pctx.fillRect(...BDRECT);
        }
    }
}
function drText(str,x,y,px) {
    const dw=1;
    pctx.textAlign = "left";
    pctx.font = px+"px sans-serif";
//    pctx.fillStyle = "rgba(0,0,0,1)";      // shadow
//    pctx.fillText(str, x + dw, y + dw);
//    pctx.fillStyle = "rgba(28,28,28,1)";     // pseudo3D-text
//    pctx.fillText(str, x + dw, y + dw);
    pctx.fillStyle = TXT_DARK;
    pctx.fillText(str, x, y);
}

function drText(str,x,y,px) {
    const dw=1;
    pctx.textAlign = "left";
    pctx.font = px+"px sans-serif";
//    pctx.fillStyle = "rgba(0,0,0,1)";      // shadow
//    pctx.fillText(str, x + dw, y + dw);
//    pctx.fillStyle = "rgba(28,28,28,1)";     // pseudo3D-text
//    pctx.fillText(str, x + dw, y + dw);
    pctx.fillStyle = TXT_DARK;
    pctx.fillText(str, x, y);
}


function drawMessage() {
    pctx.font = "32px sans-serif";
    pctx.textAlign = "center";
    if (Blks[1] && Blks[1].pos[0] === CLR_GOAL_X && Blks[1].pos[1] === CLR_GOAL_Y) {
	let w=SCRN_W/2;
	let h=SCRN_H/2-CELL/2;
	let pw=5;
	drText("THE ORACLE ESCAPED!",w,h,18);
    }
}

function canMove(bid,mv) {
    const blockChar = Blks[bid].code;          // 1. 駒のビットマップと、ボード全体の空白マスビットマップを取得
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


	if (bid==5){
	    console.log(`shiftedBlockBm:${shiftedBlockBm.toString(2).padStart(20,"-")}`);
	}
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
    const b =  a === shiftedBlockBm;


    return b;// 3. 移動後の位置がすべて空白マスであるか判定
}

function move(bid,mv) {
    gameTurns++;
    let [bx, by] = Blks[bid].pos;
    let [bw, bh] = Blks[bid].size;
    for (let y=0; y<bh; ++y)
	for (let x=0; x<bw; ++x)
	    Brd[by+y][bx+x] = 0;
    let [dx, dy] = {up:[0,-1], down:[0,1], left:[-1,0], right:[1,0]}[mv];
    let nx = bx + dx, ny = by + dy;
    Blks[bid].pos = [nx, ny];
    for (let y=0; y<bh; ++y)
	for (let x=0; x<bw; ++x)
	    Brd[ny+y][nx+x] = parseInt(bid);
    if (bid == 1 && mv in OrclIdx) {
	AniIdx[1] = OrclIdx[mv];
	if(IS_DEBUG) console.log(AniIdx[1]);
    }
    if (snd_move)
	snd_move.currentTime = 0, snd_move.play();
    statStr = convertWithCharCode(Brd);
}


function blkBuster(bid) {
    if (!(bid in Blks) || bid == 1 || bid == 7)
	return false;
    let [bx, by] = Blks[bid].pos, [bw, bh] = Blks[bid].size;
    for (let y=0; y<bh; ++y) for (let x=0; x<bw; ++x)
        if (0 <= by+y && by+y < H && 0 <= bx+x && bx+x < W && Brd[by+y][bx+x] == bid)
	    Brd[by+y][bx+x] = 0;
    delete Blks[bid];
    delete AniIdx[bid];
    if (snd_select) snd_select.currentTime = 0, snd_select.play();
    FlshEffAct = true;
    FlshEffST = performance.now();
    return true;
}
function activateMiracleFlsh() {
    if (MrflshAniAct) return;
    Mrbtn_used = true;
    MrflshAniAct = true;
    MrflshPh = 1;
    MrflshPhST = performance.now();
    let obid = 1;
    MrflshBlkBust = Object.keys(Blks).filter(bid => bid != obid);  // 破壊されるリスト
    for (let i = MrflshBlkBust.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [MrflshBlkBust[i], MrflshBlkBust[j]] = [MrflshBlkBust[j], MrflshBlkBust[i]];
    }
    AniIdx[1] = OrclIdx["down"] || 0;
    if (snd_miracle) snd_miracle.currentTime = 0, snd_miracle.play();
}

let startClrAni = () => {
    clrAni = true;
    clrAniSTM = performance.now();
    if (snd_clr) snd_clr.currentTime = 0, snd_clr.play();
}

const onMouseMove = (e) => {
    if (!isDrag || !Selected || clrAni || MrflshAniAct) return;
    if ((Blks[1] && Blks[1].pos[0] == CLR_GOAL_X && Blks[1].pos[1] == CLR_GOAL_Y))
	return;
    let rect = puzzleCanvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    let [sx, sy] = DSMP;
    let dx = x - sx;
    let dy = y - sy;
    let mv;
    if (Math.abs(dx) > DRAG_THLD) mv = dx > 0 ? "right" : "left";
    if (Math.abs(dy) > DRAG_THLD && Math.abs(dy) > Math.abs(dx)) mv = dy > 0 ? "down" : "up";
    if (MrflshAniAct) return;
    if (mv) {
        if (PClr && Selected == 1 && mv == "down") {
	    startClrAni();
        } else if ( canMove(Selected,mv) ) {
	    move(Selected, mv);
	    DSMP = [x, y];                   //  Selected position
	    blkPos = [...Blks[Selected].pos];  //  Selected block position
        } else {
	    DSMP = [x, y];                   //  Selected position
	    blkPos = [...Blks[Selected].pos];  //
        }
    }
}

const onMouseDown = (e) => {
    let rect = puzzleCanvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    let { gx, gy } = toGridXY(x, y);
    let grid_x=gx;
    let grid_y=gy;
    if (x >= rtryRect[0] && x <= rtryRect[0]+CELL && y >= rtryRect[1] && y <= rtryRect[1]+CELL) {
        loadAllResources().then(drawAll);
        initGameState();
        return;
    }
    if (!(clrAni || (Blks[1] && Blks[1].pos[0] == CLR_GOAL_X && Blks[1].pos[1] == CLR_GOAL_Y)
	  || MrflshAniAct)) {
        if (0 <= grid_x && grid_x < W && 0 <= grid_y && grid_y < H) {
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
        if (x >= mrclRect[0] && x <= mrclRect[0]+CELL && y >= mrclRect[1] && y <= mrclRect[1]+CELL) {
	    activateMiracleFlsh();
        }

    }
}

let onMouseUp = (e) => isDrag = false;

function updateGameState() {
    let now = performance.now();
    if (clrAni) {
        let elapsed = now - clrAniSTM;
        if (elapsed >= 500) {
	    clrAni = false;
	    Blks[1].pos = [CLR_GOAL_X, CLR_GOAL_Y];
	    clr = true;
        }
    }
    // Miracle Flsh
    if (MrflshAniAct) {
        let elapsed = now - MrflshPhST;
        if (MrflshPh == 1 && elapsed >= MRFLSH_ROT_DUR) {
	    if (MrflshBlkBust.length) {
                MrflshPh = 2;
                MrflshPhST = now;
                AniIdx[1] = OrclIdx["down"] || 0;
	    } else {
                MrflshAniAct = false;
	    }
        } else if (MrflshPh == 2 && elapsed >= MRFLSH_BUST_DELAY) {
	    if (MrflshBlkBust.length) {
                let bid = MrflshBlkBust.shift();
                blkBuster(bid);
                if (MrflshBlkBust.length) {
		    MrflshPh = 1;
		    MrflshPhST = now;
                } else {
		    MrflshAniAct = false;
                }
	    } else {
                MrflshAniAct = false;
	    }
        }
    }
    if (FlshEffAct) {
        let elapsed = now - FlshEffST;
        if (elapsed >= FLSH_EFF_DUR) FlshEffAct = false;
    }
}

function mainLoop() {
    updateGameState();
    drawAll();
    // judge Clear
    if (Blks[1]&&Blks[1].pos[0]===GOAL_X && Blks[1].pos[1] === GOAL_Y && !PClr && !clrAni) PClr = true;
    if (Blks[1] && Blks[1].pos[0] === CLR_GOAL_X && Blks[1].pos[1] === CLR_GOAL_Y && !clrAni && !clr) {
        if (snd_miracle && !MrflshAniAct && !clr_Mrplayed) {
	    snd_miracle.currentTime = 0; snd_miracle.play(); clr_Mrplayed = true;
        }
    }
    requestAnimationFrame(mainLoop);
}

let puzzleCanvas, pctx;
let isMouseOverCanvas = false; // マウスがcanvas上にあるかを追跡するフラグ

window.onload = async function() {
    document.getElementById('close-modal').addEventListener('click', () => {
        document.getElementById('modal').classList.remove('is-active');
    });
    puzzleCanvas = document.getElementById('puzzlecanvas');
    pctx = puzzleCanvas.getContext("2d");
    puzzleCanvas.width  = SCRN_W;
    puzzleCanvas.height = SCRN_H;
    initGameState();

    await loadAllResources();

    puzzleCanvas.addEventListener("mouseenter", () => isMouseOverCanvas = true);
    puzzleCanvas.addEventListener("mouseleave", () => isMouseOverCanvas = false);

    window.addEventListener("keydown", (e) => {
	const modal = document.getElementById('modal');
        if ((e.key === "m" || e.key === "M") ) {
            modal.classList.toggle('is-active');
        }
    });

    puzzleCanvas.addEventListener("mousedown", onMouseDown);
    puzzleCanvas.addEventListener("mousemove", onMouseMove);
    puzzleCanvas.addEventListener("mouseup", onMouseUp);
    mainLoop();
}
