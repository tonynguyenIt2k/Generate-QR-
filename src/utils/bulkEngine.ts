import { DatasetRow, GeneratedLabel, LabelTemplate } from '../types/label';
import { renderLabelToCanvas } from './pdfExporter';

export interface BulkGeneratorOptions {
  template: LabelTemplate;
  dataset: DatasetRow[];
  batchSize?: number;
  renderPreviewThumbnails?: boolean;
  onProgress?: (processed: number, total: number) => void;
}

/**
 * High performance non-blocking bulk generator that processes thousands of rows
 * in micro-batches to keep UI fluid and responsive.
 */
export async function generateBulkLabelsAsync(options: BulkGeneratorOptions): Promise<GeneratedLabel[]> {
  const {
    template,
    dataset,
    batchSize = 25,
    renderPreviewThumbnails = true,
    onProgress,
  } = options;

  const total = dataset.length;
  const results: GeneratedLabel[] = [];

  for (let i = 0; i < total; i += batchSize) {
    const chunk = dataset.slice(i, i + batchSize);

    await new Promise<void>((resolve) => {
      setTimeout(async () => {
        for (let j = 0; j < chunk.length; j++) {
          const rowIndex = i + j;
          const dataRow = chunk[j];

          let previewDataUrl: string | undefined = undefined;

          // Only render image preview for initial batch or when preview thumbnails enabled
          if (renderPreviewThumbnails && (rowIndex < 50 || total <= 200)) {
            try {
              const canvas = await renderLabelToCanvas(template, dataRow, 150); // lighter 150 DPI preview
              previewDataUrl = canvas.toDataURL('image/png');
            } catch (e) {
              console.warn('Failed preview render for row', rowIndex, e);
            }
          }

          results.push({
            id: `label_${rowIndex}_${Date.now()}`,
            rowIndex,
            data: dataRow,
            selected: true,
            status: 'rendered',
            previewDataUrl,
          });
        }

        if (onProgress) {
          onProgress(Math.min(i + batchSize, total), total);
        }

        resolve();
      }, 0);
    });
  }

  return results;
}
