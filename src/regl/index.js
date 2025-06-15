// Main Regl Visualizer Export
import ReglVisualizer from './reglVisualizer';
import ReglRenderer from './reglRenderer';

// Shader Components
import ReglWarpShader from './shaders/reglWarpShader';
import ReglCompShader from './shaders/reglCompShader';
import ReglOutputShader from './shaders/reglOutputShader';
import ReglBlurShader from './shaders/reglBlurShader';

// Rendering Components
import ReglNoise from './reglNoise';
import ReglImageTextures from './reglImageTextures';

// Wave Components
import ReglBasicWaveform from './waves/reglBasicWaveform';
import ReglCustomWaveform from './waves/reglCustomWaveform';

// Shape Components
import ReglCustomShape from './shapes/reglCustomShape';

// Sprite Components
import ReglBorder from './sprites/reglBorder';
import ReglDarkenCenter from './sprites/reglDarkenCenter';

// Effect Components
import ReglMotionVectors from './motionVectors/reglMotionVectors';
import ReglTitleText from './text/reglTitleText';

// Main exports
export default ReglVisualizer;
export { ReglRenderer };

// Individual component exports for advanced usage
export {
  // Shaders
  ReglWarpShader,
  ReglCompShader,
  ReglOutputShader,
  ReglBlurShader,
  
  // Core rendering
  ReglNoise,
  ReglImageTextures,
  
  // Waves
  ReglBasicWaveform,
  ReglCustomWaveform,
  
  // Shapes
  ReglCustomShape,
  
  // Sprites
  ReglBorder,
  ReglDarkenCenter,
  
  // Effects
  ReglMotionVectors,
  ReglTitleText,
};

/**
 * Create a new Regl-based butterchurn visualizer
 * @param {AudioContext} audioContext - Web Audio API context
 * @param {Object} reglInstance - Regl instance for rendering
 * @param {Object} opts - Configuration options
 * @returns {ReglVisualizer} - Configured visualizer instance
 */
export function createReglVisualizer(audioContext, reglInstance, opts = {}) {
  return new ReglVisualizer(audioContext, reglInstance, opts);
}

/**
 * Utility function to create a Regl instance with appropriate settings
 * @param {HTMLCanvasElement|string} canvas - Canvas element or selector
 * @param {Object} opts - Regl configuration options
 * @returns {Object} - Regl instance
 */
export function createReglInstance(canvas, opts = {}) {
  const regl = require('regl');
  
  const defaultOpts = {
    canvas: typeof canvas === 'string' ? document.querySelector(canvas) : canvas,
    attributes: {
      antialias: true,
      depth: false,
      stencil: false,
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    },
    extensions: [
      'OES_texture_float',
      'OES_texture_half_float',
      'WEBGL_color_buffer_float',
    ],
    ...opts,
  };
  
  return regl(defaultOpts);
}

/**
 * Check if Regl and required WebGL features are supported
 * @returns {boolean} - True if supported
 */
export function isReglSupported() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      return false;
    }
    
    // Check for required extensions
    const requiredExtensions = [
      'OES_texture_float',
      'OES_texture_half_float',
    ];
    
    for (const ext of requiredExtensions) {
      if (!gl.getExtension(ext)) {
        console.warn(`WebGL extension ${ext} not supported`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error checking Regl support:', error);
    return false;
  }
} 