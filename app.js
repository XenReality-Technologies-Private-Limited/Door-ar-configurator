// Import Three.js and loaders/exporters
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

// DOM refs
const heightFtInput = document.getElementById('doorHeightFt');
const heightInInput = document.getElementById('doorHeightIn');
const widthFtInput = document.getElementById('doorWidthFt');
const widthInInput = document.getElementById('doorWidthIn');
const submitButton = document.getElementById('submitDimensions');
const modelViewer = document.getElementById('doorModelViewer');
const loadingMessage = document.getElementById('loadingMessage');
const errorMessage = document.getElementById('errorMessage');

// Base model path
const MODEL_PATH = 'assets/door.glb';
let originalScene, origHeightM, origWidthM;

// Load base model
loadingMessage.style.display = 'block';
submitButton.disabled = true;
new GLTFLoader().load(
  MODEL_PATH,
  (gltf) => {
    originalScene = gltf.scene;
    const box = new THREE.Box3().setFromObject(originalScene);
    const size = box.getSize(new THREE.Vector3());
    origHeightM = size.y;
    origWidthM = size.x;
    // pivot to bottom-center
    const pivot = new THREE.Vector3((box.min.x + box.max.x)/2, box.min.y, (box.min.z+box.max.z)/2);
    originalScene.position.sub(pivot);

    loadingMessage.style.display = 'none';
    submitButton.disabled = false;
  },
  undefined,
  (err) => {
    console.error(err);
    showError('Could not load base model.');
  }
);

function showError(msg) {
  errorMessage.textContent = msg;
  errorMessage.style.display = 'block';
  loadingMessage.style.display = 'none';
}

function hideMessages() {
  errorMessage.style.display = 'none';
  loadingMessage.style.display = 'none';
}

submitButton.addEventListener('click', () => {
  if (!originalScene) return showError('Model not loaded.');
  hideMessages();
  loadingMessage.textContent = 'Processing...';
  loadingMessage.style.display = 'block';

  // read inputs
  const hFt = parseFloat(heightFtInput.value)||0;
  const hIn = parseFloat(heightInInput.value)||0;
  const wFt = parseFloat(widthFtInput.value)||0;
  const wIn = parseFloat(widthInInput.value)||0;
  if ((hFt*12+hIn)<=0 || (wFt*12+wIn)<=0) {
    return showError('Enter positive dimensions.');
  }
  if (hIn<0||hIn>=12||wIn<0||wIn>=12) {
    return showError('Inches must be 0–11.');
  }

  const targetH = (hFt*12 + hIn) * 0.0254;
  const targetW = (wFt*12 + wIn) * 0.0254;

  const scaled = originalScene.clone(true);
  const scaleY = targetH/origHeightM;
  const scaleX = targetW/origWidthM;
  scaled.scale.set(scaleX, scaleY, scaleX);

  // export
  new GLTFExporter().parse(
    scaled,
    async (arrayBuffer) => {
      try {
        const res = await fetch('http://localhost:3000/upload-glb', {
          method: 'POST',
          headers: {'Content-Type':'application/octet-stream'},
          body: arrayBuffer
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error||'Upload failed');
        modelViewer.src = data.url;
        modelViewer.style.display = 'block';
        hideMessages();
      } catch(err) {
        console.error(err);
        showError('Upload failed.');
      }
    },
    { binary: true }
  );
});

// AR error handling
modelViewer.addEventListener('ar-status', e => {
  if (e.detail.status==='failed') {
    showError('AR failed—device may not support it.');
  }
});