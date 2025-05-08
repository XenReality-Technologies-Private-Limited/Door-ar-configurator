// Import necessary modules from Three.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

// DOM Element References
const heightFtInput = document.getElementById('doorHeightFt');
const heightInInput = document.getElementById('doorHeightIn');
const widthFtInput = document.getElementById('doorWidthFt');
const widthInInput = document.getElementById('doorWidthIn');
const submitButton = document.getElementById('submitDimensions');
const modelViewerElement = document.getElementById('doorModelViewer');
const loadingMessage = document.getElementById('loadingMessage');
const errorMessage = document.getElementById('errorMessage');

// --- IMPORTANT: CONFIGURE YOUR MODEL ---
const modelPath = 'assets/door.glb'; // Path to your GLB model

// Original dimensions of your model in METERS.
// Updated after model load based on actual measurements.
let ORIGINAL_MODEL_HEIGHT_METERS = 2; // default value, will be updated
let ORIGINAL_MODEL_WIDTH_METERS = 1;  // default value, will be updated
// --- END OF MODEL CONFIGURATION ---

let originalModelScene;
const loader = new GLTFLoader();
const exporter = new GLTFExporter();
// We won't use currentObjectUrl for Blob URLs anymore, but keep it for potential cleanup if needed
let currentObjectUrl = null;

// Helper function to convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

// Function to display error messages
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    loadingMessage.style.display = 'none';
}

// Function to show loading messages
function showLoading(message) {
    loadingMessage.textContent = message;
    loadingMessage.style.display = 'block';
    errorMessage.style.display = 'none';
}

// Function to hide messages
function hideMessages() {
    loadingMessage.style.display = 'none';
    errorMessage.style.display = 'none';
}

// Preload the original model
showLoading('Loading base 3D model...');
submitButton.disabled = true; // Disable button until model is ready
loader.load(
    modelPath,
    (gltf) => {
        originalModelScene = gltf.scene;
        // Get bounding box and compute pivot as bottom centre
        const box = new THREE.Box3().setFromObject(originalModelScene);
        const size = box.getSize(new THREE.Vector3());
        const pivot = new THREE.Vector3(
            (box.min.x + box.max.x) / 2,
            box.min.y,
            (box.min.z + box.max.z) / 2
        );

        // Update model parameters with actual dimensions.
        ORIGINAL_MODEL_HEIGHT_METERS = size.y;
        ORIGINAL_MODEL_WIDTH_METERS = size.x;
        console.log('Measured door dimensions (meters):', `Height=${size.y.toFixed(3)}`, `Width=${size.x.toFixed(3)}`);

        // Shift the model's origin to bottom centre by subtracting the pivot.
        originalModelScene.position.sub(pivot);

        hideMessages();
        console.log('3D model loaded, pre-processed and origin shifted to bottom centre.');
        submitButton.disabled = false;
    },
    undefined, // Optional: progress callback
    (error) => {
        console.error('Error loading default 3D model:', error);
        showError(`Failed to load base model from "${modelPath}". Check path and file. Original error: ${error.message}`);
        submitButton.disabled = true;
    }
);

