export const SOLDISP = (function() {
    // Module-private variables
    let _solPath;
    let _initialStateInput;
    let _handleSetState;
    let _stateToBlks;
    let _COMMON;
    /**
     * Renders the sequence of solution boards in the result panel.
     * @param {string[]} path - An array of state strings representing the solution path.
     */
    function dispSol(path) {
        let html = '';
        path.forEach((state, index) => {
            const prevState = path[index - 1] || null;
            const currentBlks = _stateToBlks(state);
            let movedBlk = null;

            // 1. Identify the moved blk by finding which blk moved into a previously empty space.
            // This is more robust against state normalization than comparing characters.
            if (prevState) {
                let movedToPos = -1;
                for (let i = 0; i < prevState.length; i++) {
                    if (prevState[i] === '.' && state[i] !== '.') {
                        movedToPos = i;
                        break;
                    }
                }
                if (movedToPos !== -1) {
                    movedBlk = currentBlks.find(p => p.positions.includes(movedToPos));
                }
            }
            // 2. Build the HTML for the board grid.
            const blkMap = Array(_COMMON.WIDTH * _COMMON.HEIGHT).fill(null);
            for (const blk of currentBlks) {
                for (const pos of blk.positions) {
                    blkMap[pos] = blk;
                }
            }
            let boardCellsHtml = '';
            for (let i = 0; i < _COMMON.WIDTH * _COMMON.HEIGHT; i++) {
                const blk = blkMap[i];
                const classList = ['sol-brd-cell'];
                let cellContent = '';
                if (blk) {
                    classList.push(`blk`);
                    // Show the blk character only in its top-left cell
                    if (i === blk.positions[0]) cellContent = blk.char;
                    if (movedBlk && blk.id === movedBlk.id) classList.push('moved-blk');
                    // Add classes to remove inner borders
                    const x = i % _COMMON.WIDTH;
                    const y = Math.floor(i / _COMMON.WIDTH);
                    if (x < _COMMON.WIDTH - 1 && blkMap[i + 1] === blk)
			classList.push('blk-inner-right');
                    if (y < _COMMON.HEIGHT - 1 && blkMap[i + _COMMON.WIDTH] === blk)
			classList.push('blk-inner-bottom');
                } else {
                    classList.push('blk-dot');
                }
                boardCellsHtml += `<div class="${classList.join(' ')}">${cellContent}</div>`;
            }

            // 3. Build the HTML for the highlight overlay.
            let overlayHtml = '';
            if (movedBlk) {
                // Calculate position and size for the absolutely positioned overlay
                const cellWidth = 40 / _COMMON.WIDTH;
                const cellHeight = 76 / _COMMON.HEIGHT;
                let minX = _COMMON.WIDTH, minY = _COMMON.HEIGHT;
                for (const pos of movedBlk.positions) {
                    minX = Math.min(minX, pos % _COMMON.WIDTH);
                    minY = Math.min(minY, Math.floor(pos / _COMMON.WIDTH));
                }

                const style = `
top: ${minY * cellHeight}px;
left: ${minX * cellWidth}px;
width: ${movedBlk.width * cellWidth}px;
height: ${movedBlk.height * cellHeight}px;`;
                overlayHtml = `<div class="moved-blk-overlay" style="${style}"></div>`;
            }

            // 4. Assemble the final HTML for this step.
            html += `<div class="step">
<div class="step-number">${index === 0 ? 'Start' : index}</div>
<div class="step-board clickable-board sol-brd-grid" data-state="${state}">
${boardCellsHtml}${overlayHtml}</div></div>`;
        });
        _solPath.innerHTML = html;
    }

    /**
     * Handles clicks on the solution path to set the initial state.
     * @param {MouseEvent} e - The click event.
     */
    function handleSolPathClick(e) {
        const boardDiv = e.target.closest('.clickable-board');
        if (boardDiv) {
            const state = boardDiv.dataset.state;
            if (state) {
                _initialStateInput.value = state;
                _handleSetState();
                // Scroll to the top to make it clear the initial state has been set.
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    }
    function init(config) {
        _solPath = config.solPath;
        _initialStateInput = config.initialStateInput;
        _handleSetState = config.handleSetState;
        _stateToBlks = config.stateToBlks;
        _COMMON = config.COMMON;
        _solPath.addEventListener('click', handleSolPathClick);
    }

    // Public interface
    return {
        init: init,
        dispSol: dispSol
    };
})();
