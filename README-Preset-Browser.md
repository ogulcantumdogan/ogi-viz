# 🎵 Butterchurn Preset Browser

A beautiful, modern web interface for browsing and experiencing butterchurn-style music visualizations with real-time audio reactivity.

## ✨ Features

- **12 Unique Presets** - Carefully crafted visual effects across different categories
- **Category Filtering** - Browse by Classic, Abstract, Geometric, Psychedelic, and Minimal styles
- **Real-Time Audio Analysis** - Full frequency spectrum analysis with bass/treble separation
- **Multiple Audio Sources** - Support for audio files and microphone input
- **Modern UI** - Glass-morphism design with smooth animations and transitions
- **Audio Visualizer** - Live frequency spectrum display with 20-band visualization
- **Responsive Design** - Works on desktop and mobile devices

## 🚀 Getting Started

### Option 1: Simple File Opening
1. Download all files to a folder:
   - `preset-browser.html`
   - `preset-database.js` 
   - `preset-browser.js`

2. Open `preset-browser.html` in a modern web browser

3. The visualization will start automatically with the default "Electric Dreams" preset

### Option 2: Local Server (Recommended for audio files)
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js
npx serve .

# Then visit http://localhost:8000/preset-browser.html
```

## 🎨 Available Presets

### Classic Category
- **Electric Dreams** - Flowing electric patterns with smooth color transitions
- **Plasma Storm** - Classic plasma effect with modern audio reactivity  
- **Neon City** - Cyberpunk-inspired neon grid with electric atmosphere

### Abstract Category  
- **Cosmic Spiral** - Hypnotic spiral patterns that respond to bass frequencies
- **Fractal Zoom** - Fractal patterns with infinite zoom and audio-reactive scaling

### Geometric Category
- **Geometric Pulse** - Sharp geometric patterns with rhythmic pulsing
- **Crystal Grid** - Crystalline grid patterns with prismatic color splitting

### Psychedelic Category
- **Rainbow Tunnels** - Colorful tunnel effect with infinite depth illusion
- **Liquid Metal** - Flowing metallic surfaces with liquid-like movement
- **Kaleidoscope Dreams** - Symmetrical kaleidoscope patterns with infinite reflections

### Minimal Category
- **Minimal Waves** - Simple, elegant wave patterns with subtle audio response
- **Zen Garden** - Calm, meditative patterns inspired by Japanese zen gardens

## 🎧 Audio Setup

### Using Audio Files
1. Click the "📁 Choose Audio File" button
2. Select any audio file (MP3, WAV, OGG, etc.)
3. The file will automatically load and begin playing
4. Use the Play/Pause button to control playback

### Using Microphone
1. Click the "🎤 Use Microphone" button
2. Grant microphone permission when prompted
3. The visualization will react to live audio input
4. Speak, sing, or play music near your microphone

## 🎮 Controls

### Preset Browser Panel (Right)
- **Category Tabs** - Filter presets by type (All, Classic, Abstract, etc.)
- **Preset List** - Click any preset to load it instantly
- **Preset Preview** - Shows details about the selected preset

### Audio Control Panel (Left)
- **File Upload** - Drag & drop or click to select audio files
- **Play/Pause** - Control audio playback
- **Microphone** - Enable live microphone input
- **Audio Visualizer** - 20-band frequency spectrum display
- **Status Display** - Shows current audio status and file info

## 🛠️ Technical Details

### Technologies Used
- **WebGL** - Hardware-accelerated graphics via Regl.js
- **Web Audio API** - Real-time audio analysis and processing
- **GLSL Shaders** - Custom vertex and fragment shaders for each preset
- **CSS3** - Modern styling with backdrop-filter and animations
- **ES6 JavaScript** - Modern JavaScript features and async/await

### Audio Analysis
- **FFT Size**: 2048 samples for high-frequency resolution
- **Frequency Range**: Full spectrum analysis (20Hz - 22kHz)
- **Bass Detection**: Analyzes bottom 15% of frequency spectrum
- **Smoothing**: 0.8 smoothing factor for stable visualization
- **Sample Rate**: 60 FPS update rate for smooth animation

### Performance
- **60 FPS Target** - Optimized for smooth real-time rendering
- **WebGL Acceleration** - GPU-accelerated graphics processing
- **Efficient Shaders** - Optimized GLSL code for maximum performance
- **Memory Management** - Proper cleanup and resource management

## 🎨 Shader Architecture

Each preset consists of:
- **Vertex Shader** - Handles vertex position and audio-reactive transformations
- **Fragment Shader** - Generates the visual effects and colors
- **Uniforms** - Time, audio level, and bass level variables
- **Attributes** - Vertex positions for the full-screen quad

### Audio Uniforms Available to Shaders
```glsl
uniform float time;      // Continuous time value
uniform float audioLevel; // Overall audio amplitude (0.0 - 1.0)
uniform float bassLevel;  // Bass frequency amplitude (0.0 - 1.0)
```

## 🔧 Customization

### Adding New Presets
1. Open `preset-database.js`
2. Add a new preset object to the `presetDatabase` array:
```javascript
{
    name: "Your Preset Name",
    author: "Your Name", 
    category: "geometric", // or "classic", "abstract", "psychedelic", "minimal"
    description: "Description of your visual effect",
    data: {
        vert: `your vertex shader code`,
        frag: `your fragment shader code`
    }
}
```

### Modifying Existing Presets
- Edit the shader code in `preset-database.js`
- Modify the vertex shader for position-based effects
- Modify the fragment shader for color and pattern effects
- Use `audioLevel` and `bassLevel` uniforms for audio reactivity

## 📱 Browser Compatibility

### Supported Browsers
- ✅ Chrome 60+ (Recommended)
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

### Required Features
- WebGL 1.0 support
- Web Audio API support
- File API support
- ES6 JavaScript support

## 🐛 Troubleshooting

### Audio Not Working
- Ensure browser allows audio playback (click page first)
- Check if audio file format is supported
- Verify microphone permissions are granted
- Try using a local server for audio file loading

### Performance Issues
- Close other tabs/applications using GPU
- Try smaller window size
- Disable browser hardware acceleration if needed
- Update graphics drivers

### Preset Not Loading
- Check browser console for shader errors
- Ensure all files are in the same directory
- Verify WebGL support is enabled

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Credits

- Built with [Regl.js](https://github.com/regl-project/regl) for WebGL rendering
- Inspired by the original [Butterchurn](https://github.com/jberg/butterchurn) project
- Audio analysis powered by Web Audio API
- Modern UI design with CSS3 and backdrop-filter effects

---

**Enjoy creating beautiful music visualizations! 🎵✨** 