# How to Run the Butterchurn Regl Port

## Method 1: Quick Start with Webpack/Vite

### Prerequisites
```bash
node -v  # Should be v14+ 
npm -v   # Should be v6+
```

### Setup Steps

1. **Install dependencies:**
```bash
npm install
npm install regl  # Add Regl if not already included
```

2. **Create a development entry point:**

**`example/index.js`**
```javascript
import { createReglVisualizer, createReglInstance } from '../src/regl/index.js';

async function main() {
    // Create canvas
    const canvas = document.getElementById('canvas');
    
    // Create Regl instance  
    const regl = createReglInstance(canvas, {
        attributes: {
            antialias: true,
            alpha: false,
            depth: false
        }
    });
    
    // Create audio context
    const audioContext = new AudioContext();
    
    // Create visualizer
    const visualizer = createReglVisualizer(audioContext, regl, {
        width: 800,
        height: 600,
        meshWidth: 48,
        meshHeight: 36,
        pixelRatio: window.devicePixelRatio,
        outputFXAA: true
    });
    
    // Load a basic preset
    const basicPreset = {
        name: "Basic",
        baseVals: {
            decay: 0.98,
            wave_mode: 0,
            wave_a: 0.8,
            wave_r: 1,
            wave_g: 1,
            wave_b: 1
        },
        shapes: [],
        waves: []
    };
    
    await visualizer.loadPreset(basicPreset);
    
    // Setup audio (optional)
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            const source = audioContext.createMediaStreamSource(stream);
            visualizer.connectAudio(source);
        })
        .catch(err => console.log('Microphone access denied:', err));
    
    // Render loop
    function render() {
        visualizer.render();
        requestAnimationFrame(render);
    }
    
    render();
}

main().catch(console.error);
```

3. **Run with a development server:**

**Using Vite:**
```bash
npx vite example --host
```

**Using Webpack Dev Server:**
```bash
npx webpack serve --config webpack.dev.js
```

**Using simple HTTP server:**
```bash
python3 -m http.server 8000
# Then visit http://localhost:8000/example.html
```

---

## Method 2: Node.js/npm Project Setup

1. **Create a new project:**
```bash
mkdir my-butterchurn-app
cd my-butterchurn-app
npm init -y
```

2. **Install dependencies:**
```bash
npm install regl
# Copy the src/regl folder to your project
cp -r /path/to/butterchurn/src/regl ./
```

3. **Create package.json scripts:**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "regl": "^2.1.0",
    "@assemblyscript/loader": "^0.17.11",
    "eel-wasm": "^0.0.15"
  },
  "devDependencies": {
    "vite": "^4.0.0"
  }
}
```

4. **Run the development server:**
```bash
npm run dev
```

---

## Method 3: Direct Browser Usage (ES6 Modules)

**`index.html`**
```html
<!DOCTYPE html>
<html>
<head>
    <script type="importmap">
    {
        "imports": {
            "regl": "https://unpkg.com/regl@2.1.0/dist/regl.min.js"
        }
    }
    </script>
</head>
<body>
    <canvas id="canvas" width="800" height="600"></canvas>
    <script type="module" src="./main.js"></script>
</body>
</html>
```

**`main.js`**
```javascript
import regl from 'regl';
// You'll need to host your regl port files and import them
// import { ReglVisualizer } from './regl/reglVisualizer.js';

// For now, create a simple demo
const canvas = document.getElementById('canvas');
const reglInstance = regl({ canvas });

// Simple demo visualization
const drawCommand = reglInstance({
    vert: `
        attribute vec2 position;
        void main() {
            gl_Position = vec4(position, 0, 1);
        }
    `,
    frag: `
        precision mediump float;
        uniform float time;
        void main() {
            gl_FragColor = vec4(sin(time), cos(time), 0.5, 1.0);
        }
    `,
    attributes: {
        position: [[-1,-1], [1,-1], [-1,1], [-1,1], [1,-1], [1,1]]
    },
    uniforms: {
        time: reglInstance.context('time')
    },
    count: 6
});

function render() {
    drawCommand();
    requestAnimationFrame(render);
}
render();
```

---

## Method 4: Getting Audio and Presets Working

### Audio Sources

**File Upload:**
```javascript
document.getElementById('audioFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = true;
    
    visualizer.connectAudio(source);
    source.connect(audioContext.destination);
    source.start();
});
```

**Microphone Input:**
```javascript
navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
        const source = audioContext.createMediaStreamSource(stream);
        visualizer.connectAudio(source);
    });
```

**HTML Audio Element:**
```javascript
const audio = document.getElementById('audio');
const source = audioContext.createMediaElementSource(audio);
visualizer.connectAudio(source);
source.connect(audioContext.destination);
```

### Loading Presets

**From JSON file:**
```javascript
fetch('./presets/example.json')
    .then(res => res.json())
    .then(preset => visualizer.loadPreset(preset));
```

**Sample preset structure:**
```json
{
    "name": "Sample Preset",
    "baseVals": {
        "decay": 0.98,
        "wave_mode": 0,
        "wave_a": 0.8,
        "zoom": 1.0,
        "rot": 0.0,
        "cx": 0.5,
        "cy": 0.5
    },
    "waves": [],
    "shapes": []
}
```

---

## Troubleshooting

### Common Issues:

1. **CORS Errors:** Use a local server, don't open HTML files directly
2. **WebGL Extensions:** Check browser support for required extensions
3. **Audio Context:** Must be created after user interaction
4. **Module Resolution:** Ensure proper import paths and build configuration

### Browser Support Check:
```javascript
import { isReglSupported } from './src/regl/index.js';

if (!isReglSupported()) {
    alert('Your browser does not support the required WebGL features');
}
```

### Debug Mode:
```javascript
const visualizer = createReglVisualizer(audioContext, regl, {
    width: 800,
    height: 600,
    debug: true  // Enable debug logging
});
```

---

## Next Steps

1. **Start with Method 1** for quickest results
2. **Try the example.html** file provided above
3. **Add your own presets** from butterchurn preset collections
4. **Experiment with multiple visualizers** in the same context
5. **Build your own preset editor** using the modular components

**Ready to rock!** 🎵✨ 