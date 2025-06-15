export default class ReglBorder {
  constructor(regl, params) {
    this.regl = regl;
    
    this.texsizeX = params.texsizeX;
    this.texsizeY = params.texsizeY;
    this.aspectx = params.aspectx;
    this.aspecty = params.aspecty;
    
    this.vertexShader = `
      precision mediump float;
      attribute vec2 a_position;
      attribute vec4 a_color;
      
      varying vec4 v_color;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_color = a_color;
      }
    `;
    
    this.fragmentShader = `
      precision mediump float;
      varying vec4 v_color;
      
      void main() {
        gl_FragColor = v_color;
      }
    `;
    
    this.createReglCommand();
  }
  
  createReglCommand() {
    this.drawCommand = this.regl({
      vert: this.vertexShader,
      frag: this.fragmentShader,
      
      attributes: {
        a_position: this.regl.prop('positions'),
        a_color: this.regl.prop('colors')
      },
      
      count: this.regl.prop('count'),
      primitive: 'line strip',
      
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
  
  drawBorder(mdVSFrame, borderSettings, isOuter = false) {
    if (!borderSettings) {
      return;
    }
    
    const size = borderSettings.size || 0.01;
    const r = borderSettings.r || 1;
    const g = borderSettings.g || 1;
    const b = borderSettings.b || 1;
    const a = borderSettings.a || 0.1;
    
    if (a <= 0) {
      return;
    }
    
    const positions = [];
    const colors = [];
    const color = [r, g, b, a];
    
    if (isOuter) {
      // Outer border - around the edge of the screen
      positions.push([-1, -1]);
      positions.push([1, -1]);
      positions.push([1, 1]);
      positions.push([-1, 1]);
      positions.push([-1, -1]);
    } else {
      // Inner border - inset from the edge
      const inset = size;
      positions.push([-1 + inset, -1 + inset]);
      positions.push([1 - inset, -1 + inset]);
      positions.push([1 - inset, 1 - inset]);
      positions.push([-1 + inset, 1 - inset]);
      positions.push([-1 + inset, -1 + inset]);
    }
    
    // Fill colors array
    for (let i = 0; i < positions.length; i++) {
      colors.push(color);
    }
    
    if (positions.length > 0) {
      this.drawCommand({
        positions,
        colors,
        count: positions.length
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