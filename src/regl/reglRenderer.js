import AudioLevels from "../audio/audioLevels";
import blankPreset from "../blankPreset";
import PresetEquationRunner from "../equations/presetEquationRunner";
import PresetEquationRunnerWASM from "../equations/presetEquationRunnerWASM";
import ReglWarpShader from "./shaders/reglWarpShader";
import ReglCompShader from "./shaders/reglCompShader";
import ReglOutputShader from "./shaders/reglOutputShader";
import ReglBlurShader from "./shaders/reglBlurShader";
import ReglBasicWaveform from "./waves/reglBasicWaveform";
import ReglCustomWaveform from "./waves/reglCustomWaveform";
import ReglCustomShape from "./shapes/reglCustomShape";
import ReglBorder from "./sprites/reglBorder";
import ReglDarkenCenter from "./sprites/reglDarkenCenter";
import ReglMotionVectors from "./motionVectors/reglMotionVectors";
import ReglNoise from "./reglNoise";
import ReglImageTextures from "./reglImageTextures";
import ReglTitleText from "./text/reglTitleText";
import BlendPattern from "../rendering/blendPattern";
import Utils from "../utils";

export default class ReglRenderer {
  constructor(regl, audio, opts) {
    this.regl = regl;
    this.audio = audio;

    this.frameNum = 0;
    this.fps = 30;
    this.time = 0;
    this.presetTime = 0;
    this.lastTime = performance.now();
    this.timeHist = [0];
    this.timeHistMax = 120;
    this.blending = false;
    this.blendStartTime = 0;
    this.blendProgress = 0;
    this.blendDuration = 0;

    this.width = opts.width || 1200;
    this.height = opts.height || 900;
    this.mesh_width = opts.meshWidth || 48;
    this.mesh_height = opts.meshHeight || 36;
    this.pixelRatio = opts.pixelRatio || window.devicePixelRatio || 1;
    this.textureRatio = opts.textureRatio || 1;
    this.outputFXAA = opts.outputFXAA || false;
    this.texsizeX = this.width * this.pixelRatio * this.textureRatio;
    this.texsizeY = this.height * this.pixelRatio * this.textureRatio;
    this.aspectx = this.texsizeY > this.texsizeX ? this.texsizeX / this.texsizeY : 1;
    this.aspecty = this.texsizeX > this.texsizeY ? this.texsizeY / this.texsizeX : 1;
    this.invAspectx = 1.0 / this.aspectx;
    this.invAspecty = 1.0 / this.aspecty;

    this.qs = Utils.range(1, 33).map((x) => `q${x}`);
    this.ts = Utils.range(1, 9).map((x) => `t${x}`);
    this.regs = Utils.range(0, 100).map((x) => {
      if (x < 10) {
        return `reg0${x}`;
      }
      return `reg${x}`;
    });

    this.blurRatios = [
      [0.5, 0.25],
      [0.125, 0.125],
      [0.0625, 0.0625],
    ];

    this.audioLevels = new AudioLevels(this.audio);

    // Create Regl framebuffers for the pipeline
    this.prevFrameBuffer = this.regl.framebuffer({
      color: this.regl.texture({
        width: this.texsizeX,
        height: this.texsizeY,
        format: 'rgba',
        type: 'uint8',
      }),
      depth: false,
    });

    this.targetFrameBuffer = this.regl.framebuffer({
      color: this.regl.texture({
        width: this.texsizeX,
        height: this.texsizeY,
        format: 'rgba',
        type: 'uint8',
      }),
      depth: false,
    });

    this.compFrameBuffer = this.regl.framebuffer({
      color: this.regl.texture({
        width: this.texsizeX,
        height: this.texsizeY,
        format: 'rgba',
        type: 'uint8',
      }),
      depth: false,
    });

    const params = {
      pixelRatio: this.pixelRatio,
      textureRatio: this.textureRatio,
      texsizeX: this.texsizeX,
      texsizeY: this.texsizeY,
      mesh_width: this.mesh_width,
      mesh_height: this.mesh_height,
      aspectx: this.aspectx,
      aspecty: this.aspecty,
    };

    // Initialize all Regl components
    this.noise = new ReglNoise(regl);
    this.image = new ReglImageTextures(regl);
    this.warpShader = new ReglWarpShader(regl, this.noise, this.image, params);
    this.compShader = new ReglCompShader(regl, this.noise, this.image, params);
    this.outputShader = new ReglOutputShader(regl, params);
    this.prevWarpShader = new ReglWarpShader(regl, this.noise, this.image, params);
    this.prevCompShader = new ReglCompShader(regl, this.noise, this.image, params);
    this.numBlurPasses = 0;
    this.blurShader1 = new ReglBlurShader(0, this.blurRatios, regl, params);
    this.blurShader2 = new ReglBlurShader(1, this.blurRatios, regl, params);
    this.blurShader3 = new ReglBlurShader(2, this.blurRatios, regl, params);
    this.basicWaveform = new ReglBasicWaveform(regl, params);
    this.customWaveforms = Utils.range(4).map(
      (i) => new ReglCustomWaveform(i, regl, params)
    );
    this.customShapes = Utils.range(4).map(
      (i) => new ReglCustomShape(i, regl, params)
    );
    this.prevCustomWaveforms = Utils.range(4).map(
      (i) => new ReglCustomWaveform(i, regl, params)
    );
    this.prevCustomShapes = Utils.range(4).map(
      (i) => new ReglCustomShape(i, regl, params)
    );
    this.darkenCenter = new ReglDarkenCenter(regl, params);
    this.innerBorder = new ReglBorder(regl, params);
    this.outerBorder = new ReglBorder(regl, params);
    this.motionVectors = new ReglMotionVectors(regl, params);
    this.titleText = new ReglTitleText(regl, params);
    this.blendPattern = new BlendPattern(params);

    this.supertext = {
      startTime: -1,
    };

    this.warpUVs = new Float32Array(
      (this.mesh_width + 1) * (this.mesh_height + 1) * 2
    );
    this.warpColor = new Float32Array(
      (this.mesh_width + 1) * (this.mesh_height + 1) * 4
    );

    this.blankPreset = blankPreset;

    const globalVars = {
      frame: 0,
      time: 0,
      fps: 45,
      bass: 1,
      bass_att: 1,
      mid: 1,
      mid_att: 1,
      treb: 1,
      treb_att: 1,
    };

    this.preset = blankPreset;
    this.prevPreset = this.preset;
    this.presetEquationRunner = new PresetEquationRunner(
      this.preset,
      globalVars,
      params
    );
    this.prevPresetEquationRunner = new PresetEquationRunner(
      this.prevPreset,
      globalVars,
      params
    );

    if (!this.preset.useWASM) {
      this.regVars = this.presetEquationRunner.mdVSRegs;
    }
  }

