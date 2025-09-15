// Minfilia JS version.1.0  SAVE THE ORACLE Web Edition
const CELL = 100;
const W = 4, H = 5;
const GOAL_X = 1, GOAL_Y = 3;
const CLR_GOAL_X = 1, CLR_GOAL_Y = 5;
const BLK_BRDR = 1;
const WALL = CELL;
const SCRN_W = W * CELL + WALL * 2 + BLK_BRDR;
const SCRN_H = H * CELL + WALL * 2 + BLK_BRDR;

const GOAL_COL = "#00FF00";
const BLK_COL = "#1564C8";
const SBLK_COL = "#C8C819"; // 
const WALL_COL = "#C8C8C8";
const FLR_COL = "#0A0A0A";  // floor
const ORACLE_COL = "#C8C8B4";
const TXT_DARK = "#002828";
const TXT_LIGHT = "#FFFFFF";
const CLR_TXT_COL = TXT_LIGHT;

const ORACLE_IMG_U = "oU.png";
const ORACLE_IMG_D = "oD.png";
const ORACLE_IMG_L = "oL.png";
const ORACLE_IMG_R = "oR.png";
const WALL_IMG = "wall3.png";
const BTN_IMG_FILE = "miracle.png";
const RETRY_BTN_IMG_FILE = "retry.png";
const IMG_PAT = "block{bid}.png";

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
let ORACLE_IMG_IDX = {};
let canvas, ctx;
let btn_img = null, retry_btn_img = null, wall_img = null;
// sound
let snd_select, snd_move, snd_miracle, snd_clr;

// 
const intDiv = (a, b) => Math.floor(a / b + 1e-9);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function loadImage(src) {
    return new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = "img/" + src;
    });
}

function loadSound(src) {
    const audio = new window.Audio("snd/" + src);
    return audio;
}

async function loadAllResources() {
    imgs = {};
    aniIdx = {};
    ORACLE_IMG_IDX = {};
    for (let bid in INIT_BLKS) {
        bid = parseInt(bid);
        let blk_imgs = [];
        if (bid === 1) {
            const files = [ORACLE_IMG_U, ORACLE_IMG_D, ORACLE_IMG_L, ORACLE_IMG_R];
            for (let i = 0; i < files.length; ++i) {
                let img = await loadImage(files[i]);
                blk_imgs.push(img);
                if (files[i] === ORACLE_IMG_U) ORACLE_IMG_IDX["up"] = i;
                if (files[i] === ORACLE_IMG_D) ORACLE_IMG_IDX["down"] = i;
                if (files[i] === ORACLE_IMG_L) ORACLE_IMG_IDX["left"] = i;
                if (files[i] === ORACLE_IMG_R) ORACLE_IMG_IDX["right"] = i;
            }
        } else {
            let img = await loadImage(IMG_PAT.replace("{bid}", bid));
            blk_imgs.push(img);
        }
        imgs[bid] = blk_imgs;
        aniIdx[bid] = 0;
    }
    btn_img = await loadImage(BTN_IMG_FILE);
    retry_btn_img = await loadImage(RETRY_BTN_IMG_FILE);
    wall_img = await loadImage(WALL_IMG);

    snd_select = loadSound("select.wav");
    snd_move = loadSound("move.wav");
    snd_miracle = loadSound("miracle.wav");
    snd_clr = loadSound("clear.wav");
}


