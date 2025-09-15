// Minfilia JS version.1.2.0  SAVE THE ORACLE Web Edition
const IS_DEBUG = false;

const CELL = 100;
const W = 4, H = 5;
const BRD_LEN = W*H;
const GOAL_X = 1, GOAL_Y = 3;
const CLR_GOAL_X = 1, CLR_GOAL_Y = 5;
const BLK_BRDR = 8;

// --- Thancred Hint System ---
const THANCRED_ID = 7; // Block ID 7 is now Thancred

const WALL = CELL;
let canvas = document.getElementById('puzzlecanvas');
let style = getComputedStyle(canvas);
const SCRN_W = parseInt(style.width);//600
const SCRN_H = parseInt(style.height);// 800

console.log("w,h:",SCRN_W,SCRN_H)
const BDOFFX = WALL + BLK_BRDR/2;
const BDOFFY = WALL + BLK_BRDR/2 - CELL/2;
const BDRECT = [0, 0, SCRN_W, SCRN_H];
const BBRECT = [WALL/6, SCRN_H-WALL*1.8, WALL*2.7, WALL];

const SELECTEDCOL = "rgba(215,225,2,0.5)";
const THANCRED_COL = "rgba(45, 135, 255, 0.7)"; // Special color for Thancred
const TRANSPARENT = "rgba(0,0,0,0)";

const GOAL_COL = "#00FF00";
const BLK_COL = "#1564C8";

const WALL_COL = "#C8C8C8";
const FLR_COL = "#0A0A0A";  // floor
const ORCL_COL = "#C8C8B4";
const TXT_DARK = "#002828";
const TXT_LIGHT = "#FFFFFF";
const CLR_TXT_COL = TXT_LIGHT;
const DRAG_THLD = CELL * 0.4; // mouse drag sensibility 0<fast<->slow >1

const SPRITE = "img/imagesheet.png" // sprites sheet
const SPRITE_MAP = {
    'ryneD': [   0,    0,  200,  200 ],
    'ryneR': [ 200,    0,  200,  200 ],
    'ryneU': [ 400,    0,  200,  200 ],
    'ryneL': [ 600,    0,  200,  200 ],
    'b1':    [   0,    0,  200,  200 ],
    'b2':    [   0,  200,  100,  200 ],
    'b3':    [ 100,  200,  100,  200 ],
    'b4':    [ 200,  200,  100,  200 ],
    'b5':    [ 300,  200,  100,  200 ],
    'b6':    [ 400,  200,  200,  100 ],
    'b7':    [ 600,  300,  100,  100 ], // Original b7, now Thancred
    'b8':    [ 600,  200,  100,  100 ],
    'b9':    [ 400,  300,  100,  100 ],
    'b10':   [ 500,  300,  100,  100 ],
    'rtry':  [ 701,  200,  100,  100 ],
    'wall':  [   0,  400,  600,  700 ],
    'hint':  [ 701,  300,  100,  100 ],
    'mrcl':  [ 600,  400,  100,  100 ],
    'bble':  [ 600,  600,  200,  200 ],
    'auto':  [ 600,  600,  100,  100 ],
    'grph':  [ 700,  600,  100,  100 ],
    'quit':  [ 700,  700,  100,  100 ],
};

const SND_SEL = 'snd/select.wav'
const SND_MOV = 'snd/move.wav'
const SND_MIR = 'snd/miracle.wav'
const SND_CLR = 'snd/clear.wav'
const SND_HINT = 'snd/hint.wav' // Sound for hint activation
const SND_SEL_VOL = 1
const SND_MOV_VOL = 1
const SND_MIR_VOL = 1
const SND_CLR_VOL = 0.8
const SND_HINT_VOL = 0.7

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
// 7: Thancred

const INIT_BLKS = {
    1:  {size: [2,2], pos: [1,0], code: 'A', }, // Oracle
    2:  {size: [1,2], pos: [0,0], code: 'B', },
    3:  {size: [1,2], pos: [3,0], code: 'C', },
    4:  {size: [1,2], pos: [0,2], code: 'D', },
    5:  {size: [1,2], pos: [3,2], code: 'E', },
    6:  {size: [2,1], pos: [1,2], code: 'F', },
    7:  {size: [1,1], pos: [0,4], code: 'G', }, // Thancred
    8:  {size: [1,1], pos: [3,4], code: 'H', },
    9:  {size: [1,1], pos: [1,3], code: 'I', },
    10: {size: [1,1], pos: [2,3], code: 'J', },
};
let voidflag;