  static getHighestBlur(t) {
    if (/sampler_blur3/.test(t)) {
      return 3;
    } else if (/sampler_blur2/.test(t)) {
      return 2;
    } else if (/sampler_blur1/.test(t)) {
      return 1;
    }
    return 0;
  }

  loadPreset(preset, blendTime) {
    this.blendPattern.createBlendPattern();
    this.blending = true;
    this.blendStartTime = this.time;
    this.blendDuration = blendTime;
    this.blendProgress = 0;

    this.prevPresetEquationRunner = this.presetEquationRunner;
    this.prevPreset = this.preset;
    this.preset = preset;
    this.presetTime = this.time;

    const globalVars = {
      frame: this.frameNum,
      time: this.time,
      fps: this.fps,
      bass: this.audioLevels.bass,
      bass_att: this.audioLevels.bass_att,
      mid: this.audioLevels.mid,
      mid_att: this.audioLevels.mid_att,
      treb: this.audioLevels.treb,
      treb_att: this.audioLevels.treb_att,
    };
    
    const params = {
      pixelRatio: this.pixelRatio,
      textureRatio: this.textureRatio,
      texsizeX: this.texsizeX,
      texsizeY: this.texsizeY,
      mesh_width: this.mesh_width,
      mesh_height: this.mesh_height,
      aspectx: this.aspectx,
      aspecty: this.aspecty,
    };

    if (preset.useWASM) {
      this.preset.globalPools.perFrame.old_wave_mode.value = this.prevPreset.baseVals.wave_mode;
      this.preset.baseVals.old_wave_mode = this.prevPreset.baseVals.wave_mode;
      this.presetEquationRunner = new PresetEquationRunnerWASM(
        this.preset,
        globalVars,
        params
      );
      if (this.preset.pixel_eqs_initialize_array) {
        this.preset.pixel_eqs_initialize_array(
          this.mesh_width,
          this.mesh_height
        );
      }
    } else {
      this.preset.baseVals.old_wave_mode = this.prevPreset.baseVals.wave_mode;
      this.presetEquationRunner = new PresetEquationRunner(
        this.preset,
        globalVars,
        params
      );
      this.regVars = this.presetEquationRunner.mdVSRegs;
    }

    const tmpWarpShader = this.prevWarpShader;
    this.prevWarpShader = this.warpShader;
    this.warpShader = tmpWarpShader;

    const tmpCompShader = this.prevCompShader;
    this.prevCompShader = this.compShader;
    this.compShader = tmpCompShader;

    const warpText = this.preset.warp.trim();
    const compText = this.preset.comp.trim();

    this.warpShader.updateShader(warpText);
    this.compShader.updateShader(compText);

    if (warpText.length === 0) {
      this.numBlurPasses = 0;
    } else {
      this.numBlurPasses = ReglRenderer.getHighestBlur(warpText);
    }

    if (compText.length !== 0) {
      this.numBlurPasses = Math.max(
        this.numBlurPasses,
        ReglRenderer.getHighestBlur(compText)
      );
    }
  }

