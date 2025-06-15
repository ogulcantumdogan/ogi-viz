export default class ReglOutputShader {
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
    
    this.basicFragmentShader = `
      precision mediump float;
      uniform sampler2D u_texture;
      varying vec2 v_texCoord;
      
      void main() {
        gl_FragColor = texture2D(u_texture, v_texCoord);
      }
    `;
    
    this.fxaaFragmentShader = `
      precision mediump float;
      uniform sampler2D u_texture;
      uniform vec2 u_resolution;
      varying vec2 v_texCoord;
      
      #define FXAA_REDUCE_MIN   (1.0/ 128.0)
      #define FXAA_REDUCE_MUL   (1.0 / 8.0)
      #define FXAA_SPAN_MAX     8.0
      
      vec4 fxaa(sampler2D tex, vec2 fragCoord, vec2 resolution) {
        vec2 inverseVP = 1.0 / resolution.xy;
        vec3 rgbNW = texture2D(tex, (fragCoord + vec2(-1.0, -1.0)) * inverseVP).xyz;
        vec3 rgbNE = texture2D(tex, (fragCoord + vec2(1.0, -1.0)) * inverseVP).xyz;
        vec3 rgbSW = texture2D(tex, (fragCoord + vec2(-1.0, 1.0)) * inverseVP).xyz;
        vec3 rgbSE = texture2D(tex, (fragCoord + vec2(1.0, 1.0)) * inverseVP).xyz;
        vec3 rgbM  = texture2D(tex, fragCoord * inverseVP).xyz;
        
        vec3 luma = vec3(0.299, 0.587, 0.114);
        float lumaNW = dot(rgbNW, luma);
        float lumaNE = dot(rgbNE, luma);
        float lumaSW = dot(rgbSW, luma);
        float lumaSE = dot(rgbSE, luma);
        float lumaM  = dot(rgbM,  luma);
        
        float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
        float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));
        
        vec2 dir;
        dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
        dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));
        
        float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);
        float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
        
        dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX), max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX), dir * rcpDirMin)) * inverseVP;
        
        vec3 rgbA = 0.5 * (
          texture2D(tex, fragCoord * inverseVP + dir * (1.0 / 3.0 - 0.5)).xyz +
          texture2D(tex, fragCoord * inverseVP + dir * (2.0 / 3.0 - 0.5)).xyz);
        vec3 rgbB = rgbA * 0.5 + 0.25 * (
          texture2D(tex, fragCoord * inverseVP + dir * -0.5).xyz +
          texture2D(tex, fragCoord * inverseVP + dir * 0.5).xyz);
        
        float lumaB = dot(rgbB, luma);
        if ((lumaB < lumaMin) || (lumaB > lumaMax)) {
          return vec4(rgbA, 1.0);
        } else {
          return vec4(rgbB, 1.0);
        }
      }
      
      void main() {
        gl_FragColor = fxaa(u_texture, v_texCoord * u_resolution, u_resolution);
      }
    `;
    
    this.createReglCommands();
  }
  
  createReglCommands() {
    // Basic output command without FXAA
    this.basicOutputCommand = this.regl({
      vert: this.vertexShader,
      frag: this.basicFragmentShader,
      
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
        u_texture: this.regl.prop('texture')
      },
      
      count: 6,
      
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
    
    // FXAA output command
    this.fxaaOutputCommand = this.regl({
      vert: this.vertexShader,
      frag: this.fxaaFragmentShader,
      
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
        u_texture: this.regl.prop('texture'),
        u_resolution: [this.texsizeX, this.texsizeY]
      },
      
      count: 6,
      
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
  
  renderQuadTexture(texture, useAA = false) {
    if (useAA) {
      this.fxaaOutputCommand({ texture });
    } else {
      this.basicOutputCommand({ texture });
    }
  }
  
  updateGlobals(params) {
    this.texsizeX = params.texsizeX;
    this.texsizeY = params.texsizeY;
    this.aspectx = params.aspectx;
    this.aspecty = params.aspecty;
    this.createReglCommands();
  }
} 