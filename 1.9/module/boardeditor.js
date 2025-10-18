// --- Board Editor Logic ---
function initializeBoardEditor() {
    const srcGrid = document.getElementById('src-grid');
    const tgtGrid = document.getElementById('tgt-grid');
    const applyBtn = document.getElementById('apply-editor-btn');
    const resetBtn = document.getElementById('reset-editor-btn');
    const allowSubsetCB = document.getElementById('allow-subset-Blks');
    const highlightOl = document.createElement('div');
    highlightOl.id = 'selection-highlight';
    highlightOl.hidden = true;
    const INITIAL_SRC_STATE = "BAACBAACDFFEDIJEG..H";
    const initialBlksForMap = stateToBlks(INITIAL_SRC_STATE);
    const originalPositionsMap = new Map(initialBlksForMap.map(p => [p.id, p.positions]));
    let srcBlks = [];
    let tgtBlks = [];
    let slctBlk = null;
    let previewPositions = [];
    let lastPreviewIndex = -1;
    let lastHvrBlkInfo = { Blk: null, grid: null };

    function createGrid(gridElement) {
        gridElement.innerHTML = '';
        for (let i = 0; i < 20; i++) {
            const cell = document.createElement('div');
            cell.classList.add('editor-grid-cell');
            cell.dataset.index = i;
            gridElement.appendChild(cell);
        }
    }
    function renderGridWithBlks(gridElement, Blks) {
        const BlkMap = Array(20).fill(null);
        for (const Blk of Blks) {
            for (const pos of Blk.positions) {
                BlkMap[pos] = Blk;
            }
        }
        gridElement.querySelectorAll('.editor-grid-cell').forEach((cell, i) => {
            const Blk = BlkMap[i];
            let classList = ['editor-grid-cell'];

            if (Blk) {
                classList.push(`Blk-${Blk.char}`);
                cell.textContent = (i === Blk.positions[0]) ? Blk.char : '';
                const x = i % COMMON.WIDTH;
                const y = Math.floor(i / COMMON.WIDTH);
                if (x < COMMON.WIDTH - 1 && BlkMap[i + 1] === Blk) classList.push('Blk-inner-right');
                if (y < COMMON.HEIGHT - 1 && BlkMap[i + COMMON.WIDTH] === Blk)
                    classList.push('Blk-inner-bottom');
            } else {
                classList.push('Blk-dot');
                cell.textContent = '';
            }
            cell.className = classList.join(' ');
        });
    }
    function clearPreview() {
        if (previewPositions.length > 0) {
            previewPositions.forEach(pos => {
                const cell = tgtGrid.querySelector(`.editor-grid-cell[data-index='${pos}']`);
                if (cell) cell.classList.remove('preview-Blk');
            });
            previewPositions = [];
        }
    }

    function showPreview(positions) {
        positions.forEach(pos => {
            const cell = tgtGrid.querySelector(`.editor-grid-cell[data-index='${pos}']`);
            if (cell) cell.classList.add('preview-Blk');
        });
        previewPositions = positions;
    }
    function updateAllRenders() {
        renderGridWithBlks(srcGrid, srcBlks);
        renderGridWithBlks(tgtGrid, tgtBlks);
        updateHighlightOverlay();
    }
    function resetEditor() {
        srcBlks = stateToBlks(INITIAL_SRC_STATE);
        tgtBlks = [];
        slctBlk = null;
        clearPreview();
        updateAllRenders();
    }

    function clearHvr() {
        if (lastHvrBlkInfo.Blk) {
            lastHvrBlkInfo.Blk.positions.forEach(pos => {
                const cellEl = lastHvrBlkInfo.grid.querySelector(`.editor-grid-cell[data-index='${pos}']`);
                if (cellEl) cellEl.classList.remove('Hvr-Blk');
            });
            lastHvrBlkInfo.Blk = null;
            lastHvrBlkInfo.grid = null;
        }
    }

    function handleGridMouseOver(e, Blks, grid) {
        const cell = e.target.closest('.editor-grid-cell');
        if (!cell) return;

        const index = parseInt(cell.dataset.index, 10);
        const HvrBlk = Blks.find(p => p.positions.includes(index));

        if (HvrBlk === lastHvrBlkInfo.Blk) return;

        clearHvr();

        if (HvrBlk) {
            HvrBlk.positions.forEach(pos => {
                const cellEl = grid.querySelector(`.editor-grid-cell[data-index='${pos}']`);
                if (cellEl) cellEl.classList.add('Hvr-Blk');
            });
            lastHvrBlkInfo.Blk = HvrBlk;
            lastHvrBlkInfo.grid = grid;
        }
    }

    srcGrid.addEventListener('mouseover', e => handleGridMouseOver(e, srcBlks, srcGrid));
    tgtGrid.addEventListener('mouseover', e => handleGridMouseOver(e, tgtBlks, tgtGrid));
    srcGrid.addEventListener('mouseout', clearHvr);
    tgtGrid.addEventListener('mouseout', clearHvr);

    function updateHighlightOverlay() {
        if (!slctBlk) {
            highlightOl.hidden = true;
            return;
        }
        const originIndex = slctBlk.positions[0];
        const cellElement = srcGrid.querySelector(`.editor-grid-cell[data-index='${originIndex}']`);
        if (cellElement) {
            const cellWidth = 24;
            const cellHeight = 24;
            const gap = 0; // グリッドのgapが0なので、こちらも0に合わせます
            highlightOl.style.top = `${cellElement.offsetTop}px`;
            highlightOl.style.left = `${cellElement.offsetLeft}px`;
            highlightOl.style.width = `${slctBlk.width * cellWidth + (slctBlk.width - 1) * gap}px`;
            highlightOl.style.height = `${slctBlk.height * cellHeight + (slctBlk.height - 1) * gap}px`;
            highlightOl.hidden = false;
        } else {
            highlightOl.hidden = true;
        }
    }

    srcGrid.addEventListener('click', e => {
        const cell = e.target.closest('.editor-grid-cell');
        if (!cell) return;
        const index = parseInt(cell.dataset.index, 10);
        const clickedBlk = srcBlks.find(p => p.positions.includes(index));

        if (clickedBlk) {
            if (slctBlk && slctBlk.id === clickedBlk.id) {
                slctBlk = null; // Deselect
                clearPreview();
            } else {
                slctBlk = clickedBlk;
            }
            updateAllRenders();
        }
    });

    tgtGrid.addEventListener('mousemove', e => {
        const cell = e.target.closest('.editor-grid-cell');
        if (!cell) return;

        const tgtIndex = parseInt(cell.dataset.index, 10);
        if (tgtIndex === lastPreviewIndex) return;

        lastPreviewIndex = tgtIndex;
        clearPreview();

        if (!slctBlk) return;

        const tgtX = tgtIndex % COMMON.WIDTH;
        const tgtY = Math.floor(tgtIndex / COMMON.WIDTH);
        const crntTgtState = BlksToState(tgtBlks).split('');

        let canPlace = true;
        if (tgtX + slctBlk.width > COMMON.WIDTH || tgtY + slctBlk.height > COMMON.HEIGHT) {
            canPlace = false;
        } else {
            for (let py = 0; py < slctBlk.height; py++) {
                for (let px = 0; px < slctBlk.width; px++) {
                    if (crntTgtState[(tgtY + py) * COMMON.WIDTH + (tgtX + px)] !== '.') {
                        canPlace = false;
                        break;
                    }
                }
                if (!canPlace) break;
            }
        }

        if (canPlace) {
            const newPositions = [];
            const originIndex = slctBlk.positions[0];
            const originX = originIndex % COMMON.WIDTH;
            const originY = Math.floor(originIndex / COMMON.WIDTH);

            for (const pos of slctBlk.positions) {
                const dx = (pos % COMMON.WIDTH) - originX;
                const dy = Math.floor(pos / COMMON.WIDTH) - originY;
                newPositions.push((tgtY + dy) * COMMON.WIDTH + (tgtX + dx));
            }
            showPreview(newPositions);
        }
    });

    tgtGrid.addEventListener('mouseleave', () => {
        clearPreview();
        lastPreviewIndex = -1;
    });

    tgtGrid.addEventListener('click', e => {
        const cell = e.target.closest('.editor-grid-cell');
        if (!cell || !slctBlk) return;

        const tgtIndex = parseInt(cell.dataset.index, 10);
        const tgtX = tgtIndex % COMMON.WIDTH;
        const tgtY = Math.floor(tgtIndex / COMMON.WIDTH);
        const crntTgtState = BlksToState(tgtBlks).split('');

        let canPlace = true;
        if (tgtX + slctBlk.width > COMMON.WIDTH || tgtY + slctBlk.height > COMMON.HEIGHT) {
            canPlace = false;
        } else {
            for (let py = 0; py < slctBlk.height; py++) {
                for (let px = 0; px < slctBlk.width; px++) {
                    if (crntTgtState[(tgtY + py) * COMMON.WIDTH + (tgtX + px)] !== '.') {
                        canPlace = false;
                        break;
                    }
                }
                if (!canPlace) break;
            }
        }

        if (canPlace) {
            srcBlks = srcBlks.filter(p => p.id !== slctBlk.id);

            const newPositions = [];
            const originIndex = slctBlk.positions[0];
            const originX = originIndex % COMMON.WIDTH;
            const originY = Math.floor(originIndex / COMMON.WIDTH);

            for (const pos of slctBlk.positions) {
                const dx = (pos % COMMON.WIDTH) - originX;
                const dy = Math.floor(pos / COMMON.WIDTH) - originY;
                newPositions.push((tgtY + dy) * COMMON.WIDTH + (tgtX + dx));
            }
            slctBlk.positions = newPositions;
            tgtBlks.push(slctBlk);

            slctBlk = null;
            updateAllRenders();
        }
    });

    tgtGrid.addEventListener('contextmenu', e => {
        e.preventDefault();
        const cell = e.target.closest('.editor-grid-cell');
        if (!cell) return;

        const index = parseInt(cell.dataset.index, 10);
        const clickedBlk = tgtBlks.find(p => p.positions.includes(index));

        if (clickedBlk) {
            // Restore original positions before moving it back to src
            clickedBlk.positions = originalPositionsMap.get(clickedBlk.id);

            tgtBlks = tgtBlks.filter(p => p.id !== clickedBlk.id);
            srcBlks.push(clickedBlk);
            updateAllRenders();
        }
    });
    applyBtn.addEventListener('click', () => {
        // "サブセットを許す"がチェックされていない場合、全ての駒が配置されているかチェック
        if (!allowSubsetCB.checked && srcBlks.length > 0) {
            alert(`配置していない駒があります。全ての駒を右のボードに配置してください。`);
            return;
        }

        // A（大駒2x2の駒）は必須)。さもないとゴール条件が無くなってしまう。
        if (!tgtBlks.some(p => p.char === 'A')) {
            alert(`Aの駒は必須です。必ず右のボードに配置してください。`);
            return;
        }

        const finalState = BlksToState(tgtBlks);
        const finalStateArray = finalState.split('');
        const emptyCount = finalStateArray.filter(c => c === '.').length;
        // パズルとして成立するための最低条件をチェック (空きマスが2つ以上か)
        // (現在のボードエディターの仕様では空きマスが２つ以下になることはないが、念のため)
        if (emptyCount < 2) {
            alert(`空きマスが2つ未満です。駒を右クリックして盤面から取り除いてください。`);
            return;
        }
        startPos.value = finalState;
        handleSetState();
    });
    resetBtn.addEventListener('click', resetEditor);

    // Initial render
    createGrid(srcGrid);
    srcGrid.appendChild(highlightOl);
    createGrid(tgtGrid);
    resetEditor();
}
