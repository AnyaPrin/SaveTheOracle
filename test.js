// test.js
document.addEventListener("DOMContentLoaded", function () {
    // HTMLの読み込みが完了したら実行
    var canvas = document.getElementById('rectangle');
    if ( ! canvas || ! canvas.getContext ) {
        return false;
    }
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    ctx.font = '24px Arial';
    ctx.fillText('Puzzle Game (JS)', 25, 100);
    ctx.beginPath(); /* 図形を描き始めることを宣言 */
    ctx.moveTo(50, 50); /* 図形の描き始めを移動 */
    ctx.lineTo(150, 50); /* 図形の線の終わりを決める */
    ctx.lineTo(150, 150);
    ctx.lineTo(50, 150);
    ctx.closePath(); /* 描いた線を閉じる */
    ctx.stroke(); /* 描いた図形を線で表示させる */
    const outputDiv = document.getElementById("output");
    if (outputDiv) {
        outputDiv.innerHTML = "<p>Hello, World! This is a test from test.js</p>";
    } else {
        console.error("Output div not found!");
    }
});
