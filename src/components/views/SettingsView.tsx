import React, { useState, useRef } from 'react';
import {
  Sliders,
  Printer,
  Check,
  Save,
  HardDriveDownload,
  Upload,
  ShieldCheck,
  FileCode,
  Database,
  RefreshCw,
} from 'lucide-react';
import { LabelSizePreset, LabelTemplate, DatasetRow } from '../../types/label';
import { ToastNotification, ToastState } from '../common/CustomAlert';
import { exportFullBackupJson, importFullBackupJson, AppBackupData } from '../../utils/backupStorage';

export const LABEL_SIZE_PRESETS: LabelSizePreset[] = [
  {
    id: '40x30',
    name: '40 x 30 mm (Cuộn 2 tem / hàng - In nhiệt chuẩn)',
    widthMm: 40,
    heightMm: 30,
    description: 'Chuẩn tem in nhiệt cuộn 2 tem 1 hàng (Barcode Tuki.vn, tên công ty, website, phụ kiện).',
    category: 'mobile',
  },
  {
    id: '50x30',
    name: '50 x 30 mm (Chuẩn tem điện thoại flagship)',
    widthMm: 50,
    heightMm: 30,
    description: 'Kích thước phổ biến nhất dán máy iPhone, Samsung bao gồm QR, IMEI, Giá.',
    category: 'mobile',
  },
  {
    id: '58x40',
    name: '58 x 40 mm (Chuẩn tem VietQR / Cửa hàng lớn)',
    widthMm: 58,
    heightMm: 40,
    description: 'Khổ tem rộng phù hợp in mã VietQR thanh toán, thông tin máy chi tiết.',
    category: 'retail',
  },
  {
    id: '70x50',
    name: '70 x 50 mm (Tem quản lý kho Dual Barcode)',
    widthMm: 70,
    heightMm: 50,
    description: 'Bao gồm Dual IMEI, Serial barcode, Mã kho và Thông số chi tiết.',
    category: 'shipping',
  },
  {
    id: '100x50',
    name: '100 x 50 mm (Tem hộp sản phẩm lớn)',
    widthMm: 100,
    heightMm: 50,
    description: 'Dán ngoài vỏ hộp carton, kiện hàng vận chuyển.',
    category: 'shipping',
  },
];

