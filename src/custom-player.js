/* eslint-disable no-undef */
// Global variables loaded via script tags: butterchurn, butterchurnPresets

class CustomButterchurnPlayer {
    constructor() {
        this.visualizer = null;
        this.audioContext = null;
        this.sourceNode = null;
        this.rendering = false;
        this.playlist = [];
        this.currentPresetIndex = 0;
        this.isPlaying = false;
        this.presetTimeout = null;
        
        this.presets = {};
        this.presetKeys = [];
        
        this.init();
    }
    
    async init() {
        // Initialize audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Load presets
        this.presets = butterchurnPresets.getPresets();
        this.presetKeys = Object.keys(this.presets).sort();
        
        // Load custom fractal preset
        await this.loadCustomPreset();
        
        // Initialize visualizer
        const canvas = document.getElementById('canvas');
        this.visualizer = butterchurn.default.createVisualizer(this.audioContext, canvas, {
            width: canvas.offsetWidth,
            height: canvas.offsetHeight,
            pixelRatio: window.devicePixelRatio || 1,
            textureRatio: 1,
        });
        
        this.setupUI();
        this.setupEventListeners();
        
        // Load first preset if available
        if (this.presetKeys.length > 0) {
            this.visualizer.loadPreset(this.presets[this.presetKeys[0]], 0);
        }
        
        // Set up canvas resize
        this.resizeCanvas();
    }
    
    async loadCustomPreset() {
        try {
            const response = await fetch('./experiments/wasm-eel/presets/___000_faces.json');
            if (response.ok) {
                const fractalPreset = await response.json();
                this.presetKeys.push('___000 OGI FRACTALS');
                this.presets['___000 OGI FRACTALS'] = fractalPreset;
                console.log('Custom fractal preset loaded successfully');
            } else {
                console.warn('Could not load custom fractal preset:', response.status);
            }
        } catch (error) {
            console.warn('Failed to load custom fractal preset:', error);
        }
    }
    
    setupUI() {
        // Populate preset selector
        const presetSelect = document.getElementById('presetSelect');
        this.presetKeys.forEach((presetName, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = presetName.length > 50 ? 
                presetName.substring(0, 50) + '...' : presetName;
            presetSelect.appendChild(option);
        });
        
        this.updatePlaylistUI();
    }
    
    setupEventListeners() {
        // Playlist controls
        document.getElementById('playBtn').addEventListener('click', () => this.playPlaylist());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pausePlaylist());
        document.getElementById('prevBtn').addEventListener('click', () => this.previousPreset());
        document.getElementById('nextBtn').addEventListener('click', () => this.nextPreset());
        
        // Add preset to playlist
        document.getElementById('addPresetBtn').addEventListener('click', () => this.addPresetToPlaylist());
        
