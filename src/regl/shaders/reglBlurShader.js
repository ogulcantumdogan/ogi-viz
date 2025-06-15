export default class ReglBlurShader {
  constructor(blurLevel, blurRatios, regl, params) {
    this.regl = regl;
    this.blurLevel = blurLevel;
    this.blurRatios = blurRatios;
    
    this.texsizeX = params.texsizeX;
    this.texsizeY = params.texsizeY;
    this.aspectx = params.aspectx;
    this.aspecty = params.aspecty;
    
    this.scaleX = this.blurRatios[blurLevel][0];
    this.scaleY = this.blurRatios[blurLevel][1];
    this.blurTexsizeX = this.texsizeX * this.scaleX;
    this.blurTexsizeY = this.texsizeY * this.scaleY;
    
    this.vertexShader = `
      precision mediump float;
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      
      varying vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;
    
    this.horizontalBlurShader = `
      precision mediump float;
      uniform sampler2D u_texture;
      uniform vec2 u_resolution;
      varying vec2 v_texCoord;
      
      void main() {
        vec2 texelSize = 1.0 / u_resolution;
        vec4 color = vec4(0.0);
        
        // 5-tap horizontal Gaussian blur
        color += texture2D(u_texture, v_texCoord + vec2(-2.0 * texelSize.x, 0.0)) * 0.0545;
        color += texture2D(u_texture, v_texCoord + vec2(-1.0 * texelSize.x, 0.0)) * 0.2442;
        color += texture2D(u_texture, v_texCoord) * 0.4026;
        color += texture2D(u_texture, v_texCoord + vec2(1.0 * texelSize.x, 0.0)) * 0.2442;
        color += texture2D(u_texture, v_texCoord + vec2(2.0 * texelSize.x, 0.0)) * 0.0545;
        
        gl_FragColor = color;
      }
    `;
    
    this.verticalBlurShader = `
      precision mediump float;
      uniform sampler2D u_texture;
      uniform vec2 u_resolution;
      varying vec2 v_texCoord;
      
      void main() {
        vec2 texelSize = 1.0 / u_resolution;
        vec4 color = vec4(0.0);
        
        // 5-tap vertical Gaussian blur
        color += texture2D(u_texture, v_texCoord + vec2(0.0, -2.0 * texelSize.y)) * 0.0545;
        color += texture2D(u_texture, v_texCoord + vec2(0.0, -1.0 * texelSize.y)) * 0.2442;
        color += texture2D(u_texture, v_texCoord) * 0.4026;
        color += texture2D(u_texture, v_texCoord + vec2(0.0, 1.0 * texelSize.y)) * 0.2442;
        color += texture2D(u_texture, v_texCoord + vec2(0.0, 2.0 * texelSize.y)) * 0.0545;
        
        gl_FragColor = color;
      }
    `;
    
    this.createFramebuffers();
    this.createReglCommands();
  }
  
  createFramebuffers() {
    if (this.tempFrameBuffer) {
      this.tempFrameBuffer.destroy();
    }
    if (this.outputFrameBuffer) {
      this.outputFrameBuffer.destroy();
    }
    
    this.tempFrameBuffer = this.regl.framebuffer({
      color: this.regl.texture({
        width: this.blurTexsizeX,
        height: this.blurTexsizeY,
        format: 'rgba',
        type: 'uint8',
      }),
      depth: false,
    });
    
    this.outputFrameBuffer = this.regl.framebuffer({
      color: this.regl.texture({
        width: this.blurTexsizeX,
        height: this.blurTexsizeY,
        format: 'rgba',
        type: 'uint8',
      }),
      depth: false,
    });
  }
  
  createReglCommands() {
    const quadAttributes = {
      a_position: [
        [-1, -1], [1, -1], [-1, 1],
        [-1, 1], [1, -1], [1, 1]
      ],
      a_texCoord: [
        [0, 0], [1, 0], [0, 1],
        [0, 1], [1, 0], [1, 1]
      ]
    };
    
    this.horizontalBlurCommand = this.regl({
      vert: this.vertexShader,
      frag: this.horizontalBlurShader,
      
      attributes: quadAttributes,
      
      uniforms: {
        u_texture: this.regl.prop('texture'),
        u_resolution: [this.blurTexsizeX, this.blurTexsizeY]
      },
      
      count: 6,
      
      framebuffer: this.tempFrameBuffer,
      
      blend: {
        enable: false
      },
      
      cull: {
        enable: false
      },
      
      depth: {
        enable: false
      }
    });
    
    this.verticalBlurCommand = this.regl({
      vert: this.vertexShader,
      frag: this.verticalBlurShader,
      
      attributes: quadAttributes,
      
      uniforms: {
        u_texture: () => this.tempFrameBuffer,
        u_resolution: [this.blurTexsizeX, this.blurTexsizeY]
      },
      
      count: 6,
      
      framebuffer: this.outputFrameBuffer,
      
      blend: {
        enable: false
      },
      
      cull: {
        enable: false
      },
      
      depth: {
        enable: false
      }
    });
  }
  
  renderBlur(inputTexture) {
    // First pass: horizontal blur
    this.horizontalBlurCommand({ texture: inputTexture });
    
    // Second pass: vertical blur
    this.verticalBlurCommand();
    
    return this.outputFrameBuffer;
  }
  
  getBlurredTexture() {
    return this.outputFrameBuffer;
  }
  
  updateGlobals(params) {
    this.texsizeX = params.texsizeX;
    this.texsizeY = params.texsizeY;
    this.aspectx = params.aspectx;
    this.aspecty = params.aspecty;
    
    this.blurTexsizeX = this.texsizeX * this.scaleX;
    this.blurTexsizeY = this.texsizeY * this.scaleY;
    
    this.createFramebuffers();
    this.createReglCommands();
  }
} 