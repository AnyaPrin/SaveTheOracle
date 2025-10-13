/**
 * Blight Soil Break
 */
const thancredId = 7;
function activateBSB() {
    if (Selected != thancredId) return;

    const thancredBitmap = getBlkBitmap(thancredId);
    if (thancredBitmap === 0n) return; // サンクレッドがいない

    // サンクレッドの隣接マスを計算
    const adjacentArea =
        ((thancredBitmap & ~BigInt(UP)) << 4n) |    // 上
        ((thancredBitmap & ~BigInt(DOWN)) >> 4n) |  // 下
        ((thancredBitmap & ~BigInt(LEFT)) << 1n) |  // 左
        ((thancredBitmap & ~BigInt(RIGHT)) >> 1n); // 右

    // 1x2の中駒IDリスト
    const targetBlkIds = [2, 3, 4, 5]; // 縦長の駒のみ。

    for (const blkId of targetBlkIds) {
        const bm = getBlkBitmap(blkId);
        // 隣接しているかチェック
        if ((bm & adjacentArea) !== 0n) {
            console.log(`Blight Soil Break activated on blkId: ${blkId}`);

            // 駒を1x1に変化させる （テーブルを直接書き換える）
            BLK_SIZE_BY_ID[blkId] = [1, 1];
            SPRITE_MAP[`b${blkId}`] = INIT_SPRITE_MAP['meol'];

            // stateInt update
            const msbPos = BigInt(getMsbPosition(bm));
            const newbm = 1n << msbPos;
            updateStateInt(bm,newbm,blkId);

            if (snd_mrcl) snd_mrcl.currentTime = 0, snd_mrcl.play(); // ミラクルと同じ音を再生
            break; // 1体見つけたら終了
        }
    }
}
