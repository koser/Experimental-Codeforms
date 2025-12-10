import React, { useState } from 'react';
import { ShaderConfig, LayerKey } from '../types';
import { Sliders, Zap, Activity, Grid, Droplets, Copy, Save, Tv, GripVertical, Check, CircleDot, Download, Upload, PanelRightClose, Trash2, Image as ImageIcon, Sun } from 'lucide-react';

interface ControlPanelProps {
  config: ShaderConfig;
  userImage: string | null;
  onImageUpload: (file: File | null) => void;
  onChange: (newConfig: ShaderConfig) => void;
  onSave: () => void;
  onExport: () => void;
  onImportClick: () => void;
  onClose: () => void;
}

const LAYER_ICONS: Record<LayerKey, any> = {
    holographic: Activity,
    liquid_metal: Droplets,
    vertex_pulse: Zap,
    pixel_artefact: Grid,
    double_exposure: Copy,
    glitch: Tv,
    halftone: CircleDot,
    contrast: Sun
};

const LAYER_LABELS: Record<LayerKey, string> = {
    holographic: "Holographic",
    liquid_metal: "Liquid Metal",
    vertex_pulse: "Vertex Pulse",
    pixel_artefact: "Pixel Artefact",
    double_exposure: "Double Exposure",
    glitch: "Digital Glitch",
    halftone: "Halftone",
    contrast: "Contrast"
};

