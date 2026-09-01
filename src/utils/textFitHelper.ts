import { TextElement } from '../types/label';
import { substituteVariables } from './excelHelper';

/**
 * Utility to measure text dimensions and auto-fit font size or box dimensions.
 */

export interface TextMetricsResult {
  widthMm: number;
  heightMm: number;
  linesCount: number;
}

export function measureTextMetrics(
  text: string,
  fontSizePt: number,
  fontFamily: string = 'sans-serif',
  fontWeight: string = 'normal',
  maxWidthMm?: number,
  lineHeight: number = 1.15
): TextMetricsResult {
  if (typeof document === 'undefined') {
    return { widthMm: 20, heightMm: 5, linesCount: 1 };
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { widthMm: 20, heightMm: 5, linesCount: 1 };
  }

  // 1 pt = 96/72 px
  const fontPx = Math.max(4, fontSizePt) * (96 / 72);
  const isBold = fontWeight === 'bold' || fontWeight === '800';
  ctx.font = `${isBold ? 'bold ' : ''}${fontPx}px ${fontFamily || 'sans-serif'}`;

  const pxToMm = (px: number) => px * (25.4 / 96);
  const mmToPx = (mm: number) => mm * (96 / 25.4);

  const paragraphs = (text || '').split('\n');
  const renderedLines: string[] = [];
  const maxWidthPx = maxWidthMm && maxWidthMm > 0 ? mmToPx(maxWidthMm) : 0;

  for (const para of paragraphs) {
    if (!para) {
      renderedLines.push('');
      continue;
    }
    if (maxWidthPx > 0 && ctx.measureText(para).width > maxWidthPx) {
      const words = para.split(' ');
      let currentLine = '';
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(testLine).width > maxWidthPx && currentLine !== '') {
          renderedLines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) renderedLines.push(currentLine);
    } else {
      renderedLines.push(para);
    }
  }

  const linesCount = Math.max(1, renderedLines.length);
  let maxLineWidthPx = 0;
  for (const line of renderedLines) {
    const w = ctx.measureText(line).width;
    if (w > maxLineWidthPx) maxLineWidthPx = w;
  }

  // Add slight padding tolerance (1.2mm)
  const widthMm = Math.ceil((pxToMm(maxLineWidthPx) + 1.2) * 10) / 10;
  const singleLineHeightMm = fontSizePt * (25.4 / 72) * lineHeight;
  const heightMm = Math.ceil((singleLineHeightMm * linesCount + 1.2) * 10) / 10;

  return { widthMm, heightMm, linesCount };
}

/**
 * Automatically reduce font size so the text fits on 1 line within the given widthMm.
 */
export function shrinkFontSizeToFitLine(
  element: TextElement,
  sampleDataRow?: Record<string, string>,
  minFontSizePt: number = 4
): TextElement {
  const textContent = substituteVariables(element.content || '', sampleDataRow || {});
  let currentFontSize = element.fontSize || 8;

  while (currentFontSize > minFontSizePt) {
    const metrics = measureTextMetrics(
      textContent,
      currentFontSize,
      element.fontFamily,
      element.fontWeight,
      undefined,
      element.lineHeight || 1.15
    );

    if (metrics.widthMm <= element.width) {
      break;
    }
    currentFontSize = Math.round((currentFontSize - 0.5) * 10) / 10;
  }

  // Also ensure height fits
  const finalMetrics = measureTextMetrics(
    textContent,
    currentFontSize,
    element.fontFamily,
    element.fontWeight,
    element.width,
    element.lineHeight || 1.15
  );

  const neededHeight = Math.max(element.height, finalMetrics.heightMm);

  return {
    ...element,
    fontSize: currentFontSize,
    height: Math.ceil(neededHeight * 10) / 10,
  };
}

/**
 * Expand element height so all lines of text are fully visible without clipping.
 */
export function expandHeightToFitContent(
  element: TextElement,
  sampleDataRow?: Record<string, string>
): TextElement {
  const textContent = substituteVariables(element.content || '', sampleDataRow || {});
  const metrics = measureTextMetrics(
    textContent,
    element.fontSize,
    element.fontFamily,
    element.fontWeight,
    element.width,
    element.lineHeight || 1.15
  );

  const newHeight = Math.max(element.height, metrics.heightMm);

  return {
    ...element,
    height: Math.ceil(newHeight * 10) / 10,
  };
}

/**
 * Expand element width so text stays on a single line.
 */
export function expandWidthToFitSingleLine(
  element: TextElement,
  sampleDataRow?: Record<string, string>
): TextElement {
  const textContent = substituteVariables(element.content || '', sampleDataRow || {});
  const metrics = measureTextMetrics(
    textContent,
    element.fontSize,
    element.fontFamily,
    element.fontWeight,
    undefined,
    element.lineHeight || 1.15
  );

  const newWidth = Math.max(element.width, metrics.widthMm);

  return {
    ...element,
    width: Math.ceil(newWidth * 10) / 10,
  };
}

/**
 * Check if the given text element is overflowing its bounding box.
 */
export function isTextOverflowing(
  element: TextElement,
  sampleDataRow?: Record<string, string>
): boolean {
  const textContent = substituteVariables(element.content || '', sampleDataRow || {});
  const metrics = measureTextMetrics(
    textContent,
    element.fontSize,
    element.fontFamily,
    element.fontWeight,
    element.width,
    element.lineHeight || 1.15
  );

  return metrics.heightMm > element.height + 0.5;
}
