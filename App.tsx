import React, { useState, useCallback, useRef } from 'react';
import P5Canvas from './components/P5Canvas';
import ControlPanel from './components/ControlPanel';
import { ShaderConfig, LayerKey } from './types';
import { PanelRightOpen } from 'lucide-react';

const DEFAULT_LAYER = { enabled: false, intensity: 1.0, timeScale: 1.4, uvScale: 4.9, noiseScale: 2.0, noiseSpeed: 1.0 };
const DEFAULT_ORDER: LayerKey[] = ['vertex_pulse', 'liquid_metal', 'glitch', 'pixel_artefact', 'halftone', 'holographic', 'double_exposure', 'contrast'];

const DEFAULT_CONFIG: ShaderConfig = {
  order: DEFAULT_ORDER,
  layers: {
    holographic: { ...DEFAULT_LAYER, enabled: true, intensity: 1.0 },
    liquid_metal: { ...DEFAULT_LAYER, enabled: false, intensity: 1.0, noiseScale: 2.5, noiseSpeed: 1.2 },
    vertex_pulse: { ...DEFAULT_LAYER, enabled: true, intensity: 1.0 },
    pixel_artefact: { ...DEFAULT_LAYER, enabled: false, intensity: 1.0 },
    double_exposure: { ...DEFAULT_LAYER, enabled: true, intensity: 0.47 },
    glitch: { ...DEFAULT_LAYER, enabled: false, intensity: 1.0 },
    halftone: { ...DEFAULT_LAYER, enabled: false, intensity: 1.0 },
    contrast: { ...DEFAULT_LAYER, enabled: false, intensity: 50.0 }
  }
};

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uiInteractionRef = useRef(false);
  
  // Initialize state from localStorage or fallback to defaults
  const [config, setConfig] = useState<ShaderConfig>(() => {
    try {
      const saved = localStorage.getItem('shader_lab_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        
        // Migration logic...
        if (!parsed.order) parsed.order = DEFAULT_ORDER;
        
        // Check if old global speed/scale exist and migrate
        if (parsed.speed !== undefined || parsed.scale !== undefined) {
           const oldSpeed = parsed.speed ?? 1.4;
           const oldScale = parsed.scale ?? 4.9;
           const newLayers: any = {};
           Object.keys(parsed.layers).forEach(key => {
               newLayers[key] = { ...parsed.layers[key], timeScale: oldSpeed, uvScale: oldScale };
           });
           
           // Ensure all default keys exist in the new structure
           DEFAULT_ORDER.forEach(key => {
               if (!newLayers[key]) {
                   newLayers[key] = { ...DEFAULT_CONFIG.layers[key] };
               }
           });
           
           parsed.layers = newLayers;
           parsed.order = DEFAULT_ORDER;
           return parsed;
        }
        
        // ROBUST MIGRATION: Ensure all default layers exist and are in order
        // This covers cases where local storage has partial config
        DEFAULT_ORDER.forEach(key => {
            // 1. Ensure layer config exists
            if (!parsed.layers[key]) {
                parsed.layers[key] = { ...DEFAULT_CONFIG.layers[key] };
            }
            // 2. Ensure key is in render order
            if (!parsed.order.includes(key)) {
                parsed.order.push(key);
            }
        });
        
        // Ensure new props exist on existing layers
        Object.keys(parsed.layers).forEach(key => {
            const layer = parsed.layers[key];
            if (layer.timeScale === undefined) layer.timeScale = 1.4;
            if (layer.uvScale === undefined) layer.uvScale = 4.9;
            if (layer.noiseScale === undefined) layer.noiseScale = 2.0;
            if (layer.noiseSpeed === undefined) layer.noiseSpeed = 1.0;
        });

        return parsed;
      }
    } catch (e) {
      console.error('Failed to load saved config:', e);
    }
    return DEFAULT_CONFIG;
  });

  const handleSaveDefaults = () => {
    try {
      localStorage.setItem('shader_lab_config', JSON.stringify(config));
    } catch (e) {
      console.error('Failed to save config:', e);
    }
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "shader_config.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          if (event.target?.result) {
            const parsed = JSON.parse(event.target.result as string);
            // Basic validation
            if (parsed.layers && parsed.order) {
              setConfig(parsed);
            } else {
              alert("Invalid shader configuration file");
            }
          }
        } catch (err) {
          console.error("Error parsing JSON", err);
          alert("Error parsing JSON file");
        }
      };
    }
  };

  const handleImageUpload = (file: File | null) => {
    if (!file) {
        setUserImage(null);
        return;
    }
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) {
                setUserImage(e.target.result as string);
            }
        };
        reader.readAsDataURL(file);
    }
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          const file = e.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            handleImageUpload(file);
          } else if (file.type === 'application/json') {
            const reader = new FileReader();
            reader.onload = (ev) => {
               try {
                  const json = JSON.parse(ev.target?.result as string);
                  if (json.layers && json.order) setConfig(json);
               } catch(err) { console.log("Not a config file"); }
            };
            reader.readAsText(file);
          }
      }
  }, []);

  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden relative" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      
      {/* Canvas Area */}
      <div className="flex-1 h-full relative z-0 flex flex-col">
         <P5Canvas config={config} userImage={userImage} interactionRef={uiInteractionRef} />
         
         {/* Toggle Button (Visible when sidebar is closed) */}
         {!isSidebarOpen && (
           <button 
             onClick={() => setIsSidebarOpen(true)}
             className="absolute top-4 right-4 z-30 p-2 bg-slate-800 text-white rounded-md border border-slate-700 hover:border-emerald-500 hover:text-emerald-400 transition-all shadow-lg"
             title="Open Controls"
           >
             <PanelRightOpen size={20} />
           </button>
         )}

         {/* Full screen drag overlay */}
         {isDragging && (
             <div className="absolute inset-0 bg-emerald-500/10 border-4 border-emerald-500/50 z-40 pointer-events-none flex items-center justify-center">
                 <div className="bg-black/80 backdrop-blur text-emerald-400 px-8 py-4 rounded-xl font-bold text-xl border border-emerald-500/30 animate-pulse">
                     DROP IMAGE TO LOAD
                 </div>
             </div>
         )}
      </div>

      {/* Control Panel Sidebar */}
      <div 
        className={`
          fixed inset-y-0 right-0 z-20 
          transform transition-all duration-300 ease-in-out
          bg-slate-900 border-l border-slate-800
          ${isSidebarOpen ? 'translate-x-0 w-80' : 'translate-x-full w-0 border-l-0'}
          md:relative md:transform-none
          ${!isSidebarOpen ? 'md:hidden' : ''}
        `}
        onMouseEnter={() => uiInteractionRef.current = true}
        onMouseLeave={() => uiInteractionRef.current = false}
        onPointerEnter={() => uiInteractionRef.current = true}
        onPointerLeave={() => uiInteractionRef.current = false}
      >
        <ControlPanel 
          config={config} 
          userImage={userImage}
          onImageUpload={handleImageUpload}
          onChange={setConfig} 
          onSave={handleSaveDefaults}
          onExport={handleExportJson}
          onImportClick={() => fileInputRef.current?.click()}
          onClose={() => setIsSidebarOpen(false)}
        />
        {/* Hidden Input for JSON Import */}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".json" 
          onChange={handleImportJson} 
        />
      </div>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-10 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default App;