  loadExtraImages(imageData) {
    this.image.loadExtraImages(imageData);
  }

  setRendererSize(width, height, opts) {
    const oldTexsizeX = this.texsizeX;
    const oldTexsizeY = this.texsizeY;

    this.width = width;
    this.height = height;
    this.mesh_width = opts.meshWidth || this.mesh_width;
    this.mesh_height = opts.meshHeight || this.mesh_height;
    this.pixelRatio = opts.pixelRatio || this.pixelRatio;
    this.textureRatio = opts.textureRatio || this.textureRatio;
    this.texsizeX = width * this.pixelRatio * this.textureRatio;
    this.texsizeY = height * this.pixelRatio * this.textureRatio;
    this.aspectx = this.texsizeY > this.texsizeX ? this.texsizeX / this.texsizeY : 1;
    this.aspecty = this.texsizeX > this.texsizeY ? this.texsizeY / this.texsizeX : 1;

    if (this.texsizeX !== oldTexsizeX || this.texsizeY !== oldTexsizeY) {
      // Recreate framebuffers with new size
      this.prevFrameBuffer.destroy();
      this.targetFrameBuffer.destroy();
      this.compFrameBuffer.destroy();

      this.prevFrameBuffer = this.regl.framebuffer({
        color: this.regl.texture({
          width: this.texsizeX,
          height: this.texsizeY,
          format: 'rgba',
          type: 'uint8',
        }),
        depth: false,
      });

      this.targetFrameBuffer = this.regl.framebuffer({
        color: this.regl.texture({
          width: this.texsizeX,
          height: this.texsizeY,
          format: 'rgba',
          type: 'uint8',
        }),
        depth: false,
      });

      this.compFrameBuffer = this.regl.framebuffer({
        color: this.regl.texture({
          width: this.texsizeX,
          height: this.texsizeY,
          format: 'rgba',
          type: 'uint8',
        }),
        depth: false,
      });
    }

    this.updateGlobals();

    // Rerender current frame at new size
    if (this.frameNum > 0) {
      this.renderToScreen();
    }
  }

  setInternalMeshSize(width, height) {
    this.mesh_width = width;
    this.mesh_height = height;
    this.updateGlobals();
  }

  setOutputAA(useAA) {
    this.outputFXAA = useAA;
  }

  updateGlobals() {
    const params = {
      pixelRatio: this.pixelRatio,
      textureRatio: this.textureRatio,
      texsizeX: this.texsizeX,
      texsizeY: this.texsizeY,
      mesh_width: this.mesh_width,
      mesh_height: this.mesh_height,
      aspectx: this.aspectx,
      aspecty: this.aspecty,
    };
    
    this.presetEquationRunner.updateGlobals(params);
    this.prevPresetEquationRunner.updateGlobals(params);
    this.warpShader.updateGlobals(params);
    this.prevWarpShader.updateGlobals(params);
    this.compShader.updateGlobals(params);
    this.prevCompShader.updateGlobals(params);
    this.outputShader.updateGlobals(params);
    this.blurShader1.updateGlobals(params);
    this.blurShader2.updateGlobals(params);
    this.blurShader3.updateGlobals(params);
    this.basicWaveform.updateGlobals(params);
    this.customWaveforms.forEach((wave) => wave.updateGlobals(params));
    this.customShapes.forEach((shape) => shape.updateGlobals(params));
    this.prevCustomWaveforms.forEach((wave) => wave.updateGlobals(params));
    this.prevCustomShapes.forEach((shape) => shape.updateGlobals(params));
    this.darkenCenter.updateGlobals(params);
    this.innerBorder.updateGlobals(params);
    this.outerBorder.updateGlobals(params);
    this.motionVectors.updateGlobals(params);
    this.titleText.updateGlobals(params);
    this.blendPattern.updateGlobals(params);

    this.warpUVs = new Float32Array(
      (this.mesh_width + 1) * (this.mesh_height + 1) * 2
    );
    this.warpColor = new Float32Array(
      (this.mesh_width + 1) * (this.mesh_height + 1) * 4
    );

    if (this.preset.pixel_eqs_initialize_array) {
      this.preset.pixel_eqs_initialize_array(this.mesh_width, this.mesh_height);
    }
  }

