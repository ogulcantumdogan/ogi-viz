# Butterchurn Regl Port

This is a complete port of the butterchurn music visualizer to use [Regl](https://github.com/regl-project/regl) instead of raw WebGL. This port provides better modularity, easier integration with external Regl contexts, and support for multiple visualization layers.

## Features

- **Regl-based Architecture**: All rendering components converted to use Regl commands
- **External Context Support**: Works with existing Regl instances for easy integration
- **Modular Components**: Each rendering component can be used independently
- **Multi-layer Support**: Render multiple visualizations in the same context
- **Full Preset Compatibility**: Supports all existing butterchurn presets (both JS and WASM)
- **Performance Optimized**: Leverages Regl's efficient command batching

## Installation

```bash
npm install butterchurn regl
```

## Basic Usage

### Simple Setup

```javascript
import { createReglVisualizer, createReglInstance } from 'butterchurn/regl';

// Create canvas and Regl instance
const canvas = document.getElementById('canvas');
const regl = createReglInstance(canvas);

// Create audio context
const audioContext = new AudioContext();

// Create visualizer
const visualizer = createReglVisualizer(audioContext, regl, {
  width: 800,
  height: 600,
  meshWidth: 48,
  meshHeight: 36
});

// Connect audio source
const audioElement = document.getElementById('audio');
const source = audioContext.createMediaElementSource(audioElement);
visualizer.connectAudio(source);
source.connect(audioContext.destination);

// Load a preset
fetch('/presets/preset.json')
  .then(res => res.json())
  .then(preset => visualizer.loadPreset(preset));

// Render loop
function render() {
  visualizer.render();
  requestAnimationFrame(render);
}
render();
```

### Advanced Usage with External Regl Context

```javascript
import ReglVisualizer from 'butterchurn/regl';
import createRegl from 'regl';

// Create your own Regl instance with custom settings
const regl = createRegl({
  canvas: document.getElementById('canvas'),
  attributes: {
    antialias: true,
    alpha: true
  },
  extensions: ['OES_texture_float']
});

// Create visualizer with existing context
const visualizer = new ReglVisualizer(audioContext, regl, {
  width: 1920,
  height: 1080,
  pixelRatio: window.devicePixelRatio,
  textureRatio: 1.0,
  meshWidth: 64,
  meshHeight: 48,
  outputFXAA: true
});

// Your other Regl rendering code can coexist
const drawMyScene = regl({
  // Your scene rendering commands
});

function render() {
  // Render your scene
  drawMyScene();
  
  // Render visualizer on top
  visualizer.render();
  
  requestAnimationFrame(render);
}
```

### Multiple Visualizer Layers

```javascript
import { createReglVisualizer } from 'butterchurn/regl';

// Create multiple visualizers sharing the same context
const visualizer1 = createReglVisualizer(audioContext, regl, {
  width: 800,
  height: 600
});

const visualizer2 = createReglVisualizer(audioContext, regl, {
  width: 800,
  height: 600
});

// Load different presets
visualizer1.loadPreset(preset1);
visualizer2.loadPreset(preset2);

function render() {
  // Render both visualizers with different blend modes
  regl.clear({ color: [0, 0, 0, 1] });
  
  visualizer1.render();
  
  // Change blend mode for second layer
  regl({
    blend: {
      enable: true,
      func: { src: 'src alpha', dst: 'one' }
    }
  })(() => {
    visualizer2.render();
  });
  
  requestAnimationFrame(render);
}
```

## API Reference

### ReglVisualizer

The main visualizer class that manages the entire rendering pipeline.

#### Constructor

```javascript
new ReglVisualizer(audioContext, reglInstance, options)
```

**Parameters:**
- `audioContext` (AudioContext): Web Audio API context
- `reglInstance` (Object): Regl instance for rendering
- `options` (Object): Configuration options

**Options:**
```javascript
{
  width: 1200,           // Canvas width
  height: 900,           // Canvas height
  meshWidth: 48,         // Internal mesh resolution width
  meshHeight: 36,        // Internal mesh resolution height
  pixelRatio: 1.0,       // Device pixel ratio
  textureRatio: 1.0,     // Texture scaling ratio
  outputFXAA: false,     // Enable FXAA anti-aliasing
  onlyUseWASM: false     // Force WASM-only preset execution
}
```

#### Methods

##### `connectAudio(audioNode)`
Connect an audio source to the visualizer.

##### `loadPreset(preset, blendTime = 0)`
Load a visualization preset with optional blend transition.

##### `setRendererSize(width, height, options)`
Update the renderer size and internal parameters.

##### `render(options)`
Render a single frame of the visualization.

##### `launchSongTitleAnim(text)`
Display animated song title text.

##### `loadExtraImages(imageData)`
Load additional images for use in presets.

### Utility Functions

#### `createReglInstance(canvas, options)`
Create a Regl instance with optimal settings for butterchurn.

```javascript
const regl = createReglInstance('#canvas', {
  attributes: {
    antialias: true,
    alpha: true
  }
});
```

#### `isReglSupported()`
Check if Regl and required WebGL features are supported.

```javascript
if (isReglSupported()) {
  // Initialize visualizer
} else {
  // Show fallback
}
```

## Component Architecture

The Regl port is built with modular components that can be used independently:

### Core Components

- **ReglRenderer**: Main rendering pipeline manager
- **ReglNoise**: Noise texture generator
- **ReglImageTextures**: Image texture manager

### Shader Components

- **ReglWarpShader**: Vertex warping and transformation
- **ReglCompShader**: Composite shader effects
- **ReglOutputShader**: Final output with optional FXAA
- **ReglBlurShader**: Multi-pass Gaussian blur

### Visual Components

- **ReglBasicWaveform**: Basic audio waveform rendering
- **ReglCustomWaveform**: Advanced programmable waveforms
- **ReglCustomShape**: Geometric shape rendering
- **ReglBorder**: Inner/outer border effects
- **ReglDarkenCenter**: Radial darkness effects
- **ReglMotionVectors**: Animated motion vector grids
- **ReglTitleText**: Song title text rendering

## Migration from Original Butterchurn

### Differences

1. **Regl Dependency**: Requires Regl library instead of raw WebGL
2. **Constructor**: Takes Regl instance instead of canvas element
3. **Context Sharing**: Can share Regl context with other rendering code
4. **Modular Exports**: Individual components can be imported separately

### Migration Steps

1. Install Regl dependency
2. Create Regl instance instead of passing canvas directly
3. Update constructor calls to use new signature
4. Optional: Refactor to use individual components for custom rendering

### Example Migration

**Before (Original):**
```javascript
import Visualizer from 'butterchurn';

const visualizer = new Visualizer(audioContext, canvas, {
  width: 800,
  height: 600
});
```

**After (Regl Port):**
```javascript
import { createReglVisualizer, createReglInstance } from 'butterchurn/regl';

const regl = createReglInstance(canvas);
const visualizer = createReglVisualizer(audioContext, regl, {
  width: 800,
  height: 600
});
```

## Performance Considerations

### Optimization Tips

1. **Texture Ratio**: Use lower `textureRatio` on mobile devices
2. **Mesh Resolution**: Reduce `meshWidth`/`meshHeight` for better performance
3. **FXAA**: Only enable `outputFXAA` when needed
4. **Context Sharing**: Reuse Regl instances across multiple visualizers

### Memory Management

The Regl port automatically manages GPU resources, but you should:

1. Call `visualizer.setRendererSize()` when canvas size changes
2. Dispose of visualizer instances when no longer needed
3. Avoid creating too many concurrent visualizer instances

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

Requires WebGL 1.0 with the following extensions:
- `OES_texture_float`
- `OES_texture_half_float`

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Credits

- Original butterchurn by Jordan Berg
- Regl port implementation
- Regl library by Mikola Lysenko and contributors 