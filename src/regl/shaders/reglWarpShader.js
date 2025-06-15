export default class ReglWarpShader {
  constructor(regl, noise, image, params) {
    this.regl = regl;
    this.noise = noise;
    this.image = image;
    
    this.texsizeX = params.texsizeX;
    this.texsizeY = params.texsizeY;
    this.mesh_width = params.mesh_width;
    this.mesh_height = params.mesh_height;
    this.aspectx = params.aspectx;
    this.aspecty = params.aspecty;
    
    this.userTextures = [];
    this.blurTexture1 = null;
    this.blurTexture2 = null;
    this.blurTexture3 = null;
    
    this.vertexShader = `
      precision mediump float;
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      attribute vec4 a_color;
      
      varying vec2 v_texCoord;
      varying vec4 v_color;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
        v_color = a_color;
      }
    `;
    
    this.defaultFragmentShader = `
      precision mediump float;
      uniform sampler2D u_texture;
      varying vec2 v_texCoord;
      varying vec4 v_color;
      
      void main() {
        gl_FragColor = texture2D(u_texture, v_texCoord) * v_color;
      }
    `;
    
    this.currentFragmentShader = this.defaultFragmentShader;
    this.createReglCommand();
  }
  
  createReglCommand() {
    this.warpCommand = this.regl({
      vert: this.vertexShader,
      frag: this.currentFragmentShader,
      
      attributes: {
        a_position: this.regl.prop('positions'),
        a_texCoord: this.regl.prop('texCoords'),
        a_color: this.regl.prop('colors'),
      },
      
      uniforms: {
        u_texture: this.regl.prop('texture'),
        u_resolution: [this.texsizeX, this.texsizeY],
        u_aspectx: this.aspectx,
        u_aspecty: this.aspecty,
        u_time: this.regl.prop('time'),
        u_frame: this.regl.prop('frame'),
        u_decay: this.regl.prop('decay'),
        u_noise_lq: () => this.noise.noiseTexLQ,
        u_noise_mq: () => this.noise.noiseTexMQ,
        u_noise_hq: () => this.noise.noiseTexHQ,
        u_noise_lq_lite: () => this.noise.noiseTexLQLite,
        u_sampler_blur1: () => this.blurTexture1,
        u_sampler_blur2: () => this.blurTexture2,
        u_sampler_blur3: () => this.blurTexture3,
      },
      
      elements: this.regl.prop('elements'),
      
      blend: {
        enable: true,
        func: {
          srcRGB: 'src alpha',
          srcAlpha: 'src alpha',
          dstRGB: 'one minus src alpha',
          dstAlpha: 'one minus src alpha'
        }
      },
      
      cull: {
        enable: false
      },
      
      depth: {
        enable: false
      }
    });
  }
  
  updateShader(fragShaderText) {
    if (fragShaderText && fragShaderText.length > 0) {
      this.currentFragmentShader = this.generateFragmentShader(fragShaderText);
    } else {
      this.currentFragmentShader = this.defaultFragmentShader;
    }
    this.createReglCommand();
  }
  
  generateFragmentShader(shaderText) {
    const header = `
      precision mediump float;
      uniform sampler2D u_texture;
      uniform sampler2D u_noise_lq;
      uniform sampler2D u_noise_mq;  
      uniform sampler2D u_noise_hq;
      uniform sampler2D u_noise_lq_lite;
      uniform sampler2D u_sampler_blur1;
      uniform sampler2D u_sampler_blur2;
      uniform sampler2D u_sampler_blur3;
      uniform vec2 u_resolution;
      uniform float u_aspectx;
      uniform float u_aspecty;
      uniform float u_time;
      uniform float u_frame;
      uniform float u_decay;
      
      varying vec2 v_texCoord;
      varying vec4 v_color;
      
      #define sampler_main u_texture
      #define sampler_fc_main u_texture
      #define sampler_noise_lq u_noise_lq
      #define sampler_noise_mq u_noise_mq
      #define sampler_noise_hq u_noise_hq
      #define sampler_noise_lq_lite u_noise_lq_lite
      #define sampler_blur1 u_sampler_blur1
      #define sampler_blur2 u_sampler_blur2
      #define sampler_blur3 u_sampler_blur3
      
      #define uv v_texCoord
      #define q v_color
      #define time u_time
      #define frame u_frame
      #define decay u_decay
      #define aspectx u_aspectx
      #define aspecty u_aspecty
      #define texsize u_resolution
      
      vec4 ret = vec4(0.0);
      
      void main() {
    `;
    
    const footer = `
        gl_FragColor = ret;
      }
    `;
    
    return header + shaderText + footer;
  }
  
  renderQuadTexture(
    texture,
    blurTexture1,
    blurTexture2,
    blurTexture3,
    mdVSFrame,
    warpUVs,
    warpColors
  ) {
    this.blurTexture1 = blurTexture1;
    this.blurTexture2 = blurTexture2;
    this.blurTexture3 = blurTexture3;
    
    // Generate mesh positions and indices from warp data
    const positions = [];
    const texCoords = [];
    const colors = [];
    const elements = [];
    
    const meshWidth = Math.sqrt(warpUVs.length / 2) - 1;
    const meshHeight = meshWidth; // Assuming square mesh for now
    
    // Generate vertices
    let warpIndex = 0;
    let colorIndex = 0;
    for (let j = 0; j <= meshHeight; j++) {
      for (let i = 0; i <= meshWidth; i++) {
        // Convert from screen space to clip space
        const x = (i / meshWidth) * 2 - 1;
        const y = (j / meshHeight) * 2 - 1;
        
        positions.push([x, y]);
        
        // Use computed warp UVs
        const u = warpUVs[warpIndex++];
        const v = warpUVs[warpIndex++];
        texCoords.push([u, v]);
        
        // Use computed warp colors
        const r = warpColors[colorIndex++];
        const g = warpColors[colorIndex++];
        const b = warpColors[colorIndex++];
        const a = warpColors[colorIndex++];
        colors.push([r, g, b, a]);
      }
    }
    
    // Generate triangle indices for the mesh
    for (let j = 0; j < meshHeight; j++) {
      for (let i = 0; i < meshWidth; i++) {
        const topLeft = j * (meshWidth + 1) + i;
        const topRight = topLeft + 1;
        const bottomLeft = (j + 1) * (meshWidth + 1) + i;
        const bottomRight = bottomLeft + 1;
        
        // Two triangles per quad
        elements.push(topLeft, bottomLeft, topRight);
        elements.push(topRight, bottomLeft, bottomRight);
      }
    }
    
    this.warpCommand({
      texture,
      positions,
      texCoords,
      colors,
      elements,
      time: mdVSFrame.time || 0,
      frame: mdVSFrame.frame || 0,
      decay: mdVSFrame.decay || 0.98
    });
  }
  
  updateGlobals(params) {
    this.texsizeX = params.texsizeX;
    this.texsizeY = params.texsizeY;
    this.mesh_width = params.mesh_width;
    this.mesh_height = params.mesh_height;
    this.aspectx = params.aspectx;
    this.aspecty = params.aspecty;
    this.createReglCommand();
  }
} 