  calcTimeAndFPS(elapsedTime) {
    let elapsed;
    if (elapsedTime) {
      elapsed = elapsedTime;
    } else {
      const newTime = performance.now();
      elapsed = (newTime - this.lastTime) / 1000.0;
      if (elapsed > 1.0 || elapsed < 0.0 || this.frame < 2) {
        elapsed = 1.0 / 30.0;
      }
      this.lastTime = newTime;
    }

    this.time += 1.0 / this.fps;

    if (this.blending) {
      this.blendProgress = (this.time - this.blendStartTime) / this.blendDuration;
      if (this.blendProgress > 1.0) {
        this.blending = false;
      }
    }

    const newHistTime = this.timeHist[this.timeHist.length - 1] + elapsed;
    this.timeHist.push(newHistTime);
    if (this.timeHist.length > this.timeHistMax) {
      this.timeHist.shift();
    }

    const newFPS = this.timeHist.length / (newHistTime - this.timeHist[0]);
    if (Math.abs(newFPS - this.fps) > 3.0 && this.frame > this.timeHistMax) {
      this.fps = newFPS;
    } else {
      const damping = 0.93;
      this.fps = damping * this.fps + (1.0 - damping) * newFPS;
    }
  }

  render(opts = {}) {
    this.calcTimeAndFPS(opts.elapsedTime);
    this.frameNum += 1;

    if (opts.audioLevels) {
      this.audio.updateAudio(
        opts.audioLevels.timeByteArray,
        opts.audioLevels.timeByteArrayL,
        opts.audioLevels.timeByteArrayR
      );
    } else {
      this.audio.sampleAudio();
    }
    this.audioLevels.updateAudioLevels(this.fps, this.frameNum);

    const globalVars = {
      frame: this.frameNum,
      time: this.time,
      fps: this.fps,
      bass: this.audioLevels.bass,
      bass_att: this.audioLevels.bass_att,
      mid: this.audioLevels.mid,
      mid_att: this.audioLevels.mid_att,
      treb: this.audioLevels.treb,
      treb_att: this.audioLevels.treb_att,
      meshx: this.mesh_width,
      meshy: this.mesh_height,
      aspectx: this.invAspectx,
      aspecty: this.invAspecty,
      pixelsx: this.texsizeX,
      pixelsy: this.texsizeY,
    };

    const prevGlobalVars = Object.assign({}, globalVars);
    if (!this.prevPreset.useWASM) {
      prevGlobalVars.gmegabuf = this.prevPresetEquationRunner.gmegabuf;
    }

    if (!this.preset.useWASM) {
      globalVars.gmegabuf = this.presetEquationRunner.gmegabuf;
      Object.assign(globalVars, this.regVars);
    }

    const mdVSFrame = this.presetEquationRunner.runFrameEquations(globalVars);

    this.runPixelEquations(
      this.presetEquationRunner,
      mdVSFrame,
      globalVars
    );

    if (!this.preset.useWASM) {
      Object.assign(this.regVars, Utils.pick(this.mdVSVertex, this.regs));
      Object.assign(globalVars, this.regVars);
    }

    let mdVSFrameMixed;
    if (this.blending) {
      this.prevMDVSFrame = this.prevPresetEquationRunner.runFrameEquations(
        prevGlobalVars
      );
      this.runPixelEquations(
        this.prevPresetEquationRunner,
        this.prevMDVSFrame,
        prevGlobalVars
      );

      mdVSFrameMixed = ReglRenderer.mixFrameEquations(
        this.blendProgress,
        mdVSFrame,
        this.prevMDVSFrame
      );
    } else {
      mdVSFrameMixed = mdVSFrame;
    }

    // Swap framebuffers for ping-pong rendering
    const swapTexture = this.targetFrameBuffer;
    this.targetFrameBuffer = this.prevFrameBuffer;
    this.prevFrameBuffer = swapTexture;

    // Main rendering pipeline using Regl
    this.regl({
      framebuffer: this.targetFrameBuffer,
      viewport: { x: 0, y: 0, width: this.texsizeX, height: this.texsizeY }
    })(() => {
      this.regl.clear({
        color: [0, 0, 0, 1],
        depth: 1
      });

      const { blurMins, blurMaxs } = ReglRenderer.getBlurValues(mdVSFrameMixed);

      // Run main rendering pipeline
      this.renderMainPipeline(mdVSFrame, mdVSFrameMixed, blurMins, blurMaxs, globalVars, prevGlobalVars);
    });

    // Store variables for potential re-rendering
    this.globalVars = globalVars;
    this.mdVSFrame = mdVSFrame;
    this.mdVSFrameMixed = mdVSFrameMixed;

    if (opts.renderToScreen !== false) {
      this.renderToScreen();
    }

    return {
      globalVars,
      mdVSFrame,
      mdVSFrameMixed,
    };
  }

