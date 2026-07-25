import React, { useState } from 'react';
import {
  Grid2X2,
  Search,
  CheckSquare,
  Square,
  Trash2,
  Printer,
  Download,
  RefreshCw,
  Plus,
  FileSpreadsheet,
  QrCode,
} from 'lucide-react';
import { GeneratedLabel, LabelTemplate } from '../../types/label';
import { renderLabelToCanvas } from '../../utils/pdfExporter';

interface GalleryViewProps {
  template: LabelTemplate;
  generatedLabels: GeneratedLabel[];
  onSetGeneratedLabels: React.Dispatch<React.SetStateAction<GeneratedLabel[]>>;
  onOpenPrintModal: () => void;
  onOpenExportModal: () => void;
  onOpenImportModal: () => void;
  isGenerating: boolean;
}

export const GalleryView: React.FC<GalleryViewProps> = ({
  template,
  generatedLabels,
  onSetGeneratedLabels,
  onOpenPrintModal,
  onOpenExportModal,
  onOpenImportModal,
  isGenerating,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 24;

  const filtered = generatedLabels.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return Object.values(item.data).some((val) =>
      String(val || '').toLowerCase().includes(term)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSelectAll = () => {
    const allSelected = generatedLabels.every((l) => l.selected);
    onSetGeneratedLabels((prev) =>
      prev.map((l) => ({ ...l, selected: !allSelected }))
    );
  };

  const toggleItemSelect = (id: string) => {
    onSetGeneratedLabels((prev) =>
      prev.map((l) => (l.id === id ? { ...l, selected: !l.selected } : l))
    );
  };

  const deleteSelected = () => {
    if (confirm('Bạn có chắc muốn xóa các tem đã chọn?')) {
      onSetGeneratedLabels((prev) => prev.filter((l) => !l.selected));
    }
  };

  const selectedCount = generatedLabels.filter((l) => l.selected).length;

  const refreshSinglePreview = async (id: string) => {
    const item = generatedLabels.find((l) => l.id === id);
    if (!item) return;

    try {
      const canvas = await renderLabelToCanvas(template, item.data, 150);
      const dataUrl = canvas.toDataURL('image/png');
      onSetGeneratedLabels((prev) =>
        prev.map((l) => (l.id === id ? { ...l, previewDataUrl: dataUrl } : l))
      );
    } catch (e) {
      console.error(e);
    }
  };

  if (!generatedLabels.length) {
    return (
      <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-8 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center mb-4">
          <FileSpreadsheet className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          Chưa Có Dữ Liệu Tem Hàng Loạt
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6 leading-relaxed">
          Hãy tải file Excel danh sách điện thoại / sản phẩm để hệ thống tự động sinh ra hàng nghìn mẫu tem khác nhau!
        </p>
        <button
          onClick={onOpenImportModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tải File Excel Ngay</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-100 dark:bg-slate-950 flex flex-col overflow-hidden">
      {/* Top Controls Bar */}
      <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
          {/* Search bar */}
          <div className="relative w-40 sm:w-60 min-w-[140px] shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 shrink-0" />
            <input
              type="text"
              placeholder="Tìm IMEI, Model, Mã..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
          >
            {generatedLabels.every((l) => l.selected) ? (
              <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
            ) : (
              <Square className="w-4 h-4 text-slate-400 shrink-0" />
            )}
            <span className="whitespace-nowrap">Chọn Tất Cả ({generatedLabels.length})</span>
          </button>

          {selectedCount > 0 && (
            <button
              onClick={deleteSelected}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl font-semibold cursor-pointer whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">Xóa Đã Chọn ({selectedCount})</span>
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenExportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Tải File ZIP</span>
          </button>

          <button
            onClick={onOpenPrintModal}
            disabled={selectedCount === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">In Tem Đã Chọn ({selectedCount})</span>
          </button>
        </div>
      </div>

      {/* Main Grid Gallery */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {currentPageItems.map((item) => (
            <div
              key={item.id}
              onClick={() => toggleItemSelect(item.id)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                item.selected
                  ? 'bg-white dark:bg-slate-900 border-blue-500 ring-2 ring-blue-500/30 shadow-md'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
              }`}
            >
              {/* Checkbox indicator */}
              <div className="absolute top-2 right-2 z-10">
                {item.selected ? (
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
              </div>

              {/* Label Image Preview */}
              <div className="aspect-[4/3] bg-white rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1 overflow-hidden mb-2 shadow-xs">
                {item.previewDataUrl ? (
                  <img
                    src={item.previewDataUrl}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      refreshSinglePreview(item.id);
                    }}
                    className="flex flex-col items-center justify-center text-[10px] text-slate-400 hover:text-blue-600"
                  >
                    <RefreshCw className="w-4 h-4 mb-1" />
                    <span>Xem Tem</span>
                  </button>
                )}
              </div>

              {/* Text Meta Info */}
              <div className="text-[11px] font-mono leading-tight space-y-0.5 text-slate-800 dark:text-slate-200">
                <p className="font-bold truncate text-slate-900 dark:text-slate-100">
                  {String(item.data['Model'] || item.data['MaMay'] || `Tem #${item.rowIndex + 1}`)}
                </p>
                {item.data['IMEI'] && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    IMEI: {String(item.data['IMEI'])}
                  </p>
                )}
                {item.data['Gia'] && (
                  <p className="text-[10px] font-bold text-red-600">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                      Number(item.data['Gia'])
                    )}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs px-6">
          <span className="text-slate-500">
            Trang {page} / {totalPages} (Tổng {filtered.length} tem)
          </span>

          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 bg-slate-100 dark:bg-slate-800 disabled:opacity-40 rounded-lg font-semibold"
            >
              Trang Trước
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 bg-slate-100 dark:bg-slate-800 disabled:opacity-40 rounded-lg font-semibold"
            >
              Trang Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
