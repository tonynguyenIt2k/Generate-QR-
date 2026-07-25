import { jsPDF } from 'jspdf';
import { GeneratedLabel, LabelTemplate, PrintSettings } from '../types/label';
import { generateQRDataUrl } from './qrGenerator';
import { generateBarcodeDataUrl } from './barcodeGenerator';
import { substituteVariables } from './excelHelper';

/**
 * Renders a single label to an HTML Canvas with high DPI scaling.
 */
export async function renderLabelToCanvas(
  template: LabelTemplate,
  dataRow: Record<string, any>,
  targetDpi = 300
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

  for (const el of sortedElements) {
    if (el.visible === false) continue;

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
      ctx.fillStyle = el.fillColor || 'transparent';
      ctx.strokeStyle = el.strokeColor || 'transparent';
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
      ctx.strokeStyle = el.strokeColor || '#000000';
      ctx.lineWidth = mmToPx(el.strokeWidth || 0.3);
      ctx.beginPath();
      ctx.moveTo(x, y + h / 2);
      ctx.lineTo(x + w, y + h / 2);
      ctx.stroke();
    } else if (el.type === 'text') {
      const substitutedText = substituteVariables(el.content, dataRow);
      const fontPt = el.fontSize || 9;
      const fontPx = fontPt * (targetDpi / 72);

      ctx.fillStyle = el.color || '#000000';
      ctx.font = `${el.fontStyle === 'italic' ? 'italic ' : ''}${el.fontWeight === 'bold' || el.fontWeight === '800' ? 'bold ' : ''}${fontPx}px ${el.fontFamily || 'sans-serif'}`;
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

      ctx.fillText(substitutedText, textX, y, w);
    } else if (el.type === 'qr') {
      const substitutedContent = substituteVariables(el.content, dataRow);
      const qrDataUrl = await generateQRDataUrl({
        content: substitutedContent,
        fgColor: el.fgColor,
        bgColor: el.bgColor,
        errorCorrection: el.errorCorrection,
        logoUrl: el.logoUrl,
        logoSizeRatio: el.logoSizeRatio,
        width: Math.max(200, Math.round(w)),
      });

      const img = await loadImage(qrDataUrl);
      ctx.drawImage(img, x, y, w, h);
    } else if (el.type === 'barcode') {
      const substitutedContent = substituteVariables(el.content, dataRow);
      const barcodeDataUrl = generateBarcodeDataUrl({
        content: substitutedContent,
        format: el.format,
        fgColor: el.fgColor,
        bgColor: el.bgColor,
        displayValue: el.displayValue,
        fontSize: el.fontSize,
        fontFamily: el.fontFamily,
        height: Math.max(50, Math.round(h * 2)),
      });

      const img = await loadImage(barcodeDataUrl);
      ctx.drawImage(img, x, y, w, h);
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
