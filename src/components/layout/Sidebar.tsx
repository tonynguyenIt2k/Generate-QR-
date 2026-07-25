import React from 'react';
import {
  PenTool,
  Database,
  Grid2X2,
  Printer,
  LayoutTemplate,
  Sliders,
  Sparkles,
} from 'lucide-react';

export type MainTab = 'editor' | 'dataset' | 'gallery' | 'templates' | 'settings';

interface SidebarProps {
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  datasetCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  datasetCount,
}) => {
  const navItems = [
    {
      id: 'editor' as MainTab,
      label: 'Thiết Kế',
      fullLabel: 'Thiết Kế Tem',
      icon: PenTool,
    },
    {
      id: 'dataset' as MainTab,
      label: 'Excel',
      fullLabel: 'Dữ Liệu Excel',
      icon: Database,
      badge: datasetCount > 0 ? datasetCount : undefined,
    },
    {
      id: 'gallery' as MainTab,
      label: 'Danh Sách In',
      fullLabel: 'Danh Sách In (10.000+)',
      icon: Grid2X2,
    },
    {
      id: 'templates' as MainTab,
      label: 'Mẫu Tem',
      fullLabel: 'Thư Viện Mẫu',
      icon: LayoutTemplate,
    },
    {
      id: 'settings' as MainTab,
      label: 'Máy In',
      fullLabel: 'Cấu Hình Máy In',
      icon: Sliders,
    },
  ];

  return (
    <>
      {/* Desktop Left Sidebar (md screens and up) */}
      <aside className="hidden md:flex w-16 md:w-56 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col justify-between py-3 select-none z-10 shrink-0">
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="hidden md:inline truncate">{item.fullLabel}</span>
                {item.badge !== undefined && (
                  <span
                    className={`hidden md:inline-flex ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                      isActive
                        ? 'bg-white text-blue-700'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Printer Compatibility Hint Footer */}
        <div className="hidden md:block px-3 py-3 mx-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 mb-1">
            <Printer className="w-3.5 h-3.5 text-blue-500" />
            <span>Máy In Hỗ Trợ</span>
          </div>
          <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
            XPrinter, Zebra, TSC, Godex, Brother, Gprinter, Rongta, Bixolon.
          </p>
        </div>
      </aside>

      {/* Mobile & Tablet Bottom Navigation Bar (< md screens) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-1 z-40 shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-all cursor-pointer relative ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.2 text-[9px] font-extrabold bg-emerald-600 text-white rounded-full leading-none shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] truncate max-w-[64px] mt-0.5 leading-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
