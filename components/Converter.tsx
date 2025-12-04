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
  const [sourceText, setSourceText] = useState('');
  const [resultText, setResultText] = useState('');
  const [segments, setSegments] = useState<ParsedSegment[]>([]);

  // Parse and convert whenever source text or direction changes
  useEffect(() => {
    let parsed: ParsedSegment[] = [];
    let result = '';

    if (direction === ConversionDirection.NAI_TO_PIX) {
      parsed = parseNovelAI(sourceText);
      result = segmentsToPixAI(parsed);
    } else {
      parsed = parsePixAI(sourceText);
      result = segmentsToNovelAI(parsed);
    }

    setSegments(parsed);
    setResultText(result);
  }, [sourceText, direction]);

  const toggleDirection = () => {
    const newDirection =
      direction === ConversionDirection.NAI_TO_PIX
        ? ConversionDirection.PIX_TO_NAI
        : ConversionDirection.NAI_TO_PIX;

    setDirection(newDirection);
    setSourceText(resultText);
  };

  const getSourceLabel = () =>
    direction === ConversionDirection.NAI_TO_PIX ? 'Novel AI (Custom)' : 'Pix AI / SD';
  
  const getTargetLabel = () =>
    direction === ConversionDirection.NAI_TO_PIX ? 'Pix AI / SD' : 'Novel AI (Custom)';

  const getSourcePlaceholder = () =>
    direction === ConversionDirection.NAI_TO_PIX
      ? '예시: 2::1girl::, 1.5::sword, {shield}::\n또는 1.1::tag1, {tag2::'
      : '예시: masterpiece, (1girl:2), (sword:1.5), shield';

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
        {/* Source Input */}
        <div className="flex flex-col gap-2">
          <ActionButtons 
            text={sourceText} 
            onClear={() => setSourceText('')} 
            label={`입력 (${getSourceLabel()})`} 
          />
          <div className="relative group flex-1">
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder={getSourcePlaceholder()}
              className="w-full h-80 lg:h-96 p-4 bg-slate-900/80 border border-slate-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-slate-200 placeholder-slate-600 font-mono text-sm leading-relaxed transition-all shadow-inner"
              spellCheck={false}
            />
            <div className="absolute inset-0 rounded-xl pointer-events-none border border-transparent group-hover:border-slate-600 transition-colors" />
          </div>
        </div>

        {/* Result Output */}
        <div className="flex flex-col gap-2">
          <ActionButtons 
            text={resultText} 
            onClear={() => {}} 
            label={`결과 (${getTargetLabel()})`} 
          />
          <div className="relative group flex-1">
            <textarea
              value={resultText}
              readOnly
              placeholder="변환된 결과가 여기에 표시됩니다..."
              className="w-full h-80 lg:h-96 p-4 bg-slate-950/50 border border-slate-800 rounded-xl resize-none focus:outline-none text-indigo-300 font-mono text-sm leading-relaxed shadow-inner"
              spellCheck={false}
            />
            <div className="absolute inset-0 rounded-xl pointer-events-none border border-transparent group-hover:border-slate-700 transition-colors" />
          </div>
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
          <code className="mx-1 px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">2::</code>는 
          해당 지점부터의 <strong>기본 가중치</strong>를 설정합니다. 
          <code className="mx-1 px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">::</code>를 만나면 1.0으로 초기화됩니다.
        </p>
        <p>
          <span className="font-bold text-indigo-400">괄호 연산:</span> NovelAI의
          <code className="mx-1 px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">{'{}'}</code>는 <strong>x1.05</strong>, 
          <code className="mx-1 px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">{'[]'}</code>는 <strong>x0.95</strong>입니다.
          반면 PixAI/SD의
          <code className="mx-1 px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">()</code>는 <strong>x1.1</strong>,
          <code className="mx-1 px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">{'[]'}</code>는 <strong>x0.9</strong>입니다.
        </p>
        <p>
          <span className="font-bold text-indigo-400">결과 처리:</span> 모든 변환 결과는 소수점 둘째 자리에서 반올림되며, PixAI 변환 시 <code className="mx-1 px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">(tag:weight)</code> 형식으로 명시적 변환됩니다.
        </p>
      </div>
    </div>
  );
};

export default Converter;