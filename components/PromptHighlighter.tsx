import React from 'react';
import { ParsedSegment } from '../types';

interface PromptHighlighterProps {
  segments: ParsedSegment[];
  placeholder?: string;
}

const PromptHighlighter: React.FC<PromptHighlighterProps> = ({ segments, placeholder }) => {
  if (!segments.length && placeholder) {
    return <span className="text-slate-600 italic">{placeholder}</span>;
  }

  const getWeightColor = (weight: number) => {
    if (weight > 1.0) {
      // High weight: Red/Orange
      return 'bg-red-950/40 text-red-200 border-red-800/50';
    } else if (weight < 1.0) {
      // Low weight: Blue/Cyan
      return 'bg-blue-950/40 text-blue-200 border-blue-800/50';
    } else {
      // Neutral weight: Green (shouldn't happen often if filter logic is used, but good fallback)
      return 'bg-green-950/40 text-green-200 border-green-800/50';
    }
  };

  return (
    <div className="font-mono text-sm leading-relaxed break-words whitespace-pre-wrap">
      {segments.map((seg) => {
        // Render plain text for segments with default weight
        if (seg.type === 'text' || seg.weight === 1) {
          return <span key={seg.id} className="text-slate-400">{seg.content || seg.raw}</span>;
        }

        const colorClass = getWeightColor(seg.weight || 1);

        return (
          <span
            key={seg.id}
            className={`inline-flex items-center gap-1 mx-0.5 px-1.5 py-0.5 rounded border ${colorClass} transition-colors`}
            title={`가중치: ${seg.weight}`}
          >
            <span className="font-bold opacity-75 text-xs">{seg.weight}</span>
            <span className="opacity-50 text-[10px]">::</span>
            <span>{seg.content}</span>
          </span>
        );
      })}
    </div>
  );
};

export default PromptHighlighter;