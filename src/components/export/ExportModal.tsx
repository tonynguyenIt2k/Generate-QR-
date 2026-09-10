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
  Package,
  FileCode,
} from 'lucide-react';
import JSZip from 'jszip';
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
  initialTab?: 'files' | 'apk';
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
  initialTab = 'files',
}) => {
  const [activeTab, setActiveTab] = useState<'files' | 'apk'>(initialTab);
  const [exportingZip, setExportingZip] = useState(false);
  const [downloadingApkPkg, setDownloadingApkPkg] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

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

  const handleDownloadAndroidPackage = async () => {
    setDownloadingApkPkg(true);
    try {
      const zip = new JSZip();
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'qrlabelpro.app';

      const twaManifest = {
        packageId: 'com.hungboa.qrlabelpro',
        host: hostname,
        name: 'QR Label Pro - In Tem Nhãn',
        launcherName: 'QR Label',
        themeColor: '#4F46E5',
        navigationColor: '#0F172A',
        backgroundColor: '#FFFFFF',
        startUrl: '/?homescreen=1',
        iconUrl: '/icon-512.png',
        maskableIconUrl: '/icons/maskable-icon-512x512.png',
        appVersionName: '1.0.0',
        appVersionCode: 1,
        shortcuts: [],
        generatorApp: 'bubblewrap-cli',
        webManifestUrl: '/manifest.json',
        fallbackType: 'customtabs',
        features: {
          locationDelegation: { enabled: false },
          playBilling: { enabled: false }
        },
        enableNotifications: false
      };

      const androidManifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.hungboa.qrlabelpro">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="QR Label"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen">
        <activity
            android:name="com.google.androidbrowserhelper.trusted.LauncherActivity"
            android:exported="true"
            android:label="QR Label">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

      const buildGradle = `// Top-level build file for Android
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.2.2'
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}`;

      const appGradle = `plugins {
    id 'com.android.application'
}

android {
    namespace 'com.hungboa.qrlabelpro'
    compileSdk 34

    defaultConfig {
        applicationId "com.hungboa.qrlabelpro"
        minSdk 21
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}

dependencies {
    implementation 'com.google.androidbrowserhelper:androidbrowserhelper:2.5.0'
}`;

      const instructions = `================================================================
HƯỚNG DẪN TẠO FILE APK CHO QR LABEL PRO TRÊN ANDROID
================================================================

CÁCH 1: TẠO FILE APK ONLINE TRONG 1 PHÚT (KHÔNG CẦN CÀI ANDROID STUDIO):
1. Truy cập trang web chính thức của Microsoft PWABuilder:
   https://www.pwabuilder.com
2. Nhập URL ứng dụng web của bạn:
   ${currentAppUrl}
3. Bấm "Start" để hệ thống tự động kiểm tra manifest.
4. Bấm "Package for Android" -> Chọn "Generate APK / Signed Package".
5. PWABuilder sẽ đóng gói và trả về file .apk để bạn cài đặt trực tiếp lên điện thoại Android!

----------------------------------------------------------------
CÁCH 2: DÙNG BUBBLEWRAP CLI (GOOGLE CHROME TEAM):
1. Cài đặt Node.js và Android SDK / Java JDK.
2. Mở terminal và chạy lệnh:
   npm install -g @bubblewrap/cli
   bubblewrap init --manifest=${currentAppUrl}/manifest.json
   bubblewrap build
3. File APK ký sẵn sẽ được tạo ra tại thư mục hiện tại.

----------------------------------------------------------------
CÁCH 3: CÀI ĐẶT TRỰC TIẾP (CHUẨN GOOGLE WEBAPK):
- Mở Chrome trên Android -> Vào link ứng dụng -> Bấm nút ⋮ (3 chấm)
- Chọn "Cài đặt ứng dụng" -> Google Play Services sẽ tự động biên dịch WebAPK
  ngay trong máy của bạn với hiệu năng mượt mà nhất.
================================================================`;

      zip.file('twa-manifest.json', JSON.stringify(twaManifest, null, 2));
      zip.file('AndroidManifest.xml', androidManifest);
      zip.file('build.gradle', buildGradle);
      zip.file('app-build.gradle', appGradle);
      zip.file('HUONG_DAN_TAO_FILE_APK.txt', instructions);

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'QR_Label_Android_Source_Package.zip');
      setBackupNotice('Đã tải gói mã nguồn Android & file cấu hình APK thành công!');
      setTimeout(() => setBackupNotice(null), 4000);
    } catch (e: any) {
      alert('Lỗi tạo gói Android: ' + String(e));
    } finally {
      setDownloadingApkPkg(false);
    }
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
              {/* Option 1: Generate Standalone .APK File Online (PWABuilder) */}
              <div className="p-4 rounded-2xl border-2 border-indigo-500/50 bg-gradient-to-br from-indigo-50/90 to-blue-50/70 dark:from-indigo-950/40 dark:to-blue-950/30 space-y-3 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30 shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-sm text-indigo-950 dark:text-indigo-100">
                          Tạo File .APK Độc Lập (PWABuilder)
                        </h3>
                        <span className="px-2 py-0.5 bg-indigo-200 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 text-[10px] font-black rounded-full uppercase">
                          Khuyên dùng
                        </span>
                      </div>
                      <p className="text-[11px] text-indigo-900/70 dark:text-indigo-300/80 mt-0.5 leading-relaxed">
                        Công cụ chính thức từ Microsoft/Google biến Web thành file <strong>.apk</strong> cài đặt trên mọi điện thoại Android trong 1 phút!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-indigo-100 dark:border-indigo-900/60 space-y-1 text-[11px]">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    3 Bước cực nhanh để tải file .APK:
                  </p>
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-600 dark:text-slate-400">
                    <li>Bấm nút bên dưới để mở PWABuilder (đã tự điền link app)</li>
                    <li>Bấm nút màu tím <strong>"Package for Android"</strong></li>
                    <li>Bấm <strong>"Download Package / APK"</strong> để tải file cài đặt về</li>
                  </ol>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <a
                    href={`https://www.pwabuilder.com/reportcard?url=${encodeURIComponent(currentAppUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/30 text-center"
                  >
                    <span>Mở PWABuilder Tạo File APK</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={handleCopyUrl}
                    className="py-2.5 px-3 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 text-indigo-800 dark:text-indigo-200 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    title="Sao chép link web để dán vào PWABuilder hoặc gửi qua điện thoại"
                  >
                    {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedUrl ? 'Đã sao chép' : 'Copy Link App'}</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Direct Install on Android Phone (WebAPK) */}
              <div className="p-4 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50/80 to-teal-50/60 dark:from-emerald-950/40 dark:to-teal-950/20 space-y-3 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 shrink-0">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-sm text-emerald-950 dark:text-emerald-100">
                          Cài Đặt Tức Thì (Chuẩn Google WebAPK)
                        </h3>
                        <span className="px-2 py-0.5 bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 text-[10px] font-black rounded-full uppercase">
                          3 Giây
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                        Android tự động đóng gói WebAPK vào máy, mở toàn màn hình độc lập như app cài từ CH Play!
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
                    <span>Cài Đặt Ngay Vào Máy Android</span>
                  </button>
                </div>
              </div>

              {/* Option 3: Download Android Source Project (.ZIP) */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 shrink-0">
                      <FileCode className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                        Tải Mã Nguồn Android & File Cấu Hình (.ZIP)
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Bao gồm <code>AndroidManifest.xml</code>, <code>build.gradle</code>, <code>twa-manifest.json</code> và hướng dẫn build APK bằng Android Studio.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleDownloadAndroidPackage}
                  disabled={downloadingApkPkg}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer text-xs disabled:opacity-50"
                >
                  {downloadingApkPkg ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{downloadingApkPkg ? 'Đang tạo file ZIP...' : 'Tải Gói Cấu Hình Android (.ZIP)'}</span>
                </button>
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
