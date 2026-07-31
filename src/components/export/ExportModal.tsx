import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  FileArchive,
  Image,
  RefreshCw,
  FileCode,
  Upload,
  CheckCircle2,
  ShieldCheck,
  HardDriveDownload,
} from 'lucide-react';
import { GeneratedLabel, LabelTemplate, DatasetRow } from '../../types/label';
import { renderLabelToCanvas } from '../../utils/pdfExporter';
import { exportLabelsToZip } from '../../utils/zipExporter';
import { exportFullBackupJson, importFullBackupJson, AppBackupData } from '../../utils/backupStorage';
import { saveAs } from 'file-saver';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: LabelTemplate;
  allTemplates?: LabelTemplate[];
  dataset?: DatasetRow[];
  generatedLabels: GeneratedLabel[];
  sampleDataRow: Record<string, any>;
  onRestoreBackup?: (backup: AppBackupData) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  template,
  allTemplates = [],
  dataset = [],
  generatedLabels,
  sampleDataRow,
  onRestoreBackup,
}) => {
  const [exportingZip, setExportingZip] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleExportSinglePng = async () => {
    try {
      const canvas = await renderLabelToCanvas(template, sampleDataRow, 300);
      const dataUrl = canvas.toDataURL('image/png');
      saveAs(dataUrl, `Tem_${template.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`);
    } catch (e) {
      alert('Lỗi xuất PNG: ' + String(e));
    }
  };

  const handleExportZip = async () => {
    if (!generatedLabels.length) {
      alert('Vui lòng nhập danh sách Excel trước khi xuất file ZIP!');
      return;
    }
    setExportingZip(true);
    try {
      await exportLabelsToZip(template, generatedLabels, `Danh_Sach_Tem_QR_${Date.now()}.zip`, (curr, tot) => {
        setProgress({ current: curr, total: tot });
      });
    } catch (e) {
      alert('Lỗi xuất file ZIP: ' + String(e));
    } finally {
      setExportingZip(false);
    }
  };

  const handleExportBackup = () => {
    try {
      exportFullBackupJson(template, allTemplates, dataset);
      setBackupNotice('Đã xuất file backup JSON thành công!');
      setTimeout(() => setBackupNotice(null), 4000);
    } catch (e) {
      alert('Lỗi xuất dữ liệu dự phòng: ' + String(e));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const backup = await importFullBackupJson(file);
      if (onRestoreBackup) {
        onRestoreBackup(backup);
        setBackupNotice('Đã khôi phục dữ liệu dự phòng thành công!');
        setTimeout(() => {
          setBackupNotice(null);
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      alert('Lỗi khôi phục từ file backup JSON: ' + String(err));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Download className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <h2 className="text-xs sm:text-base font-bold text-slate-800 dark:text-slate-100 truncate">
              Xuất File Hình Ảnh / ZIP & Backup Dự Phòng
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Options */}
        <div className="p-5 sm:p-6 text-xs space-y-4 overflow-y-auto">
          {/* Option 1: Full JSON Backup Export */}
          <button
            onClick={handleExportBackup}
            className="w-full p-4 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900/80 bg-indigo-50/70 dark:bg-indigo-950/40 hover:border-indigo-500 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/50 flex items-center gap-3 transition-all cursor-pointer text-left shadow-xs"
          >
            <div className="p-3 rounded-xl bg-indigo-600 text-white shrink-0 shadow-md shadow-indigo-500/20">
              <HardDriveDownload className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-indigo-950 dark:text-indigo-100">
                  Xuất Dữ Liệu Dự Phòng (.JSON)
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-full">
                  Khuyên Dùng
                </span>
              </div>
              <p className="text-indigo-900/70 dark:text-indigo-300/80 mt-0.5 leading-relaxed">
                Tải xuống file JSON chứa toàn bộ mẫu tem ({allTemplates.length} mẫu), các phần tử và bộ dữ liệu Excel ({dataset.length} dòng) để sao lưu an toàn.
              </p>
            </div>
          </button>

          {/* Option 2: Single PNG Export */}
          <button
            onClick={handleExportSinglePng}
            className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 flex items-center gap-3 transition-all cursor-pointer text-left"
          >
            <div className="p-3 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 shrink-0">
              <Image className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Xuất 1 Tem Mẫu Này Dạng PNG (300 DPI)
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Tải ảnh PNG sắc nét của mẫu tem hiện tại trên canvas.
              </p>
            </div>
          </button>

          {/* Option 3: Bulk ZIP Export */}
          <button
            onClick={handleExportZip}
            disabled={exportingZip || !generatedLabels.length}
            className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 flex items-center gap-3 transition-all cursor-pointer text-left disabled:opacity-50"
          >
            <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200 shrink-0">
              <FileArchive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Tải Xuống File ZIP Chứa Toàn Bộ Ảnh QR ({generatedLabels.length} tem)
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Nén tất cả mã QR tem đã sinh ra từ danh sách Excel thành 1 file ZIP.
              </p>
            </div>
          </button>

          {/* Option 4: Restore Backup JSON */}
          {onRestoreBackup && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-3.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 flex items-center justify-center gap-2 transition-all cursor-pointer text-slate-700 dark:text-slate-300 font-semibold"
              >
                <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Phục Hồi Dữ Liệu Từ File Backup (.JSON)</span>
              </button>
            </div>
          )}

          {backupNotice && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-bold animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{backupNotice}</span>
            </div>
          )}

          {exportingZip && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-200">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                  Đang nén file ZIP...
                </span>
                <span>
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="w-full h-2 bg-emerald-200 dark:bg-emerald-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-200"
                  style={{
                    width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Tự động mã hóa an toàn</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-xl cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
