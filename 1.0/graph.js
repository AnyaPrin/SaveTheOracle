const graphCanvas = document.getElementById('graphcanvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 600/700, 0.1, 1000);
camera.position.z = 2;
//camera.position.y = 24;

const renderer = new THREE.WebGLRenderer({ canvas: graphCanvas });
renderer.setSize(600, 700);

const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 1, 1);
scene.add(directionalLight);

const controls = new THREE.OrbitControls(camera, renderer.domElement);

controls.enableDamping = true; 
controls.dampingFactor = 0.05;
controls.screenSpacePanning = true;
controls.minDistance = 0.000001; 
controls.maxDistance = 100;

const loader = new THREE.GLTFLoader();
loader.load(
    'obj/gaia_node.glb',               
    function (gltf) {                  
        const model = gltf.scene;
        scene.add(model);
        model.scale.set(1, 1, 1);      
        model.position.set(0, -2, 0);
        const pMat = new THREE.PointsMaterial({     // Define the material for the points (nodes)
            size: 0.005,
	    map: new THREE.TextureLoader().load('img/node.png'), 	    
            sizeAttenuation: true,
	    transparent: true,
	    opacity: 0.5,
        });
        const m = [];	                            // This array will hold all 
        model.traverse(node => {                    // the mesh parts from the loaded model
            if (node.isMesh) {
                m.push(node);
            }
        });
        m.forEach(mesh => {                        // Ensure the mesh's world matrix 
            mesh.updateWorldMatrix(true, false);   // is up-to-date before we use it
            const po = new THREE.Points(mesh.geometry, pMat);// exact world transformation to the points.
            po.applyMatrix4(mesh.matrixWorld);               // This ensures the points have the same position, 
            scene.add(po);                                   // rotation, and scale as the wireframe part.
            mesh.material = new THREE.MeshBasicMaterial({    // Add the correctly transformed points 
                color: 0x1238ff,                             // to the scene 
                wireframe: true,                             // Change the original mesh's material 
		transparent:true,                            // to a wireframe
		opacity:0.5
            });
        });
    },
    function (xhr) { console.log((xhr.loaded / xhr.total * 100) + '% loaded');}, // for progress bar
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
