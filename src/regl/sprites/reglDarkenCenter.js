export default class ReglDarkenCenter {
  constructor(regl, params) {
    this.regl = regl;
    
    this.texsizeX = params.texsizeX;
    this.texsizeY = params.texsizeY;
    this.aspectx = params.aspectx;
    this.aspecty = params.aspecty;
    
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
      uniform float u_amount;
      varying vec2 v_texCoord;
      
      void main() {
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(v_texCoord, center);
        float darkness = 1.0 - (dist * 2.0 * u_amount);
        darkness = clamp(darkness, 0.0, 1.0);
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0 - darkness);
      }
    `;
    
    this.createReglCommand();
  }
  
  createReglCommand() {
    this.drawCommand = this.regl({
      vert: this.vertexShader,
      frag: this.fragmentShader,
      
      attributes: {
        a_position: [
          [-1, -1], [1, -1], [-1, 1],
          [-1, 1], [1, -1], [1, 1]
        ],
        a_texCoord: [
          [0, 0], [1, 0], [0, 1],
          [0, 1], [1, 0], [1, 1]
        ]
      },
      
      uniforms: {
        u_amount: this.regl.prop('amount')
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
  
  drawDarkenCenter(amount) {
    if (amount > 0) {
      this.drawCommand({ amount });
    }
  }
  
  updateGlobals(params) {
    this.texsizeX = params.texsizeX;
    this.texsizeY = params.texsizeY;
    this.aspectx = params.aspectx;
    this.aspecty = params.aspecty;
  }
} 