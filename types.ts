export enum ConversionDirection {
  NAI_TO_PIX = 'NAI_TO_PIX', // 2::tag:: -> (tag:2)
  PIX_TO_NAI = 'PIX_TO_NAI'  // (tag:2) -> 2::tag::
}

export interface ConverterProps {
  direction: ConversionDirection;
  onDirectionChange: (direction: ConversionDirection) => void;
}

export interface ParsedSegment {
  id: string;
  type: 'text' | 'weight';
  raw: string;
  content?: string;
  weight?: number;
}
