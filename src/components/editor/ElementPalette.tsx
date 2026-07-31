import React from 'react';
import {
  QrCode,
  Barcode,
  Type,
  Square,
  Minus,
  Circle,
  Image as ImageIcon,
  Smartphone,
  Tag,
  DollarSign,
  Plus,
  PanelLeftClose,
} from 'lucide-react';
import { ElementType, LabelElement } from '../../types/label';

interface ElementPaletteProps {
  onAddElement: (element: Partial<LabelElement>) => void;
  sampleVariables?: string[];
  onToggleCollapse?: () => void;
  onWidthChange?: (newWidth: number) => void;
  currentWidth?: number;
}

export const ElementPalette: React.FC<ElementPaletteProps> = ({
  onAddElement,
  sampleVariables = ['Model', 'IMEI', 'Gia', 'Serial', 'DungLuong', 'MauSac'],
  onToggleCollapse,
  onWidthChange,
  currentWidth,
}) => {
  const handleDragStart = (e: React.DragEvent, elementData: Partial<LabelElement>) => {
    e.dataTransfer.setData('application/json', JSON.stringify(elementData));
    e.dataTransfer.setData('text/plain', JSON.stringify(elementData));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleAddText = (content = 'Nội dung chữ', fontSize = 9, fontWeight: any = 'normal', color = '#0f172a') => {
    onAddElement({
      type: 'text',
      name: 'Chữ ' + content.slice(0, 8),
      content,
      fontSize,
      fontFamily: 'sans-serif',
      fontWeight,
      fontStyle: 'normal',
      textAlign: 'left',
      color,
      width: 30,
      height: 5,
    });
  };

  const handleAddQR = (qrType: any = 'imei') => {
    onAddElement({
      type: 'qr',
      name: 'Mã QR Code',
      content: qrType === 'imei' ? 'https://check.shop.com/{{IMEI}}' : '{{Model}}',
      qrType,
      fgColor: '#0f172a',
      bgColor: '#ffffff',
      errorCorrection: 'M',
      width: 14,
      height: 14,
    });
  };

  const handleAddBarcode = (format: any = 'CODE128') => {
    onAddElement({
      type: 'barcode',
      name: 'Mã Vạch Barcode',
      content: '{{IMEI}}',
      format,
      fgColor: '#000000',
      bgColor: '#ffffff',
      displayValue: true,
      fontSize: 8,
      fontFamily: 'monospace',
      width: 32,
      height: 10,
    });
  };

  const handleAddShape = (shapeType: 'rectangle' | 'line' | 'circle') => {
    if (shapeType === 'line') {
      onAddElement({
        type: 'line',
        name: 'Đường Kẻ',
        width: 30,
        height: 0.5,
        fillColor: '#cbd5e1',
        strokeColor: '#cbd5e1',
        strokeWidth: 0.3,
      });
    } else if (shapeType === 'circle') {
      onAddElement({
        type: 'circle',
        name: 'Hình Tròn',
        width: 8,
        height: 8,
        fillColor: '#2563eb',
        strokeColor: 'transparent',
        strokeWidth: 0,
      });
    } else {
      onAddElement({
        type: 'rectangle',
        name: 'Khung Hình Chữ Nhật',
        width: 48,
        height: 6,
        fillColor: '#f1f5f9',
        strokeColor: '#cbd5e1',
        strokeWidth: 0.3,
        cornerRadius: 1,
      });
    }
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onAddElement({
        type: 'image',
        name: 'Logo / Ảnh',
        src: base64,
        keepAspectRatio: true,
        width: 12,
        height: 12,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-y-auto p-3 select-none shrink-0">
      <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-blue-500" />
          <span>Thêm Đối Tượng</span>
        </h3>
        <div className="flex items-center gap-1">
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 rounded cursor-pointer transition-colors"
              title="Thu gọn thanh bên trái"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Add Section */}
      <div className="space-y-3">
        {/* Dynamic Excel Variables Drag & Drop */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Kéo Cột Excel Vào Tem
            </label>
            <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono font-bold">
              Kéo thả
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sampleVariables.map((v) => (
              <button
                key={v}
                draggable={true}
                onDragStart={(e) =>
                  handleDragStart(e, {
                    type: 'text',
                    name: `Biến ${v}`,
                    content: `{{${v}}}`,
                    fontSize: 8,
                    fontFamily: 'sans-serif',
                    fontWeight: 'normal',
                    textAlign: 'left',
                    color: '#0f172a',
                    width: 25,
                    height: 5,
                  })
                }
                onClick={() => handleAddText(`{{${v}}}`, 8, 'normal', '#0f172a')}
                className="group flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 border border-slate-200 dark:border-slate-700 hover:border-blue-400 text-[11px] font-mono text-slate-700 dark:text-slate-200 cursor-grab active:cursor-grabbing transition-all"
                title={`Kéo vứt vào khung tem hoặc click để thêm [${v}]`}
              >
                <Tag className="w-3 h-3 text-blue-500 group-hover:scale-110 transition-transform" />
                <span>{`[${v}]`}</span>
              </button>
            ))}
          </div>
        </div>

        {/* QR Code */}
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
            Mã QR (QR Code)
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              draggable={true}
              onDragStart={(e) =>
                handleDragStart(e, {
                  type: 'qr',
                  name: 'Mã QR Code IMEI',
                  content: 'https://check.shop.com/{{IMEI}}',
                  fgColor: '#0f172a',
                  bgColor: '#ffffff',
                  errorCorrection: 'M',
                  width: 14,
                  height: 14,
                })
              }
              onClick={() => handleAddQR('imei')}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-xs text-slate-700 dark:text-slate-200 transition-all cursor-grab active:cursor-grabbing"
            >
              <QrCode className="w-4 h-4 text-blue-600" />
              <span>QR IMEI</span>
            </button>
            <button
              draggable={true}
              onDragStart={(e) =>
                handleDragStart(e, {
                  type: 'qr',
                  name: 'Mã QR Code Web',
                  content: '{{Model}}',
                  fgColor: '#0f172a',
                  bgColor: '#ffffff',
                  errorCorrection: 'M',
                  width: 14,
                  height: 14,
                })
              }
              onClick={() => handleAddQR('url')}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-xs text-slate-700 dark:text-slate-200 transition-all cursor-grab active:cursor-grabbing"
            >
              <QrCode className="w-4 h-4 text-indigo-600" />
              <span>QR Web</span>
            </button>
          </div>
        </div>

        {/* Barcode */}
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
            Mã Vạch (Barcode)
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              draggable={true}
              onDragStart={(e) =>
                handleDragStart(e, {
                  type: 'barcode',
                  name: 'Mã Vạch Code128',
                  content: '{{IMEI}}',
                  format: 'CODE128',
                  fgColor: '#000000',
                  bgColor: '#ffffff',
                  displayValue: true,
                  fontSize: 8,
                  fontFamily: 'monospace',
                  width: 32,
                  height: 10,
                })
              }
              onClick={() => handleAddBarcode('CODE128')}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-xs text-slate-700 dark:text-slate-200 transition-all cursor-grab active:cursor-grabbing"
            >
              <Barcode className="w-4 h-4 text-emerald-600" />
              <span>Code128</span>
            </button>
            <button
              draggable={true}
              onDragStart={(e) =>
                handleDragStart(e, {
                  type: 'barcode',
                  name: 'Mã Vạch EAN13',
                  content: '{{IMEI}}',
                  format: 'EAN13',
                  fgColor: '#000000',
                  bgColor: '#ffffff',
                  displayValue: true,
                  fontSize: 8,
                  fontFamily: 'monospace',
                  width: 32,
                  height: 10,
                })
              }
              onClick={() => handleAddBarcode('EAN13')}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-xs text-slate-700 dark:text-slate-200 transition-all cursor-grab active:cursor-grabbing"
            >
              <Barcode className="w-4 h-4 text-amber-600" />
              <span>EAN-13</span>
            </button>
          </div>
        </div>

        {/* Text Items */}
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
            Chữ & Biến Số (Text)
          </label>
          <div className="space-y-1.5">
            <button
              draggable={true}
              onDragStart={(e) =>
                handleDragStart(e, {
                  type: 'text',
                  name: 'Tên Máy',
                  content: '{{Model}}',
                  fontSize: 9,
                  fontWeight: 'bold',
                  textAlign: 'left',
                  color: '#0f172a',
                  width: 35,
                  height: 6,
                })
              }
              onClick={() => handleAddText('{{Model}}', 9, 'bold', '#0f172a')}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 text-xs text-slate-700 dark:text-slate-200 transition-all cursor-grab active:cursor-grabbing"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="truncate">Tên Máy [Model]</span>
            </button>
            <button
              draggable={true}
              onDragStart={(e) =>
                handleDragStart(e, {
                  type: 'text',
                  name: 'Giá Bán',
                  content: 'GIÁ: {{Gia | currency}}',
                  fontSize: 10,
                  fontWeight: '800',
                  textAlign: 'left',
                  color: '#dc2626',
                  width: 35,
                  height: 6,
                })
              }
              onClick={() => handleAddText('GIÁ: {{Gia | currency}}', 10, '800', '#dc2626')}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 text-xs text-slate-700 dark:text-slate-200 transition-all cursor-grab active:cursor-grabbing"
            >
              <DollarSign className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className="truncate">Giá Bán [Gia]</span>
            </button>
            <button
              draggable={true}
              onDragStart={(e) =>
                handleDragStart(e, {
                  type: 'text',
                  name: 'Mã IMEI',
                  content: 'IMEI: {{IMEI}}',
                  fontSize: 7,
                  fontWeight: 'bold',
                  textAlign: 'left',
                  color: '#1e293b',
                  width: 35,
                  height: 5,
                })
              }
              onClick={() => handleAddText('IMEI: {{IMEI}}', 7, 'bold', '#1e293b')}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 text-xs text-slate-700 dark:text-slate-200 transition-all cursor-grab active:cursor-grabbing"
            >
              <Tag className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate">Mã IMEI [IMEI]</span>
            </button>
            <button
              draggable={true}
              onDragStart={(e) =>
                handleDragStart(e, {
                  type: 'text',
                  name: 'Văn bản',
                  content: 'Văn bản thường',
                  fontSize: 8,
                  fontWeight: 'normal',
                  textAlign: 'left',
                  color: '#334155',
                  width: 30,
                  height: 5,
                })
              }
              onClick={() => handleAddText('Văn bản thường', 8, 'normal', '#334155')}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 text-xs text-slate-700 dark:text-slate-200 transition-all cursor-grab active:cursor-grabbing"
            >
              <Type className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>Chữ Thường Dạng Tùy Chỉnh</span>
            </button>
          </div>
        </div>

        {/* Shapes & Dividers */}
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
            Khung Hình & Đường Kẻ
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              draggable={true}
              onDragStart={(e) =>
                handleDragStart(e, {
                  type: 'rectangle',
                  name: 'Khung Hình Chữ Nhật',
                  width: 48,
                  height: 6,
                  fillColor: '#f1f5f9',
                  strokeColor: '#cbd5e1',
                  strokeWidth: 0.3,
                  cornerRadius: 1,
                })
              }
              onClick={() => handleAddShape('rectangle')}
              className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-xs text-slate-700 dark:text-slate-200 transition-all cursor-grab active:cursor-grabbing"
              title="Khung chữ nhật"
            >
              <Square className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Khung</span>
            </button>
            <button
              draggable={true}
              onDragStart={(e) =>
                handleDragStart(e, {
                  type: 'line',
                  name: 'Đường Kẻ',
                  width: 30,
                  height: 0.5,
                  fillColor: '#cbd5e1',
                  strokeColor: '#cbd5e1',
                  strokeWidth: 0.3,
                })
              }
              onClick={() => handleAddShape('line')}
              className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-xs text-slate-700 dark:text-slate-200 transition-all cursor-grab active:cursor-grabbing"
              title="Đường kẻ ngang"
            >
              <Minus className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Đường kẻ</span>
            </button>
            <button
              draggable={true}
              onDragStart={(e) =>
                handleDragStart(e, {
                  type: 'circle',
                  name: 'Hình Tròn',
                  width: 8,
                  height: 8,
                  fillColor: '#2563eb',
                  strokeColor: 'transparent',
                  strokeWidth: 0,
                })
              }
              onClick={() => handleAddShape('circle')}
              className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-xs text-slate-700 dark:text-slate-200 transition-all cursor-grab active:cursor-grabbing"
              title="Hình tròn"
            >
              <Circle className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">Tròn</span>
            </button>
          </div>
        </div>

        {/* Upload Logo / Image */}
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
            Hình Ảnh / Logo
          </label>
          <label className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 transition-all cursor-pointer">
            <ImageIcon className="w-4 h-4 text-blue-500" />
            <span>Tải Ảnh / Logo Up</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleUploadImage}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
