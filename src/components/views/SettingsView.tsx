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
    <div className="flex-1 bg-slate-100 dark:bg-slate-950 overflow-y-auto p-6 text-xs space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Cấu Hình Khổ Tem & Quản Lý Dữ Liệu Dự Phòng
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5">
              Tùy chỉnh thông số máy in nhiệt và xuất/nhập file JSON sao lưu an toàn cho toàn bộ dữ liệu ứng dụng.
            </p>
          </div>
        </div>

        <button
          onClick={handleApplyCustomSize}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-500/20 cursor-pointer transition-all text-xs"
        >
          <Save className="w-4 h-4" />
          <span>Lưu Cấu Hình Máy In</span>
        </button>
      </div>

      {/* Backup & Restore Section */}
      <div className="p-5 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl shadow-xl border border-indigo-800/60 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-600/80 text-white shadow-inner">
              <Database className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Sao Lưu & Phục Hồi Dữ Liệu Dự Phòng (JSON Backup)</span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-indigo-500/30 text-indigo-200 rounded-md border border-indigo-400/30">
                  An Toàn Tối Đa
                </span>
              </h3>
              <p className="text-indigo-200/80 text-[11px] mt-0.5">
                Bên cạnh đồng bộ với Firebase, bạn có thể tải về file .JSON dự phòng chứa toàn bộ mẫu tem và danh sách dữ liệu Excel.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Export JSON Button */}
          <button
            onClick={handleExportBackup}
            disabled={!currentTemplate}
            className="p-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 flex items-center gap-3 transition-all cursor-pointer text-left group"
          >
            <div className="p-3 rounded-lg bg-indigo-500 text-white group-hover:scale-105 transition-transform shrink-0">
              <HardDriveDownload className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-white group-hover:text-indigo-200 transition-colors">
                Xuất Dữ Liệu Dự Phòng (.JSON)
              </div>
              <div className="text-[11px] text-indigo-200/70 mt-0.5">
                Tải file .JSON sao lưu {allTemplates.length} mẫu tem và {dataset.length} dòng dữ liệu hiện tại.
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
              className="w-full h-full p-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 flex items-center gap-3 transition-all cursor-pointer text-left group"
            >
              <div className="p-3 rounded-lg bg-emerald-500 text-white group-hover:scale-105 transition-transform shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-xs text-white group-hover:text-emerald-200 transition-colors">
                  Phục Hồi Dữ Liệu Từ File Backup (.JSON)
                </div>
                <div className="text-[11px] text-indigo-200/70 mt-0.5">
                  Chọn file .JSON dự phòng đã xuất để nạp lại đầy đủ các mẫu tem và dữ liệu.
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Preset Label Sizes Grid */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
          Khổ Tem Nhiệt Phổ Biến (Presets)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LABEL_SIZE_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => handleSelectPresetWithToast(preset)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 border-blue-600 ring-2 ring-blue-500/30 shadow-md'
                    : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {preset.widthMm} x {preset.heightMm} mm
                    </span>
                    {isSelected && (
                      <span className="p-1 rounded-full bg-blue-600 text-white">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {preset.name}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                    {preset.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Size Config */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
          Thiết Lập Kích Thước Tem Tùy Chỉnh (Custom Width x Height)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
              Chiều Rộng Tem (Width mm)
            </label>
            <input
              type="number"
              value={widthInput}
              onChange={(e) => setWidthInput(e.target.value)}
              className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
            />
          </div>

          <div>
            <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
              Chiều Cao Tem (Height mm)
            </label>
            <input
              type="number"
              value={heightInput}
              onChange={(e) => setHeightInput(e.target.value)}
              className="w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
            />
          </div>

          <button
            onClick={handleApplyCustomSize}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 cursor-pointer"
          >
            Áp Dụng Kích Thước Tùy Chỉnh
          </button>
        </div>
      </div>

      {/* Supported Thermal Printer Brands Info */}
      <div className="p-5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
        <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
          <Printer className="w-5 h-5 text-blue-600" />
          <span>Danh Sách Máy In Hỗ Trợ Tốt Nhất</span>
        </div>
        <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
          Ứng dụng tương thích tối ưu với các driver máy in tem nhiệt phổ biến thị trường Việt Nam:
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {['XPrinter', 'Zebra', 'TSC', 'Godex', 'Brother', 'Gprinter', 'Rongta', 'Bixolon', 'Honeywell'].map(
            (brand) => (
              <span
                key={brand}
                className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 rounded-xl"
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
