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
  const isDual = template.isDualPart || template.id.includes('dual');

  if (isDual) {
    // Process dataset in pairs of 2 rows (i = 0, 2, 4...) -> Top = Odd (row i), Bottom = Even (row i+1)
    const step = batchSize * 2;
    for (let i = 0; i < total; i += step) {
      const chunkCount = Math.min(step, total - i);

      await new Promise<void>((resolve) => {
        setTimeout(async () => {
          for (let j = 0; j < chunkCount; j += 2) {
            const oddIndex = i + j;
            const evenIndex = oddIndex + 1;

            const rowOdd = dataset[oddIndex];
            const rowEven = evenIndex < total ? dataset[evenIndex] : {};

            const pairedData = {
              ...rowOdd,
              _oddRow: rowOdd,
              _evenRow: rowEven,
              _oddIndex: oddIndex + 1,
              _evenIndex: evenIndex < total ? evenIndex + 1 : null,
            };

            let previewDataUrl: string | undefined = undefined;
            if (renderPreviewThumbnails && (results.length < 50 || total <= 200)) {
              try {
                const canvas = await renderLabelToCanvas(template, pairedData, 150);
                previewDataUrl = canvas.toDataURL('image/png');
              } catch (e) {
                console.warn('Failed preview render for dual row pair', oddIndex, e);
              }
            }

            results.push({
              id: `label_dual_${oddIndex}_${Date.now()}`,
              rowIndex: Math.floor(oddIndex / 2),
              data: pairedData,
              selected: true,
              status: 'rendered',
              previewDataUrl,
            });
          }

          if (onProgress) {
            onProgress(Math.min(i + chunkCount, total), total);
          }

          resolve();
        }, 0);
      });
    }
  } else {
    for (let i = 0; i < total; i += batchSize) {
      const chunk = dataset.slice(i, i + batchSize);

      await new Promise<void>((resolve) => {
        setTimeout(async () => {
          for (let j = 0; j < chunk.length; j++) {
            const rowIndex = i + j;
            const dataRow = chunk[j];

            let previewDataUrl: string | undefined = undefined;

            if (renderPreviewThumbnails && (rowIndex < 50 || total <= 200)) {
              try {
                const canvas = await renderLabelToCanvas(template, dataRow, 150);
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
  }

  return results;
}
