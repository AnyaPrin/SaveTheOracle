const CHAR_TO_VALUE = { '.': 0, 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8, 'I': 9, 'J': 10 };
const VALUE_TO_CHAR = ['.', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

const COMMON = {
  WIDTH: 4,
  HEIGHT: 5,
  GOAL_PIECE: 'A',

  /**
   * ランダムな「完全な」盤面状態の文字列を生成する
   * @returns {string}
   */
  generateRandomState() {
    // パズルの駒構成: 'A'x4, 'B'x2, 'C'x2, 'D'x2, 'E'x2, 'F'x2, 'G'x1, 'H'x1, 'I'x1, 'J'x1, '.'x2
    const pieces = 'AAAABBCCDDEEFFGHIJ..';
    // 文字列を配列に変換し、ランダムに並び替えてから、再び文字列に戻す
    return pieces.split('').sort(() => Math.random() - 0.5).join('');
  },

  /**
   * PDB生成などで利用する、駒を減らしたサブ問題の盤面を生成する
   * @param {string} subPieces - 'A'以外に含める駒の文字列 (例: 'G' or 'BC')
   * @returns {string}
   */
  generateSubproblemState(subPieces = '') {
    const PIECE_COMPOSITION = {
      'A': 4, 'B': 2, 'C': 2, 'D': 2, 'E': 2, 'F': 2,
      'G': 1, 'H': 1, 'I': 1, 'J': 1
    };
    // 'A'は必須
    let piecesString = 'A'.repeat(PIECE_COMPOSITION['A']);
    let totalCells = PIECE_COMPOSITION['A'];

    for (const char of subPieces.toUpperCase()) {
      if (PIECE_COMPOSITION[char]) {
        piecesString += char.repeat(PIECE_COMPOSITION[char]);
        totalCells += PIECE_COMPOSITION[char];
      }
    }
    // 残りを空きマスで埋める
    piecesString += '.'.repeat(20 - totalCells);

    return piecesString.split('').sort(() => Math.random() - 0.5).join('');
  },

  /**
   * 盤面状態の文字列をBigIntにエンコードする
   * @param {string} stateString - 20文字の盤面状態
   * @returns {BigInt}
   */
  stateToBigInt(stateString) {
    // 1. 文字列長のチェック
    if (stateString.length !== 20) {
      return null;
    }

    let bigIntState = 0n;
    for (let i = 0; i < stateString.length; i++) {
      const char = stateString[i];
      const value = CHAR_TO_VALUE[char];

      // 2. 無効な文字のチェック
      if (value === undefined) {
        return null;
      }
      // 各マスに4ビットを割り当て、左のマスほど上位ビットになるように配置
      bigIntState |= (BigInt(value) << BigInt((19 - i) * 4));
    }
    return bigIntState;
  },

  /**
   * BigIntを盤面状態の文字列にデコードする
   * @param {BigInt} bigIntState
   * @returns {string}
   */
  bigIntToState(bigIntState) {
    let stateString = '';
    for (let i = 0; i < 20; i++) {
      const shift = BigInt((19 - i) * 4);
      const value = Number((bigIntState >> shift) & 0b1111n);
      stateString += VALUE_TO_CHAR[value] || '?';
    }
    return stateString;
  },

  // --- BigInt版のラッパー関数 ---

  isGoalStateBigInt(bigIntState) {
    // BigIntを文字列に変換し、既存のゴール判定関数を呼び出す
    const stateString = this.bigIntToState(bigIntState);
    return this.isGoalState(stateString);
  },

  normalizeStateBigInt(bigIntState) {
    // BigIntを文字列に変換 -> 文字列で正規化 -> 結果をBigIntに戻す
    const stateString = this.bigIntToState(bigIntState);
    const normalizedString = this.normalizeState(stateString);
    return this.stateToBigInt(normalizedString);
  },

  getPossibleNextStatesBigInt(bigIntState) {
    // BigIntを文字列に変換 -> 文字列で次の状態を計算
    const stateString = this.bigIntToState(bigIntState);
    const nextStateStrings = this.getPossibleNextStates(stateString);

    // 結果をBigIntのSetに変換して返す
    const nextBigInts = new Set();
    for (const str of nextStateStrings) {
      const normalizedBigInt = this.normalizeStateBigInt(this.stateToBigInt(str));
      nextBigInts.add(normalizedBigInt);
    }
    return nextBigInts;
  },

  isGoalState(state) {
    return state[13] === this.GOAL_PIECE && state[14] === this.GOAL_PIECE &&
      state[17] === this.GOAL_PIECE && state[18] === this.GOAL_PIECE;
  },

  reconstructPath(goalState, parentMap) {
    const path = [];
    let current = goalState;
    while (current !== null) {
      path.unshift(current);
      current = parentMap.get(current);
    }
    return path;
  },

  /**
   * 盤面状態を正規化する。
   * 駒の文字表現（A, B, C...）が異なっても、駒の形状と配置が同じなら
   * 同一の文字列に変換する。
   * @param {string} state - 盤面状態の文字列
   * @returns {string} 正規化された盤面状態の文字列
   */
  normalizeState(state) {
    // 1. 盤面に出現する駒の情報を収集する（文字、サイズ、最初の出現位置）
    const pieceInfo = {};
    for (let i = 0; i < state.length; i++) {
      const char = state[i];
      if (char !== '.' && !pieceInfo[char]) {
        pieceInfo[char] = { size: 0, pos: i };
      }
      if (char !== '.') {
        pieceInfo[char].size++;
      }
    }

    // 2. 駒を「サイズが大きい順」、同じサイズなら「出現位置が早い順」でソートする。
    // これにより、例えば2x2の駒は常にリストの先頭に来るため、必ず 'A' にマッピングされる。
    const sortedPieces = Object.keys(pieceInfo).sort((a, b) => {
      const sizeDiff = pieceInfo[b].size - pieceInfo[a].size;
      if (sizeDiff !== 0) return sizeDiff;
      return pieceInfo[a].pos - pieceInfo[b].pos;
    });

    // 3. ソートされた順に、新しい駒の名前（A, B, C...）を割り当てるマッピングを作成する。
    const mapping = {};
    let nextCharCode = 'A'.charCodeAt(0);
    for (const char of sortedPieces) {
      mapping[char] = String.fromCharCode(nextCharCode++);
    }

    // 4. 作成したマッピングを元に、新しい盤面文字列を生成して返す。
    const normalizedChars = state.split('').map(char => (char === '.' ? '.' : mapping[char]));
    return normalizedChars.join('');
  },

  getPossibleNextStates(state) {
    const nextStates = new Set();
    const processedPieces = new Set();
    for (let i = 0; i < state.length; i++) {
      const piece = state[i];
      if (piece !== '.' && !processedPieces.has(piece)) {
        processedPieces.add(piece);
        const positions = [];
        for (let j = 0; j < state.length; j++) {
          if (state[j] === piece) {
            positions.push({ x: j % this.WIDTH, y: Math.floor(j / this.WIDTH) });
          }
        }
        const directions = [
          { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
          { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
        ];
        for (const dir of directions) {
          if (this.canMove(state, positions, dir)) {
            nextStates.add(this.movePiece(state, positions, dir));
          }
        }
      }
    }
    return nextStates;
  },

  canMove(state, positions, dir) {
    for (const pos of positions) {
      const nextX = pos.x + dir.dx;
      const nextY = pos.y + dir.dy;
      if (nextX < 0 || nextX >= this.WIDTH || nextY < 0 || nextY >= this.HEIGHT) return false;
      const targetCell = state[nextY * this.WIDTH + nextX];
      const isPartOfSelf = positions.some(p => p.x === nextX && p.y === nextY);
      if (targetCell !== '.' && !isPartOfSelf) return false;
    }
    return true;
  },

  movePiece(state, positions, dir) {
    const newBoard = state.split('');
    const pieceChar = state[positions[0].y * this.WIDTH + positions[0].x];
    for (const pos of positions) {
      newBoard[pos.y * this.WIDTH + pos.x] = '.';
    }
    for (const pos of positions) {
      const newIndex = (pos.y + dir.dy) * this.WIDTH + (pos.x + dir.dx);
      newBoard[newIndex] = pieceChar;
    }
    return newBoard.join('');
  }
};
