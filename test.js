document.addEventListener("DOMContentLoaded", function () {
    var canvas = document.getElementById('gameCanvas');
    if ( ! canvas || ! canvas.getContext ) {
        return false;
    }
    const ctx = canvas.getContext('2d');
    ctx.font = '24px Arial';
    ctx.fillText('Puzzle Game (JS)', 25, 100);
    ctx.beginPath(); 
    ctx.moveTo(50, 50);
    ctx.lineTo(150, 50);
    ctx.lineTo(150, 150);
    ctx.lineTo(50, 150);
    ctx.closePath();
    ctx.stroke();
    const outputDiv = document.getElementById("output");
    if (outputDiv) {
        outputDiv.innerHTML = "<p>Hello, World! This is a test from test.js</p>";
    } else {
        console.error("Output div not found!");
    }
});
