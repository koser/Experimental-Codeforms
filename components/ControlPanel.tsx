
import React, { useState } from 'react';
import { ShaderConfig } from '../types';
import { Sliders, Zap, Activity, Grid, Droplets, Play, Maximize2, Check, Copy, Save } from 'lucide-react';

interface ControlPanelProps {
  config: ShaderConfig;
  onChange: (newConfig: ShaderConfig) => void;
  onSave: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ config, onChange, onSave }) => {
  const [isSaved, setIsSaved] = useState(false);
  
  const handleGlobalParamChange = (key: 'speed' | 'scale', value: number) => {
    onChange({ ...config, [key]: value });
  };

  const toggleLayer = (key: keyof ShaderConfig['layers']) => {
    onChange({
      ...config,
      layers: {
        ...config.layers,
        [key]: {
          ...config.layers[key],
          enabled: !config.layers[key].enabled
        }
      }
    });
  };

  const updateLayerIntensity = (key: keyof ShaderConfig['layers'], intensity: number) => {
    onChange({
      ...config,
      layers: {
        ...config.layers,
        [key]: {
          ...config.layers[key],
          intensity
        }
      }
    });
  };

  const handleSaveClick = () => {
    onSave();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const EffectControl = ({ 
    layerKey, 
    icon: Icon, 
    label 
  }: { 
    layerKey: keyof ShaderConfig['layers'], 
    icon: any, 
    label: string 
  }) => {
    const layer = config.layers[layerKey];
    
    return (
      <div className={`
        rounded-xl transition-all duration-200 border overflow-hidden
        ${layer.enabled 
          ? 'bg-slate-800/80 border-indigo-500/50 shadow-lg shadow-indigo-900/20' 
          : 'bg-slate-800/30 border-slate-800 hover:border-slate-700'}
      `}>
        {/* Toggle Button */}
        <button
          onClick={() => toggleLayer(layerKey)}
          className={`
            w-full flex items-center justify-between px-4 py-3 transition-colors
            ${layer.enabled ? 'text-white' : 'text-slate-400 hover:text-slate-200'}
          `}
        >
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg ${layer.enabled ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-600'}`}>
               <Icon size={16} />
            </div>
            <span className="font-medium text-sm">{label}</span>
          </div>
          <div className={`
            w-5 h-5 rounded-full border flex items-center justify-center transition-colors
            ${layer.enabled ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-600 bg-transparent'}
          `}>
            {layer.enabled && <Check size={12} strokeWidth={3} />}
          </div>
        </button>

        {/* Intensity Slider (Only visible when enabled) */}
        {layer.enabled && (
          <div className="px-4 pb-4 pt-1 animate-in slide-in-from-top-2 fade-in duration-200">
             <div className="flex justify-between text-xs mb-2">
                <span className="text-indigo-200/50 font-mono tracking-wide">INTENSITY</span>
                <span className="text-indigo-400 font-mono">{layer.intensity.toFixed(2)}</span>
            </div>
            <input 
                type="range" 
                min="0" max="2" step="0.01"
                value={layer.intensity}
                onChange={(e) => updateLayerIntensity(layerKey, parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-80 h-full bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl z-20 overflow-y-auto custom-scrollbar">
      
      {/* Header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
          <h1 className="text-xl font-bold text-white tracking-tight">Shader Lab</h1>
        </div>
        <p className="text-xs text-slate-500">Interactive GLSL Playground</p>
      </div>

      {/* Effect Toggles & Intensities */}
      <div className="p-6 space-y-3">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Effects Layering</h2>
        
        <EffectControl layerKey="holographic" icon={Activity} label="Holographic" />
        <EffectControl layerKey="liquid_metal" icon={Droplets} label="Liquid Metal" />
        <EffectControl layerKey="vertex_pulse" icon={Zap} label="Vertex Pulse" />
        <EffectControl layerKey="pixel_artefact" icon={Grid} label="Pixel Artefact" />
        <EffectControl layerKey="double_exposure" icon={Copy} label="Double Exposure" />
      </div>

      {/* Global Parameters */}
      <div className="p-6 border-t border-slate-800 space-y-6">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Global Parameters</h2>
        
        {/* Speed Slider */}
        <div className="space-y-3">
            <div className="flex justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                    <Play size={14} />
                    <span>Time Scale</span>
                </div>
                <span className="text-indigo-400 font-mono">{config.speed.toFixed(1)}x</span>
            </div>
            <input 
                type="range" 
                min="0" max="5" step="0.1"
                value={config.speed}
                onChange={(e) => handleGlobalParamChange('speed', parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
            />
        </div>

        {/* Scale Slider */}
        <div className="space-y-3">
            <div className="flex justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                    <Maximize2 size={14} />
                    <span>UV Scale</span>
                </div>
                <span className="text-indigo-400 font-mono">{config.scale.toFixed(1)}</span>
            </div>
            <input 
                type="range" 
                min="0.5" max="5" step="0.1"
                value={config.scale}
                onChange={(e) => handleGlobalParamChange('scale', parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
            />
        </div>
      </div>

      {/* Persistence Controls */}
      <div className="p-6 pt-0 mt-auto">
         <button 
           onClick={handleSaveClick}
           className={`
             w-full py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-all duration-200
             ${isSaved 
               ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
               : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 hover:text-white'}
           `}
         >
           {isSaved ? (
             <>
               <Check size={16} />
               <span>Settings Saved</span>
             </>
           ) : (
             <>
               <Save size={16} />
               <span>Save as Defaults</span>
             </>
           )}
         </button>
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-slate-950/50 text-center border-t border-slate-800">
        <p className="text-[10px] text-slate-600 font-mono">
           P5.JS v1.9.0 • REACT 18 • GLSL
        </p>
      </div>
    </div>
  );
};

export default ControlPanel;
