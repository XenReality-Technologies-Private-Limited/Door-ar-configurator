// app.js

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
// Ensure this base model is accessible via HTTP(S) at this path

// Original dimensions of your model in METERS.
// These will be updated after the model is loaded based on its bounding box.
let ORIGINAL_MODEL_HEIGHT_METERS = 1.0; // Default placeholder
let ORIGINAL_MODEL_WIDTH_METERS = 1.0;  // Default placeholder
// --- END OF MODEL CONFIGURATION ---

let originalModelScene;
const loader = new GLTFLoader();
const exporter = new GLTFExporter();

// Server endpoint for uploading GLB
// IMPORTANT: Change this if your server is running on a different host/port
const UPLOAD_ENDPOINT = 'http://localhost:3000/upload-glb'; // Adjust if needed


// Helper function to convert ArrayBuffer to Base64 string (No longer needed for this approach)
// function arrayBufferToBase64(buffer) {
//      let binary = '';
//      const bytes = new Uint8Array(buffer);
//      const len = bytes.byteLength;
//      for (let i = 0; i < len; i++) {
//          binary += String.fromCharCode(bytes[i]);
//      }
//      return window.btoa(binary);
// }

// Function to display error messages
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    loadingMessage.style.display = 'none';
    submitButton.disabled = false; // Re-enable button on error
}

// Function to show loading messages
function showLoading(message) {
    loadingMessage.textContent = message;
    loadingMessage.style.display = 'block';
    errorMessage.style.display = 'none';
    submitButton.disabled = true; // Disable button while loading
}

// Function to hide messages
function hideMessages() {
    loadingMessage.style.display = 'none';
    errorMessage.style.display = 'none';
    submitButton.disabled = false; // Re-enable button when done
}

// --- Model Loading and Pre-processing ---
showLoading('Loading base 3D model...');
submitButton.disabled = true; // Disable button until model is ready
loader.load(
    modelPath,
    (gltf) => {
        originalModelScene = gltf.scene;

        // Compute bounding box and pivot
        const box = new THREE.Box3().setFromObject(originalModelScene);
        const size = box.getSize(new THREE.Vector3());
        //const pivot = new THREE.Vector3(
            //(box.min.x + box.max.x) / 2, // Center X
            //box.min.y,                   // Bottom Y
            //(box.min.z + box.max.z) / 2  // Center Z
        //);

        // Store actual dimensions from the loaded model
        ORIGINAL_MODEL_HEIGHT_METERS = size.y;
        ORIGINAL_MODEL_WIDTH_METERS = size.x; // Assuming X is width

        console.log('Measured base model dimensions (meters):', `Height=${size.y.toFixed(3)}`, `Width=${size.x.toFixed(3)}`, `Depth=${size.z.toFixed(3)}`);

        // Shift the model's origin to bottom centre by subtracting the pivot.
        // This makes scaling and placing relative to the base.
        //originalModelScene.position.sub(pivot);

        hideMessages();
        console.log('Base 3D model loaded, pre-processed, and origin shifted to bottom centre.');
        submitButton.disabled = false; // Enable button now that model is loaded
    },
    undefined, // Optional: progress callback
    (error) => {
        console.error('Error loading default 3D model:', error);
        showError(`Failed to load base model from "${modelPath}". Check path and file.`);
        submitButton.disabled = true; // Keep button disabled on load failure
    }
);

