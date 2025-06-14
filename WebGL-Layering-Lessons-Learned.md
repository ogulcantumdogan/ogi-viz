# WebGL Layering with Butterchurn: Lessons Learned

## Executive Summary

This document captures the key insights from implementing real-time camera feed blending with Butterchurn visualizer. The primary challenge was WebGL context interference that prevented texture sampling in shared contexts. The solution involved creating isolated WebGL contexts for reliable layering and blending operations.

## Key Technical Takeaways

### 1. WebGL Context Isolation is Critical

**Problem**: Shared WebGL contexts between libraries can cause state conflicts that break texture sampling, even when textures contain valid data.

**Solution**: Create separate WebGL contexts for different rendering responsibilities:
- Main context: Butterchurn visualizer
- Isolated context: Camera processing and compositing
- Communication: Texture copying via `copyTexImage2D`

### 2. Texture Sampling Debugging Strategy

When texture sampling fails, use this systematic approach:

1. **Verify texture data**: Read back pixel data to confirm texture contains expected values
2. **Test shader execution**: Replace texture sampling with solid colors to verify shader works
3. **Isolate the problem**: Create minimal test cases in fresh WebGL contexts
4. **Check WebGL state**: Save/restore state or use separate contexts entirely

### 3. Video Texture Best Practices

For reliable video texture updates:
```javascript
// Set pixel store parameters only when needed
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
// Restore defaults immediately
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
```

### 4. Robust Architecture Pattern

```
┌─────────────────┐    ┌─────────────────┐
│   Main Canvas   │    │  Overlay Canvas │
│  (Butterchurn)  │───▶│   (Compositing) │
│                 │    │                 │
│ WebGL Context 1 │    │ WebGL Context 2 │
└─────────────────┘    └─────────────────┘
                              ▲
                              │
                       ┌─────────────┐
                       │ Camera Feed │
                       │   Texture   │
                       └─────────────┘
```

### 5. Performance Considerations

- **Texture copying**: `copyTexImage2D` is efficient for capturing rendered output
- **Context switching**: Minimal overhead when properly managed
- **Memory usage**: Each context maintains its own texture memory
- **Render order**: Butterchurn renders first, then compositing layer captures and blends

### 6. Blend Mode Implementation

Implement multiple blend modes in fragment shaders for real-time effects:
- **Multiply**: `result = camera * visualizer` (darker, dramatic)
- **Add**: `result = camera + visualizer` (brighter, vibrant)
- **Screen**: `result = 1.0 - (1.0 - camera) * (1.0 - visualizer)` (bright, inverted multiply)
- **Overlay**: Conditional blend based on luminance values

## Recommended System Architecture

### For New Projects

1. **Design for isolation**: Plan separate contexts from the beginning
2. **Modular rendering**: Each visual layer gets its own context and responsibility
3. **Central compositor**: One context handles final blending and output
4. **State management**: Minimize shared WebGL state between contexts

### For Existing Projects

1. **Identify interference**: Test texture sampling in isolation
2. **Gradual migration**: Move problematic operations to separate contexts
3. **Maintain compatibility**: Keep existing APIs while adding isolated rendering paths
4. **Performance monitoring**: Measure impact of context separation

## Implementation Checklist

- [ ] Create separate canvas elements for each rendering layer
- [ ] Initialize independent WebGL contexts
- [ ] Implement texture capture mechanism (`copyTexImage2D`)
- [ ] Design shader-based blending system
- [ ] Add proper error handling and fallbacks
- [ ] Test with various video formats and sizes
- [ ] Optimize for target frame rates
- [ ] Document context responsibilities and data flow

---

## Why It Didn't Work Initially & How We Solved It

**The Problem**: Butterchurn was modifying shared WebGL state (texture bindings, active texture units, shader programs) that interfered with our texture sampling operations. Even though our textures contained valid data and our shaders were correct, the sampling would return black/empty values because Butterchurn had changed the WebGL context state in ways that broke our rendering pipeline.

**The Solution**: We created a completely separate WebGL context for our camera processing and compositing operations. This context runs independently of Butterchurn's WebGL state changes. We capture Butterchurn's visual output using `copyTexImage2D` and then perform all blending operations in our isolated context. This pattern ensures that no matter what WebGL state changes Butterchurn makes, our rendering pipeline remains unaffected and reliable.

**Key Insight**: When integrating with third-party WebGL libraries, assume they will modify global WebGL state in unpredictable ways. Design your architecture to be resilient to this by using context isolation rather than trying to manage shared state. This principle applies to any situation where multiple systems need to perform complex WebGL operations simultaneously. 