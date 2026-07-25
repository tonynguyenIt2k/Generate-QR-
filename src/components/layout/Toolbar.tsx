import React from 'react';
import {
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Magnet,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Lock,
  Unlock,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
} from 'lucide-react';

interface ToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  setZoom: (fn: (z: number) => number) => void;
  showGrid: boolean;
  setShowGrid: (val: boolean) => void;
  snapToGrid: boolean;
  setSnapToGrid: (val: boolean) => void;
  previewVariables: boolean;
  setPreviewVariables: (val: boolean) => void;
  selectedElementId: string | null;
  selectedElementLocked?: boolean;
  onAlign: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onLockToggle: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onLayerMove: (direction: 'up' | 'down') => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  setZoom,
  showGrid,
  setShowGrid,
  snapToGrid,
  setSnapToGrid,
  previewVariables,
  setPreviewVariables,
  selectedElementId,
  selectedElementLocked,
  onAlign,
  onLockToggle,
  onDuplicate,
  onDelete,
  onLayerMove,
}) => {
  return (
    <div className="h-11 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 flex items-center justify-between overflow-x-auto no-scrollbar select-none gap-2 shrink-0">
      {/* Left: History & Zoom */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          disabled={!canUndo}
          onClick={onUndo}
          className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 rounded transition-colors cursor-pointer"
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          disabled={!canRedo}
          onClick={onRedo}
          className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 rounded transition-colors cursor-pointer"
          title="Redo (Ctrl+Y)"
        >
          <Redo className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

        {/* Zoom controls */}
        <button
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
          className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
          title="Thu Nhỏ"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300 min-w-10 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
          className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
          title="Phóng To"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(() => 1.5)}
          className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
          title="Khôi phục zoom (150%)"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

        {/* Grid & Magnet */}
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            showGrid
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Bật/Tắt Lưới Lưới (Grid)"
        >
          <Grid className="w-4 h-4" />
        </button>
        <button
          onClick={() => setSnapToGrid(!snapToGrid)}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            snapToGrid
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Bật/Tắt Hít Lưới (Snap to Grid)"
        >
          <Magnet className="w-4 h-4" />
        </button>
      </div>

      {/* Center: Selected Element Operations */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          disabled={!selectedElementId}
          onClick={() => onAlign('left')}
          className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 rounded cursor-pointer"
          title="Căn Trái"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          disabled={!selectedElementId}
          onClick={() => onAlign('center')}
          className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 rounded cursor-pointer"
          title="Căn Giữa Ngang"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          disabled={!selectedElementId}
          onClick={() => onAlign('right')}
          className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 rounded cursor-pointer"
          title="Căn Phải"
        >
          <AlignRight className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

        <button
          disabled={!selectedElementId}
          onClick={() => onAlign('top')}
          className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 rounded cursor-pointer"
          title="Căn Trên"
        >
          <AlignStartVertical className="w-4 h-4" />
        </button>
        <button
          disabled={!selectedElementId}
          onClick={() => onAlign('middle')}
          className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 rounded cursor-pointer"
          title="Căn Giữa Dọc"
        >
          <AlignCenterVertical className="w-4 h-4" />
        </button>
        <button
          disabled={!selectedElementId}
          onClick={() => onAlign('bottom')}
          className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 rounded cursor-pointer"
          title="Căn Dưới"
        >
          <AlignEndVertical className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

        {/* Lock & Layer */}
        <button
          disabled={!selectedElementId}
          onClick={onLockToggle}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            selectedElementLocked
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30'
          }`}
          title={selectedElementLocked ? 'Mở Khóa Đối Tượng' : 'Khóa Đối Tượng'}
        >
          {selectedElementLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        </button>
        <button
          disabled={!selectedElementId}
          onClick={() => onLayerMove('up')}
          className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 rounded cursor-pointer"
          title="Đưa Lên Trên"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <button
          disabled={!selectedElementId}
          onClick={() => onLayerMove('down')}
          className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 rounded cursor-pointer"
          title="Đưa Xuống Dưới"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
        <button
          disabled={!selectedElementId}
          onClick={onDuplicate}
          className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 rounded cursor-pointer"
          title="Nhân Bản (Ctrl+D)"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          disabled={!selectedElementId}
          onClick={onDelete}
          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-30 rounded cursor-pointer"
          title="Xóa Đối Tượng (Delete)"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Right: Variable Live Preview Toggle */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setPreviewVariables(!previewVariables)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors cursor-pointer ${
            previewVariables
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
          }`}
          title="Xem trước giá trị thực tế của biến {{...}}"
        >
          {previewVariables ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>Xem Biến</span>
        </button>
      </div>
    </div>
  );
};