// --- Event Listener for the Submit Button ---
submitButton.addEventListener('click', async () => {
    if (!originalModelScene) {
        showError('Base 3D model is not loaded yet. Please wait or refresh.');
        return;
    }

    hideMessages();
    showLoading('Processing dimensions and generating model...');

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
    if (heightIn < 0 || heightIn >= 12 || widthIn < 0 || widthIn >= 12) {
         showError('Inches must be between 0 and 11.');
         return;
    }

    // 2. Convert Dimensions to Meters
    const totalHeightInches = (heightFt * 12) + heightIn;
    const totalWidthInches = (widthFt * 12) + widthIn;
    const targetHeightMeters = totalHeightInches * 0.0254; // 1 inch = 0.0254 meters
    const targetWidthMeters = totalWidthInches * 0.0254;

     // Add some sanity checks for very small or very large dimensions
    if (targetHeightMeters < 0.3 || targetWidthMeters < 0.3) { // e.g., minimum ~1 foot
        showError('Dimensions are too small. Please enter larger values.');
        return;
    }
    // Example max limits (adjust as needed)
    if (targetHeightMeters > 4 || targetWidthMeters > 3) { // e.g., max height 13ft, max width ~10ft
         showError('Dimensions are too large. Please enter smaller values.');
         return;
    }


    // 3. Scale the Model
    // Clone the original model scene. Use clone(true) for deep cloning.
    const scaledModel = originalModelScene.clone(true);

    // Calculate scale factors.
    // Assumes Y is up for height, X is for width.
    const scaleY = targetHeightMeters / ORIGINAL_MODEL_HEIGHT_METERS;
    const scaleX = targetWidthMeters / ORIGINAL_MODEL_WIDTH_METERS;
    // Decide how the depth (Z) scales. Often, it scales proportionally to width.
    // Or you might keep it fixed, or scale proportionally to the largest scale factor.
    // Scaling proportionally to width (scaleX) is a common approach for doors.
    const scaleZ = scaleX; // Depth scales proportionally to width (adjust if needed)

    console.log(`Target H=${targetHeightMeters.toFixed(3)}m, W=${targetWidthMeters.toFixed(3)}m`);
    console.log(`Original H=${ORIGINAL_MODEL_HEIGHT_METERS.toFixed(3)}m, W=${ORIGINAL_MODEL_WIDTH_METERS.toFixed(3)}m`);
    console.log(`Calculated Scale: X=${scaleX.toFixed(3)}, Y=${scaleY.toFixed(3)}, Z=${scaleZ.toFixed(3)}`);


    // Apply the scale to the cloned model
    scaledModel.scale.set(scaleX, scaleY, scaleZ);

    // After scaling, the model's base should still be at y=0 because the original
    // was adjusted, and scaling happens from the origin (0,0,0), which is now the model's base.

    // Log the final dimensions of the scaled model for verification
    const scaledBox = new THREE.Box3().setFromObject(scaledModel);
    const scaledSize = scaledBox.getSize(new THREE.Vector3());
    console.log(`Scaled model BBox (m): H=${scaledSize.y.toFixed(3)}, W=${scaledSize.x.toFixed(3)}, D=${scaledSize.z.toFixed(3)}`);
    // Log the scaled model object before exporting
    console.log('Scaled model object before export:', scaledModel);
    console.log('Attempting to export scaled model...');
    // 4. Export the Scaled Model to GLB and Upload
    showLoading('Exporting and uploading model...');
    try {
        const options = { binary: true }; // Export as binary GLB

        exporter.parse(
            scaledModel,
            async (glbArrayBuffer) => { // Make this callback async to use await
                console.log('exporter.parse onSuccess callback triggered.');
                // --- RE-CHECK THIS LOG ---
                console.log('Type of data received in onSuccess:', typeof glbArrayBuffer);
                console.log('Is data an ArrayBuffer?', glbArrayBuffer instanceof ArrayBuffer);
                console.log('Size of data received in onSuccess:', glbArrayBuffer ? glbArrayBuffer.byteLength : 'undefined or null', 'bytes');
                // --- END RE-CHECK LOG ---
                if (!glbArrayBuffer || !(glbArrayBuffer instanceof ArrayBuffer) || glbArrayBuffer.byteLength < 1000) { // Added a more robust check
                    showError('Export failed: Produced invalid or tiny GLB data.');
                    console.error('GLB export resulted in unexpected data:', glbArrayBuffer);
                    return; // Stop here if export data is bad
                }
                console.log('GLB ArrayBuffer looks valid. Proceeding with upload...');

                try {
                    // Use fetch to send the ArrayBuffer to your Node.js server
                    const response = await fetch(UPLOAD_ENDPOINT, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/octet-stream', // Indicate binary data
                        },
                        body: glbArrayBuffer, // Send the raw ArrayBuffer
                    });

                    if (!response.ok) {
                         const errorData = await response.json();
                         console.error('Upload failed:', response.status, errorData);
                         throw new Error(`Upload failed: ${errorData.error || response.statusText}`);
                    }

                    const result = await response.json();
                    const cloudfrontUrl = result.url; // Get the URL from the server response

                    console.log('Upload successful. Model URL:', cloudfrontUrl);

                    // Set the src of the model-viewer to the received URL
                    modelViewerElement.src = cloudfrontUrl;
                    modelViewerElement.style.display = 'block'; // Make model-viewer visible
                    hideMessages(); // Hide loading message

                } catch (uploadError) {
                    console.error('Error during upload:', uploadError);
                    showError(`Failed to upload the model: ${uploadError.message}`);
                }
            },
            (error) => { // Export progress callback (optional)
                // console.log('Export progress:', error); // Uncomment for debugging progress
            },
            (error) => { // Export error callback
                console.error('Error exporting GLB:', error);
                showError('Could not export the scaled 3D model.');
            },
            options
        );
    } catch (error) {
        console.error('Error during model processing or export initiation:', error);
        showError('An unexpected error occurred during model processing.');
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

// Initial state: Hide model-viewer until a model is loaded
// Add this or ensure your CSS handles the initial hidden state
modelViewerElement.style.display = 'none'; // Start hidden

// Add some initial console logs for debugging original model dimensions
console.log('App started. Waiting for base model to load.');
console.log(`Base model path: ${modelPath}`);
// Note: Initial ORIGINAL_MODEL_HEIGHT_METERS and WIDTH are placeholders,
// they get updated once the model is successfully loaded and measured.