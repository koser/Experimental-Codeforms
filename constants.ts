





// Standard Vertex Shader
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

// Shared Shader Header (Uniforms & Helpers)
export const SHADER_HEADER = `
  precision mediump float;
  varying vec2 vTexCoord;
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform vec2 uResolution;

  // Random noise helper
  float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  // 2D Noise based on Morgan McGuire @morgan3d
  // https://www.shadertoy.com/view/4dS3Wd
  float noise (in vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);

      // Four corners in 2D of a tile
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));

      vec2 u = f * f * (3.0 - 2.0 * f);

      return mix(a, b, u.x) +
              (c - a)* u.y * (1.0 - u.x) +
              (d - b) * u.x * u.y;
  }

  // Fractional Brownian Motion
  #define OCTAVES 3
  float fbm (in vec2 st) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 0.0;
      
      for (int i = 0; i < OCTAVES; i++) {
          value += amplitude * noise(st);
          st *= 2.0;
          amplitude *= 0.5;
      }
      return value;
  }
`;

// Modular Shader Definitions
export const SHADER_MODULES = {
  vertex_pulse: {
    uniforms: `
      uniform float uEnablePulse;
      uniform float uIntensityPulse;
      uniform float uScalePulse;
      uniform float uTimeScalePulse;
    `,
    uv: `
      if (uEnablePulse > 0.5) {
        vec2 center = vec2(0.5);
        vec2 toCenter = uv - center;
        float dist = length(toCenter);
        float t = uTime * 4.0 * uTimeScalePulse;
        float ripple = sin(dist * 30.0 * (uScalePulse * 0.2) - t) * 0.02 * uIntensityPulse;
        uv += normalize(toCenter) * ripple;
      }
    `,
    split: ``,
    color: ``
  },
  liquid_metal: {
    uniforms: `
      uniform float uEnableLiquid;
      uniform float uIntensityLiquid;
      uniform float uScaleLiquid;
      uniform float uTimeScaleLiquid;
      uniform float uNoiseScaleLiquid;
      uniform float uNoiseSpeedLiquid;
    `,
    uv: `
      if (uEnableLiquid > 0.5) {
        float t = uTime * uTimeScaleLiquid * uNoiseSpeedLiquid; // Incorporate Noise Speed into time
        
        // Base coordinate for noise lookup
        vec2 noiseCoord = uv * uScaleLiquid * uNoiseScaleLiquid; 
        
        // Use FBM for smoother, more natural liquid movement
        // We offset x and y by different time factors to create swirling
        float nX = fbm(noiseCoord + vec2(t * 0.5, t * 0.2));
        float nY = fbm(noiseCoord + vec2(-t * 0.3, t * 0.6) + 10.0); // Offset to decorrelate axes
        
        // Remap 0..1 to -1..1
        vec2 flow = vec2(nX, nY) * 2.0 - 1.0;
        
        float amplitude = 0.05 * uIntensityLiquid; 
        
        uv += flow * amplitude;
      }
    `,
    split: ``,
    color: ``
  },
  glitch: {
    uniforms: `
      uniform float uEnableGlitch;
      uniform float uIntensityGlitch;
      uniform float uScaleGlitch;
      uniform float uTimeScaleGlitch;
    `,
    uv: `
      // Digital Glitch (Short, Sporadic, Smearing Strips)
      if (uEnableGlitch > 0.5) {
          float t = uTime * uTimeScaleGlitch;
          
          // Sync with Split Timing: Only glitch when the 'noisy color' phase is active
          // The split logic uses sin(t * 0.7), so we match that here.
          float glitchActive = smoothstep(0.3, 0.6, sin(t * 0.7));
          
          if (glitchActive > 0.01) {
              float stripCount = 600.0 * uScaleGlitch; 
              float stripId = floor(vTexCoord.y * stripCount);
              
              // Sporadic timing step
              float timeStep = floor(t * 25.0); 
              
              // Horizontal Segmentation (Shorter strips)
              // Create random offset per row so segments aren't aligned vertically
              float rowOffset = random(vec2(stripId, 1.0));
              // Random segment width per row
              float colCount = 8.0 + (random(vec2(stripId, 2.0)) * 8.0); 
              float colId = floor((vTexCoord.x + rowOffset) * colCount);
              
              // Activation based on Row, Column, and Time
              float activation = random(vec2(stripId + colId, timeStep));
              
              // Threshold based on intensity and the global 'glitchActive' wave
              float threshold = 1.0 - (0.15 * uIntensityGlitch * glitchActive); 
              
              if (activation > threshold) {
                   // Drift
                   float drift = sin(t * 10.0 + stripId) * 0.1;
                   // Smear
                   uv.x = (uv.x - 0.5) * 0.005 + 0.5 + drift;
              }
          }
      }
    `,
    split: `
      if (uEnableGlitch > 0.5) {
          float t = uTime * uTimeScaleGlitch;
          float interval = smoothstep(0.4, 0.6, sin(t * 0.7)); 
          float drift = (sin(t * 2.5) + sin(t * 1.5) * 0.5) * 0.02;
          
          // Jitter/Noise added to the split for a harsher look
          float jitter = (random(vec2(uv.y, t)) - 0.5) * 0.2;
          
          splitAmount += (drift + jitter) * interval * uIntensityGlitch;
      }
    `,
    color: `
      if (uEnableGlitch > 0.5) {
          float t = uTime * uTimeScaleGlitch;
          float glitchActive = smoothstep(0.3, 0.6, sin(t * 0.7));
          
          if (glitchActive > 0.01) {
              float stripCount = 600.0 * uScaleGlitch; 
              float stripId = floor(vTexCoord.y * stripCount);
              float timeStep = floor(t * 25.0); 
              
              float rowOffset = random(vec2(stripId, 1.0));
              float colCount = 8.0 + (random(vec2(stripId, 2.0)) * 8.0); 
              float rawCol = (vTexCoord.x + rowOffset) * colCount;
              float colId = floor(rawCol);
              
              float activation = random(vec2(stripId + colId, timeStep));
              float threshold = 1.0 - (0.15 * uIntensityGlitch * glitchActive); 
              
              // 1. Strip Fade (Edges of the short segment transparent)
              if (activation > threshold) {
                 float segmentPos = fract(rawCol);
                 // Fade out at start and end of the segment
                 float fade = smoothstep(0.0, 0.3, segmentPos) * (1.0 - smoothstep(0.7, 1.0, segmentPos));
                 color.rgb *= fade;
              }
          }
          
          // 2. Blur & Noise (Match split activity)
          if (abs(splitAmount) > 0.001) {
             float noise = (random(uv * t * 10.0) - 0.5) * 0.3 * uIntensityGlitch;
             color.rgb += noise;
             vec2 blur = vec2(0.02 * uIntensityGlitch, 0.0);
             vec3 blurred = (color.rgb + texture2D(uTexture, uv + blur).rgb + texture2D(uTexture, uv - blur).rgb) / 3.0;
             color.rgb = mix(color.rgb, blurred, 0.8);
          }
      }
    `
  },
  pixel_artefact: {
    uniforms: `
      uniform float uEnablePixel;
      uniform float uIntensityPixel;
      uniform float uScalePixel;
      uniform float uTimeScalePixel;
    `,
    uv: `
      if (uEnablePixel > 0.5) {
        float grid = 150.0 * uScalePixel / max(0.01, uIntensityPixel); 
        uv = floor(uv * grid) / grid;
      }
    `,
    split: ``,
    color: ``
  },
  holographic: {
    uniforms: `
      uniform float uEnableHolo;
      uniform float uIntensityHolo;
      uniform float uScaleHolo;
      uniform float uTimeScaleHolo;
    `,
    uv: ``,
    split: `
      if (uEnableHolo > 0.5) {
          float t = uTime * 3.0 * uTimeScaleHolo;
          splitAmount += 0.005 * uIntensityHolo * sin(t);
      }
    `,
    color: `
      if (uEnableHolo > 0.5) {
          float t = uTime * -5.0 * uTimeScaleHolo;
          float scan = sin(uv.y * 200.0 * (uScaleHolo * 0.2) + t) * 0.5 + 0.5;
          color.rgb *= 1.0 - (0.2 * uIntensityHolo * scan);
          color.rgb = mix(color.rgb, vec3(0.0, 1.0, 0.9) * dot(color.rgb, vec3(0.33)), 0.2 * uIntensityHolo);
      }
    `
  },
  double_exposure: {
    uniforms: `
      uniform float uEnableDouble;
      uniform float uIntensityDouble;
      uniform float uScaleDouble;
      uniform float uTimeScaleDouble;
    `,
    uv: ``,
    split: ``,
    color: `
      if (uEnableDouble > 0.5) {
        vec2 center = vec2(0.5);
        float zoomStrength = 0.1 * uIntensityDouble * (uScaleDouble * 0.2); 
        vec2 zoomUV = (uv - center) * (1.0 - zoomStrength) + center;
        vec4 zoomColor = texture2D(uTexture, zoomUV);
        color.rgb += zoomColor.rgb * 0.6 * uIntensityDouble;
      }
    `
  },
  halftone: {
    uniforms: `
      uniform float uEnableHalftone;
      uniform float uIntensityHalftone;
      uniform float uScaleHalftone;
      uniform float uTimeScaleHalftone;
    `,
    uv: ``,
    split: ``,
    color: `
      if (uEnableHalftone > 0.5) {
          // Standard screen-space halftone pattern
          float aspect = uResolution.x / uResolution.y;
          float scale = 60.0 * uScaleHalftone;
          
          // Rotate grid 45 degrees
          float angle = 0.785398;
          mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
          
          vec2 st = (vTexCoord - 0.5) * vec2(aspect, 1.0);
          st = rot * st;
          st += 0.5;
          
          vec2 gridUV = fract(st * scale) - 0.5; 
          float dist = length(gridUV) * 2.0; 
          
          // Calculate luminance of current pixel
          float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
          
          // Determine dot size based on luma
          // Lighter = bigger dots
          float radius = sqrt(luma) * uIntensityHalftone * 1.2; 
          
          float feather = 0.05 * uScaleHalftone; 
          
          // Inverse mask: 1.0 inside dot, 0.0 outside
          float mask = 1.0 - smoothstep(radius - feather, radius + feather, dist);
          
          color.rgb *= mask;
      }
    `
  },
  contrast: {
    uniforms: `
      uniform float uEnableContrast;
      uniform float uIntensityContrast;
      uniform float uScaleContrast; // Not used but needed for uniform loop consistency if generic
      uniform float uTimeScaleContrast; // Not used
    `,
    uv: ``,
    split: ``,
    color: `
      if (uEnableContrast > 0.5) {
          // Grayscale conversion
          float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
          
          // Calculate contrast factor from 0-100 range
          // 0 -> 0.0 (Flat Grey)
          // 50 -> 1.0 (Normal Grayscale)
          // 100 -> 5.0 (High Contrast B&W)
          float cFactor = 1.0;
          if (uIntensityContrast < 50.0) {
              cFactor = uIntensityContrast / 50.0;
          } else {
              cFactor = 1.0 + ((uIntensityContrast - 50.0) / 50.0) * 4.0; 
          }
          
          // Apply contrast
          vec3 final = vec3((luma - 0.5) * cFactor + 0.5);
          color.rgb = final;
      }
    `
  }
};