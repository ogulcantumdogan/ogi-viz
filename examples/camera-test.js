/* global butterchurn */

const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: true,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true // preserve drawing buffer for blending
});

if (!gl) {
    alert('WebGL2 not supported');
    throw new Error('WebGL2 not supported');
}

let visualizer;
let video;
let videoTexture;
let videoTextureInitialized = false;
let testImageTexture;
let butterchurnFBO;
let butterchurnTexture;
let compositeProgram;
let quadBuffer;
let audioContext;
let sourceNode;

// Control states
let cameraEnabled = true;
let visualizerEnabled = true;
let currentBlendMode = 'multiply';

const PRESET_URL = '../experiments/wasm-eel/presets/Geiss - Planet 1.json';

// Add event listeners for controls
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('toggleCamera').addEventListener('click', toggleCamera);
    document.getElementById('toggleVisualizer').addEventListener('click', toggleVisualizer);
    document.getElementById('blendMode').addEventListener('change', changeBlendMode);
    document.getElementById('debugInfo').addEventListener('click', showDebugInfo);
    document.getElementById('simpleTest').addEventListener('click', simpleTextureTest);
});

function toggleCamera() {
    cameraEnabled = !cameraEnabled;
    const btn = document.getElementById('toggleCamera');
    btn.textContent = `Camera: ${cameraEnabled ? 'ON' : 'OFF'}`;
    btn.classList.toggle('active', cameraEnabled);
}

function toggleVisualizer() {
    visualizerEnabled = !visualizerEnabled;
    const btn = document.getElementById('toggleVisualizer');
    btn.textContent = `Visualizer: ${visualizerEnabled ? 'ON' : 'OFF'}`;
    btn.classList.toggle('active', visualizerEnabled);
}

function changeBlendMode() {
    currentBlendMode = document.getElementById('blendMode').value;
    console.log('Changed blend mode to:', currentBlendMode);
}

function showDebugInfo() {
    console.log('=== DEBUG INFO ===');
    console.log('Canvas size:', canvas.width, 'x', canvas.height);
    console.log('Video ready state:', video.readyState);
    console.log('Video size:', video.videoWidth + 'x' + video.videoHeight);
    console.log('Video current time:', video.currentTime);
    console.log('Video paused:', video.paused);
    console.log('Video ended:', video.ended);
    
    // Test if we can read video pixel data
    if (video.readyState >= video.HAVE_CURRENT_DATA) {
        try {
            const testCanvas = document.createElement('canvas');
            testCanvas.width = 4;
            testCanvas.height = 4;
            const testCtx = testCanvas.getContext('2d');
            testCtx.drawImage(video, 0, 0, 4, 4);
            const imageData = testCtx.getImageData(0, 0, 4, 4);
            console.log('Video pixel test (first 16 values):', Array.from(imageData.data.slice(0, 16)));
        } catch (e) {
            console.error('Cannot read video pixel data:', e);
        }
    }
    
    console.log('Visualizer:', visualizer);
    console.log('Camera enabled:', cameraEnabled);
    console.log('Visualizer enabled:', visualizerEnabled);
    console.log('Current blend mode:', currentBlendMode);
    console.log('WebGL context:', gl);
    console.log('==================');
}

