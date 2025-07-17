// Minfilia JS version.1.0
// SAVE THE ORACLE (Web Edition)
const CELL = 100;
const W = 4, H = 5;
const GOAL_X = 1, GOAL_Y = 3;
const CLR_GOAL_X = 1, CLR_GOAL_Y = 5;
const BLK_BRDR = 1;
const WALL = CELL;
const SCRN_W = W * CELL + WALL * 2 + BLK_BRDR;
const SCRN_H = H * CELL + WALL * 2 + BLK_BRDR;

// 色
const GOAL_COL = "#00FF00";
const BLK_COL = "#1564C8";
const SBLK_COL = "#C8C819";
const WALL_COL = "#C8C8C8";
const FLR_COL = "#0A0A0A";
const ORACLE_COL = "#C8C8B4";
const TXT_DARK = "#002828";
const TXT_LIGHT = "#FFFFFF";
const CLR_TXT_COL = TXT_LIGHT;

// 画像ファイル名
const ORACLE_IMG_U = "ryneU.png";
const ORACLE_IMG_D = "ryneD.png";
const ORACLE_IMG_L = "ryneL.png";
const ORACLE_IMG_R = "ryneR.png";
const WALL_IMG = "wall3.png";
const BTN_IMG_FILE = "miracle.png";
const RETRY_BTN_IMG_FILE = "retry.png";
const IMG_PAT = "block{bid}.png";

// Miracle Flash
const MIRACLE_FLASH_ROTATION_DURATION = 500;
const MIRACLE_FLASH_BUST_DELAY = 200;
const FLASH_EFFECT_DURATION = 20;
const FLASH_COLOR = "rgba(255,255,200,";

// ゲーム初期状態
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

// グローバル変数
let board, blks, imgs, ani_idx, selected, pre_clr, clr_ani_act, clr_ani_start_time, clr, is_dragging, drag_start_mouse_pos, drag_start_blk_pos;
let miracle_btn_used, miracle_flash_ani_active, miracle_flash_phase, miracle_flash_phase_start_time, miracle_flash_blocks_to_bust;
let flash_effect_active, flash_effect_start_time, clr_miracle_played;
let ORACLE_IMG_IDX = {};
let canvas, ctx;
let btn_img = null, retry_btn_img = null, wall_img = null;

// サウンド
let snd_select, snd_move, snd_miracle, snd_clr;

// 画像ロード
function loadImage(src) {
    return new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = "images/" + src;
    });
}

// サウンドロード
function loadSound(src) {
    const audio = new window.Audio("sounds/" + src);
    return audio;
}

// 初期化
async function loadAllResources() {
    // Oracle画像
    imgs = {};
    ani_idx = {};
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
        ani_idx[bid] = 0;
    }
    btn_img = await loadImage(BTN_IMG_FILE);
    retry_btn_img = await loadImage(RETRY_BTN_IMG_FILE);
    wall_img = await loadImage(WALL_IMG);

    // サウンド
    snd_select = loadSound("select.wav");
    snd_move = loadSound("move.wav");
    snd_miracle = loadSound("miracle.wav");
    snd_clr = loadSound("clear.wav");
}

// ゲーム状態初期化
function initGameState() {
    board = INIT_BOARD.map(row => row.slice());
    blks = {};
    for (let k in INIT_BLKS) blks[k] = {size: [...INIT_BLKS[k].size], pos: [...INIT_BLKS[k].pos]};
    ani_idx = {};
    for (let k in blks) ani_idx[k] = 0;
    selected = board[0][0] || 1;
    pre_clr = false;
    clr_ani_act = false;
    clr_ani_start_time = 0;
    clr = false;
    is_dragging = false;
    drag_start_mouse_pos = [0,0];
    drag_start_blk_pos = [0,0];
    miracle_btn_used = false;
    miracle_flash_ani_active = false;
    miracle_flash_phase = 0;
    miracle_flash_phase_start_time = 0;
    miracle_flash_blocks_to_bust = [];
    flash_effect_active = false;
    flash_effect_start_time = 0;
    clr_miracle_played = false;
}

