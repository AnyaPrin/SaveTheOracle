// shapes.js ファイル
// このファイルは、図形を描画するための関数をエクスポートします。

/**
 * 指定されたキャンバスに四角形を描画します。
 * @param {HTMLCanvasElement} canvas - 描画対象のキャンバス要素。
 * @param {string} color - 塗りつぶしの色（例: '#4A90E2'）。
 */
export function drawRectangle(canvas, color) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = color;
        ctx.fillRect(50, 50, 100, 100);
    }
}

/**
 * 指定されたキャンバスに円を描画します。
 * @param {HTMLCanvasElement} canvas - 描画対象のキャンバス要素。
 * @param {string} color - 塗りつぶしの色（例: '#FF6B6B'）。
 */
export function drawCircle(canvas, color) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(100, 100, 75, 0, 2 * Math.PI);
        ctx.fill();
    }
}