// Event Listener for the Submit Button
submitButton.addEventListener('click', async () => {
    if (!originalModelScene) {
        showError('Base 3D model is not loaded yet. Please wait or refresh.');
        return;
    }

    hideMessages();
    showLoading('Processing your dimensions...');

    // 1. Get and Validate Dimensions
    const heightFt = parseFloat(heightFtInput.value) || 0;
    const heightIn = parseFloat(heightInInput.value) || 0;
    const widthFt = parseFloat(widthFtInput.value) || 0;
    const widthIn = parseFloat(widthInInput.value) || 0;

    if ((heightFt <= 0 && heightIn <= 0) || (widthFt <= 0 && widthIn <= 0)) {
        showError('Please enter valid positive height and width dimensions.');
        return;
    }
     // Basic validation for inches
    if (heightIn >= 12 || heightIn < 0 || widthIn >= 12 || widthIn < 0) {
         showError('Inches must be between 0 and 11.');
         return;
    }

    // 2. Convert Dimensions to Meters
    const totalHeightInches = (heightFt * 12) + heightIn;
    const totalWidthInches = (widthFt * 12) + widthIn;
    const targetHeightMeters = totalHeightInches * 0.0254; // 1 inch = 0.0254 meters
    const targetWidthMeters = totalWidthInches * 0.0254;

     // Add some sanity checks for very small or very large dimensions
    if (targetHeightMeters < 0.1 || targetWidthMeters < 0.1) {
        showError('Dimensions are too small. Please enter larger values.');
        return;
    }
    // You might want to add max limits too depending on your use case
    // if (targetHeightMeters > 5 || targetWidthMeters > 5) { ... }

    // 3. Scale the Model
    // Clone the original model scene. Use traverse to ensure all parts are cloned.
    const scaledModel = originalModelScene.clone(true);

    // Calculate scale factors.
    // Assumes Y is up for height, X is for width.
    // Ensure ORIGINAL_MODEL_HEIGHT_METERS and ORIGINAL_MODEL_WIDTH_METERS are correct.
    const scaleY = targetHeightMeters / ORIGINAL_MODEL_HEIGHT_METERS;
    const scaleX = targetWidthMeters / ORIGINAL_MODEL_WIDTH_METERS;
    // Decide how the depth (Z) scales. Often, it scales proportionally to width.
    const scaleZ = scaleX; // Depth scales proportionally to width (adjust if needed)

    // Apply the scale to the cloned model
    scaledModel.scale.set(scaleX, scaleY, scaleZ);

    // After scaling, the model's base should still be at y=0 because the original
    // was adjusted, and scaling happens from the origin (0,0,0), which is now the model's base.

    // Log the final dimensions of the scaled model for verification
    const scaledBox = new THREE.Box3().setFromObject(scaledModel);
    const scaledSize = scaledBox.getSize(new THREE.Vector3());
    console.log(`Target dimensions (m): H=${targetHeightMeters.toFixed(3)}, W=${targetWidthMeters.toFixed(3)}`);
    console.log(`Scaled model BBox (m): H=${scaledSize.y.toFixed(3)}, W=${scaledSize.x.toFixed(3)}, D=${scaledSize.z.toFixed(3)}`);

    // 4. Export the Scaled Model to GLB and create Data URL
    try {
        const options = { binary: true };
        exporter.parse(
            scaledModel,
            (glbArrayBuffer) => {
                // Revoke any previous blob URL to free memory
                if (currentObjectUrl) {
                    URL.revokeObjectURL(currentObjectUrl);
                    currentObjectUrl = null;
                }

                // Create blob and object URL directly from GLB data
                const blob = new Blob([glbArrayBuffer], { type: 'model/gltf-binary' });
                currentObjectUrl = URL.createObjectURL(blob);

                // Set the src of the model-viewer to the Object URL
                modelViewerElement.src = currentObjectUrl;
                modelViewerElement.style.display = 'block';
                hideMessages();
                console.log('Scaled model generated and passed to model-viewer.');
            },
            (error) => {
                console.error('Error exporting GLB:', error);
                showError('Could not export the scaled 3D model. Please try again.');
            },
            options
        );
    } catch (error) {
        console.error('Error during model processing or export:', error);
        showError('An unexpected error occurred while processing the model.');
    }
});

// Optional: Listen for AR status changes
modelViewerElement.addEventListener('ar-status', (event) => {
    console.log(`AR Status: ${event.detail.status}`);
    if (event.detail.status === 'failed') {
        console.warn("AR session failed. This could be due to device incompatibility or issues with the model in AR.");
        // You might want to keep the error message less technical for the user
        showError("AR failed. Your device might not support AR, or there was an issue placing the model.");
    }
});

// Initial display of model-viewer with poster
// The model-viewer is initially hidden via CSS or inline style and shown after a model is loaded
if (modelViewerElement && !modelViewerElement.src) {
     // You might want to keep it hidden until the first model is ready,
     // or set a default poster/src in your HTML.
     // modelViewerElement.style.display = 'block'; // Keep this commented out unless setting a default src
}

// Add some initial console logs for debugging original model dimensions
console.log('Ensure ORIGINAL_MODEL_HEIGHT_METERS and ORIGINAL_MODEL_WIDTH_METERS match your model\'s actual dimensions.');
console.log('Load the model in a 3D editor and verify its size.');