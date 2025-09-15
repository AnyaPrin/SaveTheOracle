// Minfilia JS version.1.1.2  SAVE THE ORACLE Web Edition
const CELL = 100;
const W = 4, H = 5;
const GOAL_X = 1, GOAL_Y = 3;
const CLR_GOAL_X = 1, CLR_GOAL_Y = 5;
const BLK_BRDR = 8;

const WALL = CELL;
const SCRN_W = W * CELL + WALL * 2 + BLK_BRDR;
const SCRN_H = H * CELL + WALL * 2 + BLK_BRDR;

const BDOFFX = WALL + BLK_BRDR/2;
const BDOFFY = WALL + BLK_BRDR/2 - CELL/2;
const BDRECT = [0, 0, SCRN_W, SCRN_H];

const SELECTEDCOL = "rgba(215,225,2,0.5)"; 
const TRANSPARENT = "rgba(0,0,0,0)";

const GOAL_COL = "#00FF00";
const BLK_COL = "#1564C8";

const WALL_COL = "#C8C8C8";
const FLR_COL = "#0A0A0A";  // floor
const ORCL_COL = "#C8C8B4";
const TXT_DARK = "#002828";
const TXT_LIGHT = "#FFFFFF";
const CLR_TXT_COL = "#54A5FF";

const S_BLK_SIZ = 25;
const S_BRDR = 4;
const S_OFS_X = 2;
const S_OFS_Y = 2;
const S_BDOFFX = 2;
const S_BDOFFY = 2;
const S_BOARD_W = 4 * S_BLK_SIZ + S_BRDR * 2;
const S_BOARD_H = 5 * S_BLK_SIZ + S_BRDR * 2;
const S_BOARD_X = 0;
const S_BOARD_Y = SCRN_H - S_BOARD_H;

const FLSH_EFF_DUR = 1000;
const FLSH_PH_DUR = 100;
let FlshEffST;
let FlshEffAct = false;
let MrflshAniAct = false;
let MrflshPhST = 0;
let MrflshPh = 0;
let MrflshBlkBust = [];
let clrAni = false;
let clr = false;
let PClr = false;
let clr_Mrplayed = false;

const PUZZLE_FONT = '24px "PixelMplus10", sans-serif';
const PUZZLE_FONT_TITLE = '36px "PixelMplus10", sans-serif';
const PUZZLE_FONT_SUB = '18px "PixelMplus10", sans-serif';

const Blks = [
    {id:0, size:[1,1], pos:[1,4], color:"#82E282", name:"empty", type:"empty", state: "normal"},
    {id:1, size:[2,2], pos:[1,0], color:ORCL_COL, name:"oracle", type:"oracle", state: "normal"}, // 主人公
    {id:2, size:[2,1], pos:[1,2], color:BLK_COL, name:"a", type:"block", state: "normal"},
    {id:3, size:[2,1], pos:[1,3], color:BLK_COL, name:"b", type:"block", state: "normal"},
    {id:4, size:[1,2], pos:[0,0], color:BLK_COL, name:"c", type:"block", state: "normal"},
    {id:5, size:[1,2], pos:[3,0], color:BLK_COL, name:"d", type:"block", state: "normal"},
    {id:6, size:[1,2], pos:[0,2], color:BLK_COL, name:"e", type:"block", state: "normal"},
    {id:7, size:[1,2], pos:[3,2], color:BLK_COL, name:"f", type:"block", state: "normal"},
    {id:8, size:[1,1], pos:[0,4], color:BLK_COL, name:"g", type:"block", state: "normal"},
    {id:9, size:[1,1], pos:[3,4], color:BLK_COL, name:"h", type:"block", state: "normal"}
];

let board = Array.from(new Array(W), () => new Array(H).fill(null));
let selectedBlk = null;