function simpleTextureTest() {
    console.log('=== SIMPLE TEXTURE TEST ===');
    
    // Create a completely fresh WebGL context and test texture sampling
    const testCanvas = document.createElement('canvas');
    testCanvas.width = 512;
    testCanvas.height = 512;
    const testGl = testCanvas.getContext('webgl2');
    
    if (!testGl) {
        console.error('Could not create test WebGL context');
        return;
    }
    
    // Create test texture
    const testTex = testGl.createTexture();
    testGl.bindTexture(testGl.TEXTURE_2D, testTex);
    testGl.texParameteri(testGl.TEXTURE_2D, testGl.TEXTURE_WRAP_S, testGl.CLAMP_TO_EDGE);
    testGl.texParameteri(testGl.TEXTURE_2D, testGl.TEXTURE_WRAP_T, testGl.CLAMP_TO_EDGE);
    testGl.texParameteri(testGl.TEXTURE_2D, testGl.TEXTURE_MIN_FILTER, testGl.LINEAR);
    testGl.texParameteri(testGl.TEXTURE_2D, testGl.TEXTURE_MAG_FILTER, testGl.LINEAR);
    
    // Create bright test data
    const testData = new Uint8Array(4 * 4 * 4);
    for (let i = 0; i < testData.length; i += 4) {
        testData[i] = 255;     // R
        testData[i + 1] = 0;   // G
        testData[i + 2] = 255; // B (magenta)
        testData[i + 3] = 255; // A
    }
    testGl.texImage2D(testGl.TEXTURE_2D, 0, testGl.RGBA, 4, 4, 0, testGl.RGBA, testGl.UNSIGNED_BYTE, testData);
    
    // Simple shader
    const vs = `#version 300 es
        in vec2 a_pos;
        out vec2 v_uv;
        void main() {
            gl_Position = vec4(a_pos, 0.0, 1.0);
            v_uv = a_pos * 0.5 + 0.5;
        }`;
    
    const fs = `#version 300 es
        precision mediump float;
        in vec2 v_uv;
        uniform sampler2D u_tex;
        out vec4 outColor;
        void main() {
            outColor = texture(u_tex, v_uv);
        }`;
    
    const prog = createTestShaderProgram(testGl, vs, fs);
    testGl.useProgram(prog);
    
    // Quad
    const quad = new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]);
    const buf = testGl.createBuffer();
    testGl.bindBuffer(testGl.ARRAY_BUFFER, buf);
    testGl.bufferData(testGl.ARRAY_BUFFER, quad, testGl.STATIC_DRAW);
    
    const posLoc = testGl.getAttribLocation(prog, 'a_pos');
    testGl.vertexAttribPointer(posLoc, 2, testGl.FLOAT, false, 0, 0);
    testGl.enableVertexAttribArray(posLoc);
    
    // Bind texture and render
    testGl.activeTexture(testGl.TEXTURE0);
    testGl.bindTexture(testGl.TEXTURE_2D, testTex);
    testGl.uniform1i(testGl.getUniformLocation(prog, 'u_tex'), 0);
    
    testGl.viewport(0, 0, 512, 512);
    testGl.clearColor(0, 1, 0, 1); // Green background
    testGl.clear(testGl.COLOR_BUFFER_BIT);
    testGl.drawArrays(testGl.TRIANGLES, 0, 6);
    
    // Read back result
    const pixels = new Uint8Array(4 * 4 * 4);
    testGl.readPixels(0, 0, 4, 4, testGl.RGBA, testGl.UNSIGNED_BYTE, pixels);
    console.log('Simple test result (should be magenta):', Array.from(pixels.slice(0, 16)));
    
    // Show the test canvas
    testCanvas.style.position = 'fixed';
    testCanvas.style.top = '100px';
    testCanvas.style.right = '10px';
    testCanvas.style.width = '200px';
    testCanvas.style.height = '200px';
    testCanvas.style.border = '2px solid white';
    testCanvas.style.zIndex = '1001';
    document.body.appendChild(testCanvas);
    
    console.log('Test canvas added to page (top-right corner)');
    console.log('=== END SIMPLE TEXTURE TEST ===');
}

function createTestShaderProgram(gl, vsSource, fsSource) {
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);
    
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);
    
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    
    return prog;
}

async function init() {
    // 1. Get user media (camera and mic)
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        // Setup audio
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        sourceNode = audioContext.createMediaStreamSource(stream);

        // Setup video
        video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true; // We have audio through WebAudio, mute video element
        video.play();
        video.addEventListener('playing', () => {
            initWebGL();
            initButterchurn();
        });

    } catch (err) {
        alert('Could not get camera/microphone access: ' + err.message);
        console.error('getUserMedia error', err);
    }
}

