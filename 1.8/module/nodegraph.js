const graphCanvas = document.getElementById('graphcanvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 600/700, 0.1, 1000);
camera.position.z = 0.351;
camera.rotation.y = 1;
camera.rotation.x = 2;

const renderer = new THREE.WebGLRenderer({ canvas: graphCanvas });
style = getComputedStyle(graphCanvas);
const GRAF_W = parseInt(style.width);
const GRAF_H = parseInt(style.height);
renderer.setSize(GRAF_W, GRAF_H);

const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 1, 1);
scene.add(directionalLight);
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = true;
controls.minDistance = 0.1;
controls.maxDistance = 10;

const loader = new THREE.GLTFLoader();
loader.load(
    '../obj/gaia_node.glb',
    function (gltf) {
        const model = gltf.scene;
        scene.add(model);
        model.scale.set(1, 1, 1);
        model.position.set(0, -2, 0);
        const pMat = new THREE.PointsMaterial({     // Define the material for the points (nodes)
	    map: new THREE.TextureLoader().load('../img/node.png'),
	    color: 0x808040,
            size: 0.005,
            sizeAttenuation: true,                //
	    transparent: true,
	    opacity: 0.5,
        });
        const meshs = [];	                   // This array will hold all
        model.traverse(node => {                   // the mesh parts from the loaded model
            if (node.isMesh) {
                meshs.push(node);
            }
        });
        meshs.forEach(m => {                       // Ensure the mesh's world matrix
            m.updateWorldMatrix(true, false);      // is up-to-date before we use it
	    const mat = new THREE.PointsMaterial({ // Create the points object
		color: 0x00ff00,                   // from the mesh's geometry
		size: 0.1,
		transparent: true,
		map: new THREE.TextureLoader().load('../img/node.png'),
		alphaTest: 0.5
	    });
	    const p=new THREE.Points(m.geometry,pMat); // CRITICAL STEP: Apply the mesh's
                                                       // exact world transformation to the points.
            p.applyMatrix4(m.matrixWorld);             // This ensures the points have the same position,
            scene.add(p);                              // rotation, and scale as the wireframe part.
            m.material = new THREE.MeshBasicMaterial({ // Add the correctly transformed points
                color: 0x1238ff,                       // to the scene
                wireframe: true,                       // Change the original mesh's material to a wireframe
		transparent:true,
		opacity:0.5
            });
        });
    },

    // for progress
    function (xhr) {

	console.log((xhr.loaded / xhr.total * 100) + '% loaded');


    },
    function (error) { console.error('An error happened:', error);}
);

window.addEventListener('resize', () => {
    const graphCanvas = document.getElementById('graphcanvas');
    camera.aspect = graphCanvas.clientWidth / graphCanvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(graphCanvas.clientWidth, graphCanvas.clientHeight);
});

function animate() {

    requestAnimationFrame(animate);

    controls.update();
    if (scene.children.length > 0) {
        scene.children[1].rotation.x += 0.005;
        scene.children[1].rotation.y += 0.005;
    }
    renderer.render(scene, camera);
}
animate();
