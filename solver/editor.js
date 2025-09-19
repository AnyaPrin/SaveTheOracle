// --- Board Editor Logic ---
function initializeBoardEditor() {
    const sourceGrid = document.getElementById('source-grid');
    const targetGrid = document.getElementById('target-grid');
    const applyBtn = document.getElementById('apply-editor-btn');
    const resetBtn = document.getElementById('reset-editor-btn');

    const highlightOverlay = document.createElement('div');
    highlightOverlay.id = 'selection-highlight';
    highlightOverlay.hidden = true;

    const INITIAL_SOURCE_STATE = "BAACBAACDFFEDIJEG..H";
    const initialPiecesForMap = stateToPieces(INITIAL_SOURCE_STATE);
    const originalPositionsMap = new Map(initialPiecesForMap.map(p => [p.id, p.positions]));

    let sourcePieces = [];
    let targetPieces = [];
    let selectedPiece = null;
    let previewPositions = [];
    let lastPreviewIndex = -1;
    let lastHoveredPieceInfo = { piece: null, grid: null };

    function stateToPieces(state) {
        const pieces = [];
        const processed = new Set();
        let pieceIdCounter = 0;

        for (let i = 0; i < state.length; i++) {
            const char = state[i];
            if (char !== '.' && !processed.has(i)) {
                const positions = [];
                const q = [i];
                processed.add(i);

                while (q.length > 0) {
                    const curr = q.shift();
                    positions.push(curr);
                    const x = curr % COMMON.WIDTH;
                    const y = Math.floor(curr / COMMON.WIDTH);

                    const neighbors = [
                        (y > 0) ? curr - COMMON.WIDTH : -1,
                        (y < COMMON.HEIGHT - 1) ? curr + COMMON.WIDTH : -1,
                        (x > 0) ? curr - 1 : -1,
                        (x < COMMON.WIDTH - 1) ? curr + 1 : -1,
                    ];

                    for (const neighbor of neighbors) {
                        if (neighbor !== -1 && !processed.has(neighbor) && state[neighbor] === char) {
                            processed.add(neighbor);
                            q.push(neighbor);
                        }
                    }
                }

                positions.sort((a, b) => a - b);
                const originIndex = positions[0];
                const originX = originIndex % COMMON.WIDTH;
                let maxX = originX, maxY = Math.floor(originIndex / COMMON.WIDTH);
                for (const p of positions) {
                    maxX = Math.max(maxX, p % COMMON.WIDTH);
                    maxY = Math.max(maxY, Math.floor(p / COMMON.WIDTH));
                }

                pieces.push({
                    id: pieceIdCounter++,
                    char: char,
                    positions: positions,
                    width: maxX - originX + 1,
                    height: maxY - Math.floor(originIndex / COMMON.WIDTH) + 1
                });
            }
        }
        return pieces;
    }

    function piecesToState(pieces) {
        const state = Array(20).fill('.');
        for (const piece of pieces) {
            for (const pos of piece.positions) {
                state[pos] = piece.char;
            }
        }
        return state;
    }

    function createGridCells(gridElement) {
        gridElement.innerHTML = '';
        for (let i = 0; i < 20; i++) {
            const cell = document.createElement('div');
            cell.classList.add('editor-grid-cell');
            cell.dataset.index = i;
            gridElement.appendChild(cell);
        }
    }

    function renderGridWithPieces(gridElement, pieces) {
        const pieceMap = Array(20).fill(null);
        for (const piece of pieces) {
            for (const pos of piece.positions) {
                pieceMap[pos] = piece;
            }
        }

        gridElement.querySelectorAll('.editor-grid-cell').forEach((cell, i) => {
            const piece = pieceMap[i];
            let classList = ['editor-grid-cell'];

            if (piece) {
                classList.push(`piece-${piece.char}`);
                cell.textContent = (i === piece.positions[0]) ? piece.char : '';

                const x = i % COMMON.WIDTH;
                const y = Math.floor(i / COMMON.WIDTH);

                if (x < COMMON.WIDTH - 1 && pieceMap[i + 1] === piece) classList.push('piece-inner-right');
                if (y < COMMON.HEIGHT - 1 && pieceMap[i + COMMON.WIDTH] === piece) classList.push('piece-inner-bottom');
            } else {
                classList.push('piece-dot');
                cell.textContent = '';
            }
            cell.className = classList.join(' ');
        });
    }

    function clearPreview() {
        if (previewPositions.length > 0) {
            previewPositions.forEach(pos => {
                const cell = targetGrid.querySelector(`.editor-grid-cell[data-index='${pos}']`);
                if (cell) cell.classList.remove('preview-piece');
            });
            previewPositions = [];
        }
    }

    function showPreview(positions) {
        positions.forEach(pos => {
            const cell = targetGrid.querySelector(`.editor-grid-cell[data-index='${pos}']`);
            if (cell) cell.classList.add('preview-piece');
        });
        previewPositions = positions;
    }

    function updateAllRenders() {
        renderGridWithPieces(sourceGrid, sourcePieces);
        renderGridWithPieces(targetGrid, targetPieces);
        updateHighlightOverlay();
    }

    function resetEditor() {
        sourcePieces = stateToPieces(INITIAL_SOURCE_STATE);
        targetPieces = [];
        selectedPiece = null;
        clearPreview();
        updateAllRenders();
    }

    function clearHover() {
        if (lastHoveredPieceInfo.piece) {
            lastHoveredPieceInfo.piece.positions.forEach(pos => {
                const cellEl = lastHoveredPieceInfo.grid.querySelector(`.editor-grid-cell[data-index='${pos}']`);
                if (cellEl) cellEl.classList.remove('hovered-piece');
            });
            lastHoveredPieceInfo.piece = null;
            lastHoveredPieceInfo.grid = null;
        }
    }

    function handleGridMouseOver(e, pieces, grid) {
        const cell = e.target.closest('.editor-grid-cell');
        if (!cell) return;

        const index = parseInt(cell.dataset.index, 10);
        const hoveredPiece = pieces.find(p => p.positions.includes(index));

        if (hoveredPiece === lastHoveredPieceInfo.piece) return;

        clearHover();

        if (hoveredPiece) {
            hoveredPiece.positions.forEach(pos => {
                const cellEl = grid.querySelector(`.editor-grid-cell[data-index='${pos}']`);
                if (cellEl) cellEl.classList.add('hovered-piece');
            });
            lastHoveredPieceInfo.piece = hoveredPiece;
            lastHoveredPieceInfo.grid = grid;
        }
    }

    sourceGrid.addEventListener('mouseover', e => handleGridMouseOver(e, sourcePieces, sourceGrid));
    targetGrid.addEventListener('mouseover', e => handleGridMouseOver(e, targetPieces, targetGrid));

    sourceGrid.addEventListener('mouseout', clearHover);
    targetGrid.addEventListener('mouseout', clearHover);

    function updateHighlightOverlay() {
        if (!selectedPiece) {
            highlightOverlay.hidden = true;
            return;
        }
        const originIndex = selectedPiece.positions[0];
        const cellElement = sourceGrid.querySelector(`.editor-grid-cell[data-index='${originIndex}']`);
        if (cellElement) {
            const cellWidth = 24;
            const cellHeight = 24;
            const gap = 1;
            highlightOverlay.style.top = `${cellElement.offsetTop}px`;
            highlightOverlay.style.left = `${cellElement.offsetLeft}px`;
            highlightOverlay.style.width = `${selectedPiece.width * cellWidth + (selectedPiece.width - 1) * gap}px`;
            highlightOverlay.style.height = `${selectedPiece.height * cellHeight + (selectedPiece.height - 1) * gap}px`;
            highlightOverlay.hidden = false;
        } else {
            highlightOverlay.hidden = true;
        }
    }

    sourceGrid.addEventListener('click', e => {
        const cell = e.target.closest('.editor-grid-cell');
        if (!cell) return;
        const index = parseInt(cell.dataset.index, 10);
        const clickedPiece = sourcePieces.find(p => p.positions.includes(index));

        if (clickedPiece) {
            if (selectedPiece && selectedPiece.id === clickedPiece.id) {
                selectedPiece = null; // Deselect
                clearPreview();
            } else {
                selectedPiece = clickedPiece;
            }
            updateAllRenders();
        }
    });

    targetGrid.addEventListener('mousemove', e => {
        const cell = e.target.closest('.editor-grid-cell');
        if (!cell) return;

        const targetIndex = parseInt(cell.dataset.index, 10);
        if (targetIndex === lastPreviewIndex) return;

        lastPreviewIndex = targetIndex;
        clearPreview();

        if (!selectedPiece) return;

        const targetX = targetIndex % COMMON.WIDTH;
        const targetY = Math.floor(targetIndex / COMMON.WIDTH);
        const currentTargetState = piecesToState(targetPieces);

        let canPlace = true;
        if (targetX + selectedPiece.width > COMMON.WIDTH || targetY + selectedPiece.height > COMMON.HEIGHT) {
            canPlace = false;
        } else {
            for (let py = 0; py < selectedPiece.height; py++) {
                for (let px = 0; px < selectedPiece.width; px++) {
                    if (currentTargetState[(targetY + py) * COMMON.WIDTH + (targetX + px)] !== '.') {
                        canPlace = false;
                        break;
                    }
                }
                if (!canPlace) break;
            }
        }

        if (canPlace) {
            const newPositions = [];
            const originIndex = selectedPiece.positions[0];
            const originX = originIndex % COMMON.WIDTH;
            const originY = Math.floor(originIndex / COMMON.WIDTH);

            for (const pos of selectedPiece.positions) {
                const dx = (pos % COMMON.WIDTH) - originX;
                const dy = Math.floor(pos / COMMON.WIDTH) - originY;
                newPositions.push((targetY + dy) * COMMON.WIDTH + (targetX + dx));
            }
            showPreview(newPositions);
        }
    });

    targetGrid.addEventListener('mouseleave', () => {
        clearPreview();
        lastPreviewIndex = -1;
    });

    targetGrid.addEventListener('click', e => {
        const cell = e.target.closest('.editor-grid-cell');
        if (!cell || !selectedPiece) return;

        const targetIndex = parseInt(cell.dataset.index, 10);
        const targetX = targetIndex % COMMON.WIDTH;
        const targetY = Math.floor(targetIndex / COMMON.WIDTH);
        const currentTargetState = piecesToState(targetPieces);

        let canPlace = true;
        if (targetX + selectedPiece.width > COMMON.WIDTH || targetY + selectedPiece.height > COMMON.HEIGHT) {
            canPlace = false;
        } else {
            for (let py = 0; py < selectedPiece.height; py++) {
                for (let px = 0; px < selectedPiece.width; px++) {
                    if (currentTargetState[(targetY + py) * COMMON.WIDTH + (targetX + px)] !== '.') {
                        canPlace = false;
                        break;
                    }
                }
                if (!canPlace) break;
            }
        }

        if (canPlace) {
            sourcePieces = sourcePieces.filter(p => p.id !== selectedPiece.id);

            const newPositions = [];
            const originIndex = selectedPiece.positions[0];
            const originX = originIndex % COMMON.WIDTH;
            const originY = Math.floor(originIndex / COMMON.WIDTH);

            for (const pos of selectedPiece.positions) {
                const dx = (pos % COMMON.WIDTH) - originX;
                const dy = Math.floor(pos / COMMON.WIDTH) - originY;
                newPositions.push((targetY + dy) * COMMON.WIDTH + (targetX + dx));
            }
            selectedPiece.positions = newPositions;
            targetPieces.push(selectedPiece);

            selectedPiece = null;
            updateAllRenders();
        }
    });

    targetGrid.addEventListener('contextmenu', e => {
        e.preventDefault();
        const cell = e.target.closest('.editor-grid-cell');
        if (!cell) return;

        const index = parseInt(cell.dataset.index, 10);
        const clickedPiece = targetPieces.find(p => p.positions.includes(index));

        if (clickedPiece) {
            // Restore original positions before moving it back to source
            clickedPiece.positions = originalPositionsMap.get(clickedPiece.id);

            targetPieces = targetPieces.filter(p => p.id !== clickedPiece.id);
            sourcePieces.push(clickedPiece);
            updateAllRenders();
        }
    });

    applyBtn.addEventListener('click', () => {
        const finalStateArray = piecesToState(targetPieces);
        const emptyCount = finalStateArray.filter(c => c === '.').length;
        if (emptyCount !== 2) {
            alert(`空白マスが2つになるように配置してください。(現在: ${emptyCount}つ)`);
            return;
        }
        const finalState = finalStateArray.join('');
        initialStateInput.value = finalState;
        handleSetState();
    });

    resetBtn.addEventListener('click', resetEditor);

    // Initial render
    createGridCells(sourceGrid);
    sourceGrid.appendChild(highlightOverlay);
    createGridCells(targetGrid);
    resetEditor();
}

initializeBoardEditor();
});
