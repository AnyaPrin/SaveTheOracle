// Minfilia JS version.1.1.2  SAVE THE ORACLE Web Edition
//
const CELL = 100;
const W = 4, H = 5;
const GOAL_X = 1, GOAL_Y = 3;
const CLR_GOAL_X = 1, CLR_GOAL_Y = 5;
const BLK_BRDR = 10;
const SBLK_COL = "rgba(255,255,100,0.315)"; // 
const WALL = CELL;
const SCRN_W = W * CELL + WALL * 2 + BLK_BRDR;
const SCRN_H = H * CELL + WALL * 2 + BLK_BRDR;

const GOAL_COL = "#00FF00";
const BLK_COL = "#1564C8";
const BLACK = "#000"
const WALL_COL = "#C8C8C8";
const FLR_COL = "#0A0A0A";  // floor
const O_COL = "#C8C8B4";
const TXT_DARK = "#002828";
const TXT_LIGHT = "#FFFFFF";
const CLR_TXT_COL = TXT_LIGHT;

const SPRITE = "img/spritesheet.png" // sprites sheet
const SPRITE_CO = { 
    'ryneD':    { x:    0, y: 0, w: 200, h: 200 },  // 0
    'ryneR':    { x:  200, y: 0, w: 200, h: 200 },  
    'ryneU':    { x:  400, y: 0, w: 200, h: 200 },
    'ryneL':    { x:  600, y: 0, w: 200, h: 200 },
    'b1':   { x:    0, y: 200, w: 100, h: 200 },
    'b2':   { x:  100, y: 200, w: 100, h: 200 },
    'b3':   { x:  200, y: 200, w: 100, h: 200 },        
    'b4':   { x:  300, y: 200, w: 100, h: 200 },
    'b5':   { x:  400, y: 200, w: 200, h: 100 },
    'b6':   { x:  400, y: 300, w: 100, h: 100 },        
    'b7':   { x:  500, y: 300, w: 100, h: 100 },
    'b8':   { x:  600, y: 200, w: 100, h: 100 },
    'b9':   { x:  600, y: 300, w: 100, h: 100 },        
    'retry':    { x:  700, y: 200, w: 100, h: 100 },
    'hint':     { x:  700, y: 300, w: 100, h: 100 },  // for extension in future
    'wall':     { x:    0, y: 400, w: 600, h: 700 },    // background image of grid
    'miracle1': { x:  600, y: 400, w: 100, h: 100 },
    'miracle2': { x:  700, y: 400, w: 100, h: 100 },   // for extension in future
    'sqex1':    { x:  600, y: 500, w: 100, h: 100 },   // for extension in future
    'sqex2':    { x:  700, y: 500, w: 100, h: 100 },   // for extension in future
    'gaia':     { x:  600, y: 600, w: 100, h: 100 },   // for extension in future    
    'sancred':  { x:  700, y: 600, w: 100, h: 100 },   // for extension in future
    'uriendje': { x:  600, y: 700, w: 100, h: 100 },   // for extension in future
    'gaia':     { x:  700, y: 700, w: 100, h: 100 },   // for extension in future    
};

const SND_SEL = 'snd/select.wav'
const SND_MOV = 'snd/move.wav'
const SND_MIR = 'snd/miracle.wav' 
const SND_CLR = 'snd/clear.wav'
const SND_SEL_VOL = 1
const SND_MOV_VOL = 1
const SND_MIR_VOL = 1
const SND_CLR_VOL = 0.8

const MRFLSH_ROT_DUR = 500; // Miracle Flash
const MRFLSH_BUST_DELAY = 200;
const FLSH_EFF_DUR = 20;
const FLSH_COL = "rgba(255,255,200,";

const INIT_BOARD = [
    [2, 1, 1, 3],
    [2, 1, 1, 3],
    [4, 6, 6, 5],
    [4, 9, 10, 5],
    [7, 0, 0, 8]
];

const INIT_BLKS = {
    1: {size: [2,2], pos: [1,0]},
    2: {size: [1,2], pos: [0,0]},
    3: {size: [1,2], pos: [3,0]},
    4: {size: [1,2], pos: [0,2]},
    5: {size: [1,2], pos: [3,2]},
    6: {size: [2,1], pos: [1,2]},
    7: {size: [1,1], pos: [0,4]},
    8: {size: [1,1], pos: [3,4]},
    9: {size: [1,1], pos: [1,3]},
    10: {size: [1,1], pos: [2,3]},
};

