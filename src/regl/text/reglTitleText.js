export default class ReglTitleText {
  constructor(regl, params) {
    this.regl = regl;
    
    this.texsizeX = params.texsizeX;
    this.texsizeY = params.texsizeY;
    this.aspectx = params.aspectx;
    this.aspecty = params.aspecty;
    
    this.titleText = '';
    this.startTime = -1;
    this.duration = 3000; // 3 seconds
    
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
    
    this.fragmentShader = `
      precision mediump float;
      uniform sampler2D u_texture;
      uniform float u_alpha;
      varying vec2 v_texCoord;
      
      void main() {
        vec4 color = texture2D(u_texture, v_texCoord);
        gl_FragColor = vec4(color.rgb, color.a * u_alpha);
      }
    `;
    
    this.createReglCommand();
    this.createTextTexture();
  }
  
  createReglCommand() {
    this.drawCommand = this.regl({
      vert: this.vertexShader,
      frag: this.fragmentShader,
      
      attributes: {
        a_position: [
          [-0.5, -0.1], [0.5, -0.1], [-0.5, 0.1],
          [-0.5, 0.1], [0.5, -0.1], [0.5, 0.1]
        ],
        a_texCoord: [
          [0, 0], [1, 0], [0, 1],
          [0, 1], [1, 0], [1, 1]
        ]
      },
      
      uniforms: {
        u_texture: this.regl.prop('texture'),
        u_alpha: this.regl.prop('alpha')
      },
      
      count: 6,
      
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
  
  createTextTexture() {
    // Create a simple text texture (placeholder implementation)
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    this.defaultTexture = this.regl.texture({
      data: canvas,
      format: 'rgba',
      wrap: 'clamp',
      min: 'linear',
      mag: 'linear'
    });
    
    this.currentTexture = this.defaultTexture;
  }
  
  updateTextTexture(text) {
    if (!text || text.length === 0) {
      this.currentTexture = this.defaultTexture;
      return;
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Set text style
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw text
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // Create/update texture
    if (this.textTexture) {
      this.textTexture.destroy();
    }
    
    this.textTexture = this.regl.texture({
      data: canvas,
      format: 'rgba',
      wrap: 'clamp',
      min: 'linear',
      mag: 'linear'
    });
    
    this.currentTexture = this.textTexture;
  }
  
  launchSongTitleAnim(text) {
    this.titleText = text || '';
    this.startTime = performance.now();
    this.updateTextTexture(this.titleText);
  }
  
  drawTitleText(currentTime) {
    if (this.startTime < 0 || !this.titleText) {
      return;
    }
    
    const elapsed = currentTime - this.startTime;
    if (elapsed > this.duration) {
      return; // Animation finished
    }
    
    // Calculate alpha based on animation phase
    let alpha = 1.0;
    const fadeInTime = 500; // 0.5 seconds
    const fadeOutTime = 500; // 0.5 seconds
    
    if (elapsed < fadeInTime) {
      alpha = elapsed / fadeInTime;
    } else if (elapsed > this.duration - fadeOutTime) {
      alpha = (this.duration - elapsed) / fadeOutTime;
    }
    
    alpha = Math.max(0, Math.min(1, alpha));
    
    if (alpha > 0) {
      this.drawCommand({
        texture: this.currentTexture,
        alpha
      });
    }
  }
  
  updateGlobals(params) {
    this.texsizeX = params.texsizeX;
    this.texsizeY = params.texsizeY;
    this.aspectx = params.aspectx;
    this.aspecty = params.aspecty;
  }
} 