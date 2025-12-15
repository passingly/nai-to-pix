import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, ArrowDownUp, Info } from 'lucide-react';
import { ConversionDirection, ParsedSegment } from '../types';
import { 
  parseNovelAI, 
  parsePixAI, 
  segmentsToPixAI, 
  segmentsToNovelAI 
} from '../utils/converter';
import ActionButtons from './ActionButtons';
import PromptHighlighter from './PromptHighlighter';

const Converter: React.FC = () => {
  const [direction, setDirection] = useState<ConversionDirection>(ConversionDirection.NAI_TO_PIX);
  
  // Input States
  const [sourceText, setSourceText] = useState(''); // Positive Input (or Combined NAI)
  const [sourceNegativeText, setSourceNegativeText] = useState(''); // Negative Input (Pix Only)

  // Output States
  const [resultText, setResultText] = useState(''); // Positive Result (or Combined NAI)
  const [resultNegativeText, setResultNegativeText] = useState(''); // Negative Result (Pix Only)

  const [segments, setSegments] = useState<ParsedSegment[]>([]);

  // Parse and convert logic
  useEffect(() => {
    let allSegments: ParsedSegment[] = [];

    if (direction === ConversionDirection.NAI_TO_PIX) {
      // 1. NAI -> PixAI
      // NAI inputs are single field, but can contain negative weights (-2::tag::)
      const parsed = parseNovelAI(sourceText);
      allSegments = parsed;

      // Split segments based on weight polarity
      const positiveSegs = parsed.filter(s => (s.weight === undefined || s.weight >= 0));
      const negativeSegs = parsed
        .filter(s => s.weight !== undefined && s.weight < 0)
        .map(s => ({ ...s, weight: Math.abs(s.weight!) })); // Flip to positive for the Negative Prompt

      setResultText(segmentsToPixAI(positiveSegs));
      setResultNegativeText(segmentsToPixAI(negativeSegs));
    
    } else {
      // 2. PixAI -> NAI
      // Pix inputs are split. We need to merge them into NAI format.
      const positiveSegs = parsePixAI(sourceText);
      
      // Treat negative input as segments with negative weight
      const negativeSegsRaw = parsePixAI(sourceNegativeText);
      const negativeSegs = negativeSegsRaw.map(s => ({
        ...s,
        weight: (s.weight || 1.0) * -1 // Force negative
      }));

      allSegments = [...positiveSegs, ...negativeSegs];
      
      setResultText(segmentsToNovelAI(allSegments));
      // NAI doesn't have a separate negative output field in this tool's context, 
      // everything goes to the main prompt as -N::...::
      setResultNegativeText(''); 
    }

    setSegments(allSegments);
  }, [sourceText, sourceNegativeText, direction]);

  const toggleDirection = () => {
    const newDirection =
      direction === ConversionDirection.NAI_TO_PIX
        ? ConversionDirection.PIX_TO_NAI
        : ConversionDirection.NAI_TO_PIX;

    setDirection(newDirection);
    
    // Swap outputs to inputs for convenience
    setSourceText(resultText);
    setSourceNegativeText(resultNegativeText);
  };

  const getSourceLabel = () =>
    direction === ConversionDirection.NAI_TO_PIX ? 'Novel AI (Custom)' : 'Pix AI / SD (Positive)';
  
  const getSourceNegativeLabel = () =>
    direction === ConversionDirection.NAI_TO_PIX ? 'Novel AI (Negative - Not Used)' : 'Pix AI / SD (Negative)';

  const getTargetLabel = () =>
    direction === ConversionDirection.NAI_TO_PIX ? 'Pix AI / SD (Positive)' : 'Novel AI (Custom)';

  const getTargetNegativeLabel = () =>
    direction === ConversionDirection.NAI_TO_PIX ? 'Pix AI / SD (Negative)' : 'Novel AI (Negative)';

  const getSourcePlaceholder = () =>
    direction === ConversionDirection.NAI_TO_PIX
      ? '예시: 2::1girl::, -1::worst quality::, 1.5::sword'
      : '예시: masterpiece, (1girl:2), (sword:1.5)';

  return (
    <div className="flex flex-col gap-6">
      
      {/* Control Bar */}
      <div className="flex justify-center">
        <button
          onClick={toggleDirection}
          className="group flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-500 rounded-full transition-all duration-300 shadow-lg shadow-black/20"
        >
          <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">
            {direction === ConversionDirection.NAI_TO_PIX ? 'Novel AI → Pix AI' : 'Pix AI → Novel AI'}
          </span>
          <ArrowRightLeft className="w-4 h-4 text-indigo-400 group-hover:text-white transition-colors hidden sm:block" />
          <ArrowDownUp className="w-4 h-4 text-indigo-400 group-hover:text-white transition-colors block sm:hidden" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Column */}
        <div className="flex flex-col gap-4">
          
          {/* Main Source Input */}
          <div className="flex flex-col gap-2 flex-1">
            <ActionButtons 
              text={sourceText} 
              onClear={() => setSourceText('')} 
              label={getSourceLabel()} 
            />
            <div className="relative group flex-1">
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder={getSourcePlaceholder()}
                className="w-full h-64 p-4 bg-slate-900/80 border border-slate-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-slate-200 placeholder-slate-600 font-mono text-sm leading-relaxed transition-all shadow-inner"
                spellCheck={false}
              />
              <div className="absolute inset-0 rounded-xl pointer-events-none border border-transparent group-hover:border-slate-600 transition-colors" />
            </div>
          </div>

          {/* Negative Source Input (Only visible for PIX -> NAI) */}
          {direction === ConversionDirection.PIX_TO_NAI && (
            <div className="flex flex-col gap-2 flex-1">
              <ActionButtons 
                text={sourceNegativeText} 
                onClear={() => setSourceNegativeText('')} 
                label={getSourceNegativeLabel()} 
              />
              <div className="relative group flex-1">
                <textarea
                  value={sourceNegativeText}
                  onChange={(e) => setSourceNegativeText(e.target.value)}
                  placeholder="예시: worst quality, lowres, (bad anatomy:1.4)"
                  className="w-full h-32 p-4 bg-slate-900/80 border border-red-900/30 border-slate-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 text-slate-200 placeholder-slate-600 font-mono text-sm leading-relaxed transition-all shadow-inner"
                  spellCheck={false}
                />
                <div className="absolute inset-0 rounded-xl pointer-events-none border border-transparent group-hover:border-slate-600 transition-colors" />
              </div>
            </div>
          )}
        </div>

        {/* Result Column */}
        <div className="flex flex-col gap-4">
          
          {/* Main Result Output */}
          <div className="flex flex-col gap-2 flex-1">
            <ActionButtons 
              text={resultText} 
              onClear={() => {}} 
              label={getTargetLabel()} 
            />
            <div className="relative group flex-1">
              <textarea
                value={resultText}
                readOnly
                placeholder="변환된 결과가 여기에 표시됩니다..."
                className="w-full h-64 p-4 bg-slate-950/50 border border-slate-800 rounded-xl resize-none focus:outline-none text-indigo-300 font-mono text-sm leading-relaxed shadow-inner"
                spellCheck={false}
              />
              <div className="absolute inset-0 rounded-xl pointer-events-none border border-transparent group-hover:border-slate-700 transition-colors" />
            </div>
          </div>

          {/* Negative Result Output (Only visible for NAI -> PIX) */}
          {direction === ConversionDirection.NAI_TO_PIX && (
            <div className="flex flex-col gap-2 flex-1">
              <ActionButtons 
                text={resultNegativeText} 
                onClear={() => {}} 
                label={getTargetNegativeLabel()} 
              />
              <div className="relative group flex-1">
                <textarea
                  value={resultNegativeText}
                  readOnly
                  placeholder="네거티브 프롬프트가 여기에 표시됩니다..."
                  className="w-full h-32 p-4 bg-slate-950/50 border border-slate-800 rounded-xl resize-none focus:outline-none text-red-300 font-mono text-sm leading-relaxed shadow-inner"
                  spellCheck={false}
                />
                <div className="absolute inset-0 rounded-xl pointer-events-none border border-transparent group-hover:border-slate-700 transition-colors" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analysis / Visualization Panel */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700 flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-slate-200">입력 프롬프트 가중치 분석 (Weight Analysis)</span>
        </div>
        <div className="p-4 bg-slate-950/30 min-h-[100px] max-h-[300px] overflow-y-auto">
          <PromptHighlighter 
            segments={segments} 
            placeholder="입력란에 텍스트를 입력하면 가중치가 적용된 태그가 이곳에 시각화됩니다."
          />
        </div>
      </div>

      <div className="mt-2 p-4 rounded-lg bg-slate-900 border border-slate-800/50 text-xs text-slate-500 space-y-2">
        <p>
          <span className="font-bold text-indigo-400">기본 가중치 (N::):</span> Novel AI 형식에서 
          <code className="mx-1 px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">2::</code>는 기본 가중치,
          <code className="mx-1 px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">-1::</code>은 네거티브 가중치입니다.
        </p>
        <p>
          <span className="font-bold text-indigo-400">네거티브 분리:</span> 
          Novel AI의 <code className="mx-1 px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">-N::</code> 태그는 
          PixAI 변환 시 자동으로 <strong>Negative Prompt</strong> 영역으로 분리됩니다.
        </p>
        <p>
          <span className="font-bold text-indigo-400">괄호 연산:</span> NovelAI {'{}'} (x1.05) / {'[]'} (x0.95), PixAI () (x1.1) / {'[]'} (x0.9)
        </p>
      </div>
    </div>
  );
};

export default Converter;