let board, blks, imgs, aniIdx, selected, PClr, clrAni, clrAniSTM, clr, isDrag, DSMP, DSBP;
let Mrbtn_used, MrflashAniAct, MrflshPh, MrflshPhST, MrflshBlkBust;
let FlshEffAct, FlshEffST, clr_Mrplayed;
let OIMG_IDX = {};
let canvas, ctx;
let btn_img = null, retry_btn_img = null, wall_img = null;
let snd_select, snd_move, snd_miracle, snd_clr;
const intDiv = (a, b) => Math.floor(a / b + 1e-9);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

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
    const Sprite = await ldSprite(SPRITE);
    const files = ["ryneU", "ryneD", "ryneL", "ryneR"];
    imgs = {};
    OIMG_IDX = {};
    for (let i = 0; i < files.length; ++i) {
	let key = files[i];
	imgs[key] = Sprite;
	OIMG_IDX[key.replace("ryne", "").toLowerCase()] = i;
    }
    for (let bid in INIT_BLKS) {
        if (bid !== '1') {
            let key = `b${bid}`;
            if (SPRITE_CO[key]) {
                imgs[key] = Sprite;
            }
        }
    }
    btn_img = Sprite;
    retry_btn_img = Sprite;
    wall_img = Sprite;
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

function drawBlocks(offx, offy) {
    for (let bid in blks) {
        let info = blks[bid];
        let [bx, by] = info.pos;
        let [bw, bh] = info.size;
        let x = bx * CELL + offx, y = by * CELL + offy;
        let sKey = (bid === '1') ? Object.keys(OIMG_IDX).find(key => OIMG_IDX[key] === AIdx[bid]) : `b${bid}`;
        let s = SPRITE_CO[sKey];
        let img = imgs[sKey];
        if (img && s) {
            ctx.drawImage(img, s.x, s.y, s.w, s.h, x, y, bw*CELL, bh*CELL);
            if (img) {
		ctx.drawImage(img, x, y, bw*CELL, bh*CELL);
		ctx.strokeStyle = selected == bid ? SBLK_COL : BLACK;
		ctx.lineWidth = BLK_BRDR;
		ctx.strokeRect(x+BLK_BRDR/2, y+BLK_BRDR/2, bw*CELL-BLK_BRDR, bh*CELL-BLK_BRDR);
            } else {
		ctx.fillStyle = (bid == 1) ? O_COL : (selected == bid ? SBLK_COL : BLK_COL);
		ctx.fillRect(x, y, bw*CELL, bh*CELL);
		ctx.strokeStyle = FLR_COL;
		ctx.strokeRect(x, y, bw*CELL, bh*CELL);
            }
        }
    }
}

function initGameState() {
    board = INIT_BOARD.map(row => row.slice());
    blks = {};
    for (let k in INIT_BLKS) blks[k] = {size: [...INIT_BLKS[k].size], pos: [...INIT_BLKS[k].pos]};
    imgs={};
    for (let bid in INIT_BLKS) {
	imgs[bid] = [];
    }
    AIdx = {};
    for (let k in blks) AIdx[k] = 0;
    selected = board[0][0] || 1;
    clr = false;    
    PClr = false;
    clrAni = false;
    clrAniSTM = 0;
    isDrag = false;
    DSMP = [0,0];
    DSBP = [0,0];
    Mrbtn_used = false;
    MrflshAniAct = false;
    MrflshPh = 0;
    MrflshPhST = 0;
    MrflshBlkBust = [];
    FlshEffAct = false;
    FlshEffST = 0;
    clr_Mrplayed = false;
}

const toGridXY = (x,y) => {
    let gx = Math.floor((x - (WALL + BLK_BRDR/2 )) / CELL);
    let gy = Math.floor((y - (WALL + BLK_BRDR/2 - CELL * 0.5)) / CELL);
    return {gx,gy};
}

function drawAll() {
    ctx.fillStyle = FLR_COL;
    ctx.fillRect(0, 0, SCRN_W, SCRN_H);
    if (wall_img) ctx.drawImage(wall_img, 0, 0, SCRN_W, SCRN_H);
    drawBlocks(WALL + BLK_BRDR/2, WALL + BLK_BRDR/2 - CELL/2);
    drawButtons();
    drawEffects();
    drawMessage();
}


