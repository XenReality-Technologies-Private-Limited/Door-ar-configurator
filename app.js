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
let ORIGINAL_MODEL_HEIGHT_METERS = 1.0; // Default placeholder, will be updated
let ORIGINAL_MODEL_WIDTH_METERS = 1.0;  // Default placeholder, will be updated
// --- END OF MODEL CONFIGURATION ---

let originalModelScene;
const loader = new GLTFLoader();
const exporter = new GLTFExporter();

// Server endpoint for uploading GLB
// IMPORTANT: Change this if your server is running on a different host/port
const UPLOAD_ENDPOINT = 'http://10.217.68.49:3000/upload-glb'; // Adjust if needed


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
    submitButton.disabled = false; // Re-enable button when done (unless model load failed)
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
        const pivot = new THREE.Vector3(
            (box.min.x + box.max.x) / 2, // Center X
            box.min.y,                   // Bottom Y
            (box.min.z + box.max.z) / 2  // Center Z
        );

        // Store actual dimensions from the loaded model
        ORIGINAL_MODEL_HEIGHT_METERS = size.y;
        ORIGINAL_MODEL_WIDTH_METERS = size.x; // Assuming X is width

        console.log('Measured base model dimensions (meters):', `Height=${size.y.toFixed(3)}`, `Width=${size.x.toFixed(3)}`, `Depth=${size.z.toFixed(3)}`);

        // Shift the model's origin to bottom centre by subtracting the pivot.
        // This makes scaling and placing relative to the base.
        originalModelScene.position.sub(pivot);

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

    // 4. Export the Scaled Model to GLB and Upload using parseAsync
    showLoading('Exporting and uploading model...');
    try {
        const options = { binary: true }; // Export as binary GLB

        console.log('Attempting to export scaled model using parseAsync...');
        // Use parseAsync which returns a Promise that resolves with the ArrayBuffer
        const glbArrayBuffer = await exporter.parseAsync(scaledModel, options);

        console.log('Model exported successfully using parseAsync.');
        // --- Check the data received from parseAsync ---
        console.log('Type of data received from parseAsync:', typeof glbArrayBuffer);
        console.log('Is data an ArrayBuffer?', glbArrayBuffer instanceof ArrayBuffer);
         // Check for Node.js Buffer too, though less likely in browser fetch context
        console.log('Is data a Buffer (Node.js)?', typeof Buffer !== 'undefined' && glbArrayBuffer instanceof Buffer);
        console.log('Size of data received from parseAsync:', glbArrayBuffer ? (glbArrayBuffer.byteLength || glbArrayBuffer.length) : 'undefined');
        // Avoid logging the entire buffer content directly to console for large files
        // console.log('GLB export resulted in data (from parseAsync):', glbArrayBuffer);


        // Validate that the result is actually a buffer type
        if (! (glbArrayBuffer instanceof ArrayBuffer) && !(typeof Buffer !== 'undefined' && glbArrayBuffer instanceof Buffer)) {
             console.error("parseAsync did not return an ArrayBuffer or Buffer as expected.");
             showError("Internal error: GLB exporter did not return binary data in expected format.");
             // Optionally, log the unexpected data for debugging if it's small
             if (glbArrayBuffer && typeof glbArrayBuffer === 'object') {
                  console.log('Unexpected data from parseAsync:', glbArrayBuffer);
             }
             return; // Stop processing
        }

         // Add a sanity check for buffer size
         if (glbArrayBuffer.byteLength < 1024) { // e.g., minimum 1KB, adjust as needed
              console.warn(`Exported GLB is very small (${glbArrayBuffer.byteLength} bytes). This might indicate an issue with the model or export.`);
              // Decide if you want to show an error or proceed
              // showError(`Exported model is too small (${glbArrayBuffer.byteLength} bytes). There might be an issue.`);
              // return;
         }


        try {
            // Use fetch to send the ArrayBuffer to your Node.js server
            const response = await fetch(UPLOAD_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/octet-stream', // Indicate binary data
                },
                body: glbArrayBuffer, // Send the raw ArrayBuffer received from parseAsync
            });

            // --- MODIFIED ERROR HANDLING (keep the robust version) ---
            if (!response.ok) {
                let errorDetails = `Upload failed: ${response.status} ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorDetails = `Upload failed: ${response.status} ${response.statusText} - ${errorData.error || JSON.stringify(errorData)}`;
                    console.error('Server returned error (JSON):', response.status, errorData);
                } catch (e) {
                    // If JSON parsing fails, get the raw text body
                    const errorBody = await response.text();
                    errorDetails = `Upload failed: ${response.status} ${response.statusText}. Server response: "${errorBody.substring(0, 200)}..."`; // Log first 200 chars
                     console.error('Server returned error (non-JSON):', response.status, errorBody);
                }
                 // Throw a new error with the gathered details
                throw new Error(errorDetails);
            }
            // --- END MODIFIED ERROR HANDLING ---


            const result = await response.json(); // This should only run if response.ok is true
            const cloudfrontUrl = result.url; // Get the URL from the server response

            console.log('Upload successful. Model URL:', cloudfrontUrl);

            // Set the src of the model-viewer to the received URL
            modelViewerElement.src = cloudfrontUrl;
            modelViewerElement.style.display = 'block'; // Make model-viewer visible
            hideMessages(); // Hide loading message

        } catch (uploadError) {
            console.error('Error during upload or processing server response:', uploadError);
            showError(`Failed to upload the model: ${uploadError.message}`);
        }

    } catch (exportError) { // Catch errors from parseAsync
        console.error('Error during GLB export:', exportError);
        showError(`Failed to export the 3D model: ${exportError.message}`);
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
