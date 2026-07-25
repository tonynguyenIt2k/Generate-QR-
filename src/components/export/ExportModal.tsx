import React, { useState } from 'react';
import { X, Download, FileArchive, Image, FileText, RefreshCw, CheckCircle2 } from 'lucide-react';
import { GeneratedLabel, LabelTemplate } from '../../types/label';
import { renderLabelToCanvas } from '../../utils/pdfExporter';
import { exportLabelsToZip } from '../../utils/zipExporter';
import { saveAs } from 'file-saver';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: LabelTemplate;
  generatedLabels: GeneratedLabel[];
  sampleDataRow: Record<string, any>;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  template,
  generatedLabels,
  sampleDataRow,
}) => {
  const [exportingZip, setExportingZip] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

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

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Download className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <h2 className="text-xs sm:text-base font-bold text-slate-800 dark:text-slate-100 truncate">
              Xuất File Hình Ảnh / ZIP Hàng Loạt
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
        <div className="p-6 text-xs space-y-4">
          <button
            onClick={handleExportSinglePng}
            className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 flex items-center gap-3 transition-all cursor-pointer text-left"
          >
            <div className="p-3 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 shrink-0">
              <Image className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Xuất 1 Tem Mẫu Này Dạng PNG
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Tải ảnh PNG siêu nét 300 DPI của mẫu tem hiện tại trên canvas.
              </p>
            </div>
          </button>

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
                Nén tất cả mã QR tem đã sinh ra từ file Excel thành 1 file ZIP nén gọn nhẹ.
              </p>
            </div>
          </button>

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
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
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
