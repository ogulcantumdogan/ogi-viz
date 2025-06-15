#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Building Butterchurn Regl Port...\n');

// Create dist directory
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Simple module bundler for the Regl port
function bundleModule(entryFile, outputFile) {
    console.log(`📦 Bundling ${entryFile} -> ${outputFile}`);
    
    const entryPath = path.join(__dirname, entryFile);
    let code = fs.readFileSync(entryPath, 'utf8');
    
    // Simple import resolution (for demo purposes)
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"];?/g;
    const resolvedImports = new Set();
    
    function resolveImports(filePath, basePath = __dirname) {
        const fullPath = path.resolve(basePath, filePath);
        
        if (resolvedImports.has(fullPath)) {
            return '';
        }
        resolvedImports.add(fullPath);
        
        try {
            let content = fs.readFileSync(fullPath, 'utf8');
            
            // Remove export default and convert to variable assignment
            content = content.replace(/export\s+default\s+class\s+(\w+)/, 'class $1');
            content = content.replace(/export\s+default\s+(\w+)/, 'const $1_default = $1;');
            content = content.replace(/export\s*{\s*([^}]+)\s*}/, '// Exported: $1');
            
            // Resolve nested imports
            content = content.replace(importRegex, (match, importPath) => {
                if (importPath.startsWith('.')) {
                    const resolvedPath = path.resolve(path.dirname(fullPath), importPath + '.js');
                    return resolveImports(resolvedPath, path.dirname(fullPath));
                }
                return `// External import: ${importPath}`;
            });
            
            return content + '\n';
        } catch (error) {
            console.warn(`⚠️  Could not resolve import: ${filePath}`);
            return `// Could not resolve: ${filePath}\n`;
        }
    }
    
    // Bundle all imports
    let bundledCode = `
// Butterchurn Regl Port - Auto-generated Bundle
// Generated on: ${new Date().toISOString()}

(function() {
    'use strict';
    
    // Polyfill for module loading
    const exports = {};
    const module = { exports };
    
`;
    
    // Add resolved imports
    code = code.replace(importRegex, (match, importPath) => {
        if (importPath.startsWith('.')) {
            const resolvedPath = path.resolve(path.dirname(entryPath), importPath + '.js');
            bundledCode += resolveImports(resolvedPath, path.dirname(entryPath));
            return `// Bundled: ${importPath}`;
        }
        return match;
    });
    
    bundledCode += code;
    bundledCode += `
    
    // Export main classes
    window.ReglVisualizer = ReglVisualizer;
    window.createReglVisualizer = createReglVisualizer;
    window.createReglInstance = createReglInstance;
    window.isReglSupported = isReglSupported;
    
})();
`;
    
    const outputPath = path.join(distDir, outputFile);
    fs.writeFileSync(outputPath, bundledCode);
    console.log(`✅ Bundle created: ${outputPath}`);
    
    return bundledCode;
}

