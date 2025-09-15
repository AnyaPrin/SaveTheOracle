// --- Global Graph Module ---
window.graphModule = (function() {
    const graphCanvas = document.getElementById('graphcanvas');
    if (!graphCanvas) {
        console.error("graphcanvas not found!");
        return;
    }

    // --- Basic Three.js setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, graphCanvas.clientWidth / graphCanvas.clientHeight, 0.1, 1000);
    camera.position.set(0, 0.3, 0.7);

    const renderer = new THREE.WebGLRenderer({ canvas: graphCanvas, antialias: true });
    renderer.setSize(graphCanvas.clientWidth, graphCanvas.clientHeight);
    renderer.setClearColor(0x000000); // Black background

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // --- Controls ---
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // --- Group to hold graph elements ---
    const graphGroup = new THREE.Group();
    scene.add(graphGroup);

    // --- Public Methods ---
    function clearGraph() {
        while(graphGroup.children.length > 0){
            const obj = graphGroup.children[0];
            graphGroup.remove(obj);
            // Dispose geometry and material to free memory
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        }
    }

    function displayPath(path) {
        clearGraph();
        if (!path || path.length === 0) return;

        const nodesToShow = path.slice(0, 4); // Current state + next 3 steps
        const nodePositions = [];

        nodesToShow.forEach((state, i) => {
            const isCurrentNode = (i === 0);

            // Create node sphere
            const geometry = new THREE.SphereGeometry(0.05, 16, 16);
            const material = new THREE.MeshStandardMaterial({
                color: isCurrentNode ? 0x2f81f7 : 0x92b2c8, // Blue for current, grey for others
                emissive: isCurrentNode ? 0x2f81f7 : 0x000000,
                metalness: 0.3,
                roughness: 0.6,
            });
            const node = new THREE.Mesh(geometry, material);

            // Position nodes in a line
            const position = new THREE.Vector3(i * 0.3 - 0.45, 0, 0);
            node.position.copy(position);
            nodePositions.push(position);

            graphGroup.add(node);
        });

        // Create edges (lines between nodes)
        for (let i = 0; i < nodePositions.length - 1; i++) {
            const points = [nodePositions[i], nodePositions[i + 1]];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ color: 0x444c56 });
            const line = new THREE.Line(geometry, material);
            graphGroup.add(line);
        }
    }


    // --- Resize handler ---
    window.addEventListener('resize', () => {
        const graphCanvas = document.getElementById('graphcanvas');
        camera.aspect = graphCanvas.clientWidth / graphCanvas.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(graphCanvas.clientWidth, graphCanvas.clientHeight);
    });

    // --- Animation loop ---
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();


    // --- Expose public methods ---
    return {
        displayPath,
        clearGraph
    };

})();
