import React from 'react';
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
  RotateCcw,
  Zap,
} from 'lucide-react';
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
}) => {
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
            <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[160px] sm:max-w-[240px] md:max-w-none">
              {currentTemplate.name}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded font-mono text-[10px] sm:text-[11px] shrink-0 whitespace-nowrap">
              {currentTemplate.widthMm}x{currentTemplate.heightMm}mm
            </span>
          </div>
        </div>
      </div>

      {/* Main Actions - Horizontal Scrollable on Mobile */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1">
        {/* Quick Direct Print Button (Always prominent) */}
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
          title="Mẫu Tem"
        >
          <LayoutTemplate className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 dark:text-slate-400 shrink-0" />
          <span className="hidden md:inline whitespace-nowrap">Mẫu Tem</span>
        </button>

        {/* Save Template */}
        <button
          onClick={onSaveTemplate}
          className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          title="Lưu mẫu tem"
        >
          <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 dark:text-slate-400 shrink-0" />
          <span className="hidden xl:inline whitespace-nowrap">Lưu Mẫu</span>
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

        {/* Dark mode toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
          title="Chuyển chế độ Sáng / Tối"
        >
          {darkMode ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
        </button>
      </div>
    </header>
  );
};
