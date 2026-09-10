import React, { useState, useEffect } from 'react';
import {
  Download,
  Moon,
  Sun,
  Plus,
  QrCode,
  Save,
  Check,
  Sparkles,
  Pencil,
  LogIn,
  LogOut,
  ChevronDown,
  Printer,
  Smartphone,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { LabelTemplate } from '../../types/label';

interface HeaderProps {
  currentTemplate: LabelTemplate;
  onUpdateTemplateName?: (newName: string) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onOpenTemplates?: () => void;
  onOpenImportModal?: () => void;
  onOpenPrintModal: (autoPrint?: boolean) => void;
  onOpenExportModal: () => void;
  onSaveTemplate: () => void;
  onNewTemplate: () => void;
  datasetCount?: number;
  authUser: User | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onOpenUpdateModal?: () => void;
  onOpenPwaModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTemplate,
  onUpdateTemplateName,
  darkMode,
  setDarkMode,
  onOpenPrintModal,
  onOpenExportModal,
  onSaveTemplate,
  onNewTemplate,
  authUser,
  onOpenAuthModal,
  onLogout,
  onOpenUpdateModal,
  onOpenPwaModal,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState(currentTemplate.name);

  useEffect(() => {
    setEditingNameValue(currentTemplate.name);
  }, [currentTemplate.name]);

  const handleSaveName = () => {
    setIsEditingName(false);
    if (editingNameValue.trim() && editingNameValue.trim() !== currentTemplate.name) {
      onUpdateTemplateName?.(editingNameValue.trim());
    } else {
      setEditingNameValue(currentTemplate.name);
    }
  };

  return (
    <header
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      className="min-h-[3.5rem] sm:min-h-[4rem] border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-2.5 sm:px-4 flex items-center justify-between shadow-xs z-30 shrink-0 gap-2 w-full pt-safe transition-colors duration-200"
    >
      {/* Brand & Active Template Info */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 sm:flex-initial">
        <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 shrink-0">
          <QrCode className="w-4 h-4 sm:w-6 sm:h-6" />
        </div>
        <div className="min-w-0 flex-1 sm:flex-initial">
          {/* Template Title */}
          {isEditingName ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={editingNameValue}
                onChange={(e) => setEditingNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') {
                    setIsEditingName(false);
                    setEditingNameValue(currentTemplate.name);
                  }
                }}
                onBlur={handleSaveName}
                autoFocus
                className="px-1.5 py-0.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-blue-500 rounded focus:outline-none w-32 sm:w-60 shadow-xs"
              />
              <button
                type="button"
                onClick={handleSaveName}
                className="p-1 text-emerald-600 hover:text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 rounded cursor-pointer shrink-0"
                title="Lưu tên mẫu tem"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingName(true)}
              className="flex items-center gap-1.5 group cursor-pointer"
              title="Bấm vào đây để chỉnh sửa tên mẫu tem"
            >
              <h1 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-[160px] sm:max-w-[240px] group-hover:text-blue-500 transition-colors">
                {currentTemplate.name}
              </h1>
              <Pencil className="w-3 h-3 text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-blue-500 shrink-0 transition-opacity" />
            </div>
          )}

          {/* Subtitle with dimensions & badge */}
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            <span className="font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700/80 shrink-0">
              {currentTemplate.widthMm} × {currentTemplate.heightMm} mm
            </span>
            <span className="hidden sm:inline text-slate-400">•</span>
            <span className="hidden sm:inline truncate max-w-[150px]">
              {currentTemplate.elements.length} đối tượng
            </span>
          </div>
        </div>
      </div>

      {/* MOBILE RIGHT CONTROLS (Right on Mobile) */}
      <div className="flex md:hidden items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setDarkMode(!darkMode)}
          className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-xs hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer ${
            darkMode
              ? 'bg-slate-800 text-amber-300 border-amber-500/30'
              : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}
          title={darkMode ? 'Đang ở Chế độ Tối (Bấm để chuyển Sáng)' : 'Đang ở Chế độ Sáng (Bấm để chuyển Tối)'}
        >
          {darkMode ? (
            <>
              <Moon className="w-4 h-4 text-indigo-400 fill-indigo-400/20 stroke-[2.2]" />
              <span className="text-[11px] font-bold">Tối</span>
            </>
          ) : (
            <>
              <Sun className="w-4 h-4 text-amber-500 fill-amber-500/20 stroke-[2.2]" />
              <span className="text-[11px] font-bold">Sáng</span>
            </>
          )}
        </button>
      </div>

      {/* DESKTOP ACTIONS BAR (Hidden on mobile, shown on desktop md+) */}
      <div className="hidden md:flex flex-1 min-w-0 items-center justify-center overflow-hidden px-1">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 max-w-full shrink">
          {/* Create New Template */}
          <button
            onClick={onNewTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/60 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            title="Tạo mẫu tem mới từ đầu"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="whitespace-nowrap">Mẫu Mới</span>
          </button>

          {/* Save / Overwrite Template */}
          <button
            onClick={onSaveTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            title="Lưu đè mẫu tem hiện tại"
          >
            <Save className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
            <span className="whitespace-nowrap">Lưu Đè Mẫu</span>
          </button>

          {/* Direct Install PWA / App */}
          {onOpenPwaModal && (
            <button
              type="button"
              onClick={onOpenPwaModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/60 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              title="Cài đặt ứng dụng vào điện thoại hoặc máy tính để sử dụng toàn màn hình"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="whitespace-nowrap">Cài Đặt App</span>
            </button>
          )}

          {/* Export File & APK */}
          <button
            onClick={onOpenExportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            title="Xuất File, Backup hoặc Cài đặt ứng dụng APK cho Android"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
            <span className="whitespace-nowrap">Xuất / Cài APK</span>
          </button>

          {/* Auto Update EXE Button */}
          {onOpenUpdateModal && (
            <button
              type="button"
              onClick={onOpenUpdateModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/80 rounded-lg transition-all cursor-pointer shrink-0 shadow-xs"
              title="Kiểm tra & Tự động cập nhật ứng dụng EXE"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="hidden xl:inline whitespace-nowrap">Cập Nhật EXE</span>
            </button>
          )}
        </div>
      </div>

      {/* DESKTOP RIGHT FIXED UTILITIES (Hidden on mobile, shown on desktop md+) */}
      <div className="hidden md:flex items-center gap-1.5 shrink-0 ml-auto pl-1">
        {/* Dark mode toggle */}
        <button
          type="button"
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-all cursor-pointer shrink-0 shadow-xs flex items-center justify-center"
          title={darkMode ? 'Đang ở Chế độ Tối (Bấm để chuyển Sáng)' : 'Đang ở Chế độ Sáng (Bấm để chuyển Tối)'}
        >
          {darkMode ? (
            <Moon className="w-4 h-4 text-indigo-400 fill-indigo-400/20" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500 fill-amber-500/20" />
          )}
        </button>

        {/* User Auth Profile Button & Logout */}
        <div className="relative shrink-0 flex items-center gap-1">
          {authUser && !authUser.isAnonymous ? (
            /* Account Dropdown Trigger */
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 rounded-lg text-indigo-700 dark:text-indigo-300 text-xs font-bold cursor-pointer transition-all hover:bg-indigo-100 dark:hover:bg-indigo-900/80"
              title="Bấm để xem thông tin tài khoản & đăng xuất"
            >
              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black uppercase shrink-0">
                {authUser.email ? authUser.email.charAt(0) : 'U'}
              </div>
              <span className="truncate max-w-[130px]">
                {authUser.email ? authUser.email.split('@')[0] : 'Tài Khoản'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform text-indigo-500 ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">Đăng Nhập</span>
            </button>
          )}

          {/* User Profile Dropdown Overlay & Menu */}
          {showUserMenu && authUser && !authUser.isAnonymous && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 p-4 animate-fade-in text-xs">
                <div className="pb-3 border-b border-slate-100 dark:border-slate-700/80 mb-3">
                  <p className="text-[11px] text-slate-400 font-medium">Đã đăng nhập với email:</p>
                  <p className="font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">{authUser.email}</p>
                  <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px] rounded-md">
                    Đồng bộ riêng theo tài khoản
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/80 text-red-600 dark:text-red-300 rounded-xl font-bold cursor-pointer transition-colors border border-red-200 dark:border-red-800/60 shadow-xs"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Đăng Xuất Tài Khoản</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

