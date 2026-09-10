import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  X,
  CheckCircle2,
  Download,
  Share2,
  MoreVertical,
  PlusSquare,
  Sparkles,
  Zap,
  HardDrive,
  Layers,
  ArrowRight,
  Laptop,
  ExternalLink,
} from 'lucide-react';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
  onInstalled?: () => void;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstalled,
}) => {
  const [platform, setPlatform] = useState<'android' | 'ios' | 'pc'>('android');
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Detect OS automatically
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent || '';
      if (/android/i.test(ua)) {
        setPlatform('android');
      } else if (/iPad|iPhone|iPod/.test(ua)) {
        setPlatform('ios');
      } else {
        setPlatform('android'); // default to android since user is asking for Android/App usage
      }
    }
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      setInstalling(true);
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          onInstalled?.();
          onClose();
        }
      } catch (e) {
        console.error('Install prompt error:', e);
      } finally {
        setInstalling(false);
      }
    } else {
      // Fallback instruction
      if (platform === 'ios') {
        alert('Trên iPhone: Bấm nút Chia sẻ (biểu tượng ô vuông mũi tên lên) ở thanh dưới cùng Safari -> Chọn "Thêm vào MH chính"');
      } else {
        alert('Trên Android: Bấm menu 3 chấm (⋮) ở góc trên bên phải trình duyệt Chrome -> Chọn "Cài đặt ứng dụng" hoặc "Thêm vào màn hình chính"');
      }
    }
  };

  return (
    <div
      id="pwa-install-modal-overlay"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 dark:bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="pwa-install-modal-container"
        className="w-full max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t sm:border border-slate-200/80 dark:border-slate-800/80 rounded-t-[28px] sm:rounded-3xl shadow-2xl shadow-black/30 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[90vh]"
      >
        {/* Mobile Pull Handle Bar */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 shrink-0" />

        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-2xl shadow-md shadow-indigo-500/20 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                Cài Đặt & Sử Dụng App Native
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Chạy Full màn hình không thanh duyệt web, hỗ trợ offline 100%
              </p>
            </div>
          </div>
          <button
            id="close-pwa-modal-btn"
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Benefits bar */}
        <div className="grid grid-cols-3 gap-2 px-4 py-3 bg-gradient-to-r from-indigo-50/50 via-slate-50 to-blue-50/50 dark:from-indigo-950/30 dark:via-slate-900/40 dark:to-blue-950/30 border-b border-slate-200/70 dark:border-slate-800 text-center shrink-0">
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center mb-1">
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100">Mở Tức Thì</span>
            <span className="text-[9px] text-slate-500 dark:text-slate-400">Không cần load lại</span>
          </div>
          <div className="flex flex-col items-center border-x border-slate-200 dark:border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center mb-1">
              <HardDrive className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100">Offline 100%</span>
            <span className="text-[9px] text-slate-500 dark:text-slate-400">Không cần mạng</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center mb-1">
              <Layers className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100">Full Màn Hình</span>
            <span className="text-[9px] text-slate-500 dark:text-slate-400">Giao diện như App</span>
          </div>
        </div>

        {/* OS Platform Tabs */}
        <div className="flex border-b border-slate-200/80 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/50 p-1.5 gap-1 shrink-0">
          <button
            onClick={() => setPlatform('android')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              platform === 'android'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
            <span>Android (Chrome)</span>
          </button>
          <button
            onClick={() => setPlatform('ios')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              platform === 'ios'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 text-blue-500" />
            <span>iPhone (Safari)</span>
          </button>
          <button
            onClick={() => setPlatform('pc')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              platform === 'pc'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Laptop className="w-3.5 h-3.5 text-indigo-500" />
            <span>Máy tính (PC)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-slate-800 dark:text-slate-200 text-xs">
          {/* Quick Install Action Button if browser supports 1-click */}
          {deferredPrompt && (
            <div className="p-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-emerald-800 dark:text-emerald-300 text-xs">
                  Trình duyệt đã sẵn sàng cài đặt!
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Bấm nút bên cạnh để thêm trực tiếp app vào điện thoại.
                </p>
              </div>
              <button
                onClick={handleInstallClick}
                disabled={installing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl shadow-md flex items-center gap-1.5 text-xs cursor-pointer shrink-0 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>{installing ? 'Đang cài...' : 'Cài Ngay'}</span>
              </button>
            </div>
          )}

          {/* Android Steps */}
          {platform === 'android' && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-xs">
                  1
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    Mở menu góc trên trình duyệt Chrome / Cốc Cốc
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                    Bấm vào biểu tượng <MoreVertical className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 inline" /> (3 chấm) ở góc trên bên phải màn hình.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-xs">
                  2
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    Chọn "Cài đặt ứng dụng" hoặc "Thêm vào màn hình chính"
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Hệ thống Android sẽ tự động tạo icon <span className="font-bold text-emerald-600 dark:text-emerald-400">QR Label Pro</span> ngoài màn hình chính.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 shadow-xs">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-xs">
                  3
                </div>
                <div>
                  <p className="font-bold text-emerald-900 dark:text-emerald-300">
                    Mở app từ màn hình chính để dùng như App thật
                  </p>
                  <p className="text-[11px] text-emerald-800/80 dark:text-slate-400 mt-0.5">
                    Ứng dụng sẽ mở ở chế độ Full màn hình (không có thanh địa chỉ web), thao tác chạm kéo siêu mượt và không bị reload trang!
                  </p>
                </div>
              </div>

              {/* Standalone APK Option */}
              <div className="p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between gap-2 shadow-xs">
                <div>
                  <p className="font-bold text-xs text-indigo-950 dark:text-indigo-200">
                    Cần tải file cài đặt .APK độc lập?
                  </p>
                  <p className="text-[10px] text-indigo-800/80 dark:text-indigo-300/80">
                    Tạo và tải file APK miễn phí qua công cụ chính thức PWABuilder
                  </p>
                </div>
                <a
                  href={`https://www.pwabuilder.com/reportcard?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl text-[11px] shrink-0 transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <span>Tạo APK</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* iOS Steps */}
          {platform === 'ios' && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-xs">
                  1
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    Bấm nút Chia sẻ (Share) trên Safari
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                    Bấm biểu tượng ô vuông có mũi tên lên <Share2 className="w-3.5 h-3.5 text-blue-500 inline" /> ở thanh công cụ dưới đáy Safari.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-xs">
                  2
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    Chọn "Thêm vào MH chính" (Add to Home Screen)
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                    Cuộn danh sách xuống và chọn dòng có biểu tượng <PlusSquare className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 inline" />.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 shadow-xs">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-xs">
                  3
                </div>
                <div>
                  <p className="font-bold text-blue-900 dark:text-blue-300">
                    Bấm "Thêm" (Add) ở góc trên bên phải
                  </p>
                  <p className="text-[11px] text-blue-800/80 dark:text-slate-400 mt-0.5">
                    Biểu tượng app sẽ xuất hiện trên màn hình iPhone, bấm vào sẽ mở chế độ App độc lập không viền!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PC Steps */}
          {platform === 'pc' && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-xs">
                  1
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    Nhìn vào thanh địa chỉ trình duyệt Chrome / Edge
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Bấm vào biểu tượng Cài đặt <Download className="w-3.5 h-3.5 text-indigo-500 inline" /> ở phía bên phải thanh gõ link URL.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 shadow-xs">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-xs">
                  2
                </div>
                <div>
                  <p className="font-bold text-indigo-900 dark:text-indigo-300">
                    Bấm "Cài đặt" (Install)
                  </p>
                  <p className="text-[11px] text-indigo-800/80 dark:text-slate-400 mt-0.5">
                    App sẽ xuất hiện trong Menu Start / Desktop như một phần mềm Windows / macOS độc lập.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Dung lượng &lt; 2MB • An toàn 100%
          </span>
          <button
            id="pwa-understand-btn"
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 active:scale-95 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
          >
            Đã Hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
