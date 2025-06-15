export default class ReglImageTextures {
  constructor(regl) {
    this.regl = regl;
    this.imageTextures = {};
    this.maxTextures = 16; // Limit for performance
  }
  
  loadExtraImages(imageData) {
    if (!imageData || typeof imageData !== 'object') {
      return;
    }
    
    // Clear existing textures
    this.clearTextures();
    
    Object.keys(imageData).forEach((key, index) => {
      if (index >= this.maxTextures) {
        console.warn(`Maximum texture limit (${this.maxTextures}) reached, skipping ${key}`);
        return;
      }
      
      const imageInfo = imageData[key];
      this.loadImage(key, imageInfo);
    });
  }
  
  loadImage(key, imageInfo) {
    try {
      if (imageInfo.data instanceof ImageData) {
        // Handle ImageData
        this.imageTextures[key] = this.regl.texture({
          width: imageInfo.data.width,
          height: imageInfo.data.height,
          data: imageInfo.data.data,
          format: 'rgba',
          type: 'uint8',
          wrap: 'repeat',
          min: 'linear',
          mag: 'linear'
        });
      } else if (imageInfo.data instanceof HTMLImageElement) {
        // Handle HTMLImageElement
        this.imageTextures[key] = this.regl.texture({
          data: imageInfo.data,
          format: 'rgba',
          wrap: 'repeat',
          min: 'linear',
          mag: 'linear'
        });
      } else if (imageInfo.data instanceof HTMLCanvasElement) {
        // Handle HTMLCanvasElement
        this.imageTextures[key] = this.regl.texture({
          data: imageInfo.data,
          format: 'rgba',
          wrap: 'repeat',
          min: 'linear',
          mag: 'linear'
        });
      } else if (imageInfo.data instanceof Uint8Array) {
        // Handle raw pixel data
        if (imageInfo.width && imageInfo.height) {
          this.imageTextures[key] = this.regl.texture({
            width: imageInfo.width,
            height: imageInfo.height,
            data: imageInfo.data,
            format: 'rgba',
            type: 'uint8',
            wrap: 'repeat',
            min: 'linear',
            mag: 'linear'
          });
        }
      } else if (typeof imageInfo.data === 'string') {
        // Handle base64 or URL string
        this.loadImageFromUrl(key, imageInfo.data);
      }
    } catch (error) {
      console.warn(`Failed to load image texture '${key}':`, error);
    }
  }
  
  loadImageFromUrl(key, url) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        this.imageTextures[key] = this.regl.texture({
          data: img,
          format: 'rgba',
          wrap: 'repeat',
          min: 'linear',
          mag: 'linear'
        });
      } catch (error) {
        console.warn(`Failed to create texture from loaded image '${key}':`, error);
      }
    };
    
    img.onerror = (error) => {
      console.warn(`Failed to load image from URL '${url}' for key '${key}':`, error);
    };
    
    img.src = url;
  }
  
  getTexture(key) {
    return this.imageTextures[key] || null;
  }
  
  hasTexture(key) {
    return key in this.imageTextures;
  }
  
  clearTextures() {
    // Dispose of existing textures to free memory
    Object.values(this.imageTextures).forEach(texture => {
      if (texture && typeof texture.destroy === 'function') {
        texture.destroy();
      }
    });
    this.imageTextures = {};
  }
  
  getAllTextures() {
    return { ...this.imageTextures };
  }
  
  getTextureCount() {
    return Object.keys(this.imageTextures).length;
  }
  
  // Create a placeholder texture for missing images
  createPlaceholderTexture(width = 64, height = 64) {
    const data = new Uint8Array(width * height * 4);
    let index = 0;
    
    // Create a checkerboard pattern
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const checker = ((x >> 3) ^ (y >> 3)) & 1;
        const color = checker ? 255 : 128;
        
        data[index++] = color;
        data[index++] = color;
        data[index++] = color;
        data[index++] = 255;
      }
    }
    
    return this.regl.texture({
      width,
      height,
      data,
      format: 'rgba',
      type: 'uint8',
      wrap: 'repeat',
      min: 'linear',
      mag: 'linear'
    });
  }
} 