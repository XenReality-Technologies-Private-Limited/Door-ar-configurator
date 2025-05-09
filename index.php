<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>3D Door AR Configurator</title>
    <link rel="stylesheet" href="style.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">

    <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"></script>
</head>

<body>
    <div class="container">
        <header>
            <h1>Customize Your Door</h1>
            <p>Enter the dimensions below and see your door in 3D and AR!</p>
        </header>

        <div class="controls">
            <h2>Enter Dimensions:</h2>
            <div class="input-group">
                <label for="doorHeightFt">Height:</label>
                <input type="number" id="doorHeightFt" placeholder="ft" min="0" value="6">
                <span>ft</span>
                <input type="number" id="doorHeightIn" placeholder="in" min="0" max="11" value="8">
                <span>in</span>
            </div>
            <div class="input-group">
                <label for="doorWidthFt">Width:</label>
                <input type="number" id="doorWidthFt" placeholder="ft" min="0" value="2">
                <span>ft</span>
                <input type="number" id="doorWidthIn" placeholder="in" min="0" max="11" value="6">
                <span>in</span>
            </div>
            <button id="submitDimensions" class="submit-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                    class="feather feather-box">
                    <path
                        d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z">
                    </path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
                Generate & View in AR
            </button>
            <p id="loadingMessage" class="loading-message"></p>
            <p id="errorMessage" class="error-message"></p>
        </div>

        <div class="viewer-container">
            <model-viewer id="doorModelViewer" ar ar-modes="webxr quick-look" ar-scale="fixed" camera-controls
                camera-orbit="0deg 75deg 6m" min-camera-orbit="auto auto 3m" max-camera-orbit="auto auto 12m"
                field-of-view="45deg" camera-target="0m 1.5m 0m" bounds="tight" auto-rotate disable-zoom
                touch-action="pan-y" alt="Scalable Door Model" shadow-intensity="1" exposure="1"
                environment-image="neutral"
                style="width: 100%; height: 500px; border-radius: 12px; background-color: #f0f0f0;"
                poster="https://placehold.co/600x400/e2e8f0/94a3b8?text=Your+3D+Door+Will+Appear+Here">
                <div class="ar-prompt" slot="ar-button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17.61 10.86a3 3 0 0 1-5.22 0"></path>
                        <path d="M10.86 17.61a3 3 0 0 1 0-5.22"></path>
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"></path>
                    </svg>
                    View in your space
                </div>
            </model-viewer>
        </div>
    </div>

    <script type="importmap">
      {
        "imports": {
          "three": "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js",
          "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/"
        }
      }
    </script>
    <script type="module" src="app.js"></script>
</body>

</html>