  renderMainPipeline(mdVSFrame, mdVSFrameMixed, blurMins, blurMaxs, globalVars, prevGlobalVars) {
    // Warp shader pass
    if (!this.blending) {
      this.warpShader.renderQuadTexture(
        this.prevFrameBuffer.color[0],
        this.blurShader1.getBlurredTexture(),
        this.blurShader2.getBlurredTexture(),
        this.blurShader3.getBlurredTexture(),
        mdVSFrame,
        this.warpUVs,
        this.warpColor
      );
    } else {
      this.prevWarpShader.renderQuadTexture(
        this.prevFrameBuffer.color[0],
        this.blurShader1.getBlurredTexture(),
        this.blurShader2.getBlurredTexture(),
        this.blurShader3.getBlurredTexture(),
        this.prevMDVSFrame,
        this.warpUVs,
        this.warpColor
      );

      this.warpShader.renderQuadTexture(
        this.prevFrameBuffer.color[0],
        this.blurShader1.getBlurredTexture(),
        this.blurShader2.getBlurredTexture(),
        this.blurShader3.getBlurredTexture(),
        mdVSFrameMixed,
        this.warpUVs,
        this.warpColor
      );
    }

    // Blur passes
    if (this.numBlurPasses > 0) {
      this.blurShader1.render(this.targetFrameBuffer.color[0], mdVSFrame, blurMins, blurMaxs);

      if (this.numBlurPasses > 1) {
        this.blurShader2.render(this.blurShader1.getTexture(), mdVSFrame, blurMins, blurMaxs);

        if (this.numBlurPasses > 2) {
          this.blurShader3.render(this.blurShader2.getTexture(), mdVSFrame, blurMins, blurMaxs);
        }
      }
    }

    // Motion vectors
    this.motionVectors.render(mdVSFrameMixed, this.warpUVs);

    // Custom shapes
    if (this.preset.shapes && this.preset.shapes.length > 0) {
      this.customShapes.forEach((shape, i) => {
        shape.render({
          blendProgress: this.blending ? this.blendProgress : 1,
          globalVars,
          presetEquationRunner: this.presetEquationRunner,
          shapeEqs: this.preset.shapes[i],
          prevTexture: this.prevFrameBuffer.color[0]
        });
      });
    }

    // Custom waveforms
    if (this.preset.waves && this.preset.waves.length > 0) {
      this.customWaveforms.forEach((waveform, i) => {
        waveform.render({
          blendProgress: this.blending ? this.blendProgress : 1,
          timeArrayL: this.audio.timeArrayL,
          timeArrayR: this.audio.timeArrayR,
          freqArrayL: this.audio.freqArrayL,
          freqArrayR: this.audio.freqArrayR,
          globalVars,
          presetEquationRunner: this.presetEquationRunner,
          waveEqs: this.preset.waves[i]
        });
      });
    }

    // Blending for previous preset
    if (this.blending) {
      if (this.prevPreset.shapes && this.prevPreset.shapes.length > 0) {
        this.prevCustomShapes.forEach((shape, i) => {
          shape.render({
            blendProgress: 1.0 - this.blendProgress,
            globalVars: prevGlobalVars,
            presetEquationRunner: this.prevPresetEquationRunner,
            shapeEqs: this.prevPreset.shapes[i],
            prevTexture: this.prevFrameBuffer.color[0]
          });
        });
      }

      if (this.prevPreset.waves && this.prevPreset.waves.length > 0) {
        this.prevCustomWaveforms.forEach((waveform, i) => {
          waveform.render({
            blendProgress: 1.0 - this.blendProgress,
            timeArrayL: this.audio.timeArrayL,
            timeArrayR: this.audio.timeArrayR,
            freqArrayL: this.audio.freqArrayL,
            freqArrayR: this.audio.freqArrayR,
            globalVars: prevGlobalVars,
            presetEquationRunner: this.prevPresetEquationRunner,
            waveEqs: this.prevPreset.waves[i]
          });
        });
      }
    }

    // Basic waveform
    this.basicWaveform.render({
      blending: this.blending,
      blendProgress: this.blendProgress,
      timeArrayL: this.audio.timeArrayL,
      timeArrayR: this.audio.timeArrayR,
      mdVSFrame: mdVSFrameMixed
    });

    // Darken center
    this.darkenCenter.render(mdVSFrameMixed);

    // Borders
    const outerColor = [
      mdVSFrameMixed.ob_r,
      mdVSFrameMixed.ob_g,
      mdVSFrameMixed.ob_b,
      mdVSFrameMixed.ob_a,
    ];
    this.outerBorder.render(outerColor, mdVSFrameMixed.ob_size, 0);

    const innerColor = [
      mdVSFrameMixed.ib_r,
      mdVSFrameMixed.ib_g,
      mdVSFrameMixed.ib_b,
      mdVSFrameMixed.ib_a,
    ];
    this.innerBorder.render(innerColor, mdVSFrameMixed.ib_size, mdVSFrameMixed.ob_size);

    // Title text
    if (this.supertext.startTime >= 0) {
      const progress = (this.time - this.supertext.startTime) / this.supertext.duration;
      if (progress >= 1) {
        this.titleText.render(progress, true, globalVars);
      }
    }
  }

