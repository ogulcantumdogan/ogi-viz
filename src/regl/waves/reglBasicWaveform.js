export default class ReglBasicWaveform {
  constructor(regl, params) {
    this.regl = regl;
    
    this.texsizeX = params.texsizeX;
    this.texsizeY = params.texsizeY;
    this.aspectx = params.aspectx;
    this.aspecty = params.aspecty;
    
    this.positions = [];
    this.colors = [];
    
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
  
  drawBasicWaveform(audioArray, mdVSFrame) {
    if (!audioArray || audioArray.length === 0) {
      return;
    }
    
    const positions = [];
    const colors = [];
    const samples = Math.min(audioArray.length, 512);
    
    // Generate waveform points
    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1; // Map to [-1, 1]
      const y = (audioArray[i] / 128.0 - 1.0) * 0.5; // Normalize and scale audio data
      
      positions.push([x, y]);
      colors.push([
        mdVSFrame.wave_r || 1,
        mdVSFrame.wave_g || 1,
        mdVSFrame.wave_b || 1,
        mdVSFrame.wave_a || 1
      ]);
    }
    
    if (positions.length > 1) {
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