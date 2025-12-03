
// Standard Vertex Shader for Screen Quad
export const VERT_QUAD = `
  attribute vec3 aPosition;
  attribute vec2 aTexCoord;

  uniform mat4 uProjectionMatrix;
  uniform mat4 uModelViewMatrix;

  varying vec2 vTexCoord;

  void main() {
    vTexCoord = aTexCoord;
    gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
  }
`;

// Master Fragment Shader
// Combines Holographic, Liquid, Pulse, and Pixel effects based on uniforms
export const FRAG_MASTER = `
  precision mediump float;
  varying vec2 vTexCoord;
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uScale;
  
  // Effect Toggles (1.0 = on, 0.0 = off)
  uniform float uEnableHolo;
  uniform float uEnableLiquid;
  uniform float uEnablePulse;
  uniform float uEnablePixel;
  uniform float uEnableDouble;

  // Individual Intensities
  uniform float uIntensityHolo;
  uniform float uIntensityLiquid;
  uniform float uIntensityPulse;
  uniform float uIntensityPixel;
  uniform float uIntensityDouble;

  // --- Helper Functions ---

  // Random noise
  float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  void main() {
    vec2 uv = vTexCoord;
    
    // --- 1. GEOMETRY / UV DISTORTIONS ---
    
    // Vertex Pulse (Ripple)
    if (uEnablePulse > 0.5) {
      vec2 center = vec2(0.5);
      vec2 toCenter = uv - center;
      float dist = length(toCenter);
      float ripple = sin(dist * 30.0 - uTime * 4.0) * 0.02 * uIntensityPulse;
      uv += normalize(toCenter) * ripple;
    }

    // Liquid Metal (Warping)
    if (uEnableLiquid > 0.5) {
      float frequency = 5.0 * uScale;
      float amplitude = 0.03 * uScale * uIntensityLiquid;
      float warpX = sin(uv.y * frequency + uTime) * amplitude;
      float warpY = cos(uv.x * frequency + uTime * 0.8) * amplitude;
      uv += vec2(warpX, warpY);
    }

    // Pixel Artefact (Quantization)
    // Applied last in UV chain to pixelate the distortions
    if (uEnablePixel > 0.5) {
      float grid = 150.0 * uScale / max(0.01, uIntensityPixel); 
      uv = floor(uv * grid) / grid;
    }

    // --- 2. SAMPLING & COLOR EFFECTS ---

    vec4 color;

    // Holographic (Chromatic Aberration + Scanlines)
    if (uEnableHolo > 0.5) {
      // RGB Split
      float offset = 0.005 * uIntensityHolo * sin(uTime * 3.0);
      float r = texture2D(uTexture, uv + vec2(offset, 0.0)).r;
      float g = texture2D(uTexture, uv).g;
      float b = texture2D(uTexture, uv - vec2(offset, 0.0)).b;
      color = vec4(r, g, b, 1.0);
      
      // Scanlines
      float scan = sin(uv.y * 200.0 + uTime * -5.0) * 0.5 + 0.5;
      color.rgb *= 1.0 - (0.2 * uIntensityHolo * scan);
      
      // Cool tint
      color.rgb = mix(color.rgb, vec3(0.0, 1.0, 0.9) * dot(color.rgb, vec3(0.33)), 0.2 * uIntensityHolo);
    } else {
      // Standard Sampling
      color = texture2D(uTexture, uv);
    }

    // Double Exposure (Additive Zoom Echo)
    if (uEnableDouble > 0.5) {
      // Create a zoomed copy
      vec2 center = vec2(0.5);
      float zoomStrength = 0.1 * uIntensityDouble;
      
      // Calculate zoomed UVs
      vec2 zoomUV = (uv - center) * (1.0 - zoomStrength) + center;
      
      // Sample slightly offset in time/space
      vec4 zoomColor = texture2D(uTexture, zoomUV);
      
      // Additive blend: Add the zoom layer to the base
      // We weight it by intensity
      color.rgb += zoomColor.rgb * 0.6 * uIntensityDouble;
    }

    gl_FragColor = color;
  }
`;
