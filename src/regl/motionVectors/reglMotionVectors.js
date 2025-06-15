export default class ReglMotionVectors {
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
      primitive: 'lines',
      
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
  
  drawMotionVectors(mdVSFrame) {
    if (!mdVSFrame.bmotionvectorson) {
      return;
    }
    
    const positions = [];
    const colors = [];
    
    const mvX = mdVSFrame.mv_x || 12;
    const mvY = mdVSFrame.mv_y || 9;
    const mvDx = mdVSFrame.mv_dx || 0;
    const mvDy = mdVSFrame.mv_dy || 0;
    const mvL = mdVSFrame.mv_l || 0.9;
    const mvR = mdVSFrame.mv_r || 1;
    const mvG = mdVSFrame.mv_g || 1;
    const mvB = mdVSFrame.mv_b || 1;
    const mvA = mdVSFrame.mv_a || 1;
    
    if (mvA <= 0) {
      return;
    }
    
    // Generate motion vector grid
    for (let y = 0; y < mvY; y++) {
      for (let x = 0; x < mvX; x++) {
        const gridX = (x / (mvX - 1)) * 2 - 1;
        const gridY = (y / (mvY - 1)) * 2 - 1;
        
        // Start position
        positions.push([gridX, gridY]);
        colors.push([mvR, mvG, mvB, mvA]);
        
        // End position with motion offset
        const endX = gridX + mvDx * mvL * 0.1;
        const endY = gridY + mvDy * mvL * 0.1;
        positions.push([endX, endY]);
        colors.push([mvR, mvG, mvB, mvA]);
      }
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