function initWebGL() {
    // Set initial canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    console.log('Initial canvas size:', canvas.width, 'x', canvas.height);
    
    // 2. Create textures and framebuffer
    videoTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, videoTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    // Don't set global pixel store parameters here - set them only when needed
    // to avoid conflicts with Butterchurn's WebGL operations
    
    // Create a test image texture with a simple pattern
    testImageTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, testImageTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    // Create a 256x256 test image with a clear pattern
    const testImageSize = 256;
    const testImageData = new Uint8Array(testImageSize * testImageSize * 4);
    for (let y = 0; y < testImageSize; y++) {
        for (let x = 0; x < testImageSize; x++) {
            const i = (y * testImageSize + x) * 4;
            testImageData[i] = Math.floor((x / testImageSize) * 255); // Red gradient left to right (0-255)
            testImageData[i + 1] = Math.floor((y / testImageSize) * 255); // Green gradient top to bottom (0-255)
            testImageData[i + 2] = 255; // Blue constant (bright blue)
            testImageData[i + 3] = 255; // Alpha
        }
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, testImageSize, testImageSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, testImageData);
    console.log('Created test image texture');
    
    // Don't initialize with test data - let it be initialized when video is ready
    // This avoids size mismatches

    butterchurnTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, butterchurnTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    butterchurnFBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, butterchurnFBO);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, butterchurnTexture, 0);

    // 3. Shader for compositing
    const vsSource = `#version 300 es
        in vec2 a_position;
        out vec2 v_texCoord;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texCoord = a_position * 0.5 + 0.5;
        }
    `;
    const fsSource = `#version 300 es
        precision mediump float;
        in vec2 v_texCoord;
        uniform sampler2D u_butterchurn;
        uniform sampler2D u_camera;
        uniform int u_blendMode;
        uniform bool u_cameraEnabled;
        uniform bool u_visualizerEnabled;
        out vec4 outColor;
        
        void main() {
            vec4 cameraColor = u_cameraEnabled ? texture(u_camera, vec2(v_texCoord.x, 1.0 - v_texCoord.y)) : vec4(1.0);
            vec4 butterchurnColor = u_visualizerEnabled ? texture(u_butterchurn, v_texCoord) : vec4(0.0, 0.0, 0.0, 1.0);
            
            if (u_blendMode == 0) { // multiply
                outColor = cameraColor * butterchurnColor;
            } else if (u_blendMode == 1) { // add
                outColor = cameraColor + butterchurnColor;
            } else if (u_blendMode == 2) { // screen
                outColor = 1.0 - (1.0 - cameraColor) * (1.0 - butterchurnColor);
            } else if (u_blendMode == 3) { // overlay
                outColor = mix(2.0 * cameraColor * butterchurnColor, 
                              1.0 - 2.0 * (1.0 - cameraColor) * (1.0 - butterchurnColor), 
                              step(0.5, cameraColor.rgb).x);
            } else if (u_blendMode == 4) { // camera only
                outColor = cameraColor;
            } else if (u_blendMode == 5) { // visualizer only
                outColor = butterchurnColor;
            } else if (u_blendMode == 6) { // test pattern
                vec2 grid = floor(v_texCoord * 10.0);
                float checker = mod(grid.x + grid.y, 2.0);
                outColor = vec4(checker, 1.0 - checker, 0.5, 1.0);
            } else if (u_blendMode == 7) { // debug camera
                vec2 texCoord = v_texCoord; // Use direct texture coordinates since we're flipping in WebGL
                vec4 cameraColor = texture(u_camera, texCoord);
                
                // Debug: Show different visualizations to understand what's happening
                if (v_texCoord.x < 0.01 || v_texCoord.x > 0.99 || v_texCoord.y < 0.01 || v_texCoord.y > 0.99) {
                    // Thin magenta border
                    outColor = vec4(1.0, 0.0, 1.0, 1.0);
                } else if (v_texCoord.x < 0.33) {
                    // Left third: Show camera color amplified 10x to see if it's just very dark
                    outColor = vec4(cameraColor.rgb * 10.0, 1.0);
                } else if (v_texCoord.x < 0.66) {
                    // Middle third: Show raw camera color
                    outColor = cameraColor;
                } else {
                    // Right third: Show camera color values as brightness (for debugging)
                    float brightness = (cameraColor.r + cameraColor.g + cameraColor.b) / 3.0;
                    outColor = vec4(brightness, brightness, brightness, 1.0);
                }
            } else if (u_blendMode == 8) { // test image
                vec4 testColor = texture(u_butterchurn, v_texCoord); // Use butterchurn texture slot for test image
                
                // Debug: Show what we're getting
                if (v_texCoord.x < 0.01 || v_texCoord.x > 0.99 || v_texCoord.y < 0.01 || v_texCoord.y > 0.99) {
                    // Cyan border to confirm we're in test image mode
                    outColor = vec4(0.0, 1.0, 1.0, 1.0);
                } else if (v_texCoord.x < 0.5) {
                    // Left half: Show texture coordinates as colors (should be red-green gradient)
                    outColor = vec4(v_texCoord, 0.0, 1.0);
                } else {
                    // Right half: Show actual texture sample
                    outColor = testColor;
                }
            } else {
                outColor = cameraColor * butterchurnColor; // default to multiply
            }
        }
    `;
    compositeProgram = createShaderProgram(vsSource, fsSource);

    // 4. A quad to draw on
    const quadVertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
}

