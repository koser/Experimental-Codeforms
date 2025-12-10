import React, { useRef, useEffect, useState } from 'react';
import Sketch from 'react-p5';
import p5Types from 'p5';
import { ShaderConfig, LayerKey } from '../types';
import { VERT_QUAD, SHADER_HEADER, SHADER_MODULES } from '../constants';

interface P5CanvasProps {
  config: ShaderConfig;
  userImage: string | null;
  interactionRef: React.MutableRefObject<boolean>;
}

interface TextAnimState {
    displayChar: string;
    nextChar: string;
    phase: 'IDLE' | 'OUT' | 'IN';
    startTime: number;
    startOpacity: number;
    startScale: number;
}

// Easing function for smoother animation
function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

const P5Canvas: React.FC<P5CanvasProps> = ({ config, userImage, interactionRef }) => {
  const shaderRef = useRef<p5Types.Shader | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const pgRef = useRef<p5Types.Graphics | null>(null);
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 });
  const viewRef = useRef({ x: 0, y: 0, zoom: 1.0 });
  
  const p5Ref = useRef<p5Types | null>(null);
  const userImageRef = useRef<p5Types.Image | null>(null);
  
  // Text Animation State
  const textAnimRef = useRef<TextAnimState>({
      displayChar: 'M',
      nextChar: 'M',
      phase: 'IDLE',
      startTime: 0,
      startOpacity: 255,
      startScale: 1.0
  });

  // Text State for UI overlay only
  const [displayText, setDisplayText] = useState('M');

  // Handle Keyboard Input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only single characters, exclude modifiers (Shift, Ctrl, Alt, Meta)
      // Allow spaces or symbols that have length 1
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setDisplayText(e.key);

        const p5 = p5Ref.current;
        if (!p5) return;
        
        const now = p5.millis();
        const anim = textAnimRef.current;
        
        anim.nextChar = e.key;

        if (anim.phase === 'IDLE') {
            anim.phase = 'OUT';
            anim.startTime = now;
            anim.startOpacity = 255;
            anim.startScale = 1.0;
        } else if (anim.phase === 'IN') {
             // Interrupting a scale-up.
             // We want to reverse and go down from current scale.
             const elapsed = now - anim.startTime;
             const progress = Math.min(1, elapsed / 500.0);
             const easedProgress = easeInOutCubic(progress);
             
             // Calculate current scale based on curve to avoid jumps
             const currentSc = anim.startScale + (1.0 - anim.startScale) * easedProgress;
             
             anim.phase = 'OUT';
             anim.startTime = now;
             anim.startOpacity = 255;
             anim.startScale = currentSc;
        }
        // If phase is OUT, we are already animating out. We just updated nextChar.
        // It will pick up the new char when the scale out completes.
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Helper to generate shader source code based on order
  const generateFragmentShader = () => {
    let source = SHADER_HEADER;

    // Append all uniforms (simple approach: include all possible module uniforms)
    Object.values(SHADER_MODULES).forEach(module => {
        source += module.uniforms;
    });

    source += `
      void main() {
        vec2 uv = vTexCoord;
        vec4 color;
        float splitAmount = 0.0;
    `;

    // 1. UV Modifications Loop (Order matters)
    config.order.forEach(key => {
        if (SHADER_MODULES[key]) {
             source += `\n // ${key} UV \n` + SHADER_MODULES[key].uv;
        }
    });

    // 2. Accumulate Split Amount (Order matters? Usually additive)
    config.order.forEach(key => {
        if (SHADER_MODULES[key] && SHADER_MODULES[key].split) {
             source += `\n // ${key} Split \n` + SHADER_MODULES[key].split;
        }
    });

    // 3. Sampling (with computed split)
    source += `
        if (abs(splitAmount) > 0.0001) {
             float r = texture2D(uTexture, uv + vec2(splitAmount, 0.0)).r;
             float g = texture2D(uTexture, uv).g;
             float b = texture2D(uTexture, uv - vec2(splitAmount, 0.0)).b;
             color = vec4(r, g, b, 1.0);
        } else {
             color = texture2D(uTexture, uv);
        }
    `;

    // 4. Color Modifications Loop (Order matters)
    config.order.forEach(key => {
        if (SHADER_MODULES[key]) {
             source += `\n // ${key} Color \n` + SHADER_MODULES[key].color;
        }
    });

    source += `
        gl_FragColor = color;
      }
    `;
    
    return source;
  };

  useEffect(() => {
    const updateSize = () => {
      if (parentRef.current) {
        setDimensions({
          w: parentRef.current.clientWidth,
          h: parentRef.current.clientHeight
        });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Handle Image Loading
  useEffect(() => {
      if (userImage && p5Ref.current) {
          p5Ref.current.loadImage(userImage, (img) => {
              userImageRef.current = img;
          });
      } else if (!userImage) {
          userImageRef.current = null;
      }
  }, [userImage]);

  const setup = (p5: p5Types, canvasParentRef: Element) => {
    p5Ref.current = p5;
    p5.createCanvas(dimensions.w, dimensions.h, p5.WEBGL).parent(canvasParentRef);
    pgRef.current = p5.createGraphics(dimensions.w, dimensions.h);
    
    // Initial Shader Compilation
    const fragSource = generateFragmentShader();
    shaderRef.current = p5.createShader(VERT_QUAD, fragSource);
  };

  // Recompile shader if order changes
  useEffect(() => {
      if (shaderRef.current) {
          shaderUpdatePending.current = true;
      }
  }, [config.order]);
  
  const shaderUpdatePending = useRef(false);

  const draw = (p5: p5Types) => {
    // Check if resize needed
    if (p5.width !== dimensions.w || p5.height !== dimensions.h) {
      p5.resizeCanvas(dimensions.w, dimensions.h);
      if (pgRef.current) pgRef.current.resizeCanvas(dimensions.w, dimensions.h);
      else pgRef.current = p5.createGraphics(dimensions.w, dimensions.h);
    }
    
    // Recompile shader if order changed
    if (shaderUpdatePending.current) {
        const fragSource = generateFragmentShader();
        shaderRef.current = p5.createShader(VERT_QUAD, fragSource);
        shaderUpdatePending.current = false;
    }

    const pg = pgRef.current;
    if (!pg) return;

    // --- STEP 1: Draw 2D Shapes ---
    pg.clear();
    pg.background(0);
    
    const time = p5.millis() * 0.001;
    const circleSize = 400;

    pg.push();
    
    pg.translate(pg.width / 2 + viewRef.current.x, pg.height / 2 + viewRef.current.y);
    pg.rotate(Math.cos(time));
    pg.scale(viewRef.current.zoom);
    pg.rectMode(p5.CENTER);
    pg.imageMode(p5.CENTER);

 
    // Prepare Clipping Context
    const ctx = pg.drawingContext as CanvasRenderingContext2D;
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, circleSize / 2, 0, Math.PI * 2);
    ctx.clip();

    // 1. Draw Uploaded Image (Masked)
    if (userImageRef.current) {
        pg.push();
        pg.blendMode(pg.BLEND); 
        
        // Calculate Object-Fit: Cover
        const img = userImageRef.current;
        const imgAspect = img.width / img.height;
        let drawW, drawH;
        
        // If image is wider than 1:1, scale by height
        if (imgAspect > 1) {
            drawH = circleSize;
            drawW = circleSize * imgAspect;
        } else {
            drawW = circleSize;
            drawH = circleSize / imgAspect;
        }
        
        pg.image(img, 0, 0, drawW, drawH);
        pg.pop();
    } else {
        // Fallback fill if no image, just to make the circle visible in the shader buffer
        pg.noStroke();
        pg.fill(20);
        pg.circle(0, 0, circleSize);
    }

    // 2. Draw Text (Masked)
    
    // Animation Logic
    const anim = textAnimRef.current;
    const nowMs = p5.millis();
    let currentOpacity = 255; // Always opaque
    let currentScale = 1.0;
    
    if (anim.phase === 'OUT') {
        const elapsed = nowMs - anim.startTime;
        const progress = Math.min(1, elapsed / 500.0); // 500ms OUT
        const easedProgress = easeInOutCubic(progress);

        // Target is 0
        currentScale = anim.startScale + (0.0 - anim.startScale) * easedProgress;
        
        if (progress >= 1.0) {
            anim.displayChar = anim.nextChar;
            anim.phase = 'IN';
            anim.startTime = nowMs;
            anim.startOpacity = 255;
            anim.startScale = 0;
            currentScale = 0;
        }
    } else if (anim.phase === 'IN') {
        const elapsed = nowMs - anim.startTime;
        const progress = Math.min(1, elapsed / 500.0); // 500ms IN
        const easedProgress = easeInOutCubic(progress);
        
        // Target is 1
        currentScale = anim.startScale + (1.0 - anim.startScale) * easedProgress;
        
        if (progress >= 1.0) {
            anim.phase = 'IDLE';
            currentScale = 1.0;
        }
    }

    pg.push();
    pg.blendMode(pg.BLEND);
    pg.textFont('DynaPuff');
    pg.textAlign(p5.CENTER, p5.CENTER);
    pg.textSize(circleSize * 0.6 * currentScale); // Scale text to circle
    pg.noStroke();
    
    // Slight shadow for contrast if image exists
    pg.fill(0, 0, 0, currentOpacity * 0.4);
    pg.text(anim.displayChar, 5, 5); 
    
    pg.fill(255, currentOpacity);
    pg.text(anim.displayChar, 0, 0);
    pg.pop();

    // End Clipping
    ctx.restore();


    // Draw White Outline (Outside clip)
    pg.blendMode(pg.ADD);
    pg.noFill();
    pg.stroke(255, 255, 255, 255);
    pg.strokeWeight(40);
    //pg.circle(0, 0, circleSize);

    // Draw horizontal line
    //pg.line(-circleSize/1.5, Math.sin(time)*200, circleSize/1.5, Math.sin(time)*200)

    pg.pop();
    pg.blendMode(pg.BLEND);

    // --- STEP 2: Apply Shader ---
    p5.background(0);
    
    const activeShader = shaderRef.current;
    if (!activeShader) return;
    
    p5.shader(activeShader);
    
    // Standard Uniforms
    activeShader.setUniform('uTexture', pg);
    activeShader.setUniform('uTime', time);
    activeShader.setUniform('uResolution', [p5.width, p5.height]);

    // Dynamic Uniforms for all layers
    Object.keys(config.layers).forEach((k) => {
        const key = k as LayerKey;
        const layer = config.layers[key];
        
        const nameMap: Record<string, string> = {
            holographic: 'Holo',
            liquid_metal: 'Liquid',
            vertex_pulse: 'Pulse',
            pixel_artefact: 'Pixel',
            double_exposure: 'Double',
            glitch: 'Glitch',
            halftone: 'Halftone',
            contrast: 'Contrast'
        };
        const shortName = nameMap[key];
        
        activeShader.setUniform(`uEnable${shortName}`, layer.enabled ? 1.0 : 0.0);
        activeShader.setUniform(`uIntensity${shortName}`, layer.intensity);
        activeShader.setUniform(`uTimeScale${shortName}`, layer.timeScale);
        activeShader.setUniform(`uScale${shortName}`, layer.uvScale);
        
        // Liquid Metal special uniforms
        if (key === 'liquid_metal') {
            activeShader.setUniform(`uNoiseScale${shortName}`, layer.noiseScale ?? 2.0);
            activeShader.setUniform(`uNoiseSpeed${shortName}`, layer.noiseSpeed ?? 1.0);
        }
    });

    p5.rectMode(p5.CENTER);
    p5.rect(0, 0, p5.width, p5.height);
  };
  
  const mouseDragged = (p5: p5Types) => {
    // Prevent dragging if interacting with UI
    if (interactionRef.current) return;

    if (p5.mouseX >= 0 && p5.mouseX <= p5.width && p5.mouseY >= 0 && p5.mouseY <= p5.height) {
        viewRef.current.x += p5.movedX;
        viewRef.current.y += p5.movedY;
    }
  };

  const mouseWheel = (p5: p5Types, event: WheelEvent) => {
    // Prevent zoom if interacting with UI
    if (interactionRef.current) return;

    const zoomSensitivity = 0.001;
    const zoomChange = event.deltaY * -zoomSensitivity;
    let newZoom = viewRef.current.zoom + zoomChange;
    newZoom = Math.max(0.1, Math.min(newZoom, 5.0));
    viewRef.current.zoom = newZoom;
    return false;
  };

  return (
    <div ref={parentRef} className="w-full h-full flex items-center justify-center bg-black overflow-hidden relative cursor-move">
      <div className="absolute top-4 left-4 z-10 text-xs text-white/30 font-mono pointer-events-none select-none">
        RENDER_MODE: WEBGL + DYNAMIC_SHADER_COMPOSITION<br/>
        ZOOM: {viewRef.current.zoom.toFixed(2)}x<br/>
        INPUT: {displayText}
      </div>
      <Sketch 
        setup={setup} 
        draw={draw} 
        mouseDragged={mouseDragged}
        mouseWheel={mouseWheel}
      />
    </div>
  );
};

export default P5Canvas;