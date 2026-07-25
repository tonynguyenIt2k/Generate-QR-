import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  X, 
  Laptop, 
  Info, 
  ArrowUpCircle,
  ExternalLink,
  ShieldCheck,
  Radio
} from 'lucide-react';
import { UpdateInfo, DownloadProgress } from '../../types/electron';

interface UpdateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpdateManagerModal: React.FC<UpdateManagerModalProps> = ({ isOpen, onClose }) => {
  const [currentVersion, setCurrentVersion] = useState<string>('1.0.0');
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'ready' | 'error'>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [autoCheckOnStartup, setAutoCheckOnStartup] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('qr_label_auto_check_update');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  useEffect(() => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.getAppVersion().then((ver) => {
        if (ver) setCurrentVersion(ver);
      }).catch(() => {});

      const unbindAvailable = window.electronAPI.onUpdateAvailable((info) => {
        setStatus('available');
        setUpdateInfo(info);
      });

      const unbindNotAvailable = window.electronAPI.onUpdateNotAvailable((info) => {
        setStatus('not-available');
        setUpdateInfo(info);
      });

      const unbindProgress = window.electronAPI.onDownloadProgress((progress) => {
        setStatus('downloading');
        setDownloadProgress(progress);
      });

      const unbindDownloaded = window.electronAPI.onUpdateDownloaded((info) => {
        setStatus('ready');
        setUpdateInfo(info);
      });

      const unbindError = window.electronAPI.onUpdateError((err) => {
        setStatus('error');
        const rawErr = String(err || '');
        if (rawErr.includes('404') || rawErr.includes('github.com') || rawErr.includes('releases.atom')) {
          setErrorMessage('Chưa tìm thấy kho phát hành (GitHub Releases) cho repository này. Bạn đang dùng phiên bản mới nhất v1.0.0.');
        } else {
          setErrorMessage(rawErr.slice(0, 150) || 'Đã xảy ra lỗi kết nối máy chủ cập nhật.');
        }
      });

      return () => {
        unbindAvailable();
        unbindNotAvailable();
        unbindProgress();
        unbindDownloaded();
        unbindError();
      };
    }
  }, [isElectron]);

  const handleCheckForUpdates = () => {
    setStatus('checking');
    setErrorMessage('');
    if (isElectron && window.electronAPI) {
      window.electronAPI.checkForUpdate();
    } else {
      // Simulation for web preview
      setTimeout(() => {
        setStatus('not-available');
        setUpdateInfo({
          version: '1.0.0',
          releaseNotes: 'Bạn đang sử dụng phiên bản ứng dụng mới nhất.',
        });
      }, 1200);
    }
  };

  const handleDownloadUpdate = () => {
    setStatus('downloading');
    if (isElectron && window.electronAPI) {
      window.electronAPI.downloadUpdate();
    } else {
      // Web simulation
      let progress = 0;
      const interval = setInterval(() => {
        progress += 15;
        setDownloadProgress({
          percent: Math.min(progress, 100),
          bytesPerSecond: 1024 * 512,
          transferred: progress * 10000,
          total: 1000000,
        });
        if (progress >= 100) {
          clearInterval(interval);
          setStatus('ready');
        }
      }, 300);
    }
  };

  const handleRestartAndInstall = () => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.quitAndInstall();
    } else {
      alert('Đã sẵn sàng! Khi dùng app EXE thực tế, ứng dụng sẽ tự động khởi động lại và cập nhật.');
    }
  };

  const handleToggleAutoCheck = (checked: boolean) => {
    setAutoCheckOnStartup(checked);
    try {
      localStorage.setItem('qr_label_auto_check_update', JSON.stringify(checked));
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Cập Nhật Tự Động EXE
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                QR Label Pro Version {currentVersion}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Main Status Display */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center text-center">
            {status === 'idle' && (
              <>
                <Laptop className="w-12 h-12 text-blue-500 mb-2 animate-bounce" />
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                  Kiểm tra bản cập nhật mới
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                  Bấm nút bên dưới để tự động kiểm tra xem có phiên bản EXE mới nhất hay không.
                </p>
              </>
            )}

            {status === 'checking' && (
              <>
                <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-2" />
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                  Đang kiểm tra máy chủ cập nhật...
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Vui lòng chờ trong giây lát
                </p>
              </>
            )}

            {status === 'not-available' && (
              <>
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2" />
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                  Bạn đang dùng phiên bản mới nhất!
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Phiên bản {currentVersion} là bản cập nhật hiện tại.
                </p>
              </>
            )}

            {status === 'available' && updateInfo && (
              <>
                <ArrowUpCircle className="w-12 h-12 text-blue-500 mb-2" />
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                  Có bản cập nhật mới: v{updateInfo.version}!
                </h4>
                {updateInfo.releaseNotes && (
                  <div className="w-full text-left mt-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-semibold block mb-1">Điểm mới trong bản này:</span>
                    {updateInfo.releaseNotes}
                  </div>
                )}
              </>
            )}

            {status === 'downloading' && downloadProgress && (
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-blue-500 animate-pulse" /> Đang tải gói cập nhật...
                  </span>
                  <span>{downloadProgress.percent}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-200 rounded-full"
                    style={{ width: `${downloadProgress.percent}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 text-right">
                  {(downloadProgress.transferred / (1024 * 1024)).toFixed(1)}MB / {(downloadProgress.total / (1024 * 1024)).toFixed(1)}MB
                </p>
              </div>
            )}

            {status === 'ready' && (
              <>
                <ShieldCheck className="w-12 h-12 text-emerald-500 mb-2" />
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                  Tải xong! Sẵn sàng nâng cấp
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Bấm &quot;Khởi động lại & Cập nhật&quot; để cài đặt ngay.
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <CheckCircle2 className="w-12 h-12 text-blue-500 mb-2" />
                <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                  Đang dùng phiên bản v{currentVersion}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-sm leading-relaxed">
                  {errorMessage.includes('Chưa tìm thấy') ? (
                    <span>Chưa có phát hành mới trên GitHub Releases. Ứng dụng của bạn hiện là <strong>phiên bản mới nhất</strong>.</span>
                  ) : (
                    errorMessage
                  )}
                </p>
              </>
            )}
          </div>

          {/* Action Button */}
          <div className="flex justify-center">
            {status === 'ready' ? (
              <button
                onClick={handleRestartAndInstall}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
              >
                <RefreshCw className="w-4 h-4 animate-spin" /> Khởi động lại & Cập nhật ngay
              </button>
            ) : status === 'available' ? (
              <button
                onClick={handleDownloadUpdate}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" /> Tải bản cập nhật mới
              </button>
            ) : (
              <button
                onClick={handleCheckForUpdates}
                disabled={status === 'checking' || status === 'downloading'}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-medium rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${status === 'checking' ? 'animate-spin' : ''}`} />
                {status === 'checking' ? 'Đang kiểm tra...' : 'Kiểm tra bản cập nhật'}
              </button>
            )}
          </div>

          {/* Setting options */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                Tự động kiểm tra bản cập nhật khi mở app
              </span>
              <input 
                type="checkbox"
                checked={autoCheckOnStartup}
                onChange={(e) => handleToggleAutoCheck(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700"
              />
            </label>

            {/* Explanation / Guide Card */}
            <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-blue-800 dark:text-blue-300">
                <Info className="w-4 h-4 shrink-0" /> Cơ chế tự động cập nhật app EXE
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                Khi xuất ra file installer <code className="px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 font-mono text-[10px]">.exe</code>, ứng dụng sử dụng công nghệ <strong>Electron Auto-Updater</strong>. Khi bạn phát hành phiên bản mới lên GitHub Releases hoặc máy chủ web, ứng dụng EXE sẽ:
              </p>
              <ul className="list-disc pl-4 text-[11px] space-y-1 text-slate-600 dark:text-slate-300">
                <li>Tự động đọc file <code className="font-mono">latest.yml</code> để kiểm tra version.</li>
                <li>Tải gói cập nhật trong nền mà không làm gián đoạn công việc.</li>
                <li>Giữ nguyên 100% mẫu tem nhãn, cài đặt & dữ liệu đã lưu trong ứng dụng!</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" /> Trạng thái: {isElectron ? 'Môi trường Desktop EXE' : 'Trình duyệt Web'}
          </span>
          <button
            onClick={onClose}
            className="hover:text-slate-800 dark:hover:text-slate-200 font-medium"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
