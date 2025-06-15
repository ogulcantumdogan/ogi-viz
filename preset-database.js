// Butterchurn-style presets database
const presetDatabase = [
    {
        name: "Electric Dreams",
        author: "Classic Collection",
        category: "classic",
        description: "Flowing electric patterns with smooth color transitions",
        data: {
            vert: `
                precision mediump float;
                attribute vec2 position;
                uniform float time, audioLevel, bassLevel;
                varying vec2 vPos;
                
                void main() {
                    vPos = position;
                    vec2 pos = position;
                    
                    float wave = sin(pos.x * 6.0 + time * 1.5) * audioLevel * 0.15;
                    wave += cos(pos.y * 4.0 + time * 2.0) * bassLevel * 0.1;
                    
                    pos += wave;
                    gl_Position = vec4(pos, 0, 1);
                }
            `,
            frag: `
                precision mediump float;
                uniform float time, audioLevel;
                varying vec2 vPos;
                
                void main() {
                    float dist = length(vPos);
                    float angle = atan(vPos.y, vPos.x);
                    
                    vec3 color = vec3(
                        sin(time + angle * 2.0) * 0.5 + 0.5,
                        cos(time * 1.3 + dist * 8.0) * 0.5 + 0.5,
                        sin(time * 0.8 + audioLevel * 5.0) * 0.5 + 0.5
                    );
                    
                    color *= (1.0 + audioLevel);
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        }
    },
    
    {
        name: "Cosmic Spiral",
        author: "SpaceViz",
        category: "abstract",
        description: "Hypnotic spiral patterns that respond to bass frequencies",
        data: {
            vert: `
                precision mediump float;
                attribute vec2 position;
                uniform float time, audioLevel, bassLevel;
                varying vec2 vPos;
                
                void main() {
                    vec2 pos = position;
                    float dist = length(pos);
                    float angle = atan(pos.y, pos.x);
                    
                    angle += dist * 10.0 + time * 2.0 + bassLevel * 12.0;
                    pos = vec2(cos(angle), sin(angle)) * dist;
                    
                    vPos = pos * (1.0 + audioLevel * 0.2);
                    gl_Position = vec4(vPos, 0, 1);
                }
            `,
            frag: `
                precision mediump float;
                uniform float time, audioLevel, bassLevel;
                varying vec2 vPos;
                
                void main() {
                    float dist = length(vPos);
                    float spiral = sin(dist * 25.0 - time * 6.0) * 0.5 + 0.5;
                    
                    vec3 color = vec3(
                        spiral + bassLevel,
                        sin(time + dist * 3.0) * 0.5 + 0.5,
                        cos(time * 1.5 + audioLevel * 8.0) * 0.5 + 0.5
                    );
                    
                    color *= (0.8 + audioLevel * 1.5);
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        }
    },
    
    {
        name: "Geometric Pulse",
        author: "ModernFX",
        category: "geometric",
        description: "Sharp geometric patterns with rhythmic pulsing",
        data: {
            vert: `
                precision mediump float;
                attribute vec2 position;
                uniform float time, audioLevel, bassLevel;
                varying vec2 vPos;
                
                void main() {
                    vec2 pos = position;
                    
                    float scale = 1.0 + sin(time * 6.0) * audioLevel * 0.2;
                    scale += cos(time * 4.0) * bassLevel * 0.15;
                    
                    pos *= scale;
                    vPos = pos;
                    
                    gl_Position = vec4(pos, 0, 1);
                }
            `,
            frag: `
                precision mediump float;
                uniform float time, audioLevel, bassLevel;
                varying vec2 vPos;
                
                void main() {
                    vec2 grid = floor(vPos * 10.0) / 10.0;
                    float checker = mod(grid.x + grid.y, 0.2);
                    
                    float pulse = sin(time * 8.0 + length(vPos) * 15.0) * audioLevel;
                    
                    vec3 color = vec3(
                        checker + pulse,
                        sin(time + bassLevel * 5.0) * 0.5 + 0.5,
                        cos(time * 1.2) * 0.5 + 0.5
                    );
                    
                    color *= (1.0 + audioLevel * 2.0);
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        }
    },
    
    {
        name: "Rainbow Tunnels",
        author: "PsychedelicFX",
        category: "psychedelic",
        description: "Colorful tunnel effect with infinite depth illusion",
        data: {
            vert: `
                precision mediump float;
                attribute vec2 position;
                uniform float time, audioLevel;
                varying vec2 vPos;
                
                void main() {
                    vPos = position;
                    vec2 pos = position;
                    
                    float tunnel = length(pos);
                    pos = pos / tunnel * (tunnel + sin(time + audioLevel * 3.0) * 0.1);
                    
                    gl_Position = vec4(pos, 0, 1);
                }
            `,
            frag: `
                precision mediump float;
                uniform float time, audioLevel;
                varying vec2 vPos;
                
                void main() {
                    float dist = length(vPos);
                    float tunnel = 1.0 / (dist + 0.1);
                    
                    vec3 color = vec3(
                        sin(tunnel * 5.0 - time * 3.0) * 0.5 + 0.5,
                        sin(tunnel * 5.0 - time * 3.0 + 2.094) * 0.5 + 0.5,
                        sin(tunnel * 5.0 - time * 3.0 + 4.188) * 0.5 + 0.5
                    );
                    
                    color *= (tunnel * 0.5 + audioLevel);
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        }
    },
    
    {
        name: "Minimal Waves",
        author: "CleanDesign",
        category: "minimal",
        description: "Simple, elegant wave patterns with subtle audio response",
        data: {
            vert: `
                precision mediump float;
                attribute vec2 position;
                uniform float time, audioLevel;
                varying vec2 vPos;
                
                void main() {
                    vPos = position;
                    vec2 pos = position;
                    
                    pos.y += sin(pos.x * 4.0 + time) * audioLevel * 0.1;
                    
                    gl_Position = vec4(pos, 0, 1);
                }
            `,
            frag: `
                precision mediump float;
                uniform float time, audioLevel;
                varying vec2 vPos;
                
                void main() {
                    float wave = sin(vPos.y * 10.0 + time * 2.0) * 0.5 + 0.5;
                    
                    vec3 color = mix(
                        vec3(0.1, 0.1, 0.2),
                        vec3(0.8, 0.9, 1.0),
                        wave * (0.5 + audioLevel)
                    );
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        }
    },
    
    {
        name: "Plasma Storm",
        author: "RetroVision",
        category: "classic",
        description: "Classic plasma effect with modern audio reactivity",
        data: {
            vert: `
                precision mediump float;
                attribute vec2 position;
                uniform float time, audioLevel;
                varying vec2 vPos;
                
                void main() {
                    vPos = position * (1.0 + audioLevel * 0.1);
                    gl_Position = vec4(position, 0, 1);
                }
            `,
            frag: `
                precision mediump float;
                uniform float time, audioLevel;
                varying vec2 vPos;
                
                void main() {
                    float plasma = sin(vPos.x * 10.0 + time);
                    plasma += sin(vPos.y * 10.0 + time * 1.5);
                    plasma += sin((vPos.x + vPos.y) * 10.0 + time * 2.0);
                    plasma *= 0.5 + audioLevel;
                    
                    vec3 color = vec3(
                        sin(plasma + time) * 0.5 + 0.5,
                        sin(plasma + time + 2.094) * 0.5 + 0.5,
                        sin(plasma + time + 4.188) * 0.5 + 0.5
                    );
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        }
    },
    
    {
        name: "Fractal Zoom",
        author: "MathViz",
        category: "abstract",
        description: "Fractal patterns with infinite zoom and audio-reactive scaling",
        data: {
            vert: `
                precision mediump float;
                attribute vec2 position;
                uniform float time, audioLevel;
                varying vec2 vPos;
                
                void main() {
                    float zoom = 1.0 + audioLevel * 0.5;
                    vPos = position * zoom;
                    gl_Position = vec4(position, 0, 1);
                }
            `,
            frag: `
                precision mediump float;
                uniform float time, audioLevel;
                varying vec2 vPos;
                
                void main() {
                    vec2 z = vPos * 3.0;
                    float zoom = time * 0.5 + audioLevel * 2.0;
                    z *= exp(-zoom);
                    
                    float iterations = 0.0;
                    for(int i = 0; i < 32; i++) {
                        if(length(z) > 2.0) break;
                        z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + vPos;
                        iterations++;
                    }
                    
                    float color = iterations / 32.0;
                    vec3 finalColor = vec3(
                        sin(color * 6.28 + time) * 0.5 + 0.5,
                        sin(color * 6.28 + time + 2.094) * 0.5 + 0.5,
                        sin(color * 6.28 + time + 4.188) * 0.5 + 0.5
                    );
                    
                    finalColor *= (0.7 + audioLevel * 1.3);
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `
        }
    },
    
    {
        name: "Crystal Grid",
        author: "CrystalFX",
        category: "geometric",
        description: "Crystalline grid patterns with prismatic color splitting",
        data: {
            vert: `
                precision mediump float;
                attribute vec2 position;
                uniform float time, audioLevel, bassLevel;
                varying vec2 vPos;
                
                void main() {
                    vec2 pos = position;
                    
                    // Crystal facet rotation
                    float angle = time * 0.3 + bassLevel * 3.14159;
                    mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
                    pos = rotation * pos;
                    
                    vPos = pos * (1.0 + audioLevel * 0.3);
                    gl_Position = vec4(vPos, 0, 1);
                }
            `,
            frag: `
                precision mediump float;
                uniform float time, audioLevel, bassLevel;
                varying vec2 vPos;
                
                void main() {
                    vec2 grid = abs(fract(vPos * 8.0) - 0.5);
                    float crystal = min(grid.x, grid.y);
                    crystal = step(0.1, crystal);
                    
                    // Prismatic color separation
                    float prism = length(vPos) + time;
                    vec3 color = vec3(
                        sin(prism + 0.0) * 0.5 + 0.5,
                        sin(prism + 2.094) * 0.5 + 0.5,
                        sin(prism + 4.188) * 0.5 + 0.5
                    );
                    
                    color = mix(color, vec3(1.0), crystal);
                    color *= (0.6 + audioLevel * 1.4 + bassLevel * 0.8);
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        }
    },
    
    {
        name: "Liquid Metal",
        author: "FluidFX",
        category: "psychedelic",
        description: "Flowing metallic surfaces with liquid-like movement",
        data: {
            vert: `
                precision mediump float;
                attribute vec2 position;
                uniform float time, audioLevel, bassLevel;
                varying vec2 vPos;
                
                void main() {
                    vec2 pos = position;
                    
                    // Liquid distortion
                    float wave1 = sin(pos.x * 3.0 + time * 2.0) * audioLevel * 0.2;
                    float wave2 = cos(pos.y * 4.0 + time * 1.5) * bassLevel * 0.15;
                    pos += vec2(wave1, wave2);
                    
                    vPos = pos;
                    gl_Position = vec4(pos, 0, 1);
                }
            `,
            frag: `
                precision mediump float;
                uniform float time, audioLevel, bassLevel;
                varying vec2 vPos;
                
                void main() {
                    float dist = length(vPos);
                    float ripple = sin(dist * 15.0 - time * 8.0) * 0.5 + 0.5;
                    
                    // Metallic reflection
                    float metallic = pow(ripple, 0.3);
                    vec3 baseColor = vec3(0.7, 0.8, 1.0);
                    vec3 metalColor = vec3(1.0, 0.9, 0.7);
                    
                    vec3 color = mix(baseColor, metalColor, metallic);
                    color += vec3(ripple * audioLevel * 2.0);
                    
                    // Add liquid shimmer
                    float shimmer = sin(time * 6.0 + dist * 20.0) * bassLevel * 0.5;
                    color += shimmer;
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        }
    },
    
    {
        name: "Zen Garden",
        author: "PeacefulViz",
        category: "minimal",
        description: "Calm, meditative patterns inspired by Japanese zen gardens",
        data: {
            vert: `
                precision mediump float;
                attribute vec2 position;
                uniform float time, audioLevel;
                varying vec2 vPos;
                
                void main() {
                    vPos = position;
                    vec2 pos = position;
                    
                    // Gentle breathing movement
                    float breath = sin(time * 0.5) * audioLevel * 0.05;
                    pos *= (1.0 + breath);
                    
                    gl_Position = vec4(pos, 0, 1);
                }
            `,
            frag: `
                precision mediump float;
                uniform float time, audioLevel;
                varying vec2 vPos;
                
                void main() {
                    float dist = length(vPos);
                    
                    // Zen circles
                    float circles = sin(dist * 20.0 - time * 0.8) * 0.5 + 0.5;
                    circles = smoothstep(0.4, 0.6, circles);
                    
                    // Peaceful colors
                    vec3 color = mix(
                        vec3(0.05, 0.1, 0.15),  // Deep blue
                        vec3(0.8, 0.9, 0.95),   // Light blue
                        circles
                    );
                    
                    // Subtle audio response
                    color += audioLevel * 0.3;
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        }
    },
    
    {
        name: "Neon City",
        author: "CyberPunk",
        category: "classic",
        description: "Cyberpunk-inspired neon grid with electric atmosphere",
        data: {
            vert: `
                precision mediump float;
                attribute vec2 position;
                uniform float time, audioLevel, bassLevel;
                varying vec2 vPos;
                
                void main() {
                    vec2 pos = position;
                    
                    // Electric jitter
                    float jitter = (sin(time * 30.0) + cos(time * 37.0)) * bassLevel * 0.02;
                    pos += jitter;
                    
                    vPos = pos;
                    gl_Position = vec4(pos, 0, 1);
                }
            `,
            frag: `
                precision mediump float;
                uniform float time, audioLevel, bassLevel;
                varying vec2 vPos;
                
                void main() {
                    vec2 grid = abs(fract(vPos * 12.0) - 0.5);
                    float lines = min(grid.x, grid.y);
                    lines = 1.0 - smoothstep(0.02, 0.05, lines);
                    
                    // Neon glow
                    vec3 neonColor = vec3(
                        0.1 + bassLevel,
                        0.8 + audioLevel * 0.5,
                        1.0
                    );
                    
                    // Electric pulse
                    float pulse = sin(time * 4.0 + length(vPos) * 10.0) * 0.3 + 0.7;
                    neonColor *= pulse;
                    
                    vec3 color = lines * neonColor;
                    color += vec3(0.0, 0.1, 0.2) * (1.0 - lines); // Dark background
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        }
    },
    
    {
        name: "Kaleidoscope Dreams",
        author: "SymmetryFX",
        category: "psychedelic",
        description: "Symmetrical kaleidoscope patterns with infinite reflections",
        data: {
            vert: `
                precision mediump float;
                attribute vec2 position;
                uniform float time, audioLevel;
                varying vec2 vPos;
                
                void main() {
                    float rotation = time * 0.5 + audioLevel * 3.14159;
                    mat2 rot = mat2(cos(rotation), -sin(rotation), sin(rotation), cos(rotation));
                    
                    vPos = rot * position;
                    gl_Position = vec4(position, 0, 1);
                }
            `,
            frag: `
                precision mediump float;
                uniform float time, audioLevel;
                varying vec2 vPos;
                
                void main() {
                    vec2 pos = vPos;
                    
                    // Kaleidoscope symmetry
                    pos = abs(pos);
                    float angle = atan(pos.y, pos.x);
                    angle = mod(angle, 3.14159 / 3.0);
                    if(angle > 3.14159 / 6.0) angle = 3.14159 / 3.0 - angle;
                    
                    float radius = length(pos);
                    pos = vec2(cos(angle), sin(angle)) * radius;
                    
                    // Pattern generation
                    float pattern = sin(pos.x * 8.0 + time * 2.0) * cos(pos.y * 6.0 + time * 1.5);
                    pattern = abs(pattern);
                    
                    vec3 color = vec3(
                        sin(pattern * 6.28 + time) * 0.5 + 0.5,
                        sin(pattern * 6.28 + time + 2.094) * 0.5 + 0.5,
                        sin(pattern * 6.28 + time + 4.188) * 0.5 + 0.5
                    );
                    
                    color *= (0.8 + audioLevel * 1.2);
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        }
    }
]; 