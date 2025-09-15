canvas = document.getElementById('graphcanvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 600/700, 0.1, 1000);
camera.position.z = 2;
camera.position.y = 24;

//const canvas = document.getElementById('graphcanvas');
const renderer = new THREE.WebGLRenderer({ canvas: canvas });
renderer.setSize(600, 700);

const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 1, 1);
scene.add(directionalLight);

const controls = new THREE.OrbitControls(camera, renderer.domElement);

controls.enableDamping = true; 
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 2; 
controls.maxDistance = 10;

/** GLTFローダーのインスタンス作成
 */
const loader = new THREE.GLTFLoader();
loader.load(                                 // GLTFモデルの読み込み
    'obj/gaia_node.glb',                      // モデルファイルパス
    function (gltf) {                        // ロード成功時のコールバック
        const model = gltf.scene;
        scene.add(model);
        model.scale.set(1, 1, 1);            // モデルのスケールや位置の調整
        model.position.set(0, 0, 0);
    },
    function (xhr) {                         // ロード中のコールバック（プログレス表示用）
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {                       // エラー時のコールバック
        console.error('An error happened:', error);
    }
);

window.addEventListener('resize', () => {
    const canvas = document.getElementById('graphcanvas');
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
});

function animate() {                         // アニメーションループ
    requestAnimationFrame(animate);
    controls.update();                       // カメラコントロールの更新
    if (scene.children.length > 0) {         // モデルを回転
	scene.children.forEach(child => {
            if (child.isMesh || child.isGroup) {
		child.rotation.y += 0.01;
            }
        });
    }
    renderer.render(scene, camera);
}
animate();
