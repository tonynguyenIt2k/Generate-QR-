import { saveAs } from 'file-saver';
import { LabelTemplate, DatasetRow } from '../types/label';
import { saveAllTemplates, getAllTemplates } from './templateStorage';

export interface AppBackupData {
  app: string;
  version: string;
  exportedAt: string;
  currentTemplate?: LabelTemplate;
  allTemplates?: LabelTemplate[];
  dataset?: DatasetRow[];
  settings?: {
    darkMode?: boolean;
    customWidthMm?: number;
    customHeightMm?: number;
    activePresetId?: string;
  };
}

/**
 * Download a full backup JSON file containing templates, current configuration, and dataset.
 */
export function exportFullBackupJson(
  currentTemplate: LabelTemplate,
  allTemplates: LabelTemplate[],
  dataset: DatasetRow[],
  settings?: AppBackupData['settings']
): void {
  const templatesToBackup = allTemplates && allTemplates.length ? allTemplates : getAllTemplates();
  const backupObj: AppBackupData = {
    app: 'QR Label Pro',
    version: '2.5',
    exportedAt: new Date().toISOString(),
    currentTemplate,
    allTemplates: templatesToBackup,
    dataset,
    settings,
  };

  const jsonStr = JSON.stringify(backupObj, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const dateStr = new Date().toISOString().slice(0, 10);
  const safeName = (currentTemplate?.name || 'Mau_Tem').replace(/[^a-zA-Z0-9_\-]/g, '_');
  saveAs(blob, `QR_Label_Pro_Backup_${safeName}_${dateStr}.json`);
}

/**
 * Import a full backup JSON file and parse its content.
 */
export function importFullBackupJson(file: File): Promise<AppBackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text) as AppBackupData;
        if (!parsed) {
          throw new Error('File JSON rỗng hoặc không hợp lệ.');
        }

        // Validate structure (support both full app backup or single template export)
        if (!parsed.currentTemplate && !parsed.allTemplates && !parsed.dataset) {
          // Check if it's a single LabelTemplate JSON format
          if ((parsed as any).name && Array.isArray((parsed as any).elements)) {
            const singleTemplate = parsed as unknown as LabelTemplate;
            resolve({
              app: 'QR Label Pro',
              version: '2.5',
              exportedAt: new Date().toISOString(),
              currentTemplate: singleTemplate,
              allTemplates: [singleTemplate],
              dataset: [],
            });
            return;
          }
          throw new Error('File JSON không chứa cấu hình mẫu tem hoặc dữ liệu dự phòng.');
        }

        if (parsed.allTemplates && Array.isArray(parsed.allTemplates) && parsed.allTemplates.length > 0) {
          saveAllTemplates(parsed.allTemplates);
        }

        resolve(parsed);
      } catch (err: any) {
        reject(err?.message || 'Lỗi đọc file JSON dự phòng.');
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}
