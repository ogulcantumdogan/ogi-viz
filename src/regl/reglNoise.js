export default class ReglNoise {
  constructor(regl) {
    this.regl = regl;
    
    // Generate noise textures
    this.createNoiseTextures();
  }
  
  createNoiseTextures() {
    // Low Quality Noise (32x32)
    const noiseLQ = this.generateNoiseData(32, 32);
    this.noiseTexLQ = this.regl.texture({
      width: 32,
      height: 32,
      data: noiseLQ,
      format: 'rgba',
      type: 'uint8',
      wrap: 'repeat',
      min: 'linear',
      mag: 'linear'
    });
    
    // Medium Quality Noise (64x64)
    const noiseMQ = this.generateNoiseData(64, 64);
    this.noiseTexMQ = this.regl.texture({
      width: 64,
      height: 64,
      data: noiseMQ,
      format: 'rgba',
      type: 'uint8',
      wrap: 'repeat',
      min: 'linear',
      mag: 'linear'
    });
    
    // High Quality Noise (128x128)
    const noiseHQ = this.generateNoiseData(128, 128);
    this.noiseTexHQ = this.regl.texture({
      width: 128,
      height: 128,
      data: noiseHQ,
      format: 'rgba',
      type: 'uint8',
      wrap: 'repeat',
      min: 'linear',
      mag: 'linear'
    });
    
    // Low Quality Lite Noise (32x32, single channel)
    const noiseLQLite = this.generateNoiseDataLite(32, 32);
    this.noiseTexLQLite = this.regl.texture({
      width: 32,
      height: 32,
      data: noiseLQLite,
      format: 'rgba',
      type: 'uint8',
      wrap: 'repeat',
      min: 'linear',
      mag: 'linear'
    });
  }
  
  generateNoiseData(width, height) {
    const data = new Uint8Array(width * height * 4);
    let index = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Generate random noise values
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        const a = Math.floor(Math.random() * 256);
        
        data[index++] = r;
        data[index++] = g;
        data[index++] = b;
        data[index++] = a;
      }
    }
    
    return data;
  }
  
  generateNoiseDataLite(width, height) {
    const data = new Uint8Array(width * height * 4);
    let index = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Generate single channel noise, replicated to all channels
        const noise = Math.floor(Math.random() * 256);
        
        data[index++] = noise;
        data[index++] = noise;
        data[index++] = noise;
        data[index++] = 255; // Full alpha
      }
    }
    
    return data;
  }
  
  // Generate Perlin-like noise (more structured)
  generatePerlinNoise(width, height, scale = 0.1) {
    const data = new Uint8Array(width * height * 4);
    let index = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Simple pseudo-Perlin noise
        const nx = x * scale;
        const ny = y * scale;
        
        const noise = this.perlinNoise(nx, ny);
        const value = Math.floor((noise + 1) * 127.5); // Convert from [-1,1] to [0,255]
        
        data[index++] = value;
        data[index++] = value;
        data[index++] = value;
        data[index++] = 255;
      }
    }
    
    return data;
  }
  
  // Simple Perlin noise implementation
  perlinNoise(x, y) {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
  }
  
  // Get noise texture by quality level
  getNoiseTexture(quality) {
    switch (quality) {
      case 'lq':
        return this.noiseTexLQ;
      case 'mq':
        return this.noiseTexMQ;
      case 'hq':
        return this.noiseTexHQ;
      case 'lq_lite':
        return this.noiseTexLQLite;
      default:
        return this.noiseTexMQ;
    }
  }
} 