// 描画
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
        // クリアアニメ
        if (clr_ani_act && bid == 1) {
            let elapsed = performance.now() - clr_ani_start_time;
            if (elapsed < 500) {
                let progress = elapsed / 500;
                let startY = GOAL_Y * CELL + offset_y;
                let endY = 5 * CELL + offset_y;
                y = startY + (endY - startY) * progress;
            } else {
                y = 5 * CELL + offset_y;
            }
            ani_idx[1] = ORACLE_IMG_IDX["down"] || 0;
        }
        // ミラクルフラッシュ回転
        else if (miracle_flash_ani_active && bid == 1 && miracle_flash_phase == 1) {
            let elapsed = performance.now() - miracle_flash_phase_start_time;
            let num_frames = 4;
            let frame_duration = MIRACLE_FLASH_ROTATION_DURATION / num_frames;
            let idx = Math.floor((elapsed / frame_duration) % num_frames);
            let keys = ["up", "left", "down", "right"];
            ani_idx[1] = ORACLE_IMG_IDX[keys[idx]] || 0;
        }
        let img = imgs[bid][ani_idx[bid]] || null;
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
    if (!clr_ani_act) {
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
    if (flash_effect_active) {
        let elapsed = performance.now() - flash_effect_start_time;
        if (elapsed < FLASH_EFFECT_DURATION) {
            let alpha = Math.max(0, 1.0 - elapsed / FLASH_EFFECT_DURATION);
            ctx.fillStyle = FLASH_COLOR + (alpha * 0.7) + ")";
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

// ゲームロジック
function canMove(bid, d) {
    if (miracle_flash_ani_active) return false;
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
    if (miracle_flash_ani_active) return;
    let [bx, by] = blks[bid].pos;
    let [bw, bh] = blks[bid].size;
    for (let y=0; y<bh; ++y) for (let x=0; x<bw; ++x) board[by+y][bx+x] = 0;
    let [dx, dy] = {up:[0,-1], down:[0,1], left:[-1,0], right:[1,0]}[d];
    let nx = bx + dx, ny = by + dy;
    blks[bid].pos = [nx, ny];
    for (let y=0; y<bh; ++y) for (let x=0; x<bw; ++x) board[ny+y][nx+x] = parseInt(bid);
    if (bid == 1 && imgs[1] && d in ORACLE_IMG_IDX) ani_idx[1] = ORACLE_IMG_IDX[d];
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
    delete ani_idx[bid];
    if (snd_select) snd_select.currentTime = 0, snd_select.play();
    flash_effect_active = true;
    flash_effect_start_time = performance.now();
    return true;
}

function activateMiracleFlash() {
    if (miracle_flash_ani_active) return;
    miracle_btn_used = true;
    miracle_flash_ani_active = true;
    miracle_flash_phase = 1;
    miracle_flash_phase_start_time = performance.now();
    let oracle_bid = 1;
    miracle_flash_blocks_to_bust = Object.keys(blks).filter(bid => bid != oracle_bid);
    for (let i = miracle_flash_blocks_to_bust.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [miracle_flash_blocks_to_bust[i], miracle_flash_blocks_to_bust[j]] = [miracle_flash_blocks_to_bust[j], miracle_flash_blocks_to_bust[i]];
    }
    ani_idx[1] = ORACLE_IMG_IDX["down"] || 0;
    if (snd_miracle) snd_miracle.currentTime = 0, snd_miracle.play();
}

function startClrAni() {
    clr_ani_act = true;
    clr_ani_start_time = performance.now();
    if (snd_clr) snd_clr.currentTime = 0, snd_clr.play();
}

// イベント
function onMouseDown(e) {
    let rect = canvas.getBoundingClientRect();
    let mouse_x = e.clientX - rect.left, mouse_y = e.clientY - rect.top;
    // Retry
    let retryRect = [SCRN_W-20-CELL, SCRN_H-20-CELL, CELL, CELL];
    if (mouse_x >= retryRect[0] && mouse_x <= retryRect[0]+CELL && mouse_y >= retryRect[1] && mouse_y <= retryRect[1]+CELL) {
        initGameState();
        loadAllResources().then(drawAll);
        return;
    }
    if (!(clr_ani_act || (blks[1] && blks[1].pos[0] == CLR_GOAL_X && blks[1].pos[1] == CLR_GOAL_Y) || miracle_flash_ani_active)) {
        // ブロック選択
        let grid_x = Math.floor((mouse_x - (WALL + BLK_BRDR/2)) / CELL);
        let grid_y = Math.floor((mouse_y - (WALL + BLK_BRDR/2 - CELL*0.5)) / CELL);
        if (0 <= grid_x && grid_x < W && 0 <= grid_y && grid_y < H) {
            let clicked_bid = board[grid_y][grid_x];
            if (clicked_bid !== 0) {
                if (selected != clicked_bid && snd_select) snd_select.currentTime = 0, snd_select.play();
                selected = clicked_bid;
                is_dragging = true;
                drag_start_mouse_pos = [mouse_x, mouse_y];
                drag_start_blk_pos = [...blks[selected].pos];
            }
        }
        // Miracle
        let btnRect = [20, SCRN_H-20-CELL, CELL, CELL];
        if (mouse_x >= btnRect[0] && mouse_x <= btnRect[0]+CELL && mouse_y >= btnRect[1] && mouse_y <= btnRect[1]+CELL) {
            activateMiracleFlash();
        }
    }
}
function onMouseMove(e) {
    if (!is_dragging || !selected || clr_ani_act || (blks[1] && blks[1].pos[0] == CLR_GOAL_X && blks[1].pos[1] == CLR_GOAL_Y) || miracle_flash_ani_active) return;
    let rect = canvas.getBoundingClientRect();
    let mouse_x = e.clientX - rect.left, mouse_y = e.clientY - rect.top;
    let [start_x, start_y] = drag_start_mouse_pos;
    let delta_x = mouse_x - start_x, delta_y = mouse_y - start_y;
    let drag_threshold = CELL * 0.7;
    let moved_direction = null;
    if (Math.abs(delta_x) > drag_threshold) moved_direction = delta_x > 0 ? "right" : "left";
    if (Math.abs(delta_y) > drag_threshold && Math.abs(delta_y) > Math.abs(delta_x)) moved_direction = delta_y > 0 ? "down" : "up";
    if (moved_direction) {
        if (pre_clr && selected == 1 && moved_direction == "down") startClrAni();
        else if (canMove(selected, moved_direction)) {
            move(selected, moved_direction);
            drag_start_mouse_pos = [mouse_x, mouse_y];
            drag_start_blk_pos = [...blks[selected].pos];
        } else {
            drag_start_mouse_pos = [mouse_x, mouse_y];
            drag_start_blk_pos = [...blks[selected].pos];
        }
    }
}
function onMouseUp(e) { is_dragging = false; }

// ゲームループ
function updateGameState() {
    let now = performance.now();
    // クリアアニメ
    if (clr_ani_act) {
        let elapsed = now - clr_ani_start_time;
        if (elapsed >= 500) {
            clr_ani_act = false;
            blks[1].pos = [CLR_GOAL_X, CLR_GOAL_Y];
            clr = true;
        }
    }
    // Miracle Flash
    if (miracle_flash_ani_active) {
        let elapsed = now - miracle_flash_phase_start_time;
        if (miracle_flash_phase == 1 && elapsed >= MIRACLE_FLASH_ROTATION_DURATION) {
            if (miracle_flash_blocks_to_bust.length) {
                miracle_flash_phase = 2;
                miracle_flash_phase_start_time = now;
                ani_idx[1] = ORACLE_IMG_IDX["down"] || 0;
            } else {
                miracle_flash_ani_active = false;
            }
        } else if (miracle_flash_phase == 2 && elapsed >= MIRACLE_FLASH_BUST_DELAY) {
            if (miracle_flash_blocks_to_bust.length) {
                let bid = miracle_flash_blocks_to_bust.shift();
                blkBuster(bid);
                if (miracle_flash_blocks_to_bust.length) {
                    miracle_flash_phase = 1;
                    miracle_flash_phase_start_time = now;
                } else {
                    miracle_flash_ani_active = false;
                }
            } else {
                miracle_flash_ani_active = false;
            }
        }
    }
    // フラッシュ
    if (flash_effect_active) {
        let elapsed = now - flash_effect_start_time;
        if (elapsed >= FLASH_EFFECT_DURATION) flash_effect_active = false;
    }
}

function mainLoop() {
    updateGameState();
    drawAll();
    // クリア判定
    if (blks[1] && blks[1].pos[0] === GOAL_X && blks[1].pos[1] === GOAL_Y && !pre_clr && !clr_ani_act) pre_clr = true;
    if (blks[1] && blks[1].pos[0] === CLR_GOAL_X && blks[1].pos[1] === CLR_GOAL_Y && !clr_ani_act && !clr) {
        if (snd_miracle && !miracle_flash_ani_active && !clr_miracle_played) {
            snd_miracle.currentTime = 0; snd_miracle.play(); clr_miracle_played = true;
        }
    }
    requestAnimationFrame(mainLoop);
}

// 初期化
window.onload = async function() {
    canvas = document.getElementById("gamecanvas");
    ctx = canvas.getContext("2d");
    canvas.width = SCRN_W;
    canvas.height = SCRN_H;
    ctx.font = '24px Arial';
    ctx.fillText('Puzzle Game (JS)', 25, 100);

    if (outputDiv) {
        outputDiv.innerHTML = "<p>Save The Oracle</p>";
    } else {
        console.error("Output div not found!");
    }
   //initGameState();
   //await loadAllResources();
    //canvas.addEventListener("mousedown", onMouseDown);
    //canvas.addEventListener("mousemove", onMouseMove);
    //canvas.addEventListener("mouseup", onMouseUp);
    //mainLoop();
};

/*
document.addEventListener("DOMContentLoaded", function () {
    const canvas = document.getElementById('gameCanvas');
    if ( ! canvas || ! canvas.getContext ) {return false;}
    const ctx = canvas.getContext('2d');
    canvas.width = SCRN_W;
    canvas.height = SCRN_H;
    ctx.font = '24px Arial';
    ctx.fillText('Puzzle Game (JS)', 25, 100);
    ctx.beginPath();
    ctx.moveTo(50, 50);
    ctx.lineTo(150, 50);
    ctx.lineTo(150, 150);
    ctx.lineTo(50, 150);
    ctx.closePath();
    ctx.stroke();
    const outputDiv = document.getElementById("output");
    if (outputDiv) {
        outputDiv.innerHTML = "<p>Hello, World!</p>";
    } else {
        console.error("Output div not found!");
    }
});

*/