async function initButterchurn() {
    // Debug: Log what's available on butterchurn
    console.log('butterchurn object:', butterchurn);
    console.log('butterchurn keys:', Object.keys(butterchurn));
    console.log('butterchurn.createVisualizerWithExternalGL:', butterchurn.createVisualizerWithExternalGL);
    console.log('butterchurn.default:', butterchurn.default);
    if (butterchurn.default) {
        console.log('butterchurn.default keys:', Object.keys(butterchurn.default));
        console.log('butterchurn.default.createVisualizerWithExternalGL:', butterchurn.default.createVisualizerWithExternalGL);
        console.log('butterchurn.default static methods:', Object.getOwnPropertyNames(butterchurn.default));
        console.log('typeof butterchurn.default:', typeof butterchurn.default);
    }

    // Try different ways to access the method
    let ButterchurnClass;
    if (typeof butterchurn.createVisualizerWithExternalGL === 'function') {
        ButterchurnClass = butterchurn;
    } else if (butterchurn.default && typeof butterchurn.default.createVisualizerWithExternalGL === 'function') {
        ButterchurnClass = butterchurn.default;
    } else {
        console.error('Could not find createVisualizerWithExternalGL method');
        console.error('Available methods on butterchurn:', Object.getOwnPropertyNames(butterchurn));
        if (butterchurn.default) {
            console.error('Available methods on butterchurn.default:', Object.getOwnPropertyNames(butterchurn.default));
        }
        throw new Error('createVisualizerWithExternalGL method not found');
    }

    console.log('Using ButterchurnClass:', ButterchurnClass);

    // 5. Initialize Butterchurn
    const visualizerOptions = {
        width: canvas.width,
        height: canvas.height,
        pixelRatio: window.devicePixelRatio || 1,
        textureRatio: 1
    };
    
    // global butterchurn is loaded from the script tag
    try {
        console.log('About to call createVisualizerWithExternalGL with:', audioContext, gl, visualizerOptions);
        visualizer = ButterchurnClass.createVisualizerWithExternalGL(audioContext, gl, visualizerOptions);
        console.log('Successfully created visualizer:', visualizer);
    } catch (error) {
        console.error('Error creating visualizer:', error);
        throw error;
    }

    visualizer.connectAudio(sourceNode);

    // 6. Load a preset
    try {
        console.log('Loading preset from:', PRESET_URL);
        const response = await fetch(PRESET_URL);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const presetMap = await response.json();
        console.log('Loaded preset:', presetMap);
        await visualizer.loadPreset(presetMap, 0.0);
        console.log('Preset loaded successfully');
    } catch(e) {
        console.error('Could not load preset', e);
        alert('Failed to load preset from ' + PRESET_URL);
        return;
    }

    // 7. Start render loop
    render();
    
    // Initialize our separate WebGL context for testing
    initOurOwnWebGL();
}

