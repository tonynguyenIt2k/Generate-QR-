import React from 'react';
import {
  LabelElement,
  TextElement,
  QRElement,
  BarcodeElement,
  ShapeElement,
  ImageElement,
  QRErrorCorrection,
  BarcodeFormat,
  QRType,
} from '../../types/label';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Lock,
  Unlock,
  Trash2,
  Copy,
  Info,
} from 'lucide-react';

interface PropertiesPanelProps {
  selectedElement: LabelElement | null;
  onUpdateElement: (updated: LabelElement) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  sampleVariables: string[];
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  sampleVariables,
}) => {
  if (!selectedElement) {
    return (
      <div className="w-full lg:w-64 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-4 flex flex-col items-center justify-center text-center select-none text-slate-400 shrink-0 min-h-[200px]">
        <Info className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-xs font-medium">Chọn một đối tượng trên tem để chỉnh sửa thuộc tính</p>
      </div>
    );
  }

  const handleChange = (field: string, value: any) => {
    onUpdateElement({
      ...selectedElement,
      [field]: value,
    } as LabelElement);
  };

  const handleNumChange = (field: string, value: string) => {
    const num = parseFloat(value);
    handleChange(field, isNaN(num) ? 0 : num);
  };

  const insertVariable = (varName: string) => {
    if (selectedElement.type === 'text' || selectedElement.type === 'qr' || selectedElement.type === 'barcode') {
      const current = selectedElement.content || '';
      handleChange('content', `${current} {{${varName}}}`);
    }
  };

  return (
    <div className="w-full lg:w-64 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-y-auto p-3 text-xs select-none shrink-0 space-y-4">
      {/* Header / Title */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <span className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-[11px]">
          Thuộc Tính ({selectedElement.type.toUpperCase()})
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onDuplicateElement(selectedElement.id)}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 cursor-pointer"
            title="Nhân bản"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDeleteElement(selectedElement.id)}
            className="p-1 hover:bg-red-50 dark:hover:bg-red-950/40 rounded text-red-600 cursor-pointer"
            title="Xóa đối tượng"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Geometry Settings (Position & Size in mm) */}
      <div className="space-y-2">
        <label className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px]">
          Tọa độ & Kích thước (mm)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-slate-400">Tọa độ X</span>
            <input
              type="number"
              step="0.5"
              value={selectedElement.x}
              onChange={(e) => handleNumChange('x', e.target.value)}
              className="w-full mt-0.5 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-400">Tọa độ Y</span>
            <input
              type="number"
              step="0.5"
              value={selectedElement.y}
              onChange={(e) => handleNumChange('y', e.target.value)}
              className="w-full mt-0.5 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-400">Rộng (Width)</span>
            <input
              type="number"
              step="0.5"
              value={selectedElement.width}
              onChange={(e) => handleNumChange('width', e.target.value)}
              className="w-full mt-0.5 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-400">Cao (Height)</span>
            <input
              type="number"
              step="0.5"
              value={selectedElement.height}
              onChange={(e) => handleNumChange('height', e.target.value)}
              className="w-full mt-0.5 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
            />
          </div>
        </div>

        {/* Rotation */}
        <div>
          <span className="text-[10px] text-slate-400">Góc Xoay (độ)</span>
          <input
            type="number"
            value={selectedElement.rotation || 0}
            onChange={(e) => handleNumChange('rotation', e.target.value)}
            className="w-full mt-0.5 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
          />
        </div>
      </div>

      {/* Dynamic Variables Quick Token Chips */}
      {(selectedElement.type === 'text' || selectedElement.type === 'qr' || selectedElement.type === 'barcode') && (
        <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
          <label className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px]">
            Chèn Biến Excel Tự Động
          </label>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {sampleVariables.map((v) => (
              <button
                key={v}
                onClick={() => insertVariable(v)}
                className="px-1.5 py-0.5 text-[10px] bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded font-mono border border-blue-200 dark:border-blue-800 cursor-pointer"
              >
                + [{v}]
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TYPE-SPECIFIC CONTROLS */}

      {/* TEXT CONTROLS */}
      {selectedElement.type === 'text' && (
        <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Nội dung Văn Bản
            </label>
            <textarea
              rows={2}
              value={(selectedElement as TextElement).content}
              onChange={(e) => handleChange('content', e.target.value)}
              className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              placeholder="Nhập nội dung hoặc {{BienExcel}}"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-400">Cỡ chữ (pt)</span>
              <input
                type="number"
                step="0.5"
                value={(selectedElement as TextElement).fontSize}
                onChange={(e) => handleNumChange('fontSize', e.target.value)}
                className="w-full mt-0.5 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400">Màu chữ</span>
              <input
                type="color"
                value={(selectedElement as TextElement).color || '#000000'}
                onChange={(e) => handleChange('color', e.target.value)}
                className="w-full h-7 mt-0.5 p-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer"
              />
            </div>
          </div>

          {/* Font Family & Styles */}
          <div>
            <span className="text-[10px] text-slate-400">Phông chữ</span>
            <select
              value={(selectedElement as TextElement).fontFamily || 'sans-serif'}
              onChange={(e) => handleChange('fontFamily', e.target.value)}
              className="w-full mt-0.5 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="sans-serif">Sans-Serif (Standard)</option>
              <option value="monospace">Monospace (Mã IMEI/Serial)</option>
              <option value="serif">Serif (Cổ điển)</option>
              <option value="Arial">Arial</option>
              <option value="Roboto">Roboto</option>
              <option value="Playfair Display">Playfair Display</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                handleChange(
                  'fontWeight',
                  (selectedElement as TextElement).fontWeight === 'bold' ? 'normal' : 'bold'
                )
              }
              className={`p-1.5 rounded border ${
                (selectedElement as TextElement).fontWeight === 'bold'
                  ? 'bg-blue-100 border-blue-400 text-blue-700'
                  : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
              }`}
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() =>
                handleChange(
                  'fontStyle',
                  (selectedElement as TextElement).fontStyle === 'italic' ? 'normal' : 'italic'
                )
              }
              className={`p-1.5 rounded border ${
                (selectedElement as TextElement).fontStyle === 'italic'
                  ? 'bg-blue-100 border-blue-400 text-blue-700'
                  : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
              }`}
            >
              <Italic className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

            <button
              onClick={() => handleChange('textAlign', 'left')}
              className={`p-1.5 rounded border ${
                (selectedElement as TextElement).textAlign === 'left'
                  ? 'bg-blue-100 border-blue-400 text-blue-700'
                  : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
              }`}
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleChange('textAlign', 'center')}
              className={`p-1.5 rounded border ${
                (selectedElement as TextElement).textAlign === 'center'
                  ? 'bg-blue-100 border-blue-400 text-blue-700'
                  : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
              }`}
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleChange('textAlign', 'right')}
              className={`p-1.5 rounded border ${
                (selectedElement as TextElement).textAlign === 'right'
                  ? 'bg-blue-100 border-blue-400 text-blue-700'
                  : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
              }`}
            >
              <AlignRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* QR CONTROLS */}
      {selectedElement.type === 'qr' && (
        <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Dữ Liệu QR Code
            </label>
            <textarea
              rows={2}
              value={(selectedElement as QRElement).content}
              onChange={(e) => handleChange('content', e.target.value)}
              className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-400">Sửa lỗi QR (ECC)</span>
              <select
                value={(selectedElement as QRElement).errorCorrection || 'M'}
                onChange={(e) => handleChange('errorCorrection', e.target.value as QRErrorCorrection)}
                className="w-full mt-0.5 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <option value="L">L (Thấp - 7%)</option>
                <option value="M">M (Vừa - 15%)</option>
                <option value="Q">Q (Cao - 25%)</option>
                <option value="H">H (Tối đa - 30%)</option>
              </select>
            </div>
            <div>
              <span className="text-[10px] text-slate-400">Màu mã QR</span>
              <input
                type="color"
                value={(selectedElement as QRElement).fgColor || '#000000'}
                onChange={(e) => handleChange('fgColor', e.target.value)}
                className="w-full h-7 mt-0.5 p-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* BARCODE CONTROLS */}
      {selectedElement.type === 'barcode' && (
        <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Dữ Liệu Barcode
            </label>
            <input
              type="text"
              value={(selectedElement as BarcodeElement).content}
              onChange={(e) => handleChange('content', e.target.value)}
              className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
            />
          </div>

          <div>
            <span className="text-[10px] text-slate-400">Chuẩn Barcode</span>
            <select
              value={(selectedElement as BarcodeElement).format || 'CODE128'}
              onChange={(e) => handleChange('format', e.target.value as BarcodeFormat)}
              className="w-full mt-0.5 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            >
              <option value="CODE128">Code 128 (Đa năng)</option>
              <option value="CODE39">Code 39 (Standard)</option>
              <option value="EAN13">EAN-13 (13 chữ số)</option>
              <option value="UPC">UPC-A (12 chữ số)</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-700 dark:text-slate-300">Hiện chữ dưới mã</span>
            <input
              type="checkbox"
              checked={(selectedElement as BarcodeElement).displayValue ?? true}
              onChange={(e) => handleChange('displayValue', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* SHAPE CONTROLS */}
      {(selectedElement.type === 'rectangle' || selectedElement.type === 'circle' || selectedElement.type === 'line') && (
        <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-400">Màu Nền (Fill)</span>
              <input
                type="color"
                value={(selectedElement as ShapeElement).fillColor || '#ffffff'}
                onChange={(e) => handleChange('fillColor', e.target.value)}
                className="w-full h-7 mt-0.5 p-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400">Màu Viền (Stroke)</span>
              <input
                type="color"
                value={(selectedElement as ShapeElement).strokeColor || '#000000'}
                onChange={(e) => handleChange('strokeColor', e.target.value)}
                className="w-full h-7 mt-0.5 p-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer"
              />
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-400">Độ dày viền (mm)</span>
            <input
              type="number"
              step="0.1"
              value={(selectedElement as ShapeElement).strokeWidth ?? 0.3}
              onChange={(e) => handleNumChange('strokeWidth', e.target.value)}
              className="w-full mt-0.5 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>
        </div>
      )}
    </div>
  );
};
