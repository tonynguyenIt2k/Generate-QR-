import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Download,
  FileArchive,
  Image,
  RefreshCw,
  Upload,
  CheckCircle2,
  ShieldCheck,
  HardDriveDownload,
  Smartphone,
  Copy,
  ExternalLink,
  Check,
  Sparkles,
  Layers,
  HelpCircle,
  QrCode,
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
  const [activeTab, setActiveTab] = useState<'files' | 'apk'>('files');
  const [exportingZip, setExportingZip] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const currentAppUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setBackupNotice('Đang cài đặt ứng dụng vào điện thoại!');
      }
      setDeferredPrompt(null);
      setIsInstallable(false);
    } else {
      alert('Cách cài đặt trực tiếp trên Android:\n1. Mở trình duyệt Chrome/Cốc Cốc trên điện thoại\n2. Bấm vào menu 3 chấm (⋮) ở góc trên bên phải\n3. Chọn "Cài đặt ứng dụng" hoặc "Thêm vào màn hình chính" (Add to Home screen)\n4. Biểu tượng app sẽ xuất hiện trên màn hình chính như 1 ứng dụng APK native!');
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentAppUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

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
    <div className="fixed inset-0 bg-slate-950/75 dark:bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fade-in">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t sm:border border-slate-200/80 dark:border-slate-800/80 rounded-t-[28px] sm:rounded-3xl shadow-2xl shadow-black/30 w-full max-w-xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[90vh]">
        {/* Mobile Pull Handle Bar */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 shrink-0" />

        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900 backdrop-blur-sm gap-2 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl shrink-0 shadow-md shadow-blue-500/20">
              <Download className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 truncate">
                Xuất File & Cài App Android
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Tải ảnh, ZIP, sao lưu JSON hoặc cài đặt PWA/APK
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 cursor-pointer shrink-0 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-100/70 dark:bg-slate-800/40 p-1.5 gap-1.5 shrink-0">
          <button
            onClick={() => setActiveTab('files')}
            className={`flex-1 py-2 px-2.5 sm:px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap min-w-0 ${
              activeTab === 'files'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span className="truncate">Xuất Dữ Liệu</span>
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`flex-1 py-2 px-2.5 sm:px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap min-w-0 ${
              activeTab === 'apk'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate">Cài Đặt APK</span>
            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-extrabold rounded-md shrink-0">
              HOT
            </span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 text-xs space-y-3.5 overflow-y-auto flex-1">
          {activeTab === 'files' ? (
            <>
              {/* Option 1: Full JSON Backup Export */}
              <button
                onClick={handleExportBackup}
                className="w-full p-3.5 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900/80 bg-indigo-50/70 dark:bg-indigo-950/40 hover:border-indigo-500 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/50 flex items-center gap-3 transition-all cursor-pointer text-left shadow-xs group"
              >
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white shrink-0 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                  <HardDriveDownload className="w-5 h-5" />
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
                  <p className="text-indigo-900/70 dark:text-indigo-300/80 mt-0.5 leading-relaxed text-[11px]">
                    Lưu toàn bộ mẫu tem ({allTemplates.length} mẫu) và danh sách Excel ({dataset.length} dòng) thành file dự phòng an toàn.
                  </p>
                </div>
              </button>

              {/* Option 2: Single PNG Export */}
              <button
                onClick={handleExportSinglePng}
                className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 flex items-center gap-3 transition-all cursor-pointer text-left group"
              >
                <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 shrink-0 group-hover:scale-105 transition-transform">
                  <Image className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Xuất 1 Tem Này Dạng Ảnh PNG (300 DPI)
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-[11px]">
                    Tải ảnh PNG sắc nét chuẩn in của mẫu tem hiện tại trên canvas.
                  </p>
                </div>
              </button>

              {/* Option 3: Bulk ZIP Export */}
              <button
                onClick={handleExportZip}
                disabled={exportingZip || !generatedLabels.length}
                className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 flex items-center gap-3 transition-all cursor-pointer text-left disabled:opacity-50 group"
              >
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200 shrink-0 group-hover:scale-105 transition-transform">
                  <FileArchive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Tải Xuống File ZIP Toàn Bộ Ảnh QR ({generatedLabels.length} tem)
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-[11px]">
                    Nén tất cả mã QR tem đã sinh từ danh sách Excel thành 1 file ZIP.
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
                    className="w-full p-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 flex items-center justify-center gap-2 transition-all cursor-pointer text-slate-700 dark:text-slate-300 font-semibold"
                  >
                    <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Phục Hồi Dữ Liệu Từ File Backup (.JSON)</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            /* APK & Mobile Installation Tab */
            <div className="space-y-4">
              {/* Quick 1-Click Install Card */}
              <div className="p-4 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/20 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-emerald-950 dark:text-emerald-100">
                        Cài Đặt Trực Tiếp Lên Android (PWA/APK)
                      </h3>
                      <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                        Không cần qua CH Play, hoạt động toàn màn hình như ứng dụng cài đặt!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <button
                    onClick={handleInstallPwa}
                    className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-600/30"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Cài Đặt Ngay Vào Điện Thoại</span>
                  </button>
                  <button
                    onClick={handleCopyUrl}
                    className="py-2.5 px-3 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 text-emerald-800 dark:text-emerald-200 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    title="Sao chép link web để mở trên điện thoại"
                  >
                    {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedUrl ? 'Đã sao chép Link' : 'Copy Link App'}</span>
                  </button>
                </div>
              </div>

              {/* Step by Step Guide for APK packaging */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-blue-500" />
                  <span>3 Cách Tạo / Sử Dụng File APK Android:</span>
                </h4>

                {/* Method 1: Chrome / Browser install */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[11px] flex items-center justify-center">
                      1
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      Cài đặt tức thì qua Trình duyệt Chrome / Cốc Cốc
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 pl-7 text-[11px] leading-relaxed">
                    Mở link app trên điện thoại Android <span className="font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1 py-0.5 rounded">Chrome</span> → Bấm nút <strong>⋮ (3 chấm)</strong> góc trên → Chọn <strong>"Cài đặt ứng dụng"</strong> hoặc <strong>"Thêm vào màn hình chính"</strong>.
                  </p>
                </div>

                {/* Method 2: PWABuilder APK Generator */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center">
                        2
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        Đóng gói thành file .APK độc lập (PWABuilder)
                      </span>
                    </div>
                    <a
                      href={`https://www.pwabuilder.com?url=${encodeURIComponent(currentAppUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <span>Mở PWABuilder</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 pl-7 text-[11px] leading-relaxed">
                    Truy cập trang <strong>PWABuilder.com</strong> (của Microsoft/Google) → Dán đường dẫn URL của ứng dụng → Chọn <strong>"Package for Android"</strong> để tải file <strong>.apk</strong> hoặc <strong>.aab</strong> đã đóng gói về máy.
                  </p>
                </div>

                {/* Method 3: Capacitor Android Studio Project */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-black text-[11px] flex items-center justify-center">
                      3
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      Build file APK Release qua Capacitor & Android Studio
                    </span>
                  </div>
                  <div className="pl-7 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                    <p>Dành cho lập trình viên muốn xuất source code Android hoàn chỉnh:</p>
                    <div className="bg-slate-900 text-slate-200 p-2 rounded-lg font-mono text-[10px] select-all">
                      npm run build && npx cap add android && npx cap open android
                    </div>
                  </div>
                </div>
              </div>
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
        <div className="p-3 sm:p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Tương thích Android, iOS, PC</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold rounded-xl cursor-pointer text-xs transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