interface SettingsViewProps {
  activePresetId: string;
  onSelectPreset: (preset: LabelSizePreset) => void;
  customWidthMm: number;
  customHeightMm: number;
  onUpdateCustomSize: (w: number, h: number) => void;
  currentTemplate?: LabelTemplate;
  allTemplates?: LabelTemplate[];
  dataset?: DatasetRow[];
  onRestoreBackup?: (backup: AppBackupData) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  activePresetId,
  onSelectPreset,
  customWidthMm,
  customHeightMm,
  onUpdateCustomSize,
  currentTemplate,
  allTemplates = [],
  dataset = [],
  onRestoreBackup,
}) => {
  const [widthInput, setWidthInput] = useState(String(customWidthMm));
  const [heightInput, setHeightInput] = useState(String(customHeightMm));
  const backupFileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleApplyCustomSize = () => {
    const w = parseFloat(widthInput);
    const h = parseFloat(heightInput);
    if (!isNaN(w) && !isNaN(h) && w > 10 && h > 10) {
      onUpdateCustomSize(w, h);
      showToast('Đã lưu cấu hình máy in & khổ tem', `Đã thiết lập kích thước tem custom thành ${w} x ${h} mm.`, 'success');
    } else {
      showToast('Cảnh báo kích thước', 'Kích thước tem phải lớn hơn 10mm!', 'warning');
    }
  };

  const handleSelectPresetWithToast = (preset: LabelSizePreset) => {
    onSelectPreset(preset);
    showToast('Đã chọn khổ tem', `Đã áp dụng mẫu khổ tem ${preset.widthMm} x ${preset.heightMm} mm (${preset.name}).`, 'success');
  };

  const handleExportBackup = () => {
    if (!currentTemplate) return;
    try {
      exportFullBackupJson(currentTemplate, allTemplates, dataset, {
        customWidthMm,
        customHeightMm,
        activePresetId,
      });
      showToast('Tải file dự phòng thành công', 'File backup .JSON chứa toàn bộ cấu hình mẫu tem và dữ liệu đã được tải về máy.');
    } catch (e) {
      showToast('Lỗi xuất file dự phòng', String(e), 'error');
    }
  };

  const handleRestoreFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const backup = await importFullBackupJson(file);
      if (onRestoreBackup) {
        onRestoreBackup(backup);
        showToast('Khôi phục dữ liệu thành công', 'Đã tải toàn bộ mẫu tem và danh sách dữ liệu từ file backup JSON.');
      }
    } catch (err: any) {
      showToast('Lỗi đọc file JSON dự phòng', String(err), 'error');
    } finally {
      if (backupFileInputRef.current) backupFileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-1 bg-slate-100 dark:bg-slate-950 overflow-y-auto p-3 sm:p-6 text-xs space-y-4 sm:space-y-6 pb-24 sm:pb-8">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 shrink-0">
            <Sliders className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-slate-100 truncate">
                Cấu Hình Khổ Tem & Sao Lưu
              </h2>
              <span className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-800/60 shrink-0">
                JSON Backup
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              Thông số khổ tem in nhiệt và dữ liệu dự phòng
            </p>
          </div>
        </div>

        <button
          onClick={handleApplyCustomSize}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl shadow-md shadow-emerald-500/20 cursor-pointer transition-all text-xs shrink-0 whitespace-nowrap"
          title="Lưu kích thước và thiết lập máy in"
        >
          <Save className="w-3.5 h-3.5 shrink-0" />
          <span>Lưu Cấu Hình</span>
        </button>
      </div>

      {/* Backup & Restore Section */}
      <div className="p-3.5 sm:p-5 bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/80 dark:from-indigo-950/60 dark:via-slate-900 dark:to-indigo-950/80 rounded-2xl shadow-xs dark:shadow-xl border border-indigo-200/80 dark:border-indigo-800/60 space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20 shrink-0">
              <Database className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                <span>Sao Lưu & Phục Hồi Dữ Liệu (JSON)</span>
                <span className="hidden sm:inline-block px-1.5 py-0.2 text-[9px] font-extrabold uppercase bg-indigo-100 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-200 rounded border border-indigo-200 dark:border-indigo-400/30">
                  An Toàn
                </span>
              </h3>
              <p className="text-slate-500 dark:text-indigo-200/80 text-[10px] sm:text-[11px] mt-0.5 truncate">
                Tải file .JSON dự phòng chứa mẫu tem và dữ liệu Excel
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 pt-0.5">
          {/* Export JSON Button */}
          <button
            onClick={handleExportBackup}
            disabled={!currentTemplate}
            className="p-3 sm:p-4 rounded-xl bg-white dark:bg-white/10 hover:bg-indigo-50/80 dark:hover:bg-white/15 active:scale-[0.98] border border-indigo-200/80 dark:border-white/20 shadow-xs dark:shadow-none flex items-center gap-2.5 sm:gap-3 transition-all cursor-pointer text-left group"
          >
            <div className="p-2.5 rounded-lg bg-indigo-600 text-white group-hover:scale-105 transition-transform shrink-0 shadow-xs">
              <HardDriveDownload className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-200 transition-colors truncate">
                Xuất File Dự Phòng (.JSON)
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-indigo-200/70 mt-0.5 truncate">
                Lưu {allTemplates.length} mẫu tem và {dataset.length} dòng dữ liệu
              </div>
            </div>
          </button>

          {/* Import JSON Restore Button */}
          <div>
            <input
              type="file"
              ref={backupFileInputRef}
              accept=".json"
              onChange={handleRestoreFileSelect}
              className="hidden"
            />
            <button
              onClick={() => backupFileInputRef.current?.click()}
              className="w-full h-full p-3 sm:p-4 rounded-xl bg-white dark:bg-white/10 hover:bg-emerald-50/80 dark:hover:bg-white/15 active:scale-[0.98] border border-emerald-200/80 dark:border-white/20 shadow-xs dark:shadow-none flex items-center gap-2.5 sm:gap-3 transition-all cursor-pointer text-left group"
            >
              <div className="p-2.5 rounded-lg bg-emerald-600 text-white group-hover:scale-105 transition-transform shrink-0 shadow-xs">
                <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-200 transition-colors truncate">
                  Phục Hồi Từ File Backup (.JSON)
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-indigo-200/70 mt-0.5 truncate">
                  Nạp lại toàn bộ mẫu tem và dữ liệu từ file
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Preset Label Sizes Grid */}
      <div className="space-y-2.5 sm:space-y-3">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
          Khổ Tem Nhiệt Phổ Biến (Presets)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          {LABEL_SIZE_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => handleSelectPresetWithToast(preset)}
                className={`p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between active:scale-[0.99] ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 border-blue-600 ring-2 ring-blue-500/30 shadow-md'
                    : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-mono">
                      {preset.widthMm} × {preset.heightMm} mm
                    </span>
                    {isSelected && (
                      <span className="p-1 rounded-full bg-blue-600 text-white">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs mb-1">
                    {preset.name}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] leading-relaxed">
                    {preset.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Size Config */}
      <div className="p-3.5 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 shadow-xs">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
          Thiết Lập Kích Thước Tem Tùy Chỉnh (Custom Width x Height)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1 text-[11px]">
              Chiều Rộng Tem (Width mm)
            </label>
            <input
              type="number"
              value={widthInput}
              onChange={(e) => setWidthInput(e.target.value)}
              className="w-full p-2 sm:p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-xs"
            />
          </div>

          <div>
            <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1 text-[11px]">
              Chiều Cao Tem (Height mm)
            </label>
            <input
              type="number"
              value={heightInput}
              onChange={(e) => setHeightInput(e.target.value)}
              className="w-full p-2 sm:p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-xs"
            />
          </div>

          <button
            onClick={handleApplyCustomSize}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 cursor-pointer text-xs"
          >
            Áp Dụng Kích Thước
          </button>
        </div>
      </div>

      {/* Supported Thermal Printer Brands Info */}
      <div className="p-3.5 sm:p-5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
        <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-xs sm:text-sm">
          <Printer className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          <span>Danh Sách Máy In Hỗ Trợ Tốt Nhất</span>
        </div>
        <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
          Ứng dụng tương thích tối ưu với các driver máy in tem nhiệt phổ biến thị trường Việt Nam:
        </p>
        <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-1">
          {['XPrinter', 'Zebra', 'TSC', 'Godex', 'Brother', 'Gprinter', 'Rongta', 'Bixolon', 'Honeywell'].map(
            (brand) => (
              <span
                key={brand}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-[10px] sm:text-xs text-slate-800 dark:text-slate-200 rounded-lg sm:rounded-xl"
              >
                {brand}
              </span>
            )
          )}
        </div>
      </div>

      <ToastNotification
        state={toastState}
        onClose={() => setToastState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
