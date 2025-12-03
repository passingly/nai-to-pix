import React, { useState } from 'react';
import { Copy, Check, Trash2 } from 'lucide-react';

interface ActionButtonsProps {
  text: string;
  onClear: () => void;
  label: string;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ text, onClear, label }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  return (
    <div className="flex items-center justify-between px-1 py-2">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
        {label}
      </span>
      <div className="flex gap-2">
        <button
          onClick={onClear}
          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md transition-colors"
          title="Clear text"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleCopy}
          disabled={!text}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            copied
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
          } ${!text ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
    </div>
  );
};

export default ActionButtons;