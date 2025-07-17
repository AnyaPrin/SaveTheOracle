// test.js
document.addEventListener("DOMContentLoaded", function () {
    // HTMLの読み込みが完了したら実行
    const outputDiv = document.getElementById("output");
    if (outputDiv) {
        outputDiv.innerHTML = "<p>Hello, World! This is a test from test.js</p>";
    } else {
        console.error("Output div not found!");
    }
});
