# Butterchurn External WebGL Context Support

This fork adds support for using butterchurn with an external WebGL2RenderingContext, enabling advanced layering effects and integration with other WebGL-based applications.

## 🚀 New Features

### External WebGL Context Support
- **New Method**: `butterchurn.createVisualizerWithExternalGL(audioContext, gl, options)`
- **Shared Context**: Use your own WebGL2RenderingContext instead of butterchurn creating its own
- **Layering**: Enable compositing of visualizer with camera feeds, images, or other WebGL content
- **Flexible Integration**: Integrate butterchurn into existing WebGL applications

## 📋 API Reference

### New Static Method

```javascript
butterchurn.createVisualizerWithExternalGL(audioContext, gl, options)
```

**Parameters:**
- `audioContext`: Web Audio API AudioContext
- `gl`: WebGL2RenderingContext - Your external WebGL context
- `options`: Configuration object (same as original createVisualizer)

**Returns:** Visualizer instance configured to use the external context

### Differences from Original API

| Original | External Context |
|----------|------------------|
| `createVisualizer(audioContext, canvas, options)` | `createVisualizerWithExternalGL(audioContext, gl, options)` |
| Creates internal canvas and WebGL context | Uses your provided WebGL2RenderingContext |
| Renders to canvas via 2D context | Renders directly to your WebGL context |
| Self-contained | Composable with other WebGL content |

## 🎯 Use Cases

### 1. Camera Feed Layering
Blend live camera feed with visualizer effects
```

### 2. Multi-Layer Compositions
Create complex visual compositions with multiple layers:

```javascript
// Your WebGL context
const gl = canvas.getContext('webgl2');

// Multiple visualizers sharing the same context
const visualizer1 = butterchurn.createVisualizerWithExternalGL(audioContext, gl, options);
const visualizer2 = butterchurn.createVisualizerWithExternalGL(audioContext, gl, options);

// Render both to framebuffers and composite
```

### 3. Integration with Existing WebGL Apps
Add butterchurn to your existing WebGL application:

```javascript
// Your existing WebGL application
const myApp = new MyWebGLApp();
const gl = myApp.getContext();

// Add butterchurn visualizer
const visualizer = butterchurn.createVisualizerWithExternalGL(
    audioContext, 
    gl, 
    options
);

// Render both in your main render loop
function render() {
    myApp.render();
    visualizer.render();
}
```

## 🛠️ Implementation Details

### Constructor Changes
The `Visualizer` class constructor now accepts an optional fourth parameter:

```javascript
constructor(audioContext, canvas, opts, externalGl = null)
```

When `externalGl` is provided:
- No internal canvas is created
- The provided WebGL context is used directly
- No automatic canvas copying occurs
- `usingExternalGl` flag is set to true

### Key Modifications

1. **Context Management**
   - Uses external context when provided
   - Skips internal canvas creation
   - Handles context loss appropriately

2. **Rendering Pipeline**
   - Renders directly to external context
   - No automatic 2D canvas copying
   - Maintains all original rendering features

3. **Resize Handling**
   - Properly handles resize without internal canvas
   - Updates renderer dimensions correctly

## 📁 Files Modified

- `src/visualizer.js` - Main visualizer class with external context support
- `src/index.js` - New static method `createVisualizerWithExternalGL`



## 🎮 Usage Examples

### Basic Usage
```javascript
// Create shared WebGL context
const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl2');

// Initialize butterchurn with external context
const visualizer = butterchurn.createVisualizerWithExternalGL(
    audioContext,
    gl,
    {
        width: canvas.width,
        height: canvas.height,
        pixelRatio: window.devicePixelRatio || 1
    }
);

// Load preset and connect audio
visualizer.loadPreset(preset, 0);
visualizer.connectAudio(audioNode);

// Render loop
function render() {
    visualizer.render();
    requestAnimationFrame(render);
}
render();
```

### With Camera Layering
```javascript
// Set up video element and texture
const video = document.createElement('video');
const videoTexture = gl.createTexture();

// Get camera stream
const stream = await navigator.mediaDevices.getUserMedia({ video: true });
video.srcObject = stream;
await video.play();

// Render loop with compositing
function render() {
    // Update video texture
    gl.bindTexture(gl.TEXTURE_2D, videoTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    
    // Render visualizer
    visualizer.render();
    
    // Composite layers with your shader
    compositeLayers();
    
    requestAnimationFrame(render);
}
```

## 🔧 Technical Notes

### WebGL Context Requirements
- **WebGL2**: Required for all butterchurn functionality
- **Extensions**: Some presets may require specific WebGL extensions
- **Context Attributes**: Recommended settings:
  ```javascript
  const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false
  });
  ```

### Memory Management
- External contexts are not automatically managed
- You're responsible for context cleanup
- Call `loseGLContext()` only handles internal contexts

### Performance Considerations
- Sharing contexts can improve performance by reducing context switches
- Large textures for layering may impact performance
- Consider using lower resolution for video textures if needed

## 🐛 Troubleshooting

### Common Issues

1. **WebGL Context Creation Fails**
   ```javascript
   if (!gl) {
       throw new Error('WebGL2 not supported');
   }
   ```

2. **Preset Loading Issues**
   - Ensure presets are loaded before creating visualizer
   - Check browser console for errors

3. **Camera Access Issues**
   - Requires HTTPS in production
   - Check browser permissions
   - Handle getUserMedia promise rejections

4. **Performance Issues**
   - Reduce texture sizes
   - Check for WebGL errors
   - Monitor memory usage

## 🤝 Contributing

This fork maintains compatibility with the original butterchurn API while adding new functionality. When contributing:

1. Ensure backward compatibility
2. Test both external and internal context modes
3. Update documentation for new features
4. Follow existing code style

## 📄 License

Same as original butterchurn project (MIT License).

## 🔗 Related Projects

- [butterchurn](https://github.com/jberg/butterchurn) - Original butterchurn visualizer
- [butterchurn-presets](https://github.com/jberg/butterchurn-presets) - Preset library
- [regl](https://github.com/regl-project/regl) - Functional WebGL library used in examples

---

For more examples and advanced usage, see the demo files and source code in this repository. 