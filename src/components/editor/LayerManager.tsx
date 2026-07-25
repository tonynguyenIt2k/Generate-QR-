import React from 'react';
import { LabelElement } from '../../types/label';
import {
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  MoveUp,
  MoveDown,
  QrCode,
  Barcode,
  Type,
  Square,
  Image as ImageIcon,
} from 'lucide-react';

interface LayerManagerProps {
  elements: LabelElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string) => void;
  onUpdateElements: (elements: LabelElement[]) => void;
}

export const LayerManager: React.FC<LayerManagerProps> = ({
  elements,
  selectedElementId,
  onSelectElement,
  onUpdateElements,
}) => {
  const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex); // top layer first

  const toggleVisibility = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = elements.map((el) =>
      el.id === id ? { ...el, visible: el.visible === false ? true : false } : el
    );
    onUpdateElements(updated);
  };

  const toggleLock = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = elements.map((el) =>
      el.id === id ? { ...el, locked: !el.locked } : el
    );
    onUpdateElements(updated);
  };

  const moveLayer = (id: string, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    const index = sorted.findIndex((el) => el.id === id);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    // Swap zIndex values
    const itemA = sorted[index];
    const itemB = sorted[targetIndex];

    const tempZ = itemA.zIndex;
    itemA.zIndex = itemB.zIndex;
    itemB.zIndex = tempZ;

    onUpdateElements([...elements]);
  };

  const getElementIcon = (type: string) => {
    switch (type) {
      case 'qr':
        return <QrCode className="w-3.5 h-3.5 text-blue-500" />;
      case 'barcode':
        return <Barcode className="w-3.5 h-3.5 text-emerald-500" />;
      case 'text':
        return <Type className="w-3.5 h-3.5 text-indigo-500" />;
      case 'image':
        return <ImageIcon className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <Square className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="w-full lg:w-56 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-3 select-none text-xs flex flex-col shrink-0">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          Danh Sách Layer ({elements.length})
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
        {sorted.map((el) => {
          const isSelected = el.id === selectedElementId;
          return (
            <div
              key={el.id}
              onClick={() => onSelectElement(el.id)}
              className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-50 border-blue-400 dark:bg-blue-950/60 dark:border-blue-700 text-blue-900 dark:text-blue-100 font-medium'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 truncate pr-1">
                {getElementIcon(el.type)}
                <span className="truncate text-[11px]">{el.name || el.type}</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => moveLayer(el.id, 'up', e)}
                  className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"
                  title="Chuyển lên trên"
                >
                  <MoveUp className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => moveLayer(el.id, 'down', e)}
                  className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"
                  title="Chuyển xuống dưới"
                >
                  <MoveDown className="w-3 h-3" />
                </button>

                <button
                  onClick={(e) => toggleLock(el.id, e)}
                  className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"
                  title={el.locked ? 'Mở khóa' : 'Khóa layer'}
                >
                  {el.locked ? <Lock className="w-3 h-3 text-amber-500" /> : <Unlock className="w-3 h-3" />}
                </button>

                <button
                  onClick={(e) => toggleVisibility(el.id, e)}
                  className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"
                  title={el.visible === false ? 'Hiện layer' : 'Ẩn layer'}
                >
                  {el.visible === false ? <EyeOff className="w-3 h-3 text-red-500" /> : <Eye className="w-3 h-3" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
