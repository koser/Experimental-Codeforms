
export interface ShaderLayer {
  enabled: boolean;
  intensity: number;
}

export interface ShaderConfig {
  layers: {
    holographic: ShaderLayer;
    liquid_metal: ShaderLayer;
    vertex_pulse: ShaderLayer;
    pixel_artefact: ShaderLayer;
    double_exposure: ShaderLayer;
  };
  speed: number;
  scale: number;
}
