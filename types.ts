
export type LayerKey = 'holographic' | 'liquid_metal' | 'vertex_pulse' | 'pixel_artefact' | 'double_exposure' | 'glitch' | 'halftone' | 'contrast';

export interface ShaderLayer {
  enabled: boolean;
  intensity: number;
  timeScale: number;
  uvScale: number;
  // Optional extra params for specific shaders (like Liquid Metal)
  noiseScale?: number;
  noiseSpeed?: number;
}

export interface ShaderConfig {
  order: LayerKey[];
  layers: {
    [key in LayerKey]: ShaderLayer;
  };
}