// Bundle the main entry point
try {
    bundleModule('src/regl/index.js', 'butterchurn-regl.js');
    
    // Create a minified version header
    const minifiedPath = path.join(distDir, 'butterchurn-regl.min.js');
    const minifiedCode = `// Butterchurn Regl Port - Minified (${new Date().toISOString()})
// For production use, please run through a proper minifier like Terser
// This is just a basic concatenated version for development
` + fs.readFileSync(path.join(distDir, 'butterchurn-regl.js'), 'utf8');
    
    fs.writeFileSync(minifiedPath, minifiedCode);
    
    // Create example HTML that uses the bundle
    const exampleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Butterchurn Regl Port - Bundled Example</title>
    <style>
        body {
            margin: 0;
            background: black;
            font-family: Arial, sans-serif;
            color: white;
            overflow: hidden;
        }
        
        #canvas {
            display: block;
            width: 100vw;
            height: 100vh;
        }
        
        #controls {
            position: absolute;
            top: 10px;
            left: 10px;
            z-index: 100;
            background: rgba(0, 0, 0, 0.8);
            padding: 15px;
            border-radius: 5px;
            max-width: 300px;
        }
        
        button {
            margin: 5px;
            padding: 8px 15px;
            background: #333;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
        }
        
        button:hover {
            background: #555;
        }
        
        input {
            margin: 5px 0;
            width: 100%;
        }
        
        .status {
            margin-top: 10px;
            font-size: 12px;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <canvas id="canvas"></canvas>
    
    <div id="controls">
        <h3>🎵 Butterchurn Regl</h3>
        
        <div>
            <input type="file" id="audioFile" accept="audio/*" placeholder="Select Audio File">
        </div>
        
        <div>
            <button onclick="loadDemo()">🎨 Load Demo</button>
            <button onclick="toggleAudio()">▶️ Play/Pause</button>
            <button onclick="useMicrophone()">🎤 Use Mic</button>
        </div>
        
        <div class="status">
            <p>Status: <span id="status">Ready</span></p>
            <p>FPS: <span id="fps">0</span></p>
        </div>
    </div>

    <!-- Load Regl -->
    <script src="https://unpkg.com/regl@2.1.0/dist/regl.min.js"></script>
    
    <!-- Load the bundled Butterchurn Regl port -->
    <script src="./butterchurn-regl.js"></script>
    
    <script>
        let visualizer, audioContext, currentAudio, isPlaying = false;
        let frameCount = 0;
        let lastTime = performance.now();
        
        async function init() {
            try {
                // Check support
                if (!window.isReglSupported()) {
                    throw new Error('WebGL/Regl not supported');
                }
                
                // Create audio context
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                // Create canvas and Regl
                const canvas = document.getElementById('canvas');
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                
                const regl = window.createReglInstance(canvas);
                
                // Create visualizer
                visualizer = window.createReglVisualizer(audioContext, regl, {
                    width: canvas.width,
                    height: canvas.height,
                    meshWidth: 48,
                    meshHeight: 36,
                    pixelRatio: window.devicePixelRatio,
                    outputFXAA: true
                });
                
                updateStatus('Visualizer initialized ✅');
                
                // Start render loop
                startRenderLoop();
                
            } catch (error) {
                console.error('Initialization failed:', error);
                updateStatus('❌ Init failed: ' + error.message);
            }
        }
        
        function startRenderLoop() {
            function render() {
                frameCount++;
                const currentTime = performance.now();
                
                // Update FPS counter
                if (currentTime - lastTime >= 1000) {
                    document.getElementById('fps').textContent = frameCount;
                    frameCount = 0;
                    lastTime = currentTime;
                }
                
                // Render frame
                if (visualizer) {
                    visualizer.render();
                }
                
                requestAnimationFrame(render);
            }
            render();
        }
        
        // Control functions
        window.loadDemo = async function() {
            const demoPreset = {
                name: "Demo Preset",
                baseVals: {
                    decay: 0.98,
                    wave_mode: 0,
                    wave_a: 0.8,
                    wave_r: 1,
                    wave_g: 0.5,
                    wave_b: 0.8,
                    zoom: 1.02,
                    rot: 0.01,
                    cx: 0.5,
                    cy: 0.5,
                    dx: 0,
                    dy: 0,
                    warp: 1.5,
                    sx: 1,
                    sy: 1
                },
                shapes: [],
                waves: []
            };
            
            if (visualizer) {
                await visualizer.loadPreset(demoPreset);
                updateStatus('🎨 Demo preset loaded');
            }
        };
        
        window.toggleAudio = function() {
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            
            if (currentAudio) {
                if (isPlaying) {
                    currentAudio.pause();
                    updateStatus('⏸️ Audio paused');
                } else {
                    currentAudio.play();
                    updateStatus('▶️ Audio playing');
                }
                isPlaying = !isPlaying;
            } else {
                updateStatus('⚠️ No audio loaded');
            }
        };
        
        window.useMicrophone = async function() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const source = audioContext.createMediaStreamSource(stream);
                
                if (visualizer) {
                    visualizer.connectAudio(source);
                    updateStatus('🎤 Microphone connected');
                }
            } catch (error) {
                updateStatus('❌ Microphone access denied');
            }
        };
        
        // Audio file handling
        document.getElementById('audioFile').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const url = URL.createObjectURL(file);
                    currentAudio = new Audio(url);
                    currentAudio.loop = true;
                    currentAudio.crossOrigin = 'anonymous';
                    
                    const source = audioContext.createMediaElementSource(currentAudio);
                    
                    if (visualizer) {
                        visualizer.connectAudio(source);
                    }
                    
                    source.connect(audioContext.destination);
                    updateStatus('🎵 Audio file loaded: ' + file.name);
                    
                } catch (error) {
                    updateStatus('❌ Audio load failed: ' + error.message);
                }
            }
        });
        
        function updateStatus(message) {
            document.getElementById('status').textContent = message;
            console.log(message);
        }
        
        // Handle window resize
        window.addEventListener('resize', () => {
            const canvas = document.getElementById('canvas');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            if (visualizer) {
                visualizer.setRendererSize(canvas.width, canvas.height);
            }
        });
        
        // Initialize when page loads
        window.addEventListener('load', init);
    </script>
</body>
</html>`;
    
    fs.writeFileSync(path.join(distDir, 'example.html'), exampleHtml);
    
    console.log('\n🎉 Build complete!');
    console.log('\n📁 Generated files:');
    console.log('   dist/butterchurn-regl.js');
    console.log('   dist/butterchurn-regl.min.js');
    console.log('   dist/example.html');
    
    console.log('\n🚀 To run:');
    console.log('   1. Start a local server: python3 -m http.server 8000');
    console.log('   2. Open: http://localhost:8000/dist/example.html');
    console.log('   3. Load audio file and enjoy! 🎵');
    
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
} 