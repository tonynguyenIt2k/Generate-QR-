import { jsPDF } from 'jspdf';
import { GeneratedLabel, LabelTemplate, PrintSettings } from '../types/label';
import { generateQRDataUrl } from './qrGenerator';
import { generateBarcodeDataUrl } from './barcodeGenerator';
import { substituteVariables } from './excelHelper';

export interface RenderLabelOptions {
  highContrastThermal?: boolean;
}

/**
 * Renders a single label to an HTML Canvas with high DPI scaling.
 */
export async function renderLabelToCanvas(
  template: LabelTemplate,
  dataRow: Record<string, any>,
  targetDpi = 300,
  options: RenderLabelOptions = {}
): Promise<HTMLCanvasElement> {
  const mmToPx = (mm: number) => (mm * targetDpi) / 25.4;

  const widthPx = Math.round(mmToPx(template.widthMm));
  const heightPx = Math.round(mmToPx(template.heightMm));

  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext('2d');

  if (!ctx) return canvas;

  // Fill background white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, widthPx, heightPx);

  // Sort elements by zIndex
  const sortedElements = [...template.elements].sort((a, b) => a.zIndex - b.zIndex);

  const isDual = template.isDualPart || template.id.includes('dual');

  const getElementDataRow = (el: any): Record<string, any> => {
    if (!isDual) return dataRow;

    const isTop = el.id.startsWith('top-') || (el.y + el.height / 2 < template.heightMm / 2);

    if (dataRow._oddRow || dataRow._evenRow) {
      return isTop ? (dataRow._oddRow || dataRow) : (dataRow._evenRow || { _isEmpty: true });
    }
    if (dataRow._sampleOdd || dataRow._sampleEven) {
      return isTop ? (dataRow._sampleOdd || dataRow) : (dataRow._sampleEven || dataRow);
    }

    if (isTop) return dataRow;
    return {
      ...dataRow,
      Serial: dataRow.Serial
        ? (String(dataRow.Serial).includes('01') ? String(dataRow.Serial).replace('01', '02') : `${dataRow.Serial}-2`)
        : 'F2LXK982P02',
    };
  };

  for (const el of sortedElements) {
    if (el.visible === false) continue;

    const elDataRow = getElementDataRow(el);
    const x = mmToPx(el.x);
    const y = mmToPx(el.y);
    const w = mmToPx(el.width);
    const h = mmToPx(el.height);

    ctx.save();

    // Handle rotation if any
    if (el.rotation) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((el.rotation * Math.PI) / 180);
      ctx.translate(-(x + w / 2), -(y + h / 2));
    }

    if (el.type === 'rectangle') {
      const fillColor = options.highContrastThermal && el.fillColor && el.fillColor !== 'transparent' && el.fillColor !== '#ffffff'
        ? '#000000'
        : (el.fillColor || 'transparent');
      const strokeColor = options.highContrastThermal && el.strokeColor && el.strokeColor !== 'transparent'
        ? '#000000'
        : (el.strokeColor || 'transparent');

      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = mmToPx(el.strokeWidth || 0.2);

      if (el.cornerRadius && typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        try {
          ctx.roundRect(x, y, w, h, mmToPx(el.cornerRadius));
        } catch {
          ctx.rect(x, y, w, h);
        }
        if (el.fillColor && el.fillColor !== 'transparent') ctx.fill();
        if (el.strokeColor && el.strokeColor !== 'transparent' && el.strokeWidth > 0) ctx.stroke();
      } else {
        if (el.fillColor && el.fillColor !== 'transparent') ctx.fillRect(x, y, w, h);
        if (el.strokeColor && el.strokeColor !== 'transparent' && el.strokeWidth > 0) ctx.strokeRect(x, y, w, h);
      }
    } else if (el.type === 'line') {
      ctx.strokeStyle = options.highContrastThermal ? '#000000' : (el.strokeColor || '#000000');
      ctx.lineWidth = mmToPx(el.strokeWidth || 0.3);
      ctx.beginPath();
      ctx.moveTo(x, y + h / 2);
      ctx.lineTo(x + w, y + h / 2);
      ctx.stroke();
    } else if (el.type === 'text') {
      const substitutedText = substituteVariables(el.content, elDataRow);
      const fontPt = el.fontSize || 9;
      const fontPx = fontPt * (targetDpi / 72);
      const lineHeightPx = fontPx * (el.lineHeight || 1.15);

      const textColor = options.highContrastThermal
        ? (el.color === '#ffffff' || el.color === 'white' ? '#ffffff' : '#000000')
        : (el.color || '#000000');

      ctx.fillStyle = textColor;
      ctx.font = `${el.fontStyle === 'italic' ? 'italic ' : ''}${
        el.fontWeight === 'bold' || el.fontWeight === '800' ? 'bold ' : ''
      }${fontPx}px ${el.fontFamily || 'sans-serif'}`;
      ctx.textBaseline = 'top';

      let textX = x;
      if (el.textAlign === 'center') {
        textX = x + w / 2;
        ctx.textAlign = 'center';
      } else if (el.textAlign === 'right') {
        textX = x + w;
        ctx.textAlign = 'right';
      } else {
        ctx.textAlign = 'left';
      }

      // Support line breaks (\n) and auto word wrapping within width w
      const paragraphs = (substitutedText || '').split('\n');
      const renderedLines: string[] = [];

      for (const paragraph of paragraphs) {
        if (!paragraph) {
          renderedLines.push('');
          continue;
        }

        const pWidth = ctx.measureText(paragraph).width;
        if (pWidth <= w + 0.5) {
          renderedLines.push(paragraph);
        } else {
          const words = paragraph.split(' ');
          let currentLine = '';

          for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const testWidth = ctx.measureText(testLine).width;

            if (testWidth > w + 0.5 && currentLine !== '') {
              renderedLines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) {
            renderedLines.push(currentLine);
          }
        }
      }

      // Draw stacked lines
      for (let lineIndex = 0; lineIndex < renderedLines.length; lineIndex++) {
        const lineY = y + lineIndex * lineHeightPx;
        if (lineY + fontPx > y + h + fontPx * 3) break;
        ctx.fillText(renderedLines[lineIndex], textX, lineY);
      }
    } else if (el.type === 'qr') {
      const substitutedContent = substituteVariables(el.content, elDataRow);
      if (substitutedContent && substitutedContent.trim() && !elDataRow._isEmpty) {
        const qrDataUrl = await generateQRDataUrl({
          content: substitutedContent,
          fgColor: options.highContrastThermal ? '#000000' : (el.fgColor || '#000000'),
          bgColor: el.bgColor || '#ffffff',
          errorCorrection: el.errorCorrection,
          logoUrl: el.logoUrl,
          logoSizeRatio: el.logoSizeRatio,
          width: Math.max(300, Math.round(Math.max(w, h))),
        });

        const img = await loadImage(qrDataUrl);
        // Disable image smoothing for razor-sharp QR pixel modules
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, x, y, w, h);
        ctx.imageSmoothingEnabled = true;
      }
    } else if (el.type === 'barcode') {
      const substitutedContent = substituteVariables(el.content, elDataRow);
      if (substitutedContent && substitutedContent.trim() && !elDataRow._isEmpty) {
        // Calculate appropriate barcode bar width for high resolution
        const estimatedModules = Math.max(35, (substitutedContent.length + 4) * 11);
        const calculatedBarWidth = Math.max(2, Math.floor((w - 16) / estimatedModules));

        const barcodeDataUrl = generateBarcodeDataUrl({
          content: substitutedContent,
          format: el.format,
          fgColor: options.highContrastThermal ? '#000000' : (el.fgColor || '#000000'),
          bgColor: el.bgColor || '#ffffff',
          displayValue: el.displayValue,
          fontSize: Math.max(12, Math.round((el.fontSize || 12) * (targetDpi / 72))),
          fontFamily: el.fontFamily,
          height: Math.max(60, Math.round(h * 1.5)),
          width: calculatedBarWidth,
        });

        const img = await loadImage(barcodeDataUrl);
        // Disable image smoothing for sharp black/white barcode vertical bars
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, x, y, w, h);
        ctx.imageSmoothingEnabled = true;
      }
    } else if (el.type === 'image' && el.src) {
      try {
        const img = await loadImage(el.src);
        ctx.drawImage(img, x, y, w, h);
      } catch (err) {
        console.warn('Could not render image element:', err);
      }
    }

    ctx.restore();
  }

  return canvas;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Generates a multi-page PDF document for thermal label printing using jsPDF.
 */
