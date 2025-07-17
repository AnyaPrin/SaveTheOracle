// test.js
document.addEventListener("DOMContentLoaded", function () {
    // HTMLの読み込みが完了したら実行
    var canvas = document.getElementById('rectangle');
    if ( ! canvas || ! canvas.getContext ) {
        return false;
    }
    var cvs = canvas.getContext('2d');
    /* rectangle */
    cvs.beginPath(); /* 図形を描き始めることを宣言 */
    cvs.moveTo(50, 50); /* 図形の描き始めを移動 */
    cvs.lineTo(150, 50); /* 図形の線の終わりを決める */
    cvs.lineTo(150, 150);
    cvs.lineTo(50, 150);
    cvs.closePath(); /* 描いた線を閉じる */
    cvs.stroke(); /* 描いた図形を線で表示させる */

    const outputDiv = document.getElementById("output");
    if (outputDiv) {
        outputDiv.innerHTML = "<p>Hello, World! This is a test from test.js</p>";
    } else {
        console.error("Output div not found!");
    }
});
