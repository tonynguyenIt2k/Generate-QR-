import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Printer,
  Download,
  FileCheck,
  Settings2,
  RefreshCw,
  Eye,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Grid,
  Square,
  CheckSquare,
  Maximize2,
  Sliders,
  Save,
  Zap,
} from 'lucide-react';
import { GeneratedLabel, LabelTemplate, PrintSettings } from '../../types/label';
import { exportBatchPdf, renderLabelToCanvas } from '../../utils/pdfExporter';
import { ToastNotification, ToastState } from '../common/CustomAlert';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: LabelTemplate;
  generatedLabels: GeneratedLabel[];
  sampleDataRow?: Record<string, any>;
  autoPrintTrigger?: boolean;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  template,
  generatedLabels,
  sampleDataRow = {},
  autoPrintTrigger = false,
}) => {
  const [printSettings, setPrintSettings] = useState<PrintSettings>(() => {
    try {
      const saved = localStorage.getItem('saved_print_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          widthMm: template.widthMm,
          heightMm: template.heightMm,
        };
      }
    } catch (e) {
      console.warn('Failed to parse saved print settings', e);
    }
    return {
      presetId: 'custom',
      widthMm: template.widthMm,
      heightMm: template.heightMm,
      dpi: 203, // standard thermal printer resolution
      marginTopMm: 0,
      marginBottomMm: 0,
      marginLeftMm: 0,
      marginRightMm: 0,
      gapMm: 2,
      labelsPerRow: template.widthMm <= 40 ? 2 : 1,
      copiesPerItem: 1,
    };
  });

  // Sync printSettings dimensions when template changes
  useEffect(() => {
    setPrintSettings((prev) => ({
      ...prev,
      widthMm: template.widthMm,
      heightMm: template.heightMm,
      labelsPerRow: template.widthMm <= 40 ? 2 : prev.labelsPerRow,
    }));
  }, [template.widthMm, template.heightMm]);

  const [exportingPdf, setExportingPdf] = useState(false);
  const [isPrintingDirect, setIsPrintingDirect] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [activeTab, setActiveTab] = useState<'preview' | 'settings'>('preview');

  // Preview State
  const [previewZoom, setPreviewZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'roll' | 'single'>('roll');
  const [renderedThumbnails, setRenderedThumbnails] = useState<Record<string, string>>({});
  const [isRenderingPreviews, setIsRenderingPreviews] = useState(false);

  // Toast Notification State
  const [toastState, setToastState] = useState<ToastState>({
    isOpen: false,
    title: '',
  });

  const showToast = (title: string, message?: string, type: ToastState['type'] = 'success') => {
    setToastState({ isOpen: true, title, message, type });
    setTimeout(() => {
      setToastState((prev) => ({ ...prev, isOpen: false }));
    }, 3500);
  };

  // Save Printer Configuration
  const handleSavePrinterSettings = () => {
    try {
      localStorage.setItem('saved_print_settings', JSON.stringify(printSettings));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
    showToast(
      'Đã lưu cấu hình máy in',
      `Đã lưu độ phân giải ${printSettings.dpi} DPI, ${printSettings.labelsPerRow} cột tem/hàng và ${printSettings.copiesPerItem} bản in/mã làm mặc định.`,
      'success'
    );
  };

  // Normalize labels: If generatedLabels is empty, create 1 preview item from sampleDataRow
  const labelItems = useMemo(() => {
    if (generatedLabels.length > 0) {
      return generatedLabels;
    }
    return [
      {
        id: 'sample-0',
        data: sampleDataRow,
        selected: true,
      },
    ];
  }, [generatedLabels, sampleDataRow]);

  const activeLabels = useMemo(() => {
    return labelItems.filter((l) => l.selected !== false);
  }, [labelItems]);

  // Compute flattened printable items considering copies
  const printableList = useMemo(() => {
    const list: Array<{ labelId: string; data: Record<string, any>; copyIndex: number; totalCopies: number }> = [];
    const copies = Math.max(1, printSettings.copiesPerItem || 1);
    
    activeLabels.forEach((item) => {
      for (let c = 0; c < copies; c++) {
        list.push({
          labelId: item.id,
          data: item.data,
          copyIndex: c + 1,
          totalCopies: copies,
        });
      }
    });
    return list;
  }, [activeLabels, printSettings.copiesPerItem]);

  // Pagination for Preview (e.g. 12 items per page or based on row config)
  const labelsPerPage = useMemo(() => {
    return printSettings.labelsPerRow * 6; // 6 rows per page view
  }, [printSettings.labelsPerRow]);

  const totalPages = Math.max(1, Math.ceil(printableList.length / labelsPerPage));

  // Render preview thumbnails when template, activeLabels change
  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;
    setIsRenderingPreviews(true);

    async function loadPreviews() {
      const newCache: Record<string, string> = {};
      const limit = Math.min(activeLabels.length, 12); // render first 12 unique items fast

      for (let i = 0; i < limit; i++) {
        const item = activeLabels[i];
        if (!item) continue;
        if (item.previewUrl) {
          newCache[item.id] = item.previewUrl;
        } else {
          try {
            const canvas = await renderLabelToCanvas(template, item.data, 150);
            newCache[item.id] = canvas.toDataURL('image/png');
          } catch (e) {
            console.error('Error rendering preview thumbnail', e);
          }
        }
      }

      if (isSubscribed) {
        setRenderedThumbnails(newCache);
        setIsRenderingPreviews(false);
      }
    }

    loadPreviews();

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, template, activeLabels]);

  const handleDownloadPdf = async () => {
    setExportingPdf(true);
    try {
      const pdf = await exportBatchPdf(template, activeLabels, printSettings, (curr, tot) => {
        setProgress({ current: curr, total: tot });
      });
      pdf.save(`In_Tem_${template.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`);
    } catch (err) {
      alert('Lỗi xuất PDF: ' + String(err));
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDirectBrowserPrint = async () => {
    if (activeLabels.length === 0) {
      showToast('Cảnh báo', 'Không có tem nào được chọn để in!', 'warning');
      return;
    }

    // Synchronously open window inside click event gesture to prevent browser popup block
    const printWin = window.open('about:blank', '_blank');
    if (printWin) {
      try {
        printWin.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <title>Đang tạo trang in - ${template.name}</title>
              <style>
                body {
                  font-family: system-ui, -apple-system, sans-serif;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  background: #0f172a;
                  color: #f8fafc;
                }
                .spinner {
                  width: 44px;
                  height: 44px;
                  border: 4px solid #334155;
                  border-top-color: #3b82f6;
                  border-radius: 50%;
                  animation: spin 0.8s linear infinite;
                  margin-bottom: 16px;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                .title { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
                .subtitle { font-size: 13px; color: #94a3b8; }
              </style>
            </head>
            <body>
              <div class="spinner"></div>
              <div class="title">Đang xử lý bản in cho máy in nhiệt...</div>
              <div class="subtitle">Cửa sổ in của hệ thống sẽ tự động bật lên ngay sau đây.</div>
            </body>
          </html>
        `);
        printWin.document.close();
      } catch (e) {
        console.error(e);
      }
    }

    setIsPrintingDirect(true);
    showToast('Đang tạo bản in...', 'Hệ thống đang chuẩn bị dữ liệu máy in nhiệt...', 'info');

    try {
      const images: string[] = [];
      const dpi = printSettings.dpi || 203;

      for (const item of activeLabels) {
        let url = renderedThumbnails[item.id];
        if (!url) {
          const canvas = await renderLabelToCanvas(template, item.data, dpi);
          url = canvas.toDataURL('image/png');
        }
        const copies = Math.max(1, printSettings.copiesPerItem || 1);
        for (let c = 0; c < copies; c++) {
          images.push(url);
        }
      }

      if (images.length === 0) {
        if (printWin && !printWin.closed) printWin.close();
        showToast('Lỗi', 'Không thể tạo hình ảnh tem nhãn!', 'error');
        return;
      }

      const cols = Math.max(1, printSettings.labelsPerRow || 1);
      const gap = printSettings.gapMm || 2;
      const labelW = template.widthMm;
      const labelH = template.heightMm;
      const totalRowW = labelW * cols + gap * (cols - 1);

      const rows: string[][] = [];
      for (let i = 0; i < images.length; i += cols) {
        rows.push(images.slice(i, i + cols));
      }

      const rowsHtml = rows
        .map(
          (rowImgs) => `
          <div class="thermal-row">
            ${rowImgs.map((src) => `<img src="${src}" class="thermal-img" />`).join('')}
          </div>
        `
        )
        .join('');

      const widthInInches = (totalRowW / 25.4).toFixed(2);
      const heightInInches = (labelH / 25.4).toFixed(2);

      const fullHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>In Tem Nhãn - ${template.name}</title>
            <style>
              *, *:before, *:after { box-sizing: border-box; }
              
              @media print {
                @page {
                  size: ${widthInInches}in ${heightInInches}in;
                  margin: 0mm !important;
                }
                html, body {
                  margin: 0 !important;
                  padding: 0 !important;
                  background: #ffffff !important;
                  width: ${totalRowW}mm !important;
                  height: ${labelH}mm !important;
                }
                .print-action-bar {
                  display: none !important;
                }
                .thermal-row {
                  width: ${totalRowW}mm !important;
                  height: ${labelH}mm !important;
                  page-break-after: always !important;
                  page-break-inside: avoid !important;
                  break-after: page !important;
                  display: flex !important;
                  align-items: center !important;
                  justify-content: flex-start !important;
                  gap: ${gap}mm !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  overflow: hidden !important;
                }
                .thermal-img {
                  width: ${labelW}mm !important;
                  height: ${labelH}mm !important;
                  object-fit: contain !important;
                  display: block !important;
                }
              }

              @media screen {
                html, body {
                  width: 100% !important;
                  height: auto !important;
                  min-height: 100vh !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: #0f172a !important;
                  color: #f8fafc !important;
                  font-family: system-ui, -apple-system, sans-serif !important;
                }
                body {
                  display: flex !important;
                  flex-direction: column !important;
                  align-items: center !important;
                  padding: 24px 16px !important;
                }
                .print-action-bar {
                  background: #1e293b;
                  border: 1px solid #334155;
                  padding: 12px 20px;
                  border-radius: 12px;
                  margin-bottom: 24px;
                  display: flex;
                  align-items: center;
                  gap: 16px;
                  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
                  max-width: 600px;
                  width: 100%;
                  justify-content: space-between;
                }
                .print-btn {
                  background: #2563eb;
                  color: #ffffff;
                  font-weight: 700;
                  padding: 8px 18px;
                  border-radius: 8px;
                  border: none;
                  cursor: pointer;
                  font-size: 13px;
                  white-space: nowrap;
                  transition: background 0.2s;
                }
                .print-btn:hover {
                  background: #1d4ed8;
                }
                .thermal-row {
                  width: ${totalRowW}mm !important;
                  height: ${labelH}mm !important;
                  background: #ffffff !important;
                  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);
                  border-radius: 4px;
                  margin-bottom: 16px;
                  display: flex !important;
                  align-items: center !important;
                  justify-content: flex-start !important;
                  gap: ${gap}mm !important;
                  overflow: hidden !important;
                  flex-shrink: 0 !important;
                }
                .thermal-img {
                  width: ${labelW}mm !important;
                  height: ${labelH}mm !important;
                  object-fit: contain !important;
                  display: block !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="print-action-bar">
              <div>
                <strong style="font-size:14px; color:#ffffff;">Xem Trước Tem In Nhiệt</strong>
                <div style="font-size:12px; color:#94a3b8; margin-top:2px;">
                  Mẫu: ${template.name} (${totalRowW}mm x ${labelH}mm)
                </div>
              </div>
              <button class="print-btn" onclick="window.print()">🖨️ In Ngay (Ctrl+P)</button>
            </div>
            ${rowsHtml}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.focus();
                  window.print();
                }, 350);
              };
            </script>
          </body>
        </html>
      `;

      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);

      if (printWin && !printWin.closed) {
        printWin.location.href = blobUrl;
        showToast('Thành công', 'Đã mở trang in ở tab mới! Cửa sổ in hệ thống đang bật lên.', 'success');
      } else {
        // Fallback: append iframe or local area + PDF download
        let printArea = document.getElementById('printable-thermal-area');
        if (printArea) printArea.remove();

        printArea = document.createElement('div');
        printArea.id = 'printable-thermal-area';
        printArea.innerHTML = `
          <style id="thermal-print-style">
            @media print {
              @page { size: ${totalRowW}mm ${labelH}mm; margin: 0mm !important; }
              html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
              body > *:not(#printable-thermal-area) { display: none !important; }
              #printable-thermal-area { display: block !important; position: absolute; top:0; left:0; width: ${totalRowW}mm; }
              .thermal-print-row { width: ${totalRowW}mm; height: ${labelH}mm; page-break-after: always; display: flex; gap: ${gap}mm; }
              .thermal-print-img { width: ${labelW}mm; height: ${labelH}mm; object-fit: contain; }
            }
            @media screen { #printable-thermal-area { display: none !important; } }
          </style>
          <div>
            ${rows.map((r) => `<div class="thermal-print-row">${r.map((src) => `<img src="${src}" class="thermal-print-img" />`).join('')}</div>`).join('')}
          </div>
        `;
        document.body.appendChild(printArea);

        const pdf = await exportBatchPdf(template, activeLabels, printSettings);
        pdf.save(`TemInNhiet_${template.name.replace(/\s+/g, '_')}.pdf`);
        showToast('Trình duyệt chặn Popup', 'Hệ thống đã tự động xuất PDF in nhiệt cho bạn!', 'warning');
      }
    } catch (err) {
      console.error('Lỗi khi in trực tiếp:', err);
      showToast('Lỗi in ấn', String(err), 'error');
    } finally {
      setIsPrintingDirect(false);
    }
  };

  // Auto-trigger direct print if opened with autoPrintTrigger = true
  useEffect(() => {
    if (isOpen && autoPrintTrigger) {
      const timer = setTimeout(() => {
        handleDirectBrowserPrint();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrintTrigger]);

  if (!isOpen) return null;

  // Slice list for current page preview
  const startIndex = (currentPage - 1) * labelsPerPage;
  const currentPreviewList = printableList.slice(startIndex, startIndex + labelsPerPage);

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col h-[92vh]">
        {/* Top Header */}
        <div className="px-3 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 gap-2 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20 shrink-0">
              <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                Cấu Hình & Xem Trước Khi In
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                Mẫu: <span className="font-semibold text-slate-800 dark:text-slate-200">{template.name}</span> ({template.widthMm}x{template.heightMm}mm) — <span className="font-bold text-blue-600">{printableList.length}</span> tem
              </p>
            </div>
          </div>

          {/* Mobile Tab Switcher */}
          <div className="flex md:hidden items-center bg-slate-200 dark:bg-slate-700 p-1 rounded-xl text-xs font-semibold shrink-0">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'preview'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Xem Trước
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Cài Đặt
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 cursor-pointer shrink-0"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left Panel: Settings Controls */}
          <div
            className={`w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 p-4 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-900/40 text-xs ${
              activeTab === 'settings' ? 'block' : 'hidden md:block'
            }`}
          >
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider pb-1 border-b border-slate-200 dark:border-slate-800">
              <Sliders className="w-4 h-4 text-blue-600" />
              <span>Cấu Hình Máy In Nhiệt</span>
            </div>

            {/* DPI Preset */}
            <div>
              <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                Độ Phân Giải Máy In (DPI)
              </label>
              <select
                value={printSettings.dpi}
                onChange={(e) =>
                  setPrintSettings({ ...printSettings, dpi: parseInt(e.target.value) })
                }
                className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value={203}>203 DPI (XPrinter, Rongta, Gprinter tiêu chuẩn)</option>
                <option value={300}>300 DPI (Zebra, TSC, Godex nét cao)</option>
                <option value={600}>600 DPI (Brother, Honeywell siêu nét)</option>
              </select>
            </div>

            {/* Copies */}
            <div>
              <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                Số Bản Sao Cho Mỗi Mã (Copies/Item)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={printSettings.copiesPerItem}
                  onChange={(e) =>
                    setPrintSettings({
                      ...printSettings,
                      copiesPerItem: Math.max(1, parseInt(e.target.value) || 1),
                    })
                  }
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-center text-sm"
                />
                <span className="text-slate-500 text-xs font-medium whitespace-nowrap">bản / mã</span>
              </div>
            </div>

            {/* Columns (Labels per row) */}
            <div>
              <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                Số Cột Tem Trên 1 Hàng (Columns)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((cols) => (
                  <button
                    key={cols}
                    type="button"
                    onClick={() => setPrintSettings({ ...printSettings, labelsPerRow: cols })}
                    className={`py-2 px-3 border rounded-xl font-bold transition-all cursor-pointer text-center ${
                      printSettings.labelsPerRow === cols
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cols} Tem/Hàng
                  </button>
                ))}
              </div>
            </div>

            {/* Gap Between Labels */}
            <div>
              <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                Khoảng Cách Giữa Các Tem (Gap mm)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="20"
                  value={printSettings.gapMm}
                  onChange={(e) =>
                    setPrintSettings({ ...printSettings, gapMm: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                />
                <span className="text-slate-500 text-xs">mm</span>
              </div>
            </div>

            {/* Summary Box */}
            <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-bold">
                <FileCheck className="w-4 h-4 text-blue-600" />
                <span>Thống Kê Bản In</span>
              </div>
              <div className="text-slate-600 dark:text-slate-300 space-y-1 text-[11px]">
                <p>• Kích thước tem: <b className="text-slate-900 dark:text-slate-100">{template.widthMm} x {template.heightMm} mm</b></p>
                <p>• Mã tem khác nhau: <b className="text-blue-600 dark:text-blue-400">{activeLabels.length}</b></p>
                <p>• Tổng tem sẽ in: <b className="text-emerald-600 dark:text-emerald-400 text-sm font-extrabold">{printableList.length}</b> tem</p>
              </div>
            </div>

            {/* Thermal Printer Config Advice Box */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-[11px] space-y-2 text-amber-900 dark:text-amber-200">
              <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300 text-[12px]">
                <span className="text-sm">📌</span>
                <span>Mẹo Cố Định Khổ Tem "USER (3.17 x 1.18 in)" Vĩnh Viễn Trên Windows</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-[10.5px] leading-relaxed text-amber-900/90 dark:text-amber-200/90">
                <li>
                  <b>Để không bị nhảy về 4x6 inch:</b> Vào <b>Control Panel</b> → <b>Devices and Printers</b> → Click chuột phải vào <b>Máy In Nhiệt</b> → Chọn <b>Printer Properties</b> → Tab <b>Advanced</b> → Bấm <b>Printing Defaults...</b>
                </li>
                <li>
                  Tại ô <b>Stock Name</b>: Chọn chính xác <b>USER (3.17 in x 1.18 in)</b> hoặc <b>intem</b> rồi bấm <b>Apply → OK</b>. Từ sau Windows sẽ mặc định luôn khổ này.
                </li>
                <li>
                  <b>Lề trình duyệt (Margins):</b> Chọn <b>Margins = None (Không lề)</b>, <b>Scale = 100%</b> trong Chrome/Edge.
                </li>
              </ul>
            </div>

            {/* Actions in Left Panel for quick access */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleSavePrinterSettings}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
              >
                <Save className="w-4 h-4" />
                <span>Lưu Cấu Hình Mặc Định</span>
              </button>

              <button
                onClick={handleDirectBrowserPrint}
                disabled={isPrintingDirect || printableList.length === 0}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs ring-2 ring-blue-400/40 active:scale-95"
              >
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300 animate-bounce" />
                <span>{isPrintingDirect ? 'Đang gửi bản in...' : 'IN NGAY TRỰC TIẾP (1-CLICK)'}</span>
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={exportingPdf || printableList.length === 0}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
              >
                <Download className="w-4 h-4" />
                <span>Xuất PDF Cho Máy In Nhiệt</span>
              </button>
            </div>
          </div>

          {/* Right Panel: Live Print Preview Canvas */}
          <div
            className={`flex-1 bg-slate-100 dark:bg-slate-950 flex flex-col overflow-hidden ${
              activeTab === 'preview' ? 'block' : 'hidden md:flex'
            }`}
          >
            {/* Toolbar for Preview */}
            <div className="px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span>Xem Trước Bản In Live</span>
                </span>
                {isRenderingPreviews && (
                  <span className="flex items-center gap-1 text-[11px] text-blue-600 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Đang tạo ảnh tem...
                  </span>
                )}
              </div>

              {/* View Mode & Zoom & Pagination */}
              <div className="flex items-center gap-3">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setViewMode('roll')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                      viewMode === 'roll'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs'
                        : 'text-slate-500'
                    }`}
                    title="Xem cuộn giấy in"
                  >
                    <Grid className="w-3.5 h-3.5" />
                    <span>Cuộn In</span>
                  </button>
                  <button
                    onClick={() => setViewMode('single')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                      viewMode === 'single'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs'
                        : 'text-slate-500'
                    }`}
                    title="Xem chi tiết từng tem"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Từng Tem</span>
                  </button>
                </div>

                {/* Zoom controls */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setPreviewZoom((z) => Math.max(0.4, z - 0.2))}
                    className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md cursor-pointer"
                    title="Thu nhỏ"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-bold w-12 text-center text-slate-700 dark:text-slate-300">
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <button
                    onClick={() => setPreviewZoom((z) => Math.min(2.5, z + 0.2))}
                    className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md cursor-pointer"
                    title="Phóng to"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setPreviewZoom(1)}
                    className="px-1.5 text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-40 rounded-lg cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Trang {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-40 rounded-lg cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Preview Sheet Area */}
            <div className="flex-1 overflow-auto p-6 flex justify-center items-start bg-slate-200/70 dark:bg-slate-950/80">
              {printableList.length === 0 ? (
                <div className="my-auto text-center p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 max-w-md">
                  <Printer className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">Chưa chọn tem nào để in</p>
                  <p className="text-slate-500 text-xs mt-1">
                    Vui lòng chọn ít nhất 1 dòng trong danh sách dữ liệu để hiển thị bản in.
                  </p>
                </div>
              ) : viewMode === 'roll' ? (
                /* Roll/Sheet View */
                <div
                  className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl p-6 transition-all duration-200 relative min-h-[300px]"
                  style={{
                    transform: `scale(${previewZoom})`,
                    transformOrigin: 'top center',
                  }}
                >
                  <div className="absolute top-2 left-3 text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">
                    Cuộn Giấy In Nhiệt ({template.widthMm * printSettings.labelsPerRow + printSettings.gapMm * (printSettings.labelsPerRow - 1)} mm x {template.heightMm} mm)
                  </div>

                  {/* Grid Layout of Labels on paper */}
                  <div
                    className="grid gap-y-4 gap-x-3 mt-6"
                    style={{
                      gridTemplateColumns: `repeat(${printSettings.labelsPerRow}, minmax(0, 1fr))`,
                    }}
                  >
                    {currentPreviewList.map((item, idx) => {
                      const thumb = renderedThumbnails[item.labelId];
                      return (
                        <div
                          key={`${item.labelId}-${idx}`}
                          className="group relative bg-white border border-slate-300 dark:border-slate-700 rounded-md shadow-sm hover:border-blue-500 transition-all flex flex-col items-center justify-center p-1 bg-white"
                          style={{
                            width: `${template.widthMm * 3.2}px`,
                            height: `${template.heightMm * 3.2}px`,
                          }}
                        >
                          {thumb ? (
                            <img
                              src={thumb}
                              alt="Label Preview"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-50 text-[10px] text-slate-400 animate-pulse">
                              Đang tải...
                            </div>
                          )}

                          {/* Index Badge */}
                          <div className="absolute -top-2 -left-2 bg-slate-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow opacity-80 group-hover:opacity-100">
                            #{startIndex + idx + 1}
                          </div>

                          {/* Copy Badge if multiple copies */}
                          {item.totalCopies > 1 && (
                            <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full shadow">
                              Bản {item.copyIndex}/{item.totalCopies}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Single Label Focus View */
                <div
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 transition-all"
                  style={{
                    transform: `scale(${previewZoom})`,
                    transformOrigin: 'top center',
                  }}
                >
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Square className="w-4 h-4 text-blue-600" />
                    <span>Chi Tiết Tem #{startIndex + 1} / {printableList.length}</span>
                  </div>

                  {currentPreviewList[0] && (
                    <div
                      className="border-2 border-blue-500 rounded-lg shadow-lg overflow-hidden bg-white p-2"
                      style={{
                        width: `${template.widthMm * 4.5}px`,
                        height: `${template.heightMm * 4.5}px`,
                      }}
                    >
                      {renderedThumbnails[currentPreviewList[0].labelId] ? (
                        <img
                          src={renderedThumbnails[currentPreviewList[0].labelId]}
                          alt="Detailed Label"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 text-xs">
                          Đang tạo ảnh tem...
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sample Data Details */}
                  {currentPreviewList[0] && (
                    <div className="w-full max-w-sm p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] space-y-1">
                      <p className="font-bold text-slate-800 dark:text-slate-200 border-b pb-1 mb-1">
                        Dữ Liệu Được Điền Vào Tem:
                      </p>
                      {Object.entries(currentPreviewList[0].data).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-slate-600 dark:text-slate-300">
                          <span className="font-medium text-slate-500">{k}:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100">{String(v || '-')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress Overlay */}
        {exportingPdf && (
          <div className="px-6 py-3 bg-emerald-50 dark:bg-emerald-950/80 border-t border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-200">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
              Đang kết xuất Vector PDF chuẩn in nhiệt...
            </span>
            <span>
              {progress.current} / {progress.total}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-3 sm:px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-xl cursor-pointer text-xs whitespace-nowrap shrink-0"
          >
            Đóng / Quay Lại
          </button>

          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={handleDownloadPdf}
              disabled={exportingPdf || printableList.length === 0}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer text-xs whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Xuất File PDF</span>
            </button>

            <button
              onClick={handleDirectBrowserPrint}
              disabled={isPrintingDirect || printableList.length === 0}
              className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all cursor-pointer text-xs ring-2 ring-blue-400/40 active:scale-95 whitespace-nowrap shrink-0"
            >
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse shrink-0" />
              <span>{isPrintingDirect ? 'Đang gửi...' : 'IN NGAY TRỰC TIẾP'}</span>
            </button>
          </div>
        </div>
      </div>

      <ToastNotification
        state={toastState}
        onClose={() => setToastState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