const ControlPanel: React.FC<ControlPanelProps> = ({ config, userImage, onImageUpload, onChange, onSave, onExport, onImportClick, onClose }) => {
  const [isSaved, setIsSaved] = useState(false);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  const toggleLayer = (key: LayerKey) => {
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

  const updateLayerParam = (key: LayerKey, param: 'intensity' | 'timeScale' | 'uvScale' | 'noiseScale' | 'noiseSpeed', value: number) => {
    onChange({
      ...config,
      layers: {
        ...config.layers,
        [key]: {
          ...config.layers[key],
          [param]: value
        }
      }
    });
  };

  const handleSaveClick = () => {
    onSave();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          onImageUpload(e.target.files[0]);
      }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    // Only allow drag if we are clicking the handle? 
    // Ideally yes, but current implementation puts draggable on the whole row.
    // We rely on input stopPropagation to prevent inputs from starting drag.
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = "move";
    // Hide the drag image ghosting of the open controls
    // e.dataTransfer.setDragImage(e.currentTarget, 0, 0); 
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) return;
    
    // Swap items in order
    const newOrder = [...config.order];
    const item = newOrder[draggedItem];
    newOrder.splice(draggedItem, 1);
    newOrder.splice(index, 0, item);
    
    onChange({ ...config, order: newOrder });
    setDraggedItem(index);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const preventDragPropagation = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
  };

  return (
    <div 
        className="w-full h-full flex flex-col z-20 overflow-hidden relative"
        onWheel={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
    >
      
      {/* Header */}
      <div className="p-6 border-b border-slate-800 flex-shrink-0 flex justify-between items-start">
        <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
              <h1 className="text-xl font-bold text-white tracking-tight">Shader Lab</h1>
            </div>
            <p className="text-xs text-slate-500">Drag to reorder effects</p>
        </div>
        <button 
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-1"
            title="Collapse Panel"
        >
            <PanelRightClose size={20} />
        </button>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3 pb-6">
        
        {/* Image Input Section */}
        <div className="mb-6 space-y-2">
           <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Image Input</div>
           {userImage ? (
             <div className="relative group rounded-lg overflow-hidden border border-slate-700 bg-black/50 aspect-video flex items-center justify-center">
                <img src={userImage} className="max-w-full max-h-full object-contain" alt="User Input" />
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={() => onImageUpload(null)} 
                        className="flex items-center gap-2 text-white bg-red-500/80 hover:bg-red-500 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                    >
                       <Trash2 size={14} /> Remove
                    </button>
                </div>
             </div>
           ) : (
             <label className="flex flex-col items-center justify-center w-full h-24 rounded-lg border-2 border-dashed border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all cursor-pointer group">
                <div className="flex flex-col items-center pt-2 pb-3">
                    <ImageIcon size={20} className="text-slate-500 group-hover:text-emerald-400 mb-2 transition-colors"/>
                    <p className="text-xs text-slate-500 group-hover:text-slate-300">Upload Image</p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageFile} />
             </label>
           )}
        </div>

        {/* Shader Layers */}
        <div className="space-y-3">
            {config.order.map((layerKey, index) => {
                const layer = config.layers[layerKey];
                const Icon = LAYER_ICONS[layerKey];
                const isDragging = draggedItem === index;

                return (
                    <div 
                        key={layerKey}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`
                            rounded-xl transition-all duration-200 border overflow-hidden
                            ${isDragging ? 'opacity-50 scale-95 border-emerald-500/50' : 'opacity-100 hover:border-slate-600'}
                            ${layer.enabled 
                            ? 'bg-slate-800 border-emerald-500/30 shadow-lg shadow-emerald-900/10' 
                            : 'bg-slate-900/50 border-slate-800'}
                        `}
                    >
                        {/* Header / Toggle */}
                        <div className="flex items-center p-3 gap-3">
                            <div className="cursor-grab text-slate-600 hover:text-slate-400 active:cursor-grabbing">
                                <GripVertical size={16} />
                            </div>
                            
                            <button 
                                onClick={() => toggleLayer(layerKey)}
                                className={`p-2 rounded-lg transition-colors ${layer.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-600'}`}
                            >
                                <Icon size={18} />
                            </button>
                            
                            <div className="flex-1 min-w-0" onClick={() => toggleLayer(layerKey)}>
                                <div className="text-sm font-medium text-slate-200 truncate cursor-pointer select-none">
                                    {LAYER_LABELS[layerKey]}
                                </div>
                            </div>

                            <div className={`w-2 h-2 rounded-full ${layer.enabled ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                        </div>

                        {/* Controls (Only if enabled) */}
                        {layer.enabled && (
                            <div className="px-4 pb-4 pt-1 space-y-4 border-t border-white/5 bg-black/20">
                                
                                {/* Intensity */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-wider">
                                        <span>Intensity</span>
                                        <span className="font-mono text-emerald-500">{(layer.intensity).toFixed(layerKey === 'contrast' ? 0 : 2)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={layerKey === 'contrast' ? "0" : "0"}
                                        max={layerKey === 'contrast' ? "100" : "5"}
                                        step={layerKey === 'contrast' ? "1" : "0.01"}
                                        value={layer.intensity}
                                        onChange={(e) => updateLayerParam(layerKey, 'intensity', parseFloat(e.target.value))}
                                        onPointerDown={preventDragPropagation}
                                        onMouseDown={preventDragPropagation}
                                        className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500"
                                    />
                                </div>

                                {/* Common Props (Time/UV) - Hide for Contrast if not needed? 
                                    Contrast module doesn't use timeScale/uvScale in logic but they exist in type. 
                                    Let's keep them hidden for 'contrast' for a cleaner UI as requested.
                                    The user said "a slider should control it from 0 to 100".
                                */}
                                {layerKey !== 'contrast' && (
                                <>
                                {/* Time Scale */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-wider">
                                        <span>Time Scale</span>
                                        <span className="font-mono text-emerald-500">{layer.timeScale.toFixed(2)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="5"
                                        step="0.1"
                                        value={layer.timeScale}
                                        onChange={(e) => updateLayerParam(layerKey, 'timeScale', parseFloat(e.target.value))}
                                        onPointerDown={preventDragPropagation}
                                        onMouseDown={preventDragPropagation}
                                        className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
                                    />
                                </div>

                                {/* UV Scale */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-wider">
                                        <span>UV Scale</span>
                                        <span className="font-mono text-emerald-500">{layer.uvScale.toFixed(2)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="10"
                                        step="0.1"
                                        value={layer.uvScale}
                                        onChange={(e) => updateLayerParam(layerKey, 'uvScale', parseFloat(e.target.value))}
                                        onPointerDown={preventDragPropagation}
                                        onMouseDown={preventDragPropagation}
                                        className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500"
                                    />
                                </div>
                                </>
                                )}
                                
                                {/* Liquid Metal Specific: Noise Controls */}
                                {layerKey === 'liquid_metal' && (
                                    <>
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-wider">
                                                <span>Noise Scale</span>
                                                <span className="font-mono text-emerald-500">{(layer.noiseScale ?? 2.0).toFixed(2)}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0.1"
                                                max="10.0"
                                                step="0.1"
                                                value={layer.noiseScale ?? 2.0}
                                                onChange={(e) => updateLayerParam(layerKey, 'noiseScale', parseFloat(e.target.value))}
                                                onPointerDown={preventDragPropagation}
                                                onMouseDown={preventDragPropagation}
                                                className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-wider">
                                                <span>Noise Speed</span>
                                                <span className="font-mono text-emerald-500">{(layer.noiseSpeed ?? 1.0).toFixed(2)}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0.0"
                                                max="5.0"
                                                step="0.1"
                                                value={layer.noiseSpeed ?? 1.0}
                                                onChange={(e) => updateLayerParam(layerKey, 'noiseSpeed', parseFloat(e.target.value))}
                                                onPointerDown={preventDragPropagation}
                                                onMouseDown={preventDragPropagation}
                                                className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-rose-500"
                                            />
                                        </div>
                                    </>
                                )}

                            </div>
                        )}
                    </div>
                );
            })}
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="p-4 border-t border-slate-800 bg-slate-900 flex-shrink-0 z-30 space-y-2">
        <button
          onClick={handleSaveClick}
          className={`
            w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-300
            ${isSaved 
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
              : 'bg-white text-slate-900 hover:bg-slate-200'}
          `}
        >
          {isSaved ? <Check size={18} /> : <Save size={18} />}
          {isSaved ? 'Default Saved!' : 'Save as Default'}
        </button>
        
        <div className="flex gap-2">
             <button
               onClick={onExport}
               className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
               title="Export JSON"
             >
                <Download size={16} />
                <span>Save JSON</span>
             </button>
             <button
               onClick={onImportClick}
               className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
               title="Import JSON"
             >
                <Upload size={16} />
                <span>Load JSON</span>
             </button>
        </div>
      </div>

    </div>
  );
};

export default ControlPanel;