        // Playlist management
        document.getElementById('savePlaylistBtn').addEventListener('click', () => this.savePlaylist());
        document.getElementById('loadPlaylistBtn').addEventListener('click', () => document.getElementById('loadPlaylistFile').click());
        document.getElementById('loadPlaylistFile').addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.loadPlaylist(e.target.files[0]);
            }
        });
        document.getElementById('clearPlaylistBtn').addEventListener('click', () => this.clearPlaylist());
        
        // Audio file input
        document.getElementById('audioFile').addEventListener('change', (e) => this.loadAudioFile(e));
        document.getElementById('micBtn').addEventListener('click', () => this.useMicrophone());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.isPlaying ? this.pausePlaylist() : this.playPlaylist();
                    break;
                case 'ArrowRight':
                    this.nextPreset();
                    break;
                case 'ArrowLeft':
                    this.previousPreset();
                    break;
            }
        });
        
        // Window resize
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    addPresetToPlaylist() {
        const select = document.getElementById('presetSelect');
        const presetIndex = parseInt(select.value);
        const presetName = this.presetKeys[presetIndex];
        
        const playlistItem = {
            name: presetName,
            preset: this.presets[presetName],
            duration: 15000, // Default 15 seconds
            id: Date.now() + Math.random()
        };
        
        this.playlist.push(playlistItem);
        this.updatePlaylistUI();
    }
    
    updatePlaylistUI() {
        const playlistDiv = document.getElementById('playlist');
        const playlistCount = document.getElementById('playlistCount');
        
        // Update counter
        playlistCount.textContent = this.playlist.length;
        
        playlistDiv.innerHTML = '';
        
        if (this.playlist.length === 0) {
            playlistDiv.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
                    No presets in playlist.<br>
                    Add some presets above!
                </div>
            `;
            return;
        }
        
        this.playlist.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = `preset-item ${index === this.currentPresetIndex ? 'active' : ''}`;
            
            itemDiv.innerHTML = `
                <div class="preset-name">
                    ${item.name.length > 30 ? item.name.substring(0, 30) + '...' : item.name}
                </div>
                <div class="preset-controls">
                    <input type="number" class="duration-input" value="${item.duration / 1000}" 
                           min="1" max="300" step="1"
                           onchange="window.player.updatePresetDuration(${index}, this.value)">s
                    <button class="remove-btn" onclick="window.player.removeFromPlaylist(${index})">×</button>
                </div>
            `;
            
            itemDiv.addEventListener('click', (e) => {
                if (!e.target.matches('input, button')) {
                    this.jumpToPreset(index);
                }
            });
            
            playlistDiv.appendChild(itemDiv);
        });
    }
    
    updatePresetDuration(index, durationSeconds) {
        if (this.playlist[index]) {
            this.playlist[index].duration = durationSeconds * 1000;
        }
    }
    
    removeFromPlaylist(index) {
        this.playlist.splice(index, 1);
        if (this.currentPresetIndex >= index) {
            this.currentPresetIndex = Math.max(0, this.currentPresetIndex - 1);
        }
        this.updatePlaylistUI();
    }
    
    playPlaylist() {
        if (this.playlist.length === 0) {
            alert('Please add presets to the playlist first!');
            return;
        }
        
        this.isPlaying = true;
        this.loadCurrentPreset();
        this.startRenderer();
        this.scheduleNextPreset();
        
        // Update status
        document.getElementById('playbackStatus').textContent = 'Playing';
    }
    
    pausePlaylist() {
        this.isPlaying = false;
        if (this.presetTimeout) {
            clearTimeout(this.presetTimeout);
            this.presetTimeout = null;
        }
        
        // Update status
        document.getElementById('playbackStatus').textContent = 'Paused';
    }
    
    nextPreset() {
        if (this.playlist.length === 0) return;
        
        this.currentPresetIndex = (this.currentPresetIndex + 1) % this.playlist.length;
        this.loadCurrentPreset();
        this.updatePlaylistUI();
        
        if (this.isPlaying) {
            this.scheduleNextPreset();
        }
    }
    
    previousPreset() {
        if (this.playlist.length === 0) return;
        
        this.currentPresetIndex = this.currentPresetIndex === 0 ? 
            this.playlist.length - 1 : this.currentPresetIndex - 1;
        this.loadCurrentPreset();
        this.updatePlaylistUI();
        
        if (this.isPlaying) {
            this.scheduleNextPreset();
        }
    }
    
    jumpToPreset(index) {
        if (index >= 0 && index < this.playlist.length) {
            this.currentPresetIndex = index;
            this.loadCurrentPreset();
            this.updatePlaylistUI();
            
            if (this.isPlaying) {
                this.scheduleNextPreset();
            }
        }
    }
    
    loadCurrentPreset() {
        if (this.playlist.length > 0 && this.visualizer) {
            const currentItem = this.playlist[this.currentPresetIndex];
            this.visualizer.loadPreset(currentItem.preset, 2.0); // 2 second blend
            
            // Update status
            document.getElementById('currentPreset').textContent = currentItem.name;
        }
    }
    
    scheduleNextPreset() {
        if (this.presetTimeout) {
            clearTimeout(this.presetTimeout);
        }
        
        if (this.isPlaying && this.playlist.length > 0) {
            const currentItem = this.playlist[this.currentPresetIndex];
            this.presetTimeout = setTimeout(() => {
                this.nextPreset();
            }, currentItem.duration);
        }
    }
    
    startRenderer() {
        if (!this.rendering) {
            this.rendering = true;
            this.renderLoop();
        }
    }
    
    renderLoop() {
        if (this.rendering) {
            requestAnimationFrame(() => this.renderLoop());
            this.visualizer.render();
        }
    }
    
    async loadAudioFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            await this.audioContext.resume();
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            if (this.sourceNode) {
                this.sourceNode.disconnect();
            }
            
            this.sourceNode = this.audioContext.createBufferSource();
            this.sourceNode.buffer = audioBuffer;
            this.sourceNode.loop = true;
            
            // Connect to visualizer
            this.visualizer.connectAudio(this.sourceNode);
            this.sourceNode.connect(this.audioContext.destination);
            this.sourceNode.start(0);
            
            this.startRenderer();
        } catch (error) {
            console.error('Error loading audio file:', error);
            alert('Error loading audio file. Please try a different file.');
        }
    }
    
    async useMicrophone() {
        try {
            await this.audioContext.resume();
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const micSource = this.audioContext.createMediaStreamSource(stream);
            
            // Add some gain to boost microphone input
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = 1.5;
            
            micSource.connect(gainNode);
            this.visualizer.connectAudio(gainNode);
            
            this.startRenderer();
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Error accessing microphone. Please check permissions.');
        }
    }
    
    resizeCanvas() {
        const canvas = document.getElementById('canvas');
        const container = document.getElementById('visualizer-container');
        
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
        
        if (this.visualizer) {
            this.visualizer.setRendererSize(canvas.width, canvas.height);
        }
    }
    
    // Save/Load playlist functionality
    savePlaylist() {
        const playlistData = this.playlist.map(item => ({
            name: item.name,
            duration: item.duration
        }));
        
        const dataStr = JSON.stringify(playlistData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'butterchurn-playlist.json';
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    async loadPlaylist(file) {
        try {
            const text = await file.text();
            const playlistData = JSON.parse(text);
            
            this.playlist = playlistData.map(item => ({
                ...item,
                preset: this.presets[item.name],
                id: Date.now() + Math.random()
            })).filter(item => item.preset); // Filter out presets that don't exist
            
            this.currentPresetIndex = 0;
            this.updatePlaylistUI();
        } catch (error) {
            console.error('Error loading playlist:', error);
            alert('Error loading playlist file.');
        }
    }
    
    clearPlaylist() {
        this.playlist = [];
        this.currentPresetIndex = 0;
        this.pausePlaylist();
        this.updatePlaylistUI();
    }
}

// Initialize the player when the page loads and make it globally accessible
document.addEventListener('DOMContentLoaded', () => {
    window.player = new CustomButterchurnPlayer();
}); 