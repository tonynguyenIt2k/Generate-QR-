import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PenTool,
  FileSpreadsheet,
  QrCode,
  LayoutTemplate,
  Sliders,
  Sparkles,
  Printer,
  Smartphone,
  Plus,
  Moon,
  Sun,
  X,
  User,
  ChevronUp,
  Eye,
  EyeOff,
  LogOut,
  LogIn,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { MainTab } from './Sidebar';
import { useVirtualKeyboard } from '../../hooks/useVirtualKeyboard';

interface FloatingDockProps {
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  datasetCount: number;
  darkMode: boolean;
  onToggleDarkMode: (val?: boolean) => void;
  onOpenPrintModal: (instant?: boolean) => void;
  onOpenImportModal: () => void;
  onOpenTemplateGallery: () => void;
  onOpenExportModal: () => void;
  onNewTemplate: () => void;
  onOpenAuthModal?: () => void;
  isLoggedIn?: boolean;
  authUser?: FirebaseUser | null;
  onLogout?: () => void;
  onOpenPwaModal?: () => void;
}

export const FloatingDock: React.FC<FloatingDockProps> = ({
  activeTab,
  setActiveTab,
  datasetCount,
  darkMode,
  onToggleDarkMode,
  onOpenPrintModal,
  onOpenImportModal,
  onOpenTemplateGallery,
  onOpenExportModal,
  onNewTemplate,
  onOpenAuthModal,
  isLoggedIn,
  authUser,
  onLogout,
  onOpenPwaModal,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const isKeyboardOpen = useVirtualKeyboard();

  const [autoHideEnabled, setAutoHideEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('qr_dock_auto_hide');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const menuRef = useRef<HTMLDivElement | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollPosRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);

  // Automatically close any open quick action popover menu when keyboard opens
  useEffect(() => {
    if (isKeyboardOpen) {
      setIsMenuOpen(false);
    }
  }, [isKeyboardOpen]);

  const toggleAutoHide = useCallback(() => {
    setAutoHideEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('qr_dock_auto_hide', JSON.stringify(next));
      } catch {
        // ignore
      }
      if (!next) {
        setIsVisible(true);
      }
      return next;
    });
  }, []);

  // Show dock helper
  const showDock = useCallback(() => {
    setIsVisible(true);
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  // Hide dock helper
  const hideDock = useCallback(() => {
    if (isMenuOpen || !autoHideEnabled) return;
    setIsVisible(false);
  }, [isMenuOpen, autoHideEnabled]);

  // Reset idle timer to show dock after user stops scrolling/interacting
  const resetIdleTimer = useCallback(() => {
    if (!autoHideEnabled) return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 2800);
  }, [autoHideEnabled]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Always show dock when tab changes or menu opens
  useEffect(() => {
    showDock();
  }, [activeTab, isMenuOpen, showDock]);

  // Smart Auto-Hide Scroll & Gesture Detection
  useEffect(() => {
    if (!autoHideEnabled) {
      setIsVisible(true);
      return;
    }

    const handleScroll = (e: Event) => {
      if (isMenuOpen) return;
      const target = e.target as HTMLElement | Document;
      let currentScroll = 0;

      if (target === document || target === document.documentElement || target === document.body) {
        currentScroll = window.scrollY || document.documentElement.scrollTop || 0;
      } else if (target instanceof HTMLElement) {
        currentScroll = target.scrollTop || 0;
      }

      const diff = currentScroll - lastScrollPosRef.current;
      lastScrollPosRef.current = currentScroll;

      // Scrolling Down significantly -> Hide dock
      if (diff > 10 && currentScroll > 30) {
        hideDock();
        resetIdleTimer();
      }
      // Scrolling Up -> Show dock
      else if (diff < -8) {
        showDock();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (isMenuOpen) return;
      if (e.deltaY > 15) {
        hideDock();
        resetIdleTimer();
      } else if (e.deltaY < -15) {
        showDock();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartYRef.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isMenuOpen || e.touches.length === 0) return;
      const currentY = e.touches[0].clientY;
      const diff = touchStartYRef.current - currentY;

      // Finger moving UP (content scrolls down) -> Hide dock
      if (diff > 25) {
        hideDock();
        resetIdleTimer();
      }
      // Finger moving DOWN (content scrolls up) -> Show dock
      else if (diff < -20) {
        showDock();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Hovering near the bottom 85px reveals the dock
      if (e.clientY >= window.innerHeight - 85) {
        showDock();
      }
    };

    // Capture scroll events from all nested scroll containers
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mousemove', handleMouseMove);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [autoHideEnabled, isMenuOpen, hideDock, showDock, resetIdleTimer]);

  const navItems = [
    {
      id: 'editor' as MainTab,
      label: 'Thiết Kế',
      icon: PenTool,
      tooltip: 'Thiết kế tem nhãn',
    },
    {
      id: 'dataset' as MainTab,
      label: 'Excel',
      icon: FileSpreadsheet,
      badge: datasetCount > 0 ? datasetCount : undefined,
      tooltip: 'Dữ liệu Excel',
    },
    {
      id: 'gallery' as MainTab,
      label: 'Danh Sách In',
      icon: QrCode,
      tooltip: 'Danh sách tem in mã vạch & QR',
    },
    {
      id: 'templates' as MainTab,
      label: 'Mẫu Tem',
      icon: LayoutTemplate,
      tooltip: 'Thư viện mẫu tem có sẵn',
    },
  ];

  // Trigger subtle physical vibration haptic feedback if supported by device
  const triggerHaptic = (pattern: number | number[] = 15) => {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Silently ignore if unsupported
      }
    }
  };

  // Touch & pointer gesture handling to allow smooth sliding/gliding across tabs
  const dockRef = React.useRef<HTMLDivElement>(null);

  const handlePointerSwipe = (clientX: number) => {
    if (!dockRef.current) return;
    const rect = dockRef.current.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right) return;
    const relativeX = clientX - rect.left;
    const index = Math.min(
      navItems.length - 1,
      Math.max(0, Math.floor((relativeX / rect.width) * navItems.length))
    );
    const targetItem = navItems[index];
    if (targetItem && targetItem.id !== activeTab) {
      triggerHaptic(12);
      setActiveTab(targetItem.id);
    }
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      handlePointerSwipe(e.touches[0].clientX);
    }
  };

  const activeItem = navItems.find((item) => item.id === activeTab) || navItems[0];
  const ActiveIcon = activeItem.icon;

  const isEffectivelyVisible = isVisible && !isKeyboardOpen;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center justify-end pointer-events-none pb-3 sm:pb-5 px-3 sm:px-4 select-none">
      {/* ========================================================= */}
      {/* SMART MINI SUMMON PILL (Revealed when dock is hidden by scroll, NOT when keyboard is open) */}
      {/* ========================================================= */}
      <AnimatePresence>
        {!isEffectivelyVisible && !isKeyboardOpen && (
          <motion.button
            key="dock-summon-pill"
            initial={{ y: 30, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => {
              triggerHaptic(15);
              showDock();
            }}
            onMouseEnter={showDock}
            title="Bấm hoặc rê chuột để hiện thanh điều hướng"
            className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 dark:bg-slate-800/90 hover:bg-slate-900 dark:hover:bg-slate-700 text-white backdrop-blur-xl border border-white/20 shadow-xl shadow-black/25 cursor-pointer group active:scale-95 transition-transform mb-1"
          >
            <div className="flex items-center gap-1.5">
              <ActiveIcon className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="text-[11px] font-bold text-slate-200">{activeItem.label}</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-white/40" />
            <ChevronUp className="w-3.5 h-3.5 text-white/80 group-hover:-translate-y-0.5 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MAIN DOCK CONTAINER (Animated Slide Up / Down)             */}
      {/* ========================================================= */}
      <motion.div
        animate={{
          y: isEffectivelyVisible ? 0 : 100,
          opacity: isEffectivelyVisible ? 1 : 0,
          scale: isEffectivelyVisible ? 1 : 0.94,
        }}
        transition={{
          type: 'spring',
          stiffness: 380,
          damping: 30,
          mass: 0.65,
        }}
        className={`flex items-center gap-2.5 sm:gap-3 relative w-full max-w-md sm:max-w-lg ${
          isEffectivelyVisible ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        {/* ========================================================= */}
        {/* MAIN FROSTED GLASS DOCK PILL (Pure Liquid Frosted Glass)  */}
        {/* ========================================================= */}
        <div
          id="liquid-glass-dock"
          ref={dockRef}
          onTouchMove={onTouchMove}
          className="liquid-glass-dock relative flex-1 flex items-center h-16 sm:h-18 px-2 sm:px-2.5 rounded-full transition-all duration-300 touch-none shadow-[0_14px_40px_rgba(0,0,0,0.15)]"
        >
          {/* Shimmer & Glass specular background container (overflow-hidden to contain wave) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
            {/* Subtle glossy top specular reflection highlight */}
            <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/40 to-transparent pointer-events-none rounded-full" />
            {/* Periodic 10s Liquid Glass Shimmer Wave */}
            <div className="w-1/3 h-full bg-gradient-to-r from-transparent via-white/35 dark:via-white/20 to-transparent animate-liquid-shimmer pointer-events-none" />
          </div>

          {/* Navigation Tab Items Grid */}
          <div className="flex items-center justify-between w-full h-full relative">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  id={`dock-tab-${item.id}`}
                  onClick={() => {
                    triggerHaptic(18);
                    setActiveTab(item.id);
                  }}
                  className="relative flex-1 h-13 sm:h-15 mx-0.5 sm:mx-1 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 ease-out focus:outline-none select-none group hover:scale-105 active:scale-90"
                >
                  {/* Floating Glass Tooltip (Desktop Hover) */}
                  <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 translate-y-1.5 group-hover:opacity-100 group-hover:translate-y-0 scale-95 group-hover:scale-100 transition-all duration-200 pointer-events-none z-50 hidden sm:flex flex-col items-center">
                    <div className="px-2.5 py-1 rounded-xl bg-slate-900/95 dark:bg-slate-800/95 text-white text-[11px] font-semibold whitespace-nowrap shadow-xl border border-white/20 backdrop-blur-md flex items-center gap-1.5">
                      <span className="text-cyan-400 font-bold">{item.label}</span>
                      <span className="text-slate-300 font-normal text-[10px]">· {item.tooltip}</span>
                    </div>
                    {/* Tooltip Downward Caret */}
                    <div className="w-2 h-2 bg-slate-900/95 dark:bg-slate-800/95 rotate-45 border-r border-b border-white/20 -mt-1" />
                  </div>
                  {/* Inactive tab hover glass indicator */}
                  {!isActive && (
                    <div className="absolute inset-y-1 inset-x-1 rounded-full bg-white/0 group-hover:bg-white/30 dark:group-hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none" />
                  )}

                  {/* Active White Liquid Glass Water Drop (Giọt nước kính lỏng trắng hình oval to tròn cong theo đường cong của dock) */}
                  {isActive && (
                    <motion.div
                      layoutId="activeDockIndicator"
                      className="liquid-waterdrop-oval absolute inset-y-0.5 inset-x-0.5 sm:inset-y-1 sm:inset-x-1 rounded-full overflow-hidden"
                      transition={{
                        type: 'spring',
                        stiffness: 450,
                        damping: 28,
                        mass: 0.75,
                      }}
                    >
                      {/* Top-Left Water droplet specular bulb gloss reflection */}
                      <div className="absolute top-1.5 left-3 sm:left-4 w-4 sm:w-5 h-1.5 bg-white/95 rounded-full blur-[0.3px] pointer-events-none" />
                      {/* Ambient liquid water gloss sheen */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/70 via-transparent to-black/5 pointer-events-none" />
                      {/* Smooth top curved specular line */}
                      <div className="absolute inset-x-3 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none rounded-full" />
                    </motion.div>
                  )}

                  {/* Icon & Badge */}
                  <div className="relative z-10 flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-active:scale-90">
                    <Icon
                      className={`w-6 h-6 sm:w-7 sm:h-7 transition-all duration-200 ${
                        isActive
                          ? 'text-cyan-600 dark:text-cyan-400 fill-cyan-500/15 stroke-[2.5] drop-shadow-sm scale-105'
                          : 'text-slate-700/80 dark:text-slate-300/80 group-hover:text-slate-950 dark:group-hover:text-white group-hover:opacity-100 stroke-[2.1]'
                      }`}
                    />

                    {/* Numeric Badge (e.g. for Excel rows) */}
                    {item.badge !== undefined && (
                      <span
                        className={`absolute -top-1.5 -right-2.5 min-w-4.5 h-4.5 px-1 flex items-center justify-center text-[9px] font-black rounded-full shadow-xs ${
                          isActive
                            ? 'bg-cyan-500 text-white font-extrabold shadow-sm'
                            : 'bg-emerald-500 text-white group-hover:scale-105'
                        }`}
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* DETACHED CIRCULAR 3D QUICK LAUNCHER ORB (Pure Frosted Glass) */}
        {/* ========================================================= */}
        <div ref={menuRef} className="relative shrink-0 group">
          {/* Floating Glass Tooltip for Launcher Orb (Desktop Hover) */}
          {!isMenuOpen && (
            <div className="absolute bottom-full mb-3 right-0 opacity-0 translate-y-1.5 group-hover:opacity-100 group-hover:translate-y-0 scale-95 group-hover:scale-100 transition-all duration-200 pointer-events-none z-50 hidden sm:flex flex-col items-end">
              <div className="px-2.5 py-1 rounded-xl bg-slate-900/95 dark:bg-slate-800/95 text-white text-[11px] font-semibold whitespace-nowrap shadow-xl border border-white/20 backdrop-blur-md flex items-center gap-1.5">
                <span className="text-amber-400 font-bold">Tác Vụ Nhanh</span>
                <span className="text-slate-300 font-normal text-[10px]">· Phím tắt & In ấn</span>
              </div>
              {/* Tooltip Downward Caret */}
              <div className="w-2 h-2 bg-slate-900/95 dark:bg-slate-800/95 rotate-45 border-r border-b border-white/20 -mt-1 mr-7" />
            </div>
          )}

          <button
            id="dock-launcher-orb"
            onClick={() => {
              triggerHaptic(20);
              setIsMenuOpen(!isMenuOpen);
            }}
            className="liquid-glass-orb w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 opacity-95 hover:opacity-100 hover:scale-108 active:scale-95 group relative overflow-hidden focus:outline-none shadow-[0_12px_32px_rgba(0,0,0,0.14)] hover:shadow-[0_16px_36px_rgba(0,0,0,0.22)]"
          >
            {/* Glossy radial overlay */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/40 via-transparent to-black/10 pointer-events-none" />

            {/* Periodic 10s Liquid Glass Shimmer Wave for Orb */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
              <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent animate-liquid-shimmer pointer-events-none" />
            </div>

            {/* Custom 3D Isometric 4-Color Glossy Rounded Pill / Sphere Grid (Fully Rounded Organic Shapes matching screenshot) */}
            <div className="relative w-7.5 h-7.5 sm:w-8.5 sm:h-8.5 grid grid-cols-2 gap-1.5 p-0.5 transform group-hover:rotate-6 transition-transform duration-300">
              {/* Cyan Top-Left - Soft organic rounded pill */}
              <div className="rounded-full bg-gradient-to-br from-cyan-300 via-cyan-400 to-teal-500 shadow-sm shadow-cyan-400/50 border border-white/60 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white/90 rounded-full -mt-1 -ml-1 blur-[0.3px]" />
              </div>

              {/* Royal Blue Top-Right - Smooth rounded capsule */}
              <div className="rounded-full bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 shadow-sm shadow-blue-500/50 border border-white/60 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white/90 rounded-full -mt-1 -ml-1 blur-[0.3px]" />
              </div>

              {/* Amber / Orange Bottom-Left - Fully rounded circular badge */}
              <div className="rounded-full bg-gradient-to-br from-amber-300 via-orange-400 to-amber-500 shadow-sm shadow-orange-400/50 border border-white/60 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white/90 rounded-full -mt-1 -ml-1 blur-[0.3px]" />
              </div>

              {/* Lime / Green Bottom-Right - Rounded gem */}
              <div className="rounded-full bg-gradient-to-br from-lime-300 via-emerald-400 to-green-500 shadow-sm shadow-emerald-400/50 border border-white/60 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white/90 rounded-full -mt-1 -ml-1 blur-[0.3px]" />
              </div>

              {/* Twinkling Star sparkle accent (Top-Left corner) */}
              <Sparkles className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 text-white fill-white drop-shadow-md animate-pulse pointer-events-none" />
            </div>
          </button>

          {/* Quick Action Frosted Popover Menu */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 15 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="absolute bottom-full right-0 mb-3 w-[min(calc(100vw-32px),300px)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/80 dark:border-slate-700/80 rounded-3xl shadow-2xl p-2.5 space-y-1.5 z-50 ring-1 ring-black/5 dark:ring-white/10"
              >
                {/* Header */}
                <div className="px-3 py-2 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100">
                      Tác Vụ Nhanh
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      triggerHaptic(10);
                      setIsMenuOpen(false);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Action 1: Print Instantly */}
                <button
                  onClick={() => {
                    triggerHaptic(15);
                    setIsMenuOpen(false);
                    onOpenPrintModal(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer group active:scale-98"
                >
                  <div className="p-1.5 rounded-xl bg-white/20">
                    <Printer className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <div>In Tem Ngay</div>
                    <div className="text-[10px] text-blue-100 font-normal">Mở hộp thoại in ấn hàng loạt</div>
                  </div>
                </button>

                {/* Action 2: Settings & Printer Config (Moved from dock) */}
                <button
                  onClick={() => {
                    triggerHaptic(15);
                    setIsMenuOpen(false);
                    setActiveTab('settings');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer text-left"
                >
                  <div className="p-1.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div>Cấu Hình Khổ Tem & Máy In</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Thông số khổ tem, sao lưu & máy in</div>
                  </div>
                </button>

                {/* Action 3: Import Excel */}
                <button
                  onClick={() => {
                    triggerHaptic(15);
                    setIsMenuOpen(false);
                    onOpenImportModal();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer text-left"
                >
                  <div className="p-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div>Nhập Dữ Liệu Excel</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Nạp danh sách sản phẩm / QR</div>
                  </div>
                </button>

                {/* Action 4: Install PWA / App */}
                <button
                  onClick={() => {
                    triggerHaptic(15);
                    setIsMenuOpen(false);
                    if (onOpenPwaModal) {
                      onOpenPwaModal();
                    } else {
                      onOpenExportModal();
                    }
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer text-left"
                >
                  <div className="p-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span>Cài Đặt Dùng Như App</span>
                      <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 text-[9px] font-bold rounded">MỚI</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Dùng full màn hình không cần trình duyệt</div>
                  </div>
                </button>

                {/* Action 5: New Template */}
                <button
                  onClick={() => {
                    triggerHaptic(15);
                    setIsMenuOpen(false);
                    onNewTemplate();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer text-left"
                >
                  <div className="p-1.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div>Tạo Mẫu Tem Trắng</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Thiết kế tem nhãn từ đầu</div>
                  </div>
                </button>

                {/* Smart Auto-hide Dock Toggle Option */}
                <button
                  onClick={() => {
                    triggerHaptic(12);
                    toggleAutoHide();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer text-left border-t border-slate-200/50 dark:border-slate-800/50 pt-2"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400">
                      {autoHideEnabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-xs">Tự Động Ẩn Hiện Dock</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                        {autoHideEnabled ? 'Đang bật (Tự ẩn khi cuộn)' : 'Đang tắt (Ghim cố định)'}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`w-8 h-4.5 rounded-full transition-colors flex items-center p-0.5 ${
                      autoHideEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                        autoHideEnabled ? 'translate-x-3.5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </button>

                {/* User Profile & Auth Status Section */}
                {authUser && !authUser.isAnonymous ? (
                  <div className="pt-2 mt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                    <div className="p-2.5 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center text-xs font-black uppercase shadow-xs shrink-0 ring-2 ring-indigo-300 dark:ring-indigo-700">
                          {authUser.photoURL ? (
                            <img
                              src={authUser.photoURL}
                              alt="Avatar"
                              referrerPolicy="no-referrer"
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : authUser.email ? (
                            authUser.email.charAt(0).toUpperCase()
                          ) : (
                            'U'
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                              {authUser.displayName || (authUser.email ? authUser.email.split('@')[0] : 'Tài Khoản')}
                            </span>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Cloud
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {authUser.email || 'Đã đồng bộ hóa dữ liệu'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-0.5">
                        {onOpenAuthModal && (
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic(10);
                              setIsMenuOpen(false);
                              onOpenAuthModal();
                            }}
                            className="flex-1 py-1.5 px-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-bold text-[11px] rounded-xl border border-indigo-200 dark:border-indigo-800 text-center transition-colors cursor-pointer shadow-xs active:scale-98"
                          >
                            Quản Lý Tài Khoản
                          </button>
                        )}
                        {onLogout && (
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic(15);
                              setIsMenuOpen(false);
                              onLogout();
                            }}
                            className="py-1.5 px-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-600 dark:text-red-300 font-bold text-[11px] rounded-xl border border-red-200 dark:border-red-800/60 flex items-center gap-1 transition-colors cursor-pointer shadow-xs active:scale-98"
                            title="Đăng xuất tài khoản"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Đăng Xuất</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  onOpenAuthModal && (
                    <div className="pt-2 mt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic(15);
                          setIsMenuOpen(false);
                          onOpenAuthModal();
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 cursor-pointer active:scale-98 transition-all"
                      >
                        <div className="flex items-center gap-2.5 text-left">
                          <div className="p-1.5 rounded-xl bg-white/20">
                            <LogIn className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold">Đăng Nhập / Đăng Ký</div>
                            <div className="text-[10px] font-normal text-indigo-100/90">Lưu & Đồng bộ Cloud tự động</div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">Cloud</span>
                      </button>
                    </div>
                  )
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
