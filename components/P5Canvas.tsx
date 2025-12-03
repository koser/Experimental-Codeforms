
import React, { useRef, useEffect, useState } from 'react';
import Sketch from 'react-p5';
import p5Types from 'p5';
import { ShaderConfig } from '../types';
import { VERT_QUAD, FRAG_MASTER } from '../constants';

interface P5CanvasProps {
  config: ShaderConfig;
}

const P5Canvas: React.FC<P5CanvasProps> = ({ config }) => {
  const shaderRef = useRef<p5Types.Shader | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const pgRef = useRef<p5Types.Graphics | null>(null);
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 });
  
  // Viewport state for pan and zoom
  const viewRef = useRef({ x: 0, y: 0, zoom: 1.0 });

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

  const setup = (p5: p5Types, canvasParentRef: Element) => {
    p5.createCanvas(dimensions.w, dimensions.h, p5.WEBGL).parent(canvasParentRef);
    
    // Create offscreen graphics buffer for 2D shapes
    pgRef.current = p5.createGraphics(dimensions.w, dimensions.h);

    // Initialize Master Shader
    shaderRef.current = p5.createShader(VERT_QUAD, FRAG_MASTER);
  };

  const draw = (p5: p5Types) => {
    // Resize handling
    if (p5.width !== dimensions.w || p5.height !== dimensions.h) {
      p5.resizeCanvas(dimensions.w, dimensions.h);
      if (pgRef.current) {
        pgRef.current.resizeCanvas(dimensions.w, dimensions.h);
      } else {
        pgRef.current = p5.createGraphics(dimensions.w, dimensions.h);
      }
    }

    const pg = pgRef.current;
    if (!pg) return;

    // --- STEP 1: Draw 2D Shapes to Offscreen Buffer (pg) ---
    pg.clear();
    pg.background(0); // Pure black background
    
    // Set ADD blend mode so overlapping stroke colors multiply/brighten
    pg.blendMode(pg.ADD);
    
    pg.push();
    
    // Apply Viewport Transforms (Pan & Zoom)
    // Translate to center first, then apply pan, then scale
    pg.translate(pg.width / 2 + viewRef.current.x, pg.height / 2 + viewRef.current.y);
    pg.scale(viewRef.current.zoom);
    
    // Settings for shapes
    pg.rectMode(p5.CENTER);
    //pg.noStroke();
    pg.noFill();
    pg.strokeWeight(10.0);
    
    const time = p5.millis() * 0.001 * config.speed;
/*
    // Pill 1: Main Center
    pg.stroke (99, 102, 255); // Indigo-500
    pg.push();
    pg.rotate(time * 0.5);
    pg.rect(0, 0, 250, 120, 255); // w, h, radius (pill shape)
    pg.pop();

    // Pill 2: Offset & Faster Rotation
    pg.stroke (236, 72, 153, 255); // Pink-500, slight alpha
    pg.push();
    pg.rotate(time * -0.8 + 1.0);
    pg.translate(40, 40);
    pg.rect(0, 0, 200, 80, 255);
    pg.pop();

    // Pill 3: Another Offset
    pg.stroke (16, 185, 129, 255); // Emerald-500
    pg.push();
    pg.rotate(time * 0.3 - 2.0);
    pg.translate(-50, -30);
    pg.rect(0, 0, 180, 60, 255);
    pg.pop();
    */
    // Decorative Element: Circle
    pg.noFill();
    pg.stroke(255, 255, 255, 255);
    pg.strokeWeight(20);
    pg.circle(0, 0, 400 + Math.sin(time) * 20);

    pg.pop();

    // Reset Blend Mode for the rest of P5 (though we only draw this texture)
    pg.blendMode(pg.BLEND);

    // --- STEP 2: Apply Shader to Main Canvas ---
    p5.background(0);
    
    const activeShader = shaderRef.current;
    if (!activeShader) return;
    
    p5.shader(activeShader);
    
    // Pass Standard Uniforms
    activeShader.setUniform('uTexture', pg);
    activeShader.setUniform('uTime', time);
    activeShader.setUniform('uResolution', [p5.width, p5.height]);
    activeShader.setUniform('uScale', config.scale);

    // Pass Effect Toggles and Intensities
    activeShader.setUniform('uEnableHolo', config.layers.holographic.enabled ? 1.0 : 0.0);
    activeShader.setUniform('uIntensityHolo', config.layers.holographic.intensity);

    activeShader.setUniform('uEnableLiquid', config.layers.liquid_metal.enabled ? 1.0 : 0.0);
    activeShader.setUniform('uIntensityLiquid', config.layers.liquid_metal.intensity);

    activeShader.setUniform('uEnablePulse', config.layers.vertex_pulse.enabled ? 1.0 : 0.0);
    activeShader.setUniform('uIntensityPulse', config.layers.vertex_pulse.intensity);

    activeShader.setUniform('uEnablePixel', config.layers.pixel_artefact.enabled ? 1.0 : 0.0);
    activeShader.setUniform('uIntensityPixel', config.layers.pixel_artefact.intensity);
    
    activeShader.setUniform('uEnableDouble', config.layers.double_exposure.enabled ? 1.0 : 0.0);
    activeShader.setUniform('uIntensityDouble', config.layers.double_exposure.intensity);
    
    // Ensure the rect covers the whole canvas
    p5.rectMode(p5.CENTER);
    p5.rect(0, 0, p5.width, p5.height);
  };
  
  const mouseDragged = (p5: p5Types) => {
    // Check bounds to prevent interaction when using sidebar overlay on mobile
    if (p5.mouseX >= 0 && p5.mouseX <= p5.width && p5.mouseY >= 0 && p5.mouseY <= p5.height) {
        viewRef.current.x += p5.movedX;
        viewRef.current.y += p5.movedY;
    }
  };

  const mouseWheel = (p5: p5Types, event: WheelEvent) => {
    // Zoom in/out
    const zoomSensitivity = 0.001;
    // deltaY is usually positive for scroll down (zoom out) and negative for scroll up (zoom in)
    const zoomChange = event.deltaY * -zoomSensitivity;
    
    let newZoom = viewRef.current.zoom + zoomChange;
    // Clamp zoom
    newZoom = Math.max(0.1, Math.min(newZoom, 5.0));
    
    viewRef.current.zoom = newZoom;
    
    // Prevent default browser scrolling
    return false;
  };

  return (
    <div ref={parentRef} className="w-full h-full flex items-center justify-center bg-black overflow-hidden relative cursor-move">
      <div className="absolute top-4 left-4 z-10 text-xs text-white/30 font-mono pointer-events-none select-none">
        RENDER_MODE: WEBGL + MULTI_PASS_SHADER<br/>
        ZOOM: {viewRef.current.zoom.toFixed(2)}x
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