function drawButtons() {
    let btnRect = [20, SCRN_H-20-CELL, CELL, CELL];
    let alphacolor = "rgba(5,5,5,0.7)";
    ctx.fillStyle = "#FAFA96";
    ctx.fillRect(...btnRect);
    ctx.strokeStyle = "#012345";
    ctx.strokeRect(...btnRect);
    if (btn_img) {
	ctx.drawImage(btn_img, ...btnRect);
    } else {
	ctx.fillStyle = alphacolor;
	ctx.font = "12px sans-serif";
	ctx.fillText("© SQUARE ENIX", btnRect[0]+CELL/2, btnRect[1]+CELL*7/8);
    }
    
    let retryRect = [SCRN_W-20-CELL, SCRN_H-20-CELL, CELL, CELL];
    if (retry_btn_img) {
	ctx.drawImage(retry_btn_img, ...retryRect);
    } else {
        ctx.fillStyle = "#0A0C78";
        ctx.fillRect(...retryRect);
        ctx.strokeStyle = "#D2D2F0";
        ctx.strokeRect(...retryRect);
	ctx.fillStyle = alphacolor;
	ctx.font = "12.5px sans-serif";
	ctx.fillText("RETRY", retryRect[0]+CELL/2, retryRect[1]+CELL*5/7);
    }
}

const drawEffects = () => {
    if (FlshEffAct) {
        let elapsed = performance.now() - FlshEffST;
        if (elapsed < FLSH_EFF_DUR) {
            let alpha = Math.max(0, 1.0 - elapsed / FLSH_EFF_DUR);
            ctx.fillStyle = FLSH_COL + (alpha * 0.7) + ")";
            ctx.fillRect(0, 0, SCRN_W, SCRN_H);
        }
    }
} 

function drawMessage() {
    ctx.font = "32px sans-serif";
    ctx.textAlign = "center";
    if (blks[1] && blks[1].pos[0] === CLR_GOAL_X && blks[1].pos[1] === CLR_GOAL_Y) {

	let w=SCRN_W/2;
	let h=SCRN_H/2-CELL/2;
	let pw=5;
	
	// shadow
	ctx.fillStyle = "rgba(0,0,0,0.5)";
	ctx.fillText("THE ORACLE ESCAPED!", w + pw, h + pw);

	// make pseudo3D-text
	ctx.fillStyle = "rgba(28,28,28,1)";
	pw=1; 
	ctx.fillText("THE ORACLE ESCAPED!", w + pw, h + pw); 

	ctx.fillStyle = CLR_TXT_COL; 
	ctx.fillText("THE ORACLE ESCAPED!", w, h);
	
    }
}

function canMove(bid, d) {
    if (MrflshAniAct) return false;
    let [bx, by] = blks[bid].pos;
    let [bw, bh] = blks[bid].size;
    let [dx, dy] = {up:[0,-1], down:[0,1], left:[-1,0], right:[1,0]}[d];
    let nx = bx + dx, ny = by + dy;
    if (!(0 <= nx && nx <= W-bw && 0 <= ny && ny <= H-bh)) return false;
    for (let y=0; y<bh; ++y) for (let x=0; x<bw; ++x) {
        let tx = nx + x, ty = ny + y;
        if (board[ty][tx] !== 0 && board[ty][tx] !== parseInt(bid)) return false;
    }
    return true;
}

function move(bid, d) {
    if (MrflshAniAct) return;
    let [bx, by] = blks[bid].pos;
    let [bw, bh] = blks[bid].size;
    for (let y=0; y<bh; ++y) for (let x=0; x<bw; ++x) board[by+y][bx+x] = 0;
    let [dx, dy] = {up:[0,-1], down:[0,1], left:[-1,0], right:[1,0]}[d];
    let nx = bx + dx, ny = by + dy;
    blks[bid].pos = [nx, ny];
    for (let y=0; y<bh; ++y) for (let x=0; x<bw; ++x) board[ny+y][nx+x] = parseInt(bid);
    if (bid == 1 && imgs[1] && d in OIMG_IDX) aniIdx[1] = OIMG_IDX[d];
    if (snd_move) snd_move.currentTime = 0, snd_move.play();
}