export async function exportBatchPdf(
  template: LabelTemplate,
  generatedLabels: GeneratedLabel[],
  printSettings: PrintSettings,
  onProgress?: (processed: number, total: number) => void
): Promise<jsPDF> {
  const activeLabels = generatedLabels.filter((gl) => gl.selected !== false);
  const totalItems = activeLabels.length;

  const cols = Math.max(1, printSettings.labelsPerRow || 1);
  const gap = printSettings.gapMm || 2;
  const labelW = template.widthMm;
  const labelH = template.heightMm;
  const totalRowW = labelW * cols + gap * (cols - 1);

  const orientation = totalRowW > labelH ? 'landscape' : 'portrait';

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [totalRowW, labelH],
  });

  const images: string[] = [];

  for (let i = 0; i < totalItems; i++) {
    const labelItem = activeLabels[i];

    // Render high res 300 DPI canvas
    const canvas = await renderLabelToCanvas(template, labelItem.data, printSettings.dpi || 300);
    const imgData = canvas.toDataURL('image/png');

    const copies = Math.max(1, printSettings.copiesPerItem || 1);

    for (let c = 0; c < copies; c++) {
      images.push(imgData);
    }

    if (onProgress) {
      onProgress(i + 1, totalItems);
    }
  }

  // Group images into rows based on cols (e.g. 2 tem / hàng)
  const rows: string[][] = [];
  for (let i = 0; i < images.length; i += cols) {
    rows.push(images.slice(i, i + cols));
  }

  for (let r = 0; r < rows.length; r++) {
    if (r > 0) {
      pdf.addPage([totalRowW, labelH], orientation);
    }

    const rowImgs = rows[r];
    for (let c = 0; c < rowImgs.length; c++) {
      const x = c * (labelW + gap);
      pdf.addImage(rowImgs[c], 'PNG', x, 0, labelW, labelH);
    }
  }

  return pdf;
}
