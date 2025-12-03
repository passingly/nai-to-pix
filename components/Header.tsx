import React from 'react';
import { Wand2 } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="w-full py-6 px-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
            <Wand2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
              Prompt Weight Converter
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              NovelAI (Custom) ⟷ PixAI / Stable Diffusion
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;