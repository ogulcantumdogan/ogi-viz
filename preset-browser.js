// Global variables
let regl, audioContext, analyser, currentAudio, isPlaying = false;
let frameCount = 0, lastTime = performance.now();
let time = 0, audioData = new Float32Array(1024);
let drawCommand, currentPresetData = null;
let filteredPresets = [...presetDatabase];

// Initialize
async function init() {
    try {
        updateStatus('Initializing WebGL and Audio...');
        
        const canvas = document.getElementById('canvas');
        updateCanvas();
        
        // Initialize WebGL with Regl
        regl = createREGL({
            canvas: canvas,
            attributes: { antialias: true, depth: false, alpha: false }
        });
        
        // Initialize Audio Context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Load default preset
        loadPreset(presetDatabase[0]);
        
        // Initialize UI
        setupUI();
        populatePresetList();
        createAudioBars();
        
        updateStatus('✅ Ready! Upload audio or browse presets');
        render();
        
    } catch (error) {
        updateStatus('❌ Initialization failed: ' + error.message);
        console.error('Init error:', error);
    }
}

function setupUI() {
    // Category tabs
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            filterPresets(tab.dataset.category);
        });
    });
    
    // Audio file upload
    document.getElementById('audioFile').addEventListener('change', handleAudioFile);
}

function filterPresets(category) {
    filteredPresets = presetDatabase.filter(preset => {
        return category === 'all' || preset.category === category;
    });
    populatePresetList();
}

function populatePresetList() {
    const listElement = document.getElementById('presetList');
    
    if (filteredPresets.length === 0) {
        listElement.innerHTML = '<div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.6);">No presets found</div>';
        return;
    }
    
    listElement.innerHTML = filteredPresets.map((preset, index) => `
        <div class="preset-item" onclick="loadPresetFromList(${presetDatabase.indexOf(preset)})" 
             style="animation-delay: ${index * 0.05}s">
            <div class="preset-name">${preset.name}</div>
            <div class="preset-author">by ${preset.author}</div>
            <div class="preset-description">${preset.description}</div>
        </div>
    `).join('');
}

function loadPresetFromList(index) {
    // Remove active class from all items
    document.querySelectorAll('.preset-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Find and activate the clicked item
    const presetItems = document.querySelectorAll('.preset-item');
    const filteredIndex = filteredPresets.findIndex(p => presetDatabase.indexOf(p) === index);
    if (filteredIndex !== -1 && presetItems[filteredIndex]) {
        presetItems[filteredIndex].classList.add('active');
    }
    
    loadPreset(presetDatabase[index]);
}

function loadPreset(preset) {
    currentPresetData = preset;
    
    if (regl && preset.data) {
        try {
            drawCommand = regl({
                vert: preset.data.vert,
                frag: preset.data.frag,
                attributes: {
                    position: [[-1, -1], [1, -1], [-1, 1], [-1, 1], [1, -1], [1, 1]]
                },
                uniforms: {
                    time: () => time,
                    audioLevel: getAudioLevel,
                    bassLevel: getBassLevel
                },
                count: 6
            });
            
            updateStatus(`🎨 Loaded: ${preset.name}`);
        } catch (error) {
            updateStatus(`❌ Shader error in ${preset.name}: ${error.message}`);
            console.error('Shader compile error:', error);
        }
    }
}

function createAudioBars() {
    const barsContainer = document.getElementById('audioBars');
    const numBars = 20;
    
    // Clear existing bars
    barsContainer.innerHTML = '';
    
    for (let i = 0; i < numBars; i++) {
        const bar = document.createElement('div');
        bar.className = 'audio-bar';
        bar.style.height = '10%';
        barsContainer.appendChild(bar);
    }
}

function updateAudioBars() {
    if (!analyser) return;
    
    const bars = document.querySelectorAll('.audio-bar');
    analyser.getFloatFrequencyData(audioData);
    
    bars.forEach((bar, index) => {
        const dataIndex = Math.floor((index / bars.length) * audioData.length);
        const value = Math.max(0, (audioData[dataIndex] + 140) / 140);
        bar.style.height = Math.max(5, value * 100) + '%';
    });
}

function getAudioLevel() {
    if (!analyser) return 0.1 + Math.sin(time * 2.0) * 0.05; // Fallback animation
    
    analyser.getFloatFrequencyData(audioData);
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
        sum += Math.max(0, (audioData[i] + 140) / 140);
    }
    const level = Math.max(0, Math.min(1, sum / audioData.length));
    
    updateAudioBars();
    return level;
}

