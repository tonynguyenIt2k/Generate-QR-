import React from 'react';
import {
  DatasetRow,
  LabelElement,
  LabelTemplate,
  TextElement,
  QRElement,
  BarcodeElement,
  ShapeElement,
  ImageElement,
  QRErrorCorrection,
  BarcodeFormat,
  QRType,
} from '../../types/label';
import { substituteVariables } from '../../utils/excelHelper';
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
  Sparkles,
  PanelRightClose,
  Sliders,
  Maximize2,
  Keyboard,
  Layers,
  FileText,
  CheckCircle2,
} from 'lucide-react';

interface PropertiesPanelProps {
  selectedElement: LabelElement | null;
  onUpdateElement: (updated: LabelElement) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  sampleVariables: string[];
  sampleDataRow?: DatasetRow;
  onUpdateDatasetValue?: (key: string, value: string) => void;
  onToggleCollapse?: () => void;
  onWidthChange?: (newWidth: number) => void;
  currentWidth?: number;
  template?: LabelTemplate;
  onUpdateTemplate?: (updated: LabelTemplate) => void;
  elementsCount?: number;
  onFitCanvas?: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  sampleVariables,
  sampleDataRow,
  onUpdateDatasetValue,
  onToggleCollapse,
  onWidthChange,
  currentWidth,
  template,
  onUpdateTemplate,
  elementsCount = 0,
  onFitCanvas,
}) => {
  if (!selectedElement) {
    return (
      <div className="w-full h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-3.5 flex flex-col justify-between text-slate-600 dark:text-slate-300 select-none overflow-y-auto">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-[11px]">
              <Sliders className="w-3.5 h-3.5 text-blue-500" />
              <span>THUỘC TÍNH TEM</span>
            </div>
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 cursor-pointer"
                title="Thu gọn bảng thuộc tính"
              >
                <PanelRightClose className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Hint Card */}
          <div className="bg-blue-50/80 dark:bg-slate-800/80 border border-blue-200/80 dark:border-slate-700 rounded-xl p-3 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-400 text-xs">
              <Info className="w-4 h-4 shrink-0 text-blue-500" />
              <span>Chưa Chọn Đối Tượng</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Nhấp trực tiếp vào một văn bản, mã QR, Barcode hoặc hình ảnh trên tem để tùy chỉnh thuộc tính chi tiết.
            </p>
          </div>

          {/* Template Info & Editing Card */}
          {template && (
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/70 rounded-xl p-3 space-y-3 text-xs">
              <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  Cấu Hình Mẫu Tem
                </span>
                <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-medium">
                  {template.category || 'Mẫu Tem'}
                </span>
              </div>

              {/* Template Name Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block">
                  Tên Mẫu Tem:
                </label>
                <input
                  type="text"
                  value={template.name}
                  onChange={(e) => {
                    if (onUpdateTemplate) {
                      onUpdateTemplate({
                        ...template,
                        name: e.target.value,
                        updatedAt: new Date().toISOString(),
                      });
                    }
                  }}
                  placeholder="Nhập tên mẫu tem..."
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Size Dimensions Inputs */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Rộng (mm):</label>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={template.widthMm}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val > 0 && onUpdateTemplate) {
                        onUpdateTemplate({ ...template, widthMm: val });
                      }
                    }}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Cao (mm):</label>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={template.heightMm}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val > 0 && onUpdateTemplate) {
                        onUpdateTemplate({ ...template, heightMm: val });
                      }
                    }}
                    className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Dual-Part Checkbox Toggle */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!template.isDualPart}
                    onChange={(e) => {
                      if (onUpdateTemplate) {
                        onUpdateTemplate({
                          ...template,
                          isDualPart: e.target.checked,
                          updatedAt: new Date().toISOString(),
                        });
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block leading-tight">
                      Mẫu Tem Đôi (In 2 Máy / Tem)
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                      Phần trên = Hàng 1 Excel, Phần dưới = Hàng 2 Excel
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span>Số Lớp Phần Tử:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  {elementsCount} Layer
                </span>
              </div>
            </div>
          )}

          {/* Quick Fit Action */}
          {onFitCanvas && (
            <button
              type="button"
              onClick={onFitCanvas}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Phóng Vừa Khung Màn Hình</span>
            </button>
          )}

          {/* Shortcuts Box */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Keyboard className="w-3.5 h-3.5" />
              <span>Phím Tắt Hỗ Trợ</span>
            </div>
            <div className="text-[11px] space-y-1 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <div className="flex justify-between items-center">
                <span>Di chuyển tinh chỉnh</span>
                <kbd className="bg-white dark:bg-slate-700 border px-1 rounded text-[10px] font-mono">Phím mũi tên</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span>Xóa phần tử</span>
                <kbd className="bg-white dark:bg-slate-700 border px-1 rounded text-[10px] font-mono">Delete / Backspace</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span>Hoàn tác / Lặp lại</span>
                <kbd className="bg-white dark:bg-slate-700 border px-1 rounded text-[10px] font-mono">Ctrl + Z / Y</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span>Zoom bằng chuột</span>
                <kbd className="bg-white dark:bg-slate-700 border px-1 rounded text-[10px] font-mono">Ctrl + Cuộn chuột</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 flex items-center gap-1 justify-center">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span>Sẵn sàng chỉnh sửa & xuất in</span>
        </div>
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
    <div className="w-full h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-y-auto p-3 text-xs select-none shrink-0 space-y-4">
      {/* Header / Title */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <span className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-[11px] truncate mr-1">
          Thuộc Tính ({selectedElement.type.toUpperCase()})
        </span>
        <div className="flex items-center gap-1 shrink-0">
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
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 rounded cursor-pointer transition-colors"
              title="Thu gọn bảng thuộc tính"
            >
              <PanelRightClose className="w-3.5 h-3.5" />
            </button>
          )}
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
      {selectedElement.type === 'text' && (() => {
        const textEl = selectedElement as TextElement;
        const rawContent = textEl.content || '';
        const varMatch = rawContent.match(/\{\{\s*([a-zA-Z0-9_]+)(?:\s*\|\s*[a-zA-Z0-9_]+)?\s*\}\}/);
        const linkedVar = varMatch ? varMatch[1] : null;
        const currentDataValue = linkedVar && sampleDataRow ? (sampleDataRow[linkedVar] ?? '') : '';

        return (
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            {linkedVar ? (
              <div className="bg-blue-50/80 dark:bg-blue-950/50 p-2.5 rounded-xl border border-blue-200 dark:border-blue-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Nội dung thực tế (Cột {linkedVar})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdateDatasetValue) {
                        onUpdateDatasetValue(linkedVar, String(currentDataValue) + '\n');
                      }
                    }}
                    className="text-[10px] bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold cursor-pointer"
                    title="Thêm xuống dòng vào dữ liệu thực tế"
                  >
                    + Xuống dòng
                  </button>
                </div>

                <textarea
                  rows={3}
                  value={String(currentDataValue)}
                  onChange={(e) => {
                    if (onUpdateDatasetValue) {
                      onUpdateDatasetValue(linkedVar, e.target.value);
                    }
                  }}
                  className="w-full px-2 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-sans leading-relaxed"
                  placeholder="Nhập nội dung hiển thị (Bấm Enter để xuống dòng)..."
                />
                <div className="flex items-center justify-between text-[10px] text-blue-800 dark:text-blue-300">
                  <span>💡 Enter để xuống dòng nhiều dòng.</span>
                  <button
                    type="button"
                    onClick={() => {
                      const staticVal = substituteVariables(rawContent, sampleDataRow || {});
                      handleChange('content', staticVal);
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                  >
                    Tách thành văn bản tĩnh
                  </button>
                </div>

                <div className="pt-2 border-t border-blue-200/60 dark:border-blue-800/60">
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                    Công thức mã biến (Template)
                  </span>
                  <input
                    type="text"
                    value={rawContent}
                    onChange={(e) => handleChange('content', e.target.value)}
                    className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono"
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                    Nội dung Văn Bản
                  </label>
                  <button
                    type="button"
                    onClick={() => handleChange('content', rawContent + '\n')}
                    className="text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-medium cursor-pointer"
                    title="Thêm dòng mới"
                  >
                    + Xuống dòng
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={rawContent}
                  onChange={(e) => handleChange('content', e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-sans leading-relaxed"
                  placeholder="Nhập nội dung (Bấm Enter để xuống dòng) hoặc {{BienExcel}}"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 Hỗ trợ xuống dòng bằng phím Enter. Tất cả các dòng sẽ giữ nguyên vị trí khi in tem.
                </p>
              </div>
            )}

          <div className="grid grid-cols-3 gap-2">
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
              <span className="text-[10px] text-slate-400">Giãn dòng</span>
              <input
                type="number"
                step="0.1"
                min="0.8"
                max="3.0"
                value={(selectedElement as TextElement).lineHeight || 1.15}
                onChange={(e) => handleNumChange('lineHeight', e.target.value)}
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
        );
      })()}

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
