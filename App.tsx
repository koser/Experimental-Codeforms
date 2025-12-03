
import React, { useState, useEffect } from 'react';
import P5Canvas from './components/P5Canvas';
import ControlPanel from './components/ControlPanel';
import { ShaderConfig } from './types';
import { Menu, X } from 'lucide-react';

const DEFAULT_CONFIG: ShaderConfig = {
  layers: {
    holographic: { enabled: true, intensity: 1.0 },
    liquid_metal: { enabled: false, intensity: 1.0 },
    vertex_pulse: { enabled: true, intensity: 1.0 },
    pixel_artefact: { enabled: false, intensity: 1.0 },
    double_exposure: { enabled: true, intensity: 0.47 }
  },
  speed: 1.4,
  scale: 4.9
};

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Initialize state from localStorage or fallback to defaults
  const [config, setConfig] = useState<ShaderConfig>(() => {
    try {
      const saved = localStorage.getItem('shader_lab_config');
      if (saved) {
        return JSON.parse(saved);
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

  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden relative">
      
      {/* Canvas Area */}
      <div className="flex-1 h-full relative z-0">
         <P5Canvas config={config} />
         
         {/* Mobile Menu Toggle */}
         <button 
           onClick={() => setIsSidebarOpen(!isSidebarOpen)}
           className="absolute top-4 right-4 md:hidden z-30 p-2 bg-slate-800 text-white rounded-md border border-slate-700 hover:bg-slate-700 transition-colors"
         >
           {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
         </button>
      </div>

      {/* Control Panel Sidebar */}
      <div 
        className={`
          fixed inset-y-0 right-0 z-20 transform transition-transform duration-300 ease-in-out
          md:relative md:transform-none md:flex-shrink-0
          ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <ControlPanel 
          config={config} 
          onChange={setConfig} 
          onSave={handleSaveDefaults}
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