function getBassLevel() {
    if (!analyser) return 0.1 + Math.cos(time * 1.5) * 0.05; // Fallback animation
    
    analyser.getFloatFrequencyData(audioData);
    let bassSum = 0;
    const bassEnd = Math.floor(audioData.length * 0.15);
    
    for (let i = 0; i < bassEnd; i++) {
        bassSum += Math.max(0, (audioData[i] + 140) / 140);
    }
    
    return Math.max(0, Math.min(1, bassSum / bassEnd));
}

function updateCanvas() {
    const canvas = document.getElementById('canvas');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
}

function render() {
    frameCount++;
    const now = performance.now();
    
    if (now - lastTime >= 1000) {
        // Update FPS display if exists
        const fpsElement = document.getElementById('fps');
        if (fpsElement) {
            fpsElement.textContent = frameCount;
        }
        frameCount = 0;
        lastTime = now;
    }
    
    // Smooth time progression
    time += 0.016;
    
    // Clear and render
    if (regl) {
        regl.clear({ color: [0, 0, 0, 1], depth: 1 });
        
        if (drawCommand) {
            try {
                drawCommand();
            } catch (error) {
                console.error('Render error:', error);
            }
        }
    }
    
    requestAnimationFrame(render);
}

// Control functions
window.toggleAudio = function() {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    if (currentAudio) {
        if (isPlaying) {
            currentAudio.pause();
            updateAudioStatus('⏸️ Audio paused');
        } else {
            currentAudio.play().catch(error => {
                updateAudioStatus('❌ Play failed: ' + error.message);
            });
            updateAudioStatus('▶️ Audio playing');
        }
        isPlaying = !isPlaying;
    } else {
        updateAudioStatus('⚠️ No audio loaded');
    }
};

window.useMicrophone = async function() {
    try {
        if (audioContext && audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: { 
                echoCancellation: false, 
                noiseSuppression: false,
                autoGainControl: false
            }
        });
        
        const source = audioContext.createMediaStreamSource(stream);
        connectAudioSource(source);
        
        updateAudioStatus('🎤 Microphone connected');
        
    } catch (error) {
        updateAudioStatus('❌ Microphone access denied: ' + error.message);
    }
};

function connectAudioSource(source) {
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    
    // Update audio data buffer
    audioData = new Float32Array(analyser.frequencyBinCount);
}

async function handleAudioFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        if (audioContext && audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        if (currentAudio) {
            currentAudio.pause();
        }
        
        const url = URL.createObjectURL(file);
        currentAudio = new Audio(url);
        currentAudio.loop = true;
        currentAudio.volume = 0.8;
        currentAudio.crossOrigin = 'anonymous';
        
        // Create audio source and connect
        const source = audioContext.createMediaElementSource(currentAudio);
        connectAudioSource(source);
        source.connect(audioContext.destination);
        
        updateAudioStatus(`🎵 ${file.name} loaded`);
        
        // Update file label
        document.querySelector('.file-input-label').textContent = `🎵 ${file.name.substring(0, 25)}${file.name.length > 25 ? '...' : ''}`;
        
        // Auto-play
        currentAudio.play().then(() => {
            isPlaying = true;
            updateAudioStatus(`▶️ Playing: ${file.name}`);
        }).catch(error => {
            updateAudioStatus('⚠️ Click play to start audio');
        });
        
    } catch (error) {
        updateAudioStatus('❌ Audio load failed: ' + error.message);
        console.error('Audio load error:', error);
    }
}

function updateStatus(message) {
    const statusElement = document.getElementById('statusText');
    if (statusElement) {
        statusElement.textContent = message;
    }
    console.log('Status:', message);
}

function updateAudioStatus(message) {
    const audioStatusElement = document.getElementById('audioStatus');
    if (audioStatusElement) {
        audioStatusElement.textContent = message;
    }
    console.log('Audio:', message);
}

// Event listeners
window.addEventListener('resize', updateCanvas);
window.addEventListener('click', () => {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
}, { once: true });

// Initialize when page loads
window.addEventListener('load', init); 