function render() {
    requestAnimationFrame(render);
    
    // Render with our separate context for test modes
    renderWithOurContext();
    
    if (video.readyState < video.HAVE_CURRENT_DATA) {
        return;
    }

    // Update canvas size
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        visualizer.setRendererSize(canvas.width, canvas.height);
        gl.viewport(0, 0, canvas.width, canvas.height);
        
        // resize framebuffer texture
        gl.bindTexture(gl.TEXTURE_2D, butterchurnTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        console.log('Resized canvas to:', canvas.width, 'x', canvas.height);
    }

    // Clear the screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Method 1: Render butterchurn directly to screen (if enabled)
    if (visualizerEnabled && currentBlendMode === 'visualizer-only') {
        try {
            visualizer.render({ renderToScreen: true });
        } catch (error) {
            console.error('Error rendering visualizer:', error);
        }
        return; // Skip compositing
    }

    // Method 2: For camera-only or debug modes, just render our shader
    if (currentBlendMode === 'camera-only' || currentBlendMode === 'debug-camera' || currentBlendMode === 'test-pattern' || currentBlendMode === 'test-image') {
        // Update video texture if needed (but not in test image mode)
        if (currentBlendMode !== 'test-image' && cameraEnabled && video.readyState >= video.HAVE_CURRENT_DATA) {
            // Initialize texture with correct video dimensions on first use
            if (!videoTextureInitialized) {
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, videoTexture);
                // Initialize with correct video dimensions
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, video.videoWidth, video.videoHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                videoTextureInitialized = true;
                console.log('Initialized video texture with dimensions:', video.videoWidth, 'x', video.videoHeight);
            }
            
            // Only log occasionally to avoid spam
            if (Math.random() < 0.01) { // Log ~1% of the time
                console.log('Updating video texture, video size:', video.videoWidth, 'x', video.videoHeight);
            }
            
            gl.activeTexture(gl.TEXTURE1); // Make sure we're on the right texture unit
            gl.bindTexture(gl.TEXTURE_2D, videoTexture);
            
            try {
                // Set pixel store parameters for video texture
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
                
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
                
                // Restore default pixel store parameters to avoid conflicts with Butterchurn
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
                
                // Check for WebGL errors
                const error = gl.getError();
                if (error !== gl.NO_ERROR) {
                    console.error('WebGL error updating video texture:', error);
                }
                
                // Test: Read back a few pixels from the texture to verify data
                if (Math.random() < 0.001) { // Very rarely, to avoid performance issues
                    const fb = gl.createFramebuffer();
                    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
                    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, videoTexture, 0);
                    
                    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
                        const pixels = new Uint8Array(4 * 4 * 4); // 4x4 RGBA
                        gl.readPixels(0, 0, 4, 4, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                        console.log('WebGL texture pixel test (first 16 values):', Array.from(pixels.slice(0, 16)));
                    }
                    
                    gl.deleteFramebuffer(fb);
                    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                }
            } catch (e) {
                console.error('Error updating video texture:', e);
            }
        } else {
            if (Math.random() < 0.01) { // Log occasionally
                console.log('Not updating video texture - camera enabled:', cameraEnabled, 'video ready:', video.readyState >= video.HAVE_CURRENT_DATA);
            }
        }

        // Render with our shader
        gl.useProgram(compositeProgram);
        
        // CRITICAL: Save ALL WebGL state before our rendering
        // Butterchurn changes state that breaks texture sampling
        const savedState = {
            activeTexture: gl.getParameter(gl.ACTIVE_TEXTURE),
            texture0: gl.getParameter(gl.TEXTURE_BINDING_2D),
            program: gl.getParameter(gl.CURRENT_PROGRAM),
            arrayBuffer: gl.getParameter(gl.ARRAY_BUFFER_BINDING),
            viewport: gl.getParameter(gl.VIEWPORT),
            depthTest: gl.getParameter(gl.DEPTH_TEST),
            blend: gl.getParameter(gl.BLEND),
            cullFace: gl.getParameter(gl.CULL_FACE)
        };
        
        // Set our texture on unit 0 and switch to it
        gl.activeTexture(gl.TEXTURE0);
        const savedTexture0 = gl.getParameter(gl.TEXTURE_BINDING_2D);
        
        gl.activeTexture(gl.TEXTURE1);
        const savedTexture1 = gl.getParameter(gl.TEXTURE_BINDING_2D);
        
        // Debug: Check if program is valid
        if (!gl.getProgramParameter(compositeProgram, gl.LINK_STATUS)) {
            console.error('Shader program link error:', gl.getProgramInfoLog(compositeProgram));
        }
        
        // Ensure proper WebGL state
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.BLEND);
        gl.viewport(0, 0, canvas.width, canvas.height);
        
        // Use our program
        gl.useProgram(compositeProgram);
        
        // Bind textures to shader
        const posLoc = gl.getAttribLocation(compositeProgram, 'a_position');
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(posLoc);

        // CRITICAL: Re-bind textures immediately before draw call
        // Butterchurn might have changed the texture bindings
        gl.activeTexture(gl.TEXTURE0);
        if (currentBlendMode === 'test-image') {
            // Put test image on texture unit 0 for testing
            gl.bindTexture(gl.TEXTURE_2D, testImageTexture);
        } else {
            gl.bindTexture(gl.TEXTURE_2D, butterchurnTexture);
        }
        
        gl.activeTexture(gl.TEXTURE1);
        if (currentBlendMode === 'test-image') {
            // Put a dummy texture on unit 1
            gl.bindTexture(gl.TEXTURE_2D, butterchurnTexture);
        } else {
            gl.bindTexture(gl.TEXTURE_2D, videoTexture);
        }

        const butterchurnLoc = gl.getUniformLocation(compositeProgram, 'u_butterchurn');
        gl.uniform1i(butterchurnLoc, 0);
        
        const cameraLoc = gl.getUniformLocation(compositeProgram, 'u_camera');
        gl.uniform1i(cameraLoc, 1);
        
        // Debug: Check what uniform values are actually set
        if (Math.random() < 0.01) { // Log occasionally
            console.log('Uniform locations - butterchurn:', butterchurnLoc, 'camera:', cameraLoc);
            console.log('Uniform values - butterchurn unit:', gl.getUniform(compositeProgram, butterchurnLoc));
            console.log('Uniform values - camera unit:', gl.getUniform(compositeProgram, cameraLoc));
            console.log('Current active texture unit:', gl.getParameter(gl.ACTIVE_TEXTURE) - gl.TEXTURE0);
        }
        
        // Set other uniforms
        const blendModeMap = {
            'multiply': 0,
            'add': 1,
            'screen': 2,
            'overlay': 3,
            'camera-only': 4,
            'visualizer-only': 5,
            'test-pattern': 6,
            'debug-camera': 7,
            'test-image': 8
        };
        gl.uniform1i(gl.getUniformLocation(compositeProgram, 'u_blendMode'), blendModeMap[currentBlendMode] || 0);
        gl.uniform1i(gl.getUniformLocation(compositeProgram, 'u_cameraEnabled'), cameraEnabled ? 1 : 0);
        gl.uniform1i(gl.getUniformLocation(compositeProgram, 'u_visualizerEnabled'), visualizerEnabled ? 1 : 0);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        
        // CRITICAL: Restore WebGL state for Butterchurn
        gl.useProgram(savedState.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, savedState.arrayBuffer);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, savedTexture0);
        
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, savedTexture1);
        
        gl.activeTexture(savedState.activeTexture);
        
        if (savedState.depthTest) gl.enable(gl.DEPTH_TEST);
        if (savedState.blend) gl.enable(gl.BLEND);
        if (savedState.cullFace) gl.enable(gl.CULL_FACE);
        
        gl.viewport(savedState.viewport[0], savedState.viewport[1], savedState.viewport[2], savedState.viewport[3]);
        
        return;
    }

    // Method 3: For blending modes, we need a different approach
    // This is more complex and would require reading back the butterchurn output
    // For now, let's just render butterchurn directly
    if (visualizerEnabled) {
        try {
            visualizer.render({ renderToScreen: true });
        } catch (error) {
            console.error('Error rendering visualizer:', error);
        }
    }
}