function initGameState() {
    board = INIT_BOARD.map(row => row.slice());
    blks = {};
    for (let k in INIT_BLKS) blks[k] = {size: [...INIT_BLKS[k].size], pos: [...INIT_BLKS[k].pos]};
    aniIdx = {};
    for (let k in blks) aniIdx[k] = 0;
    selected = board[0][0] || 1;
    PClr = false;
    clrAni = false;
    clrAniSTM = 0;
    clr = false;
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

function drawAll() {
    ctx.fillStyle = FLR_COL;
    ctx.fillRect(0, 0, SCRN_W, SCRN_H);
    if (wall_img) ctx.drawImage(wall_img, 0, 0, SCRN_W, SCRN_H);

    drawBlocks(WALL + BLK_BRDR/2, WALL + BLK_BRDR/2 - CELL/2);
    drawButtons();
    drawEffects();
    drawMessage();
}

function drawBlocks(offset_x, offset_y) {
    for (let bid in blks) {
        let info = blks[bid];
        let [bx, by] = info.pos;
        let [bw, bh] = info.size;
        let x = bx * CELL + offset_x, y = by * CELL + offset_y;
        if (clrAni && bid == 1) {
            let elapsed = performance.now() - clrAniSTM;
            if (elapsed < 500) {
                let progress = elapsed / 500;
                let startY = GOAL_Y * CELL + offset_y;
                let endY = 5 * CELL + offset_y;
                y = startY + (endY - startY) * progress;
            } else {
                y = 5 * CELL + offset_y;
            }
            aniIdx[1] = ORACLE_IMG_IDX["down"] || 0;
        } else if (MrflshAniAct && bid == 1 && MrflshPh == 1) {
        // rotation of miracle flash
            let elapsed = performance.now() - MrflshPhST;
            let num_frames = 4;
            let frame_duration = MRFLSH_ROT_DUR / num_frames;
            let idx = Math.floor((elapsed / frame_duration) % num_frames);
            let keys = ["up", "left", "down", "right"];
            aniIdx[1] = ORACLE_IMG_IDX[keys[idx]] || 0;
        }
	
        let img = imgs[bid][aniIdx[bid]] || null;
        if (img) {
            ctx.drawImage(img, x, y, bw*CELL, bh*CELL);
            ctx.strokeStyle = selected == bid ? SBLK_COL : "rgba(0,0,0,0)";
            ctx.lineWidth = BLK_BRDR;
            ctx.strokeRect(x, y, bw*CELL, bh*CELL);
        } else {
            ctx.fillStyle = (bid == 1) ? ORACLE_COL : (selected == bid ? SBLK_COL : BLK_COL);
            ctx.fillRect(x, y, bw*CELL, bh*CELL);
            ctx.strokeStyle = FLR_COL;
            ctx.strokeRect(x, y, bw*CELL, bh*CELL);
        }
    }
}

function drawButtons() {
    // Miracle
    if (!clrAni) {
        let btnRect = [20, SCRN_H-20-CELL, CELL, CELL];
        if (btn_img) ctx.drawImage(btn_img, ...btnRect);
        else {
            ctx.fillStyle = "#FAFA96";
            ctx.fillRect(...btnRect);
            ctx.strokeStyle = "#02020C";
            ctx.strokeRect(...btnRect);
            ctx.fillStyle = "#02020C";
            ctx.font = "16px sans-serif";
            ctx.fillText("© SQUARE ENIX", btnRect[0]+10, btnRect[1]+CELL/2);
        }
    }
    // Retry
    let retryRect = [SCRN_W-20-CELL, SCRN_H-20-CELL, CELL, CELL];
    if (retry_btn_img) ctx.drawImage(retry_btn_img, ...retryRect);
    else {
        ctx.fillStyle = "#0A0C78";
        ctx.fillRect(...retryRect);
        ctx.strokeStyle = "#D2D2F0";
        ctx.strokeRect(...retryRect);
        ctx.fillStyle = "#D2D2F0";
        ctx.font = "20px sans-serif";
        ctx.fillText("RETRY", retryRect[0]+20, retryRect[1]+CELL/2);
    }
}

function drawEffects() {
    if (FlshEffAct) {
        let elapsed = performance.now() - FlshEffST;
        if (elapsed < FLSH_EFF_DUR) {
            let alpha = Math.max(0, 1.0 - elapsed / FLSH_EFF_DUR);
            ctx.fillStyle = FLSH_COLOR + (alpha * 0.7) + ")";
            ctx.fillRect(0, 0, SCRN_W, SCRN_H);
        }
    }
}

function drawMessage() {
    ctx.font = "32px sans-serif";
    ctx.textAlign = "center";
    if (blks[1] && blks[1].pos[0] === CLR_GOAL_X && blks[1].pos[1] === CLR_GOAL_Y) {
        ctx.fillStyle = CLR_TXT_COL;
        ctx.fillText("THE ORACLE ESCAPED!", SCRN_W/2, SCRN_H/2 - CELL/2);
    }
}

// game logic
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
    if (bid == 1 && imgs[1] && d in ORACLE_IMG_IDX) aniIdx[1] = ORACLE_IMG_IDX[d];
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
    let oracle_bid = 1;
    MrflshBlkBust = Object.keys(blks).filter(bid => bid != oracle_bid);
    for (let i = MrflshBlkBust.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [MrflshBlkBust[i], MrflshBlkBust[j]] = [MrflshBlkBust[j], MrflshBlkBust[i]];
    }
    aniIdx[1] = ORACLE_IMG_IDX["down"] || 0;
    if (snd_miracle) snd_miracle.currentTime = 0, snd_miracle.play();
}

function startClrAni() {
    clrAni = true;
    clrAniSTM = performance.now();
    if (snd_clr) snd_clr.currentTime = 0, snd_clr.play();
}

function onMouseDown(e) {
    let rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left, y = e.clientY - rect.top;
    let retryRect = [SCRN_W-20-CELL, SCRN_H-20-CELL, CELL, CELL];
    if (x >= retryRect[0] && x <= retryRect[0]+CELL && y >= retryRect[1] && y <= retryRect[1]+CELL) {
        initGameState();
        loadAllResources().then(drawAll);
        return;
    }
    if (!(clrAni || (blks[1] && blks[1].pos[0] == CLR_GOAL_X && blks[1].pos[1] == CLR_GOAL_Y)
	  || MrflshAniAct)) {
        let grid_x = Math.floor((x - (WALL + BLK_BRDR/2 -CELL/2)) / CELL);
        let grid_y = Math.floor((y - (WALL + BLK_BRDR/2 - CELL/2)) / CELL);
        if (0 <= grid_x && grid_x < W && 0 <= grid_y && grid_y < H) {
            let clicked_bid = board[grid_y][grid_x];
            if (clicked_bid !== 0) {
                if (selected != clicked_bid && snd_select) snd_select.currentTime = 0, snd_select.play();
                selected = clicked_bid;
                isDrag = true;
                drag_start_pos = [x, y];
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
function onMouseMove(e) {
    if ( !isDrag || !selected || clrAni
	 || (blks[1] && blks[1].pos[0] == CLR_GOAL_X && blks[1].pos[1] == CLR_GOAL_Y)
	 || MrflshAniAct)
	return;
    let rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left, y = e.clientY - rect.top;
    let [sx, sy] = DSMP;
    let dx = x - sx;
    let dy = y - sy;    
    let dragThld = CELL * 0.7;
    let mD = null;
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
function onMouseUp(e) { isDrag = false; }

// game loop
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
                aniIdx[1] = ORACLE_IMG_IDX["down"] || 0;
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
