import React, { useState } from 'react';
import {
  Printer,
  Download,
  FileSpreadsheet,
  LayoutTemplate,
  Moon,
  Sun,
  Plus,
  QrCode,
  Save,
  Zap,
  User as UserIcon,
  LogOut,
  LogIn,
  Check,
  Sparkles,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { LabelTemplate } from '../../types/label';

interface HeaderProps {
  currentTemplate: LabelTemplate;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onOpenTemplates: () => void;
  onOpenImportModal: () => void;
  onOpenPrintModal: (autoPrint?: boolean) => void;
  onOpenExportModal: () => void;
  onSaveTemplate: () => void;
  onNewTemplate: () => void;
  datasetCount: number;
  authUser: User | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onOpenUpdateModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTemplate,
  darkMode,
  setDarkMode,
  onOpenTemplates,
  onOpenImportModal,
  onOpenPrintModal,
  onOpenExportModal,
  onSaveTemplate,
  onNewTemplate,
  datasetCount,
  authUser,
  onOpenAuthModal,
  onLogout,
  onOpenUpdateModal,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="h-14 sm:h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 sm:px-4 flex items-center justify-between shadow-xs z-20 shrink-0 gap-2">
      {/* Brand & Active Template */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 shrink-0">
          <QrCode className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white leading-tight truncate">
              QR Label Pro
            </h1>
            <span className="hidden sm:inline px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded-full">
              v2.5
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
            <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px] sm:max-w-[200px] md:max-w-none">
              {currentTemplate.name}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded font-mono text-[10px] sm:text-[11px] shrink-0 whitespace-nowrap">
              {currentTemplate.widthMm}x{currentTemplate.heightMm}mm
            </span>
          </div>
        </div>
      </div>

      {/* Main Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1">
        {/* Direct Print Button */}
        <button
          onClick={() => onOpenPrintModal(true)}
          className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/25 rounded-lg transition-all cursor-pointer ring-2 ring-blue-500/30 active:scale-95 shrink-0 whitespace-nowrap"
          title="Bấm vào để mở hộp thoại in ngay lập tức"
        >
          <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 fill-amber-300 animate-pulse shrink-0" />
          <span className="whitespace-nowrap">IN NGAY</span>
        </button>

        {/* Data Import Excel */}
        <button
          onClick={onOpenImportModal}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/60 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="hidden lg:inline whitespace-nowrap">Nhập Excel</span>
          {datasetCount > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] font-bold bg-emerald-600 text-white rounded-full shrink-0">
              {datasetCount}
            </span>
          )}
        </button>

        {/* Template Library */}
        <button
          onClick={onOpenTemplates}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          title="Thư viện mẫu tem"
        >
          <LayoutTemplate className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 dark:text-slate-400 shrink-0" />
          <span className="hidden md:inline whitespace-nowrap">Mẫu Tem</span>
        </button>

        {/* Create New Template */}
        <button
          onClick={onNewTemplate}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/60 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          title="Tạo mẫu tem mới từ đầu"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="hidden lg:inline whitespace-nowrap">Mẫu Mới</span>
        </button>

        {/* Save / Overwrite Template */}
        <button
          onClick={onSaveTemplate}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          title="Lưu đè mẫu tem hiện tại"
        >
          <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 dark:text-slate-400 shrink-0" />
          <span className="hidden xl:inline whitespace-nowrap">Lưu Đè Mẫu</span>
        </button>

        {/* Export File */}
        <button
          onClick={onOpenExportModal}
          className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          title="Xuất File"
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 dark:text-slate-400 shrink-0" />
          <span className="hidden xl:inline whitespace-nowrap">Xuất File</span>
        </button>

        {/* Print Settings & Preview Modal Trigger */}
        <button
          onClick={() => onOpenPrintModal(false)}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          title="Mở cấu hình in"
        >
          <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="hidden md:inline whitespace-nowrap">Cấu Hình In</span>
        </button>

        {/* Auto Update EXE Button */}
        {onOpenUpdateModal && (
          <button
            type="button"
            onClick={onOpenUpdateModal}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/80 rounded-lg transition-all cursor-pointer shrink-0 shadow-xs"
            title="Kiểm tra & Tự động cập nhật ứng dụng EXE"
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="hidden xl:inline whitespace-nowrap">Cập Nhật EXE</span>
          </button>
        )}

        {/* Dark mode toggle */}
        <button
          type="button"
          onClick={() => setDarkMode(!darkMode)}
          className="p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer shrink-0 shadow-xs flex items-center justify-center"
          title={darkMode ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
        >
          {darkMode ? (
            <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 fill-indigo-500/10" />
          )}
        </button>

        {/* User Auth Profile Button */}
        <div className="relative shrink-0 ml-1">
          {authUser && !authUser.isAnonymous ? (
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 rounded-lg text-indigo-700 dark:text-indigo-300 text-xs font-bold cursor-pointer transition-all hover:bg-indigo-100"
            >
              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black uppercase">
                {authUser.email ? authUser.email.charAt(0) : 'U'}
              </div>
              <span className="hidden sm:inline truncate max-w-[110px]">
                {authUser.email ? authUser.email.split('@')[0] : 'Tài Khoản'}
              </span>
            </button>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">Đăng Nhập</span>
            </button>
          )}

          {/* User Profile Dropdown */}
          {showUserMenu && authUser && !authUser.isAnonymous && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 p-3 animate-fade-in text-xs">
              <div className="pb-2 border-b border-slate-100 dark:border-slate-700 mb-2">
                <p className="text-[11px] text-slate-400 font-medium">Đã đăng nhập với</p>
                <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{authUser.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px] rounded-md">
                  Đồng bộ riêng theo tài khoản
                </span>
              </div>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 rounded-xl font-bold cursor-pointer transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng Xuất</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