function createShaderProgram(vsSource, fsSource) {
    const vertexShader = loadShader(gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl.FRAGMENT_SHADER, fsSource);
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }
    return shaderProgram;
}

function loadShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function initOurOwnWebGL() {
    // Create our own canvas and WebGL context, completely separate from Butterchurn
    ourCanvas = document.createElement('canvas');
    ourCanvas.width = canvas.width;
    ourCanvas.height = canvas.height;
    ourCanvas.style.position = 'absolute';
    ourCanvas.style.top = '0';
    ourCanvas.style.left = '0';
    ourCanvas.style.width = '100%';
    ourCanvas.style.height = '100%';
    ourCanvas.style.pointerEvents = 'none'; // Don't interfere with controls
    ourCanvas.style.zIndex = '999'; // Above main canvas but below controls
    document.body.appendChild(ourCanvas);
    
    ourGl = ourCanvas.getContext('webgl2');
    if (!ourGl) {
        console.error('Could not create our own WebGL context');
        return false;
    }
    
    // Create our test texture
    ourTestTexture = ourGl.createTexture();
    ourGl.bindTexture(ourGl.TEXTURE_2D, ourTestTexture);
    ourGl.texParameteri(ourGl.TEXTURE_2D, ourGl.TEXTURE_WRAP_S, ourGl.CLAMP_TO_EDGE);
    ourGl.texParameteri(ourGl.TEXTURE_2D, ourGl.TEXTURE_WRAP_T, ourGl.CLAMP_TO_EDGE);
    ourGl.texParameteri(ourGl.TEXTURE_2D, ourGl.TEXTURE_MIN_FILTER, ourGl.LINEAR);
    ourGl.texParameteri(ourGl.TEXTURE_2D, ourGl.TEXTURE_MAG_FILTER, ourGl.LINEAR);
    
    // Create bright test image
    const testImageSize = 256;
    const testImageData = new Uint8Array(testImageSize * testImageSize * 4);
    for (let y = 0; y < testImageSize; y++) {
        for (let x = 0; x < testImageSize; x++) {
            const i = (y * testImageSize + x) * 4;
            testImageData[i] = Math.floor((x / testImageSize) * 255); // Red gradient
            testImageData[i + 1] = Math.floor((y / testImageSize) * 255); // Green gradient
            testImageData[i + 2] = 255; // Blue constant
            testImageData[i + 3] = 255; // Alpha
        }
    }
    ourGl.texImage2D(ourGl.TEXTURE_2D, 0, ourGl.RGBA, testImageSize, testImageSize, 0, ourGl.RGBA, ourGl.UNSIGNED_BYTE, testImageData);
    
    // Create video texture
    ourVideoTexture = ourGl.createTexture();
    ourGl.bindTexture(ourGl.TEXTURE_2D, ourVideoTexture);
    ourGl.texParameteri(ourGl.TEXTURE_2D, ourGl.TEXTURE_WRAP_S, ourGl.CLAMP_TO_EDGE);
    ourGl.texParameteri(ourGl.TEXTURE_2D, ourGl.TEXTURE_WRAP_T, ourGl.CLAMP_TO_EDGE);
    ourGl.texParameteri(ourGl.TEXTURE_2D, ourGl.TEXTURE_MIN_FILTER, ourGl.LINEAR);
    ourGl.texParameteri(ourGl.TEXTURE_2D, ourGl.TEXTURE_MAG_FILTER, ourGl.LINEAR);
    
    // Create Butterchurn texture for capturing visualizer output
    ourButterchurnTexture = ourGl.createTexture();
    ourGl.bindTexture(ourGl.TEXTURE_2D, ourButterchurnTexture);
    ourGl.texParameteri(ourGl.TEXTURE_2D, ourGl.TEXTURE_WRAP_S, ourGl.CLAMP_TO_EDGE);
    ourGl.texParameteri(ourGl.TEXTURE_2D, ourGl.TEXTURE_WRAP_T, ourGl.CLAMP_TO_EDGE);
    ourGl.texParameteri(ourGl.TEXTURE_2D, ourGl.TEXTURE_MIN_FILTER, ourGl.LINEAR);
    ourGl.texParameteri(ourGl.TEXTURE_2D, ourGl.TEXTURE_MAG_FILTER, ourGl.LINEAR);
    // Initialize with canvas size
    ourGl.texImage2D(ourGl.TEXTURE_2D, 0, ourGl.RGBA, canvas.width, canvas.height, 0, ourGl.RGBA, ourGl.UNSIGNED_BYTE, null);
    
    // Enhanced shader for blending
    const vs = `#version 300 es
        in vec2 a_position;
        out vec2 v_texCoord;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texCoord = a_position * 0.5 + 0.5;
        }`;
    
    const fs = `#version 300 es
        precision mediump float;
        in vec2 v_texCoord;
        uniform sampler2D u_camera;
        uniform sampler2D u_butterchurn;
        uniform int u_mode;
        uniform bool u_cameraEnabled;
        uniform bool u_visualizerEnabled;
        out vec4 outColor;
        
        void main() {
            vec4 cameraColor = u_cameraEnabled ? texture(u_camera, vec2(v_texCoord.x, 1.0 - v_texCoord.y)) : vec4(1.0);
            vec4 butterchurnColor = u_visualizerEnabled ? texture(u_butterchurn, v_texCoord) : vec4(0.0, 0.0, 0.0, 1.0);
            
            if (u_mode == 0) { // multiply
                outColor = cameraColor * butterchurnColor;
            } else if (u_mode == 1) { // add
                outColor = cameraColor + butterchurnColor;
            } else if (u_mode == 2) { // screen
                outColor = 1.0 - (1.0 - cameraColor) * (1.0 - butterchurnColor);
            } else if (u_mode == 3) { // overlay
                outColor = mix(2.0 * cameraColor * butterchurnColor, 
                              1.0 - 2.0 * (1.0 - cameraColor) * (1.0 - butterchurnColor), 
                              step(0.5, cameraColor.rgb).x);
            } else if (u_mode == 4) { // camera only
                outColor = cameraColor;
            } else if (u_mode == 5) { // visualizer only
                outColor = butterchurnColor;
            } else if (u_mode == 6) { // test pattern
                vec2 grid = floor(v_texCoord * 10.0);
                float checker = mod(grid.x + grid.y, 2.0);
                outColor = vec4(checker, 1.0 - checker, 0.5, 1.0);
            } else if (u_mode == 7) { // debug camera
                if (v_texCoord.x < 0.01 || v_texCoord.x > 0.99 || v_texCoord.y < 0.01 || v_texCoord.y > 0.99) {
                    outColor = vec4(1.0, 0.0, 1.0, 1.0); // Magenta border
                } else if (v_texCoord.x < 0.33) {
                    outColor = vec4(cameraColor.rgb * 10.0, 1.0); // Amplified camera
                } else if (v_texCoord.x < 0.66) {
                    outColor = cameraColor; // Raw camera
                } else {
                    float brightness = (cameraColor.r + cameraColor.g + cameraColor.b) / 3.0;
                    outColor = vec4(brightness, brightness, brightness, 1.0); // Brightness
                }
            } else if (u_mode == 8) { // test image
                if (v_texCoord.x < 0.01 || v_texCoord.x > 0.99 || v_texCoord.y < 0.01 || v_texCoord.y > 0.99) {
                    outColor = vec4(0.0, 1.0, 1.0, 1.0); // Cyan border
                } else if (v_texCoord.x < 0.5) {
                    outColor = vec4(v_texCoord, 0.0, 1.0); // Texture coordinates
                } else {
                    outColor = texture(u_camera, v_texCoord); // Test image (using camera slot)
                }
            } else {
                outColor = cameraColor * butterchurnColor; // default to multiply
            }
        }`;
    
    ourProgram = createTestShaderProgram(ourGl, vs, fs);
    
    // Create quad
    const quadVertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    ourQuadBuffer = ourGl.createBuffer();
    ourGl.bindBuffer(ourGl.ARRAY_BUFFER, ourQuadBuffer);
    ourGl.bufferData(ourGl.ARRAY_BUFFER, quadVertices, ourGl.STATIC_DRAW);
    
    console.log('Created our own WebGL context');
    return true;
}

