export default class ReglCustomShape {
  constructor(index, regl, params) {
    this.regl = regl;
    this.index = index;
    
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
      primitive: this.regl.prop('primitive'),
      
      blend: {
        enable: this.regl.prop('blend'),
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
  
  drawCustomShape(mdVSFrame, shapeSettings) {
    if (!shapeSettings || !shapeSettings.enabled) {
      return;
    }
    
    const sides = Math.max(3, shapeSettings.sides || 4);
    const radius = shapeSettings.rad || 0.1;
    const x = (shapeSettings.x || 0.5) * 2 - 1;
    const y = (shapeSettings.y || 0.5) * 2 - 1;
    const angle = shapeSettings.ang || 0;
    
    const positions = [];
    const colors = [];
    
    // Generate polygon vertices
    for (let i = 0; i <= sides; i++) {
      const theta = (i / sides) * Math.PI * 2 + angle;
      const px = x + Math.cos(theta) * radius;
      const py = y + Math.sin(theta) * radius;
      
      positions.push([px, py]);
      colors.push([
        shapeSettings.r || 1,
        shapeSettings.g || 1,
        shapeSettings.b || 1,
        shapeSettings.a || 1
      ]);
    }
    
    if (positions.length > 2) {
      this.drawCommand({
        positions,
        colors,
        count: positions.length,
        primitive: shapeSettings.thickoutline ? 'line strip' : 'triangle fan',
        blend: shapeSettings.additive || false
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