// Audio
const snd_move = new Audio('sound/se_move.wav');
const snd_error = new Audio('sound/se_error.wav');
const snd_select = new Audio('sound/se_select.wav');
const snd_ok = new Audio('sound/se_ok.wav');
const snd_cancel = new Audio('sound/se_cancel.wav');
const snd_title = new Audio('sound/bgm_title.mp3');
const snd_game = new Audio('sound/bgm_game.mp3');
const snd_miracle = new Audio('sound/se_miracle.mp3');

// Canvas context
const puzzleCanvas = document.getElementById('puzzlecanvas');
const ctx = puzzleCanvas.getContext('2d');
puzzleCanvas.width = SCRN_W;
puzzleCanvas.height = SCRN_H;

window.onload = function () {
    // initialize board
    Blks.forEach(blk => {
        for(let i = 0; i < blk.size[0]; i++) {
            for(let j = 0; j < blk.size[1]; j++) {
                board[blk.pos[0]+i][blk.pos[1]+j] = blk.id;
            }
        }
    });
    // Start game loop
    mainLoop();
}

puzzleCanvas.addEventListener('mousedown', function(event) {
    const rect = puzzleCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left - BDOFFX;
    const y = event.clientY - rect.top - BDOFFY;
    
    let cellX = Math.floor(x / CELL);
    let cellY = Math.floor(y / CELL);
    
    if (cellX >= 0 && cellX < W && cellY >= 0 && cellY < H) {
        let blkId = board[cellX][cellY];
        if (blkId !== null) {
            selectedBlk = Blks[blkId];
            if (snd_select) {
                snd_select.currentTime = 0;
                snd_select.play();
            }
        }
    }
});

puzzleCanvas.addEventListener('mouseup', function(event) {
    if (!selectedBlk) return;
    
    const rect = puzzleCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left - BDOFFX;
    const y = event.clientY - rect.top - BDOFFY;
    
    let cellX = Math.floor(x / CELL);
    let cellY = Math.floor(y / CELL);
    
    if (cellX >= 0 && cellX < W && cellY >= 0 && cellY < H) {
        let oldPos = [...selectedBlk.pos];
        let dx = cellX - oldPos[0];
        let dy = cellY - oldPos[1];
        
        let moved = false;
        
        if (selectedBlk.size[0] === 1 && selectedBlk.size[1] === 1) { // 1x1 
            if (Math.abs(dx) + Math.abs(dy) === 1) {
                if (board[cellX][cellY] === 0) {
                    swapBlocks(selectedBlk, Blks[0]);
                    moved = true;
                }
            }
        } else if (selectedBlk.size[0] > 1 && dx !== 0 && dy === 0) { // 横長
             if (Math.abs(dx) === 1) {
                let targetX = dx > 0 ? oldPos[0] + selectedBlk.size[0] : oldPos[0] - 1;
                let emptyFound = true;
                for (let i = 0; i < selectedBlk.size[1]; i++) {
                    if (targetX < 0 || targetX >= W || board[targetX][oldPos[1] + i] !== 0) {
                        emptyFound = false;
                        break;
                    }
                }
                if (emptyFound) {
                    moveBlock(selectedBlk, dx, 0);
                    moved = true;
                }
            }
        } else if (selectedBlk.size[1] > 1 && dy !== 0 && dx === 0) { // 縦長
            if (Math.abs(dy) === 1) {
                let targetY = dy > 0 ? oldPos[1] + selectedBlk.size[1] : oldPos[1] - 1;
                let emptyFound = true;
                for (let i = 0; i < selectedBlk.size[0]; i++) {
                    if (targetY < 0 || targetY >= H || board[oldPos[0] + i][targetY] !== 0) {
                        emptyFound = false;
                        break;
                    }
                }
                if (emptyFound) {
                    moveBlock(selectedBlk, 0, dy);
                    moved = true;
                }
            }
        }

        if (moved) {
            if (snd_move) {
                snd_move.currentTime = 0;
                snd_move.play();
            }
        } else {
            if (snd_error) {
                snd_error.currentTime = 0;
                snd_error.play();
            }
        }
    }
    selectedBlk = null;
});

