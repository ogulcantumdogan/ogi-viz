export default class ReglCustomWaveform {
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
  
  drawCustomWaveform(audioArray, mdVSFrame, waveSettings) {
    if (!waveSettings || !waveSettings.enabled || !audioArray || audioArray.length === 0) {
      return;
    }
    
    const positions = [];
    const colors = [];
    const samples = Math.min(audioArray.length, waveSettings.samples || 512);
    const useDots = waveSettings.usedots || false;
    
    // Generate waveform points based on settings
    for (let i = 0; i < samples; i++) {
      const t = i / (samples - 1);
      const audioValue = audioArray[i] / 128.0 - 1.0;
      
      // Apply wave transformations
      let x = (waveSettings.x || 0.5) + t * (waveSettings.scaling || 1) - 0.5;
      let y = (waveSettings.y || 0.5) + audioValue * (waveSettings.scaling || 1);
      
      // Convert to screen coordinates
      x = x * 2 - 1;
      y = y * 2 - 1;
      
      positions.push([x, y]);
      colors.push([
        waveSettings.r || 1,
        waveSettings.g || 1,
        waveSettings.b || 1,
        waveSettings.a || 1
      ]);
    }
    
    if (positions.length > 0) {
      this.drawCommand({
        positions,
        colors,
        count: positions.length,
        primitive: useDots ? 'points' : 'line strip',
        blend: waveSettings.additive || false
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