import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { GeneratedLabel, LabelTemplate } from '../types/label';
import { renderLabelToCanvas } from './pdfExporter';

/**
 * Packs all selected rendered labels into a ZIP file containing high-res PNG images.
 */
export async function exportLabelsToZip(
  template: LabelTemplate,
  labels: GeneratedLabel[],
  zipFilename = 'danh_sach_tem_qr.zip',
  onProgress?: (processed: number, total: number) => void
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('tem_nhan_qr');

  const selectedLabels = labels.filter((l) => l.selected !== false);
  const total = selectedLabels.length;

  for (let i = 0; i < total; i++) {
    const item = selectedLabels[i];
    const canvas = await renderLabelToCanvas(template, item.data, 300);
    const dataUrl = canvas.toDataURL('image/png');
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

    const imeiOrCode = item.data['IMEI'] || item.data['MaMay'] || item.data['Model'] || `tem_${i + 1}`;
    const cleanFilename = String(imeiOrCode).replace(/[^a-zA-Z0-9_-]/g, '_');

    folder?.file(`Tem_${i + 1}_${cleanFilename}.png`, base64Data, { base64: true });

    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, zipFilename);
}
