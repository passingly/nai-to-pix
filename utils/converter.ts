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
 * Helper: Round number to 2 decimal places.
 */
const roundWeight = (num: number): number => {
  return Math.round(num * 100) / 100;
};

/**
 * Parses NovelAI format text into structured segments using a strictly stateful approach.
 * Handles:
 * 1. "N::" sets a persistent base weight AND RESETS bracket counters.
 *    - IMPORANT: "N::" completely clears the bracket history for the following text.
 *    - Closing brackets after "N::" will therefore drive depth negative.
 * 2. "::" resets base weight to 1.0 and RESETS bracket counters.
 * 3. "{ }" multiplies weight by 1.05 per nesting level.
 * 4. "[ ]" multiplies weight by 0.95 per nesting level.
 * 5. Commas split segments, inheriting the current weight state.
 */
export const parseNovelAI = (text: string): ParsedSegment[] => {
  if (!text) return [];
  
  const segments: ParsedSegment[] = [];
  
  // Current bracket nesting levels
  // These can go negative if "N::" resets them and then closing brackets appear.
  let curlyDepth = 0; // Each level x1.05
  let squareDepth = 0; // Each level x0.95
  
  // Weight Control State
  let activeBaseWeight = 1.0;
  
  let buffer = '';
  
  // Regex to detect "N::" or "::" ahead
  // Matches start of string or immediate position
  const weightControlRegex = /^(\d*(?:\.\d+)?)?::/;

  const flush = () => {
    const trimmed = buffer.trim();
    if (trimmed) {
      // Calculate multipliers. Depth can be negative.
      const curlyMult = Math.pow(1.05, curlyDepth);
      const squareMult = Math.pow(0.95, squareDepth);
      
      let finalWeight = activeBaseWeight * curlyMult * squareMult;
      
      // Round to 2 decimal places
      finalWeight = roundWeight(finalWeight);

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
        if (!isNaN(w)) {
            activeBaseWeight = w;
        }
      } else {
        // "::" -> reset base to 1.0
        activeBaseWeight = 1.0;
      }

      // CRITICAL UPDATE: NAI resets the bracket stack when using :: syntax.
      // This means subsequent closing brackets will create negative depth.
      curlyDepth = 0;
      squareDepth = 0;
      
      i += match[0].length;
      continue;
    }

    const char = text[i];

    // 2. Check for Brackets/Braces
    if (char === '{') {
      flush();
      curlyDepth++;
      i++;
    } else if (char === '}') {
      flush();
      curlyDepth--; // Allow going negative
      i++;
    } else if (char === '[') {
      flush();
      squareDepth++;
      i++;
    } else if (char === ']') {
      flush();
      squareDepth--; // Allow going negative
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
 * 
 * Rules:
 * 1. ( ... ) multiplies weight by 1.1.
 * 2. [ ... ] multiplies weight by 0.9.
 * 3. (tag:1.5) sets absolute weight to 1.5, overriding any surrounding brackets.
 * 4. Commas separate tags but preserve current bracket depth for the next tag in the group.
 */
export const parsePixAI = (text: string): ParsedSegment[] => {
  if (!text) return [];

  const segments: ParsedSegment[] = [];
  
  // Track nesting levels
  let parenDepth = 0;  // x1.1
  let squareDepth = 0; // x0.9
  
  let buffer = '';

  // Regex to detect explicit weight syntax like (tag:1.5)
  const explicitWeightRegex = /^\(((?:[^:()\\]|\\.)+):(\d+(?:\.\d+)?)\)/;

  const flush = (overrideWeight?: number) => {
    const trimmed = buffer.trim();
    if (trimmed) {
      let finalWeight = 1.0;

      if (overrideWeight !== undefined) {
        finalWeight = overrideWeight;
      } else {
        // Calculate based on depth using multiplication logic
        // Updated logic: ( ) is 1.1x, [ ] is 0.9x
        const parenMult = Math.pow(1.1, parenDepth);
        const squareMult = Math.pow(0.9, squareDepth);
        finalWeight = 1.0 * parenMult * squareMult;
      }

      // Round to 2 decimal places
      finalWeight = roundWeight(finalWeight);

      segments.push({
        id: generateId(),
        type: finalWeight === 1.0 ? 'text' : 'weight',
        raw: trimmed,
        content: unescapePixAI(trimmed), // Unescape content for internal storage
        weight: finalWeight
      });
    }
    buffer = '';
  };

  let i = 0;
  while (i < text.length) {
    const char = text[i];

    // 1. Handle Escaped Characters
    if (char === '\\') {
      if (i + 1 < text.length) {
        buffer += char + text[i + 1];
        i += 2;
        continue;
      }
    }

    // 2. Check for Explicit Weight Syntax: (tag:1.5)
    // We check this when we hit an opening parenthesis
    if (char === '(') {
      const remaining = text.slice(i);
      const match = remaining.match(explicitWeightRegex);

      if (match) {
        // Found (tag:1.5). 
        // Flush previous buffer using CURRENT context.
        flush();
        
        // Add the explicit tag with its ABSOLUTE weight.
        const content = match[1];
        const weight = parseFloat(match[2]);
        
        // Add directly as segment
        segments.push({
          id: generateId(),
          type: 'weight',
          raw: match[0],
          content: unescapePixAI(content.trim()),
          weight: weight // Use exact weight provided in explicit syntax
        });

        // Advance index past the entire (tag:1.5) block
        i += match[0].length;
        continue;
      }
    }

    // 3. Handle Brackets acting as modifiers
    if (char === '(') {
      flush();
      parenDepth++;
      i++;
    } else if (char === ')') {
      flush();
      parenDepth = Math.max(0, parenDepth - 1);
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
    // 4. Handle Comma
    else if (char === ',') {
      flush();
      i++;
    } 
    // 5. Normal Character
    else {
      buffer += char;
      i++;
    }
  }

  flush();

  return segments;
};

/**
 * Converts structured segments to PixAI format string.
 * Always uses explicit syntax (tag:weight) for any weight != 1.0
 * to ensure maximum compatibility.
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

      if (w === 1.0) {
        return content;
      }
      
      // Explicit syntax for everything else: (tag:weight)
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