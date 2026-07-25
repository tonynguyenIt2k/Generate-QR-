import JsBarcode from 'jsbarcode';
import { BarcodeFormat } from '../types/label';

export interface BarcodeRenderOptions {
  content: string;
  format?: BarcodeFormat;
  fgColor?: string;
  bgColor?: string;
  displayValue?: boolean;
  fontSize?: number;
  fontFamily?: string;
  width?: number; // bar width scale factor
  height?: number; // barcode height in px
}

/**
 * Generates a high-quality Data URL (PNG) for a given Barcode content and options.
 */
export function generateBarcodeDataUrl(options: BarcodeRenderOptions): string {
  const {
    content,
    format = 'CODE128',
    fgColor = '#000000',
    bgColor = '#ffffff',
    displayValue = true,
    fontSize = 14,
    fontFamily = 'monospace',
    height = 60,
  } = options;

  const rawContent = (content || '1234567890').trim();

  try {
    const canvas = document.createElement('canvas');
    let validFormat = format;

    // Map format names for JsBarcode
    let jsBarcodeFormat: string = 'CODE128';
    if (format === 'CODE39') jsBarcodeFormat = 'CODE39';
    else if (format === 'EAN13') jsBarcodeFormat = 'EAN13';
    else if (format === 'UPC') jsBarcodeFormat = 'UPC';
    else if (format === 'DATAMATRIX') jsBarcodeFormat = 'CODE128'; // fallback to code128 for matrix standard jsbarcode

    // Validate specific format rules
    let sanitizedContent = rawContent;
    if (format === 'EAN13') {
      // Ensure EAN13 has digits
      sanitizedContent = rawContent.replace(/\D/g, '').padEnd(13, '0').substring(0, 13);
    } else if (format === 'UPC') {
      sanitizedContent = rawContent.replace(/\D/g, '').padEnd(12, '0').substring(0, 12);
    }

    JsBarcode(canvas, sanitizedContent, {
      format: jsBarcodeFormat,
      lineColor: fgColor,
      background: bgColor,
      displayValue: displayValue,
      fontSize: fontSize,
      fontOptions: 'bold',
      font: fontFamily,
      height: height,
      margin: 4,
      width: 2,
    });

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn(`JsBarcode failed for format ${format} with content "${content}". Falling back to CODE128.`, err);
    try {
      const fallbackCanvas = document.createElement('canvas');
      JsBarcode(fallbackCanvas, rawContent || 'INVALID', {
        format: 'CODE128',
        lineColor: fgColor,
        background: bgColor,
        displayValue: displayValue,
        fontSize: fontSize,
        height: height,
        margin: 4,
        width: 2,
      });
      return fallbackCanvas.toDataURL('image/png');
    } catch {
      // Ultimate fallback image
      const errCanvas = document.createElement('canvas');
      errCanvas.width = 200;
      errCanvas.height = height;
      const ctx = errCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, 200, height);
        ctx.fillStyle = fgColor;
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Barcode Error', 100, height / 2);
      }
      return errCanvas.toDataURL('image/png');
    }
  }
}