  renderToScreen() {
    // Render to screen with composition shader
    this.regl({
      framebuffer: this.outputFXAA ? this.compFrameBuffer : null,
      viewport: { 
        x: 0, 
        y: 0, 
        width: this.outputFXAA ? this.texsizeX : this.width, 
        height: this.outputFXAA ? this.texsizeY : this.height 
      }
    })(() => {
      this.regl.clear({
        color: [0, 0, 0, 1],
        depth: 1
      });

      const { blurMins, blurMaxs } = ReglRenderer.getBlurValues(this.mdVSFrameMixed);

      if (!this.blending) {
        this.compShader.render({
          blending: false,
          mainTexture: this.targetFrameBuffer.color[0],
          blurTexture1: this.blurShader1.getTexture(),
          blurTexture2: this.blurShader2.getTexture(),
          blurTexture3: this.blurShader3.getTexture(),
          blurMins,
          blurMaxs,
          mdVSFrame: this.mdVSFrame,
          mdVSQs: this.presetEquationRunner.mdVSQAfterFrame,
          warpColor: this.warpColor
        });
      } else {
        this.prevCompShader.render({
          blending: false,
          mainTexture: this.targetFrameBuffer.color[0],
          blurTexture1: this.blurShader1.getTexture(),
          blurTexture2: this.blurShader2.getTexture(),
          blurTexture3: this.blurShader3.getTexture(),
          blurMins,
          blurMaxs,
          mdVSFrame: this.prevMDVSFrame,
          mdVSQs: this.prevPresetEquationRunner.mdVSQAfterFrame,
          warpColor: this.warpColor
        });

        this.compShader.render({
          blending: true,
          mainTexture: this.targetFrameBuffer.color[0],
          blurTexture1: this.blurShader1.getTexture(),
          blurTexture2: this.blurShader2.getTexture(),
          blurTexture3: this.blurShader3.getTexture(),
          blurMins,
          blurMaxs,
          mdVSFrame: this.mdVSFrameMixed,
          mdVSQs: this.presetEquationRunner.mdVSQAfterFrame,
          warpColor: this.warpColor
        });
      }

      // Title text overlay
      if (this.supertext.startTime >= 0) {
        const progress = (this.time - this.supertext.startTime) / this.supertext.duration;
        this.titleText.render(progress, false, this.globalVars);

        if (progress >= 1) {
          this.supertext.startTime = -1;
        }
      }
    });

    // FXAA pass if enabled
    if (this.outputFXAA) {
      this.regl({
        framebuffer: null,
        viewport: { x: 0, y: 0, width: this.width, height: this.height }
      })(() => {
        this.outputShader.render(this.compFrameBuffer.color[0]);
      });
    }
  }