function moveBlock(blk, dx, dy) {
    // Clear old positions
    for (let i = 0; i < blk.size[0]; i++) {
        for (let j = 0; j < blk.size[1]; j++) {
            board[blk.pos[0] + i][blk.pos[1] + j] = null;
        }
    }
    // Update new position
    blk.pos[0] += dx;
    blk.pos[1] += dy;
    // Set new positions
    for (let i = 0; i < blk.size[0]; i++) {
        for (let j = 0; j < blk.size[1]; j++) {
            board[blk.pos[0] + i][blk.pos[1] + j] = blk.id;
        }
    }
}

function swapBlocks(blk1, blk2) {
    let pos1 = [...blk1.pos];
    let pos2 = [...blk2.pos];

    moveBlock(blk1, pos2[0] - pos1[0], pos2[1] - pos1[1]);
    moveBlock(blk2, pos1[0] - pos2[0], pos1[1] - pos2[1]);
}

function updateGameState() {
    // 状態更新ロジックをここに
    // 例えば、アニメーションやゲームの状態遷移など
}

function getMovableBlocksCount() {
    let movableCount = 0;
    const emptyPos = Blks[0].pos; // 空きスペースの座標
    
    // 全ての駒をチェック
    for (let i = 1; i < Blks.length; i++) {
        const blk = Blks[i];
        
        // 駒の左右にある空きスペースをチェック
        // 左側
        if (blk.pos[0] > 0 && blk.size[0] === 1 && emptyPos[0] === blk.pos[0] - 1 && emptyPos[1] === blk.pos[1]) {
            movableCount++;
        }
        // 右側
        if (blk.pos[0] + blk.size[0] < W && blk.size[0] === 1 && emptyPos[0] === blk.pos[0] + 1 && emptyPos[1] === blk.pos[1]) {
            movableCount++;
        }
        
        // 駒の上下にある空きスペースをチェック
        // 上側
        if (blk.pos[1] > 0 && blk.size[1] === 1 && emptyPos[1] === blk.pos[1] - 1 && emptyPos[0] === blk.pos[0]) {
            movableCount++;
        }
        // 下側
        if (blk.pos[1] + blk.size[1] < H && blk.size[1] === 1 && emptyPos[1] === blk.pos[1] + 1 && emptyPos[0] === blk.pos[0]) {
            movableCount++;
        }

        // 2x1ブロックの左右移動
        if (blk.size[0] === 2 && blk.size[1] === 1) {
            // 左に移動可能か
            if (blk.pos[0] > 0 && board[blk.pos[0] - 1][blk.pos[1]] === 0) {
                movableCount++;
            }
            // 右に移動可能か
            if (blk.pos[0] + blk.size[0] < W && board[blk.pos[0] + blk.size[0]][blk.pos[1]] === 0) {
                movableCount++;
            }
        }
        // 1x2ブロックの上下移動
        if (blk.size[0] === 1 && blk.size[1] === 2) {
            // 上に移動可能か
            if (blk.pos[1] > 0 && board[blk.pos[0]][blk.pos[1] - 1] === 0) {
                movableCount++;
            }
            // 下に移動可能か
            if (blk.pos[1] + blk.size[1] < H && board[blk.pos[0]][blk.pos[1] + blk.size[1]] === 0) {
                movableCount++;
            }
        }

        // 2x2ブロックの移動
        if (blk.size[0] === 2 && blk.size[1] === 2) {
             // 左に移動可能か
            if (blk.pos[0] > 0 && board[blk.pos[0] - 1][blk.pos[1]] === 0 && board[blk.pos[0] - 1][blk.pos[1] + 1] === 0) {
                movableCount++;
            }
            // 右に移動可能か
            if (blk.pos[0] + blk.size[0] < W && board[blk.pos[0] + blk.size[0]][blk.pos[1]] === 0 && board[blk.pos[0] + blk.size[0]][blk.pos[1] + 1] === 0) {
                movableCount++;
            }
             // 上に移動可能か
            if (blk.pos[1] > 0 && board[blk.pos[0]][blk.pos[1] - 1] === 0 && board[blk.pos[0] + 1][blk.pos[1] - 1] === 0) {
                movableCount++;
            }
            // 下に移動可能か
            if (blk.pos[1] + blk.size[1] < H && board[blk.pos[0]][blk.pos[1] + blk.size[1]] === 0 && board[blk.pos[0] + 1][blk.pos[1] + blk.size[1]] === 0) {
                movableCount++;
            }
        }
    }
    
    return movableCount;
}