function renderWithOurContext() {
    if (!ourGl || !ourProgram) return;
    
    // Update canvas size
    if (ourCanvas.width !== window.innerWidth || ourCanvas.height !== window.innerHeight) {
        ourCanvas.width = window.innerWidth;
        ourCanvas.height = window.innerHeight;
        
        // Resize Butterchurn texture
        ourGl.bindTexture(ourGl.TEXTURE_2D, ourButterchurnTexture);
        ourGl.texImage2D(ourGl.TEXTURE_2D, 0, ourGl.RGBA, ourCanvas.width, ourCanvas.height, 0, ourGl.RGBA, ourGl.UNSIGNED_BYTE, null);
    }
    
    // Always show our canvas now (we handle all modes)
    ourCanvas.style.display = 'block';
    
    // Capture Butterchurn's output if visualizer is enabled
    if (visualizerEnabled && visualizer) {
        // Copy main canvas (where Butterchurn renders) to our texture
        ourGl.bindTexture(ourGl.TEXTURE_2D, ourButterchurnTexture);
        ourGl.copyTexImage2D(ourGl.TEXTURE_2D, 0, ourGl.RGBA, 0, 0, canvas.width, canvas.height, 0);
    }
    
    ourGl.viewport(0, 0, ourCanvas.width, ourCanvas.height);
    ourGl.clearColor(0, 0, 0, 1);
    ourGl.clear(ourGl.COLOR_BUFFER_BIT);
    
    ourGl.useProgram(ourProgram);
    
    // Update video texture if needed
    if (video && video.readyState >= video.HAVE_CURRENT_DATA) {
        ourGl.bindTexture(ourGl.TEXTURE_2D, ourVideoTexture);
        ourGl.pixelStorei(ourGl.UNPACK_FLIP_Y_WEBGL, true);
        ourGl.texImage2D(ourGl.TEXTURE_2D, 0, ourGl.RGBA, ourGl.RGBA, ourGl.UNSIGNED_BYTE, video);
        ourGl.pixelStorei(ourGl.UNPACK_FLIP_Y_WEBGL, false);
    }
    
    // Bind textures
    ourGl.activeTexture(ourGl.TEXTURE0);
    if (currentBlendMode === 'test-image') {
        ourGl.bindTexture(ourGl.TEXTURE_2D, ourTestTexture);
    } else {
        ourGl.bindTexture(ourGl.TEXTURE_2D, ourVideoTexture);
    }
    ourGl.uniform1i(ourGl.getUniformLocation(ourProgram, 'u_camera'), 0);
    
    ourGl.activeTexture(ourGl.TEXTURE1);
    ourGl.bindTexture(ourGl.TEXTURE_2D, ourButterchurnTexture);
    ourGl.uniform1i(ourGl.getUniformLocation(ourProgram, 'u_butterchurn'), 1);
    
    // Set uniforms
    const modeMap = {
        'multiply': 0,
        'add': 1,
        'screen': 2,
        'overlay': 3,
        'camera-only': 4,
        'visualizer-only': 5,
        'test-pattern': 6,
        'debug-camera': 7,
        'test-image': 8
    };
    
    ourGl.uniform1i(ourGl.getUniformLocation(ourProgram, 'u_mode'), modeMap[currentBlendMode] || 0);
    ourGl.uniform1i(ourGl.getUniformLocation(ourProgram, 'u_cameraEnabled'), cameraEnabled ? 1 : 0);
    ourGl.uniform1i(ourGl.getUniformLocation(ourProgram, 'u_visualizerEnabled'), visualizerEnabled ? 1 : 0);
    
    // Draw quad
    const posLoc = ourGl.getAttribLocation(ourProgram, 'a_position');
    ourGl.bindBuffer(ourGl.ARRAY_BUFFER, ourQuadBuffer);
    ourGl.vertexAttribPointer(posLoc, 2, ourGl.FLOAT, false, 0, 0);
    ourGl.enableVertexAttribArray(posLoc);
    
    ourGl.drawArrays(ourGl.TRIANGLES, 0, 6);
}

// Start everything
init(); 

// NEW: Separate WebGL context for our rendering
let ourCanvas;
let ourGl;
let ourVideoTexture;
let ourTestTexture;
let ourButterchurnTexture;
let ourProgram;
let ourQuadBuffer; 