  runPixelEquations(presetEquationRunner, mdVSFrame, globalVars) {
    if (!this.preset.pixel_eqs && !this.preset.pixel_eqs_eel) {
      // No pixel equations, generate default mesh
      this.generateDefaultMesh();
      return;
    }

    // Generate mesh vertices and run pixel equations
    let warpIndex = 0;
    let colorIndex = 0;
    let lastX = 0.5;
    let lastY = 0.5;

    for (let j = 0; j <= this.mesh_height; j++) {
      for (let i = 0; i <= this.mesh_width; i++) {
        // Calculate normalized coordinates
        const x = i / this.mesh_width;
        const y = j / this.mesh_height;
        const rad = Math.sqrt((x - 0.5) * (x - 0.5) + (y - 0.5) * (y - 0.5));
        const ang = Math.atan2(y - 0.5, x - 0.5);

        // Set up pixel equation variables
        const pixelVars = {
          ...globalVars,
          x: x,
          y: y,
          rad: rad,
          ang: ang,
        };

        // Add Q variables for this pixel
        if (!this.preset.useWASM) {
          Object.assign(pixelVars, presetEquationRunner.mdVSQAfterFrame);
        }

                 let newX = x;
         let newY = y;
         let r = 1.0, g = 1.0, b = 1.0, a = 1.0;

         // Run pixel equations
         if (this.preset.useWASM && this.preset.pixel_eqs) {
           // WASM pixel equations
           if (this.preset.globalPools && this.preset.globalPools.perVertex) {
             const pool = this.preset.globalPools.perVertex;
             
             // Set input variables
             if (pool.x) pool.x.value = x;
             if (pool.y) pool.y.value = y;
             if (pool.rad) pool.rad.value = rad;
             if (pool.ang) pool.ang.value = ang;
             if (pool.frame) pool.frame.value = globalVars.frame;
             if (pool.time) pool.time.value = globalVars.time;
             if (pool.fps) pool.fps.value = globalVars.fps;
             if (pool.bass) pool.bass.value = globalVars.bass;
             if (pool.mid) pool.mid.value = globalVars.mid;
             if (pool.treb) pool.treb.value = globalVars.treb;
             if (pool.bass_att) pool.bass_att.value = globalVars.bass_att;
             if (pool.mid_att) pool.mid_att.value = globalVars.mid_att;
             if (pool.treb_att) pool.treb_att.value = globalVars.treb_att;

             // Run the WASM pixel equation
             this.preset.pixel_eqs();

             // Get results
             newX = pool.x ? pool.x.value : x;
             newY = pool.y ? pool.y.value : y;
           }
         } else if (this.preset.pixel_eqs && typeof this.preset.pixel_eqs === 'function') {
           // JavaScript pixel equations
           try {
             const result = this.preset.pixel_eqs(pixelVars);
             newX = result.x !== undefined ? result.x : x;
             newY = result.y !== undefined ? result.y : y;
           } catch (error) {
             console.warn('Error running pixel equations:', error);
             newX = x;
             newY = y;
           }
         }

         // Track last processed vertex
         lastX = newX;
         lastY = newY;

        // Apply zoom, rotation, and other transformations from frame equations
        const zoom = mdVSFrame.zoom || 1.0;
        const zoomexp = mdVSFrame.zoomexp || 1.0;
        const rot = mdVSFrame.rot || 0.0;
        const warp = mdVSFrame.warp || 1.0;
        const cx = mdVSFrame.cx || 0.5;
        const cy = mdVSFrame.cy || 0.5;
        const dx = mdVSFrame.dx || 0.0;
        const dy = mdVSFrame.dy || 0.0;
        const sx = mdVSFrame.sx || 1.0;
        const sy = mdVSFrame.sy || 1.0;

        // Apply zoom
        const effectiveZoom = Math.pow(zoom, Math.pow(zoomexp, rad * 2.0 - 1.0));
        
        // Center coordinates
        let u = newX - cx;
        let v = newY - cy;

        // Apply scaling
        u *= sx;
        v *= sy;

        // Apply rotation
        if (rot !== 0) {
          const cosRot = Math.cos(rot);
          const sinRot = Math.sin(rot);
          const uRot = u * cosRot - v * sinRot;
          const vRot = u * sinRot + v * cosRot;
          u = uRot;
          v = vRot;
        }

        // Apply zoom
        u /= effectiveZoom;
        v /= effectiveZoom;

        // Apply translation and recenter
        u += cx + dx;
        v += cy + dy;

        // Apply warping (this is where the magic happens)
        if (warp !== 1.0) {
          const warpFactor = 1.0 + (warp - 1.0) * Math.exp(-rad * 10.0);
          u = cx + (u - cx) * warpFactor;
          v = cy + (v - cy) * warpFactor;
        }

        // Store UV coordinates
        this.warpUVs[warpIndex++] = u;
        this.warpUVs[warpIndex++] = v;

                 // Calculate color based on position and frame variables
        
        // Apply color transformations
        r = 1.0;
        g = 1.0;
        b = 1.0;
        a = 1.0;

        // Apply red/blue effect
        if (mdVSFrame.red_blue !== 0) {
          const redBlueAmount = mdVSFrame.red_blue;
          r = 1.0 + redBlueAmount * 0.3;
          b = 1.0 - redBlueAmount * 0.3;
        }

        // Apply brighten/darken
        const brighten = mdVSFrame.brighten || 0;
        const darken = mdVSFrame.darken || 0;
        const brightnessFactor = 1.0 + brighten - darken;
        r *= brightnessFactor;
        g *= brightnessFactor;
        b *= brightnessFactor;

        // Apply solarize effect
        if (mdVSFrame.solarize > 0) {
          const solarizeAmount = mdVSFrame.solarize;
          r = r > 0.5 ? 1.0 - (r - 0.5) * solarizeAmount : r;
          g = g > 0.5 ? 1.0 - (g - 0.5) * solarizeAmount : g;
          b = b > 0.5 ? 1.0 - (b - 0.5) * solarizeAmount : b;
        }

        // Apply invert effect
        if (mdVSFrame.invert > 0) {
          const invertAmount = mdVSFrame.invert;
          r = r * (1.0 - invertAmount) + (1.0 - r) * invertAmount;
          g = g * (1.0 - invertAmount) + (1.0 - g) * invertAmount;
          b = b * (1.0 - invertAmount) + (1.0 - b) * invertAmount;
        }

        // Clamp color values
        r = Math.max(0, Math.min(1, r));
        g = Math.max(0, Math.min(1, g));
        b = Math.max(0, Math.min(1, b));
        a = Math.max(0, Math.min(1, a));

        // Store color values
        this.warpColor[colorIndex++] = r;
        this.warpColor[colorIndex++] = g;
        this.warpColor[colorIndex++] = b;
        this.warpColor[colorIndex++] = a;
      }
    }

    // Store results for use in shaders
    this.mdVSVertex = {
      x: lastX,
      y: lastY,
    };
  }

