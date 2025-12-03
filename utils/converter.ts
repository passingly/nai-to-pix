import { ParsedSegment } from '../types';

const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * Helper: Escape parentheses for PixAI/SD format.
 * ( -> \( and ) -> \)
 */
const escapePixAI = (text: string): string => {
  return text.replace(/([()])/g, '\\$1');
};

/**
 * Helper: Unescape parentheses from PixAI/SD format.
 * \( -> ( and \) -> )
 */
const unescapePixAI = (text: string): string => {
  return text.replace(/\\([()])/g, '$1');
};

/**
 * Parses NovelAI format text into structured segments using a strictly stateful approach.
 * Handles:
 * 1. "N::" sets a persistent base weight.
 * 2. "::" resets base weight to 1.0.
 * 3. "{ }" increases weight by 0.1 per nesting level.
 * 4. "[ ]" decreases weight by 0.1 per nesting level.
 * 5. Commas split segments, inheriting the current weight state.
 */
export const parseNovelAI = (text: string): ParsedSegment[] => {
  if (!text) return [];
  
  const segments: ParsedSegment[] = [];
  let currentBaseWeight = 1.0;
  let curlyDepth = 0; // Each level adds +0.1
  let squareDepth = 0; // Each level adds -0.1
  
  let buffer = '';
  
  // Regex to detect "N::" or "::" ahead
  // Matches start of string or immediate position
  const weightControlRegex = /^(\d*(?:\.\d+)?)?::/;

  const flush = () => {
    const trimmed = buffer.trim();
    if (trimmed) {
      // Calculate final weight
      // Formula: Base + (Curly * 0.1) - (Square * 0.1)
      const modifier = (curlyDepth * 0.1) - (squareDepth * 0.1);
      let finalWeight = currentBaseWeight + modifier;
      
      // Fix float precision issues (e.g. 1.200000001)
      finalWeight = Math.round(finalWeight * 1000) / 1000;

      segments.push({
        id: generateId(),
        type: finalWeight === 1.0 ? 'text' : 'weight',
        raw: trimmed,
        content: trimmed,
        weight: finalWeight
      });
    }
    buffer = '';
  };

  let i = 0;
  while (i < text.length) {
    const remaining = text.slice(i);

    // 1. Check for Weight Control Token (N:: or ::)
    const match = remaining.match(weightControlRegex);
    if (match) {
      flush(); // Flush existing buffer before weight change
      
      const numStr = match[1];
      if (numStr) {
        // "2::" -> set base to 2
        const w = parseFloat(numStr);
        if (!isNaN(w)) currentBaseWeight = w;
      } else {
        // "::" -> reset base to 1
        currentBaseWeight = 1.0;
      }
      
      i += match[0].length;
      continue;
    }

    const char = text[i];

    // 2. Check for Brackets/Braces
    // IMPORTANT: We must flush the buffer BEFORE changing depth for opening brackets (to save outer text)
    // and BEFORE changing depth for closing brackets (to save inner text with its weight).
    if (char === '{') {
      flush();
      curlyDepth++;
      i++;
    } else if (char === '}') {
      flush();
      curlyDepth = Math.max(0, curlyDepth - 1);
      i++;
    } else if (char === '[') {
      flush();
      squareDepth++;
      i++;
    } else if (char === ']') {
      flush();
      squareDepth = Math.max(0, squareDepth - 1);
      i++;
    } 
    // 3. Check for Comma
    else if (char === ',') {
      flush();
      i++;
    } 
    // 4. Normal Character
    else {
      buffer += char;
      i++;
    }
  }

  // Flush remaining buffer
  flush();

  return segments;
};

/**
 * Parses PixAI/SD format text into structured segments.
 * Supports (tag:1.2) syntax.
 * Handles escaped parentheses \( and \) by unescaping them in the content.
 * Regex updated to correctly parse (tag \(info\):1.2)
 */
export const parsePixAI = (text: string): ParsedSegment[] => {
  if (!text) return [];

  const segments: ParsedSegment[] = [];
  
  // Regex Explanation:
  // Matches `( ... : weight )`
  // Content group `((?: ... )+)` allows:
  // 1. `[^:()\\\\]` : Matches any character except `:`, `(`, `)`, or `\`
  // 2. `\\.`        : Matches any escaped character (e.g., `\(`, `\)`)
  // 3. `\((?:[^()]|\\.)*\)` : Matches nested parentheses with optional internal escapes
  // Note: For simple PixAI tag escaping, `((?:[^:()]|\\.)+)` handles `tag \(tag\)` correctly.
  const regex = /\(((?:[^:()]|\\.)+):(\d+(?:\.\d+)?)\)/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const plainText = text.slice(lastIndex, match.index);
      if (plainText.trim()) {
        segments.push({
          id: generateId(),
          type: 'text',
          raw: plainText,
          content: unescapePixAI(plainText),
          weight: 1.0
        });
      }
    }

    const rawContent = match[1];
    const weight = parseFloat(match[2]);
    const content = unescapePixAI(rawContent);

    segments.push({
      id: generateId(),
      type: 'weight',
      raw: match[0],
      weight,
      content: content.trim()
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex);
    if (remaining.trim()) {
      segments.push({
        id: generateId(),
        type: 'text',
        raw: remaining,
        content: unescapePixAI(remaining),
        weight: 1.0
      });
    }
  }

  return segments;
};

/**
 * Converts structured segments to PixAI format string.
 * Escapes parentheses in content to \( and \).
 */
export const segmentsToPixAI = (segments: ParsedSegment[]): string => {
  return segments
    .filter(seg => seg.content && seg.content.trim().length > 0)
    .map(seg => {
      const w = seg.weight || 1.0;
      // Use non-null assertion as filter guarantees content
      let content = seg.content!; 
      
      // Escape parenthesis for PixAI
      content = escapePixAI(content);

      // If weight is effectively 1, just return content (with escapes)
      if (w === 1.0) {
        return content;
      }
      return `(${content}:${w})`;
    })
    .join(', ');
};

/**
 * Converts structured segments to NovelAI format string.
 * Uses explicit syntax "N::tag::" for clarity and safety.
 */
export const segmentsToNovelAI = (segments: ParsedSegment[]): string => {
  return segments.map(seg => {
    // If text or weight 1, just return text
    if (seg.type === 'text' || seg.weight === 1) {
      return seg.content || seg.raw;
    }
    // Use explicit closing :: for safety
    return `${seg.weight}::${seg.content}::`;
  }).join(', ');
};

export const convertToPixAI = (text: string): string => {
  const segments = parseNovelAI(text);
  return segmentsToPixAI(segments);
};

export const convertToNovelAI = (text: string): string => {
  const segments = parsePixAI(text);
  return segmentsToNovelAI(segments);
};