function blkBuster(bid) {
    if (!(bid in blks) || bid == 1) return false;
    let [bx, by] = blks[bid].pos, [bw, bh] = blks[bid].size;
    for (let y=0; y<bh; ++y) for (let x=0; x<bw; ++x)
        if (0 <= by+y && by+y < H && 0 <= bx+x && bx+x < W && board[by+y][bx+x] == bid)
            board[by+y][bx+x] = 0;
    delete blks[bid];
    delete imgs[bid];
    delete aniIdx[bid];
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
    MrflshBlkBust = Object.keys(blks).filter(bid => bid != obid);
    for (let i = MrflshBlkBust.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [MrflshBlkBust[i], MrflshBlkBust[j]] = [MrflshBlkBust[j], MrflshBlkBust[i]];
    }
    aniIdx[1] = OIMG_IDX["down"] || 0;
    if (snd_miracle) snd_miracle.currentTime = 0, snd_miracle.play();
}

let startClrAni = () => {
    clrAni = true;
    clrAniSTM = performance.now();
    if (snd_clr) snd_clr.currentTime = 0, snd_clr.play();
}

const onMouseDown = (e) => {
    let rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    let { gx, gy } = toGridXY(x, y);    
    let grid_x=gx;
    let grid_y=gy;
    let retryRect = [SCRN_W-20-CELL, SCRN_H-20-CELL, CELL, CELL];
    if (x >= retryRect[0] && x <= retryRect[0]+CELL && y >= retryRect[1] && y <= retryRect[1]+CELL) {
        loadAllResources().then(drawAll);	
        initGameState();
        return;
    }
    if (!(clrAni || (blks[1] && blks[1].pos[0] == CLR_GOAL_X && blks[1].pos[1] == CLR_GOAL_Y)
	  || MrflshAniAct)) {
        if (0 <= grid_x && grid_x < W && 0 <= grid_y && grid_y < H) {
            let clicked_bid = board[grid_y][grid_x];
            if (clicked_bid !== 0) {
                if (selected != clicked_bid && snd_select) snd_select.currentTime = 0, snd_select.play();
                selected = clicked_bid;
                isDrag = true;
                DSMP = [x, y];
                DSBP = [...blks[selected].pos];
            }
        }
        // Miracle
        let btnRect = [20, SCRN_H-20-CELL, CELL, CELL];
        if (x >= btnRect[0] && x <= btnRect[0]+CELL && y >= btnRect[1] && y <= btnRect[1]+CELL) {
            activateMiracleFlsh();
        }
    }
}

const onMouseMove = (e) => {
    if (!isDrag || !selected || clrAni || MrflshAniAct) return;
    if ((blks[1] && blks[1].pos[0] == CLR_GOAL_X && blks[1].pos[1] == CLR_GOAL_Y))
	return;
    let rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    let [sx, sy] = DSMP;
    let dx = x - sx;
    let dy = y - sy;    
    let mD = null;
    let dragThld = CELL * 0.5;
    if (Math.abs(dx) > dragThld) mD = dx > 0 ? "right" : "left";
    if (Math.abs(dy) > dragThld && Math.abs(dy) > Math.abs(dx)) mD = dy > 0 ? "down" : "up";
    if (mD) {
        if (PClr && selected == 1 && mD == "down") startClrAni();
        else if (canMove(selected, mD)) {
            move(selected, mD);
            DSMP = [x, y];
            DSBP = [...blks[selected].pos];
        } else {
            DSMP = [x, y];
            DSBP = [...blks[selected].pos];
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
            blks[1].pos = [CLR_GOAL_X, CLR_GOAL_Y];
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
                aniIdx[1] = OIMG_IDX["down"] || 0;
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
    if (blks[1] && blks[1].pos[0] === GOAL_X && blks[1].pos[1] === GOAL_Y && !PClr && !clrAni) PClr = true;
    if (blks[1] && blks[1].pos[0] === CLR_GOAL_X && blks[1].pos[1] === CLR_GOAL_Y && !clrAni && !clr) {
        if (snd_miracle && !MrflshAniAct && !clr_Mrplayed) {
            snd_miracle.currentTime = 0; snd_miracle.play(); clr_Mrplayed = true;
        }
    }
    requestAnimationFrame(mainLoop);
}

window.onload = async function() {
    canvas = document.getElementById("gamecanvas");
    ctx = canvas.getContext("2d");
    canvas.width = SCRN_W;
    canvas.height = SCRN_H;
    initGameState();
    await loadAllResources();
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    mainLoop();
};