  generateDefaultMesh() {
    // Generate a default mesh when no pixel equations are present
    let warpIndex = 0;
    let colorIndex = 0;

    for (let j = 0; j <= this.mesh_height; j++) {
      for (let i = 0; i <= this.mesh_width; i++) {
        const x = i / this.mesh_width;
        const y = j / this.mesh_height;

        // Store UV coordinates (no transformation)
        this.warpUVs[warpIndex++] = x;
        this.warpUVs[warpIndex++] = y;

        // Store default color values
        this.warpColor[colorIndex++] = 1.0; // r
        this.warpColor[colorIndex++] = 1.0; // g
        this.warpColor[colorIndex++] = 1.0; // b
        this.warpColor[colorIndex++] = 1.0; // a
      }
    }

    this.mdVSVertex = { x: 0.5, y: 0.5 };
  }

  static mixFrameEquations(blendProgress, mdVSFrame, mdVSFramePrev) {
    const mix = 0.5 - 0.5 * Math.cos(blendProgress * Math.PI);
    const mix2 = 1 - mix;

    const mixedFrame = Utils.cloneVars(mdVSFrame);

    mixedFrame.decay = mix * mdVSFrame.decay + mix2 * mdVSFramePrev.decay;
    mixedFrame.wave_a = mix * mdVSFrame.wave_a + mix2 * mdVSFramePrev.wave_a;
    // ... more mixing logic

    return mixedFrame;
  }

  static getBlurValues(mdVSFrame) {
    return {
      blurMins: [mdVSFrame.b1n, mdVSFrame.b2n, mdVSFrame.b3n],
      blurMaxs: [mdVSFrame.b1x, mdVSFrame.b2x, mdVSFrame.b3x],
    };
  }

  launchSongTitleAnim(text) {
    this.supertext = {
      startTime: this.time,
      duration: 1.7,
    };
    this.titleText.generateTitleTexture(text);
  }

  toDataURL() {
    // Implementation for converting current frame to data URL
    return this.regl.read();
  }

  warpBufferToDataURL() {
    // Implementation for converting warp buffer to data URL
    return this.regl.read({ framebuffer: this.targetFrameBuffer });
  }
} 