const BTNSIZ = CELL*7/8;
const mrclRect = [CELL/7, SCRN_H-CELL*5/4, BTNSIZ, BTNSIZ];
const rtryRect = [SCRN_W-CELL*7/8, SCRN_H-CELL*2, BTNSIZ, BTNSIZ];
const hintRect = [SCRN_W-CELL*7/8, SCRN_H-CELL, BTNSIZ, BTNSIZ];


let Brd;
let Blks;
let AniIdx;
let Selected;
let PClr;
let clrAni;
let clrAniSTM;
let clr;
let isDrag;
let DSMP;
let DSBP;
let Mrbtn_used, MrflashAniAct, MrflshPh, MrflshPhST, MrflshBlkBust;
let FlshEffAct, FlshEffST, clr_Mrplayed;
let isSolving = false; // Flag to prevent multiple solver calls

let Freedom = 0;

function convertWithCharCode(board) {
    let result = '';
    const charCodeA = 'A'.charCodeAt(0);
    for (let row = 0; row < board.length; row++) {
        for (let col = 0; col < board[row].length; col++) {
            const value = board[row][col];
            if (value === 0) {
                result += '.';
            } else if (value >= 1 && value <= 10) {
                result += String.fromCharCode(charCodeA + value - 1);
            } else {
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

let snd_select, snd_move, snd_miracle, snd_clr, snd_hint;
let imgSheet = null;

function drImg(key,x,y,w,h){
    let m = SPRITE_MAP[key];
    pctx.drawImage(imgSheet, ...m, x, y, w, h);
}

const ldSprite = (path) => {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image from ${path}`));
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
    imgSheet = await ldSprite(SPRITE);
    try {
        snd_select = await ldSound(SND_SEL);
        snd_select.volume = SND_SEL_VOL;
        snd_move = await ldSound(SND_MOV);
        snd_move.volume = SND_MOV_VOL;
        snd_miracle = await ldSound(SND_MIR);
        snd_miracle.volume = SND_MIR_VOL;
        snd_clr = await ldSound(SND_CLR);
        snd_clr.volume = SND_CLR_VOL;
        snd_hint = await ldSound(SND_HINT);
        snd_hint.volume = SND_HINT_VOL;
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
    Selected = Brd[0][0] || 1;
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
    Freedom = 0;
    statStr = initStr;
}
const toGridXY = (x,y) => {
    let gx = Math.floor((x - (WALL + BLK_BRDR/2 )) / CELL);
    let gy = Math.floor((y - (WALL + BLK_BRDR/2 - CELL * 0.5)) / CELL);
    return {gx,gy};
}
function drawBlocks(mv) {
    for (let bid in Blks) {
        let info = Blks[bid];
        let [bx, by] = info.pos;
        let [bw, bh] = info.size;

        let x = bx * CELL + BDOFFX;
	      let y = by * CELL + BDOFFY;
	      const rect = [x, y, bw*CELL, bh*CELL];

	      if (bid==1 && AniIdx[1]) {
            // ... (Oracle animation logic remains the same)
	      } else {
	          drImg(`b${bid}`, ...rect);
	      }

        pctx.lineWidth = BLK_BRDR;
        // Set stroke style based on selection or if it's Thancred
        if (Selected == bid) {
            pctx.strokeStyle = (parseInt(bid) === THANCRED_ID) ? THANCRED_COL : SELECTEDCOL;
        } else if (parseInt(bid) === THANCRED_ID) {
            pctx.strokeStyle = THANCRED_COL;
        } else {
            pctx.strokeStyle = TRANSPARENT;
        }
	      pctx.strokeRect(x+BLK_BRDR/2, y+BLK_BRDR/2, bw*CELL-BLK_BRDR, bh*CELL-BLK_BRDR);
    }
}

// --- Solver and Hint Logic ---
// (This section includes functions adapted from our previous solver)
const GOAL_PIECE = 'A'; // Oracle is Block 'A' (ID 1)

function isGoalState(state) {
    return state[13] === GOAL_PIECE && state[14] === GOAL_PIECE &&
           state[17] === GOAL_PIECE && state[18] === GOAL_PIECE;
}

function getPossibleNextStates(state) {
    const nextStates = new Set();
    const processedPieces = new Set();
    for (let i = 0; i < state.length; i++) {
        const piece = state[i];
        if (piece !== '.' && !processedPieces.has(piece)) {
            processedPieces.add(piece);
            const positions = [];
            for (let j = 0; j < state.length; j++) {
                if (state[j] === piece) {
                    positions.push({ x: j % W, y: Math.floor(j / W) });
                }
            }
            const directions = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
            for (const dir of directions) {
                if (canMoveState(state, positions, dir)) {
                    nextStates.add(movePieceState(state, positions, dir));
                }
            }
        }
    }
    return nextStates;
}
function canMoveState(state, positions, dir) {
    for (const pos of positions) {
        const nextX = pos.x + dir.dx;
        const nextY = pos.y + dir.dy;
        if (nextX < 0 || nextX >= W || nextY < 0 || nextY >= H) return false;
        const targetCell = state[nextY * W + nextX];
        const isPartOfSelf = positions.some(p => p.x === nextX && p.y === nextY);
        if (targetCell !== '.' && !isPartOfSelf) return false;
    }
    return true;
}
function movePieceState(state, positions, dir) {
    const newBoard = state.split('');
    const pieceChar = state[positions[0].y * W + positions[0].x];
    for (const pos of positions) { newBoard[pos.y * W + pos.x] = '.'; }
    for (const pos of positions) {
        const newIndex = (pos.y + dir.dy) * W + (pos.x + dir.dx);
        newBoard[newIndex] = pieceChar;
    }
    return newBoard.join('');
}

// This function runs BFS to find the shortest path
function findShortestPath(startState) {
    return new Promise(resolve => {
        const queue = [startState];
        const visited = new Set([startState]);
        const parentMap = new Map([[startState, null]]);

        let head = 0;
        const process = () => {
            let CHUNK_SIZE = 1000; // Process in chunks to avoid freezing
            for(let i = 0; i < CHUNK_SIZE && head < queue.length; i++) {
                const currentState = queue[head++];
                if (isGoalState(currentState)) {
                    const path = [];
                    let current = currentState;
                    while (current !== null) {
                        path.unshift(current);
                        current = parentMap.get(current);
                    }
                    resolve(path);
                    return;
                }
                const nextStates = getPossibleNextStates(currentState);
                for (const nextState of nextStates) {
                    if (!visited.has(nextState)) {
                        visited.add(nextState);
                        parentMap.set(nextState, currentState);
                        queue.push(nextState);
                    }
                }
            }

            if (head < queue.length) {
                setTimeout(process, 0);
            } else {
                resolve(null); // No path found
            }
        };
        process();
    });
}

// --- End of Solver Logic ---


// This function will be called when Thancred is clicked
async function handleThancredClick() {
    if (isSolving) {
        console.log("Solver is already running.");
        return;
    }
    isSolving = true;
    if(snd_hint) snd_hint.play();

    const infoDiv = document.getElementById('info');
    infoDiv.textContent = "サンクレッドが最善手を探索中...";

    const path = await findShortestPath(statStr);

    if (path) {
        infoDiv.textContent = `探索完了。最短手数は ${path.length - 1} 手です。\nグラフに次の3手までを表示します。`;
        // Pass the path to the graph module
        if (window.graphModule && typeof window.graphModule.displayPath === 'function') {
            window.graphModule.displayPath(path);
        }
    } else {
        infoDiv.textContent = "ゴールまでの経路が見つかりませんでした。";
    }
    isSolving = false;
}


// ... (The rest of the puzzle.js file, including drawAll, move, etc.)
// ... (Make sure to check the original file for the full content)

// (Functions like freedom, drawAll, etc. are assumed to be here)
let mkStatStr = (character) => {
    let bm = 0;
    for (let i = 0; i < 20; i++) {
	if (statStr[i] === character) {
	    const bitPos = 20 - 1 - i;
	    bm |= (1 << bitPos);
	}
    }
    return bm;
}

let infoBm,infoShift,infoC,infoHall;
const WALL_UP =    0b11110000000000000000;
const WALL_DOWN =  0b00000000000000001111;
const WALL_LEFT =  0b10001000100010001000;
const WALL_RIGHT = 0b00010001000100010001;
function freedom() {
    const block = 'ABCDEFGHIJ';
    let bm,shift;
    let res=0;
    const hallbm = mkStatStr('.');
    infoHall=hallbm;
    for (let i = 0; i < 10 ; i++) {
	const c = block[i];
	infoC = c;
	bm = mkStatStr(c);
	infoBm=bm;
	if((bm & WALL_UP) === 0) {
	    shift = bm<<4;
	    infoShift=shift;
    	    if ((shift & hallbm) === shift ) res++;
	}
	if((bm & WALL_DOWN) === 0) {
	    shift = bm>>>4;
    	    if ((shift & hallbm) === shift ) res++;
	}
	if ((bm & WALL_LEFT) === 0) {
	    shift = bm << 1;
	    if ((shift & hallbm) === shift) res++;
	}
	if ((bm & WALL_RIGHT) === 0) {
	    shift = bm >>> 1;
	    if ((shift & hallbm) === shift) res++;
	}
    }
    return res;
}
function drawAll() {
    pctx.fillStyle = FLR_COL;
    drImg("wall", ...BDRECT);
    drImg("bble", ...BBRECT);
    drawBlocks();
    drawButtons();
    // ... rest of drawAll
    Freedom = freedom();
    let str="Freedom Degree is ..."+ Freedom;
    drText (str, WALL/2, SCRN_H - WALL*1.4, 16);

    let infoStr	= `Infomation\n`;
    infoStr += `Thancred (Block ${THANCRED_ID}) selected: Show hint graph.\n`;
    infoStr += `Freedom Degree : ${Freedom}\n`;
    infoStr += `Selected Block : ${Selected} ${Blks[Selected].code}\n`;
    infoStr += `Current State  : ${statStr}\n`;
    drInfo (infoStr);
}
function drInfo(str) {
    const infoDiv = document.getElementById('info');
    infoDiv.textContent = str;
    infoDiv.style.whiteSpace = 'pre-wrap';
}
function drawButtons() {
    drImg('rtry', ...rtryRect);
    drImg('hint', ...hintRect);
    drImg('mrcl', ...mrclRect);
}
function drText(str,x,y,px) {
    pctx.textAlign = "left";
    pctx.font = px+"px sans-serif";
    pctx.fillStyle = TXT_DARK;
    pctx.fillText(str, x, y);
}
function canMove(bid,mv) {
    if (MrflshAniAct) return false;
    let [bx, by] = Blks[bid].pos;
    let [bw, bh] = Blks[bid].size;
    let [dx, dy] = {up:[0,-1], down:[0,1], left:[-1,0], right:[1,0]}[mv];
    let nx = bx + dx, ny = by + dy;
    if (!(0 <= nx && nx <= W-bw && 0 <= ny && ny <= H-bh))
	return false;
    for (let y=0; y<bh; ++y)
	for (let x=0; x<bw; ++x) {
	    let tx = nx + x, ty = ny + y;
	    if (Brd[ty][tx] !== 0 && Brd[ty][tx] !== parseInt(bid))
		return false;
	}
    return true;
}
function move(bid,mv) {
    if (MrflshAniAct) return;
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
    }
    if (snd_move)
	snd_move.currentTime = 0, snd_move.play();
    statStr = convertWithCharCode(Brd);
}

const onMouseDown = (e) => {
    let rect = puzzleCanvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    let { gx, gy } = toGridXY(x, y);

    if (x >= rtryRect[0] && x <= rtryRect[0]+CELL && y >= rtryRect[1] && y <= rtryRect[1]+CELL) {
        initGameState();
        if (window.graphModule) window.graphModule.clearGraph();
        return;
    }
    if (!(clrAni || (Blks[1] && Blks[1].pos[0] == CLR_GOAL_X && Blks[1].pos[1] == CLR_GOAL_Y)
	  || MrflshAniAct)) {
        if (0 <= gx && gx < W && 0 <= gy && gy < H) {
	    let clicked_bid = Brd[gy][gx];
	    if (clicked_bid !== 0) {
                // --- THANCRED CLICK LOGIC ---
                if (clicked_bid === THANCRED_ID) {
                    Selected = clicked_bid;
                    handleThancredClick(); // Activate hint search
                    return; // Don't proceed to drag logic
                }
                // --- END THANCRED LOGIC ---

                if (Selected != clicked_bid && snd_select) snd_select.currentTime = 0, snd_select.play();
                Selected = clicked_bid;
                isDrag = true;
                DSMP = [x, y];
                DSBP = [...Blks[Selected].pos];
	    }
        }
        // Miracle btn
        if (x >= mrclRect[0] && x <= mrclRect[0]+CELL && y >= mrclRect[1] && y <= mrclRect[1]+CELL) {
	    activateMiracleFlsh();
        }
    }
}

function blkBuster(bid) {
    if (!(bid in Blks) || bid == 1) return false;
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

    if (mv) {
        if (canMove(Selected,mv)) {
	    move(Selected, mv);
	    DSMP = [x, y];
	    DSBP = [...Blks[Selected].pos];
        } else {
	    DSMP = [x, y];
	    DSBP = [...Blks[Selected].pos];
        }
    }
}
let onMouseUp = (e) => isDrag = false;

function updateGameState() {
    // ... (existing update logic)
}

function mainLoop() {
    updateGameState();
    drawAll();
    requestAnimationFrame(mainLoop);
}
let puzzleCanvas, pctx;
window.onload = async function() {
    puzzleCanvas = document.getElementById('puzzlecanvas');
    pctx = puzzleCanvas.getContext("2d");
    puzzleCanvas.width  = SCRN_W;
    puzzleCanvas.height = SCRN_H;
    initGameState();
    await loadAllResources();
    puzzleCanvas.addEventListener("mousedown", onMouseDown);
    puzzleCanvas.addEventListener("mousemove", onMouseMove);
    puzzleCanvas.addEventListener("mouseup", onMouseUp);
    mainLoop();
}