function drawAll() {
    ctx.clearRect(0, 0, SCRN_W, SCRN_H);
    ctx.fillStyle = FLR_COL;
    ctx.fillRect(0, 0, SCRN_W, SCRN_H);

    // draw wall
    ctx.fillStyle = WALL_COL;
    ctx.fillRect(0, 0, SCRN_W, WALL);
    ctx.fillRect(0, SCRN_H - WALL, SCRN_W, WALL);
    ctx.fillRect(0, 0, WALL, SCRN_H);
    ctx.fillRect(SCRN_W - WALL, 0, WALL, SCRN_H);

    // draw goal
    ctx.fillStyle = GOAL_COL;
    ctx.fillRect(BDOFFX + GOAL_X * CELL, BDOFFY + GOAL_Y * CELL, Blks[1].size[0] * CELL, Blks[1].size[1] * CELL);

    // draw blocks
    Blks.forEach(blk => {
        if (blk.type !== "empty") {
            ctx.fillStyle = blk.color;
            ctx.fillRect(BDOFFX + blk.pos[0] * CELL, BDOFFY + blk.pos[1] * CELL, blk.size[0] * CELL - BLK_BRDR, blk.size[1] * CELL - BLK_BRDR);
            
            // Draw highlight if selected
            if (selectedBlk && selectedBlk.id === blk.id) {
                ctx.fillStyle = SELECTEDCOL;
                ctx.fillRect(BDOFFX + blk.pos[0] * CELL, BDOFFY + blk.pos[1] * CELL, blk.size[0] * CELL - BLK_BRDR, blk.size[1] * CELL - BLK_BRDR);
            }
        }
    });

    // Draw the "freedom" count
    ctx.fillStyle = TXT_LIGHT;
    ctx.font = PUZZLE_FONT;
    ctx.fillText(`自由度: ${getMovableBlocksCount()}`, WALL, SCRN_H - WALL + 40);
}

function updateGameState() {
    // 状態更新ロジックをここに
    // 例えば、アニメーションやゲームの状態遷移など
}

function mainLoop() {
    updateGameState();
    drawAll();
    // judge Clear
    if (Blks[1] && Blks[1].pos[0] === GOAL_X && Blks[1].pos[1] === GOAL_Y && !PClr && !clrAni) PClr = true;
    if (Blks[1] && Blks[1].pos[0] === CLR_GOAL_X && Blks[1].pos[1] === CLR_GOAL_Y && !clrAni && !clr) {
        if (snd_miracle && !MrflshAniAct && !clr_Mrplayed) {
            snd_miracle.currentTime = 0; snd_miracle.play(); clr_Mrplayed = true;
        }
    }
    requestAnimationFrame(mainLoop);
}

window.onload = function () {
    // initialize board
    Blks.forEach(blk => {
        for(let i = 0; i < blk.size[0]; i++) {
            for(let j = 0; j < blk.size[1]; j++) {
                board[blk.pos[0]+i][blk.pos[1]+j] = blk.id;
            }
        }
    });
    // Start game loop
    mainLoop();
}
