import React, { useRef, useState, useEffect } from 'react';
import { DatasetRow, LabelElement, LabelTemplate } from '../../types/label';
import { substituteVariables } from '../../utils/excelHelper';
import { RulerAndGrid } from './RulerAndGrid';
import { generateQRDataUrl } from '../../utils/qrGenerator';
import { generateBarcodeDataUrl } from '../../utils/barcodeGenerator';
import {
  Edit3,
  Trash2,
  Copy,
  Lock,
  Unlock,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Plus,
  Minus,
  Check,
  RotateCw,
  Layers,
  ArrowUp,
  ArrowDown,
  QrCode,
  Barcode,
  Smartphone,
  DollarSign,
  Tag,
  MousePointer,
  Sparkles,
  Upload,
} from 'lucide-react';

interface CanvasEditorProps {
  template: LabelTemplate;
  elements: LabelElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (updated: LabelElement, saveHistory?: boolean) => void;
  onAddElement?: (element: Partial<LabelElement>) => void;
  onDeleteElement?: (id?: string) => void;
  onDuplicateElement?: (id?: string) => void;
  onLayerMove?: (direction: 'up' | 'down') => void;
  zoom: number;
  showGrid: boolean;
  snapToGrid: boolean;
  previewVariables: boolean;
  sampleDataRow: DatasetRow;
}

export const CanvasEditor: React.FC<CanvasEditorProps> = ({
  template,
  elements,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onAddElement,
  onDeleteElement,
  onDuplicateElement,
  onLayerMove,
  zoom,
  showGrid,
  snapToGrid,
  previewVariables,
  sampleDataRow,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const printableRef = useRef<HTMLDivElement>(null);
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{
    x: number;
    y: number;
    elX: number;
    elY: number;
    elW: number;
    elH: number;
  }>({
    x: 0,
    y: 0,
    elX: 0,
    elY: 0,
    elW: 0,
    elH: 0,
  });

  // Mouse hover position & live HUD coordinates
  const [mouseCanvasPos, setMouseCanvasPos] = useState<{ xMm: number; yMm: number } | null>(null);

  // Right-Click Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    canvasXMm: number;
    canvasYMm: number;
    elementId: string | null;
  } | null>(null);

  // Render cache for QR & Barcode images inside canvas
  const [qrCache, setQrCache] = useState<Record<string, string>>({});
  const [barcodeCache, setBarcodeCache] = useState<Record<string, string>>({});

  // Screen DPI conversion constant
  const mmToPx = (mm: number) => mm * (96 / 25.4) * zoom;
  const pxToMm = (px: number) => px / ((96 / 25.4) * zoom);

  const canvasWidthPx = mmToPx(template.widthMm);
  const canvasHeightPx = mmToPx(template.heightMm);

  // Clear editingTextId if selectedElementId changes
  useEffect(() => {
    if (selectedElementId !== editingTextId) {
      setEditingTextId(null);
    }
  }, [selectedElementId]);

  // Close Context Menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Signature for QR & Barcode properties so drag/resize doesn't clear/regenerate preview cache
  const qrBarcodeSignature = elements
    .map((el) =>
      el.type === 'qr'
        ? `${el.id}:${el.content}:${el.fgColor}:${el.bgColor}:${el.errorCorrection}:${el.logoUrl}:${el.logoSizeRatio}`
        : el.type === 'barcode'
        ? `${el.id}:${el.content}:${el.format}:${el.fgColor}:${el.bgColor}:${el.displayValue}:${el.fontSize}:${el.fontFamily}`
        : ''
    )
    .join('|');

  const sampleDataSignature = JSON.stringify(sampleDataRow);

  // Load QR & Barcode preview data URLs
  useEffect(() => {
    let active = true;

    async function loadPreviews() {
      const newQr: Record<string, string> = {};
      const newBar: Record<string, string> = {};

      for (const el of elements) {
        if (el.type === 'qr') {
          const content = previewVariables ? substituteVariables(el.content, sampleDataRow) : el.content;
          const url = await generateQRDataUrl({
            content,
            fgColor: el.fgColor,
            bgColor: el.bgColor,
            errorCorrection: el.errorCorrection,
            logoUrl: el.logoUrl,
            logoSizeRatio: el.logoSizeRatio,
            width: 200,
          });
          newQr[el.id] = url;
        } else if (el.type === 'barcode') {
          const content = previewVariables ? substituteVariables(el.content, sampleDataRow) : el.content;
          const url = generateBarcodeDataUrl({
            content,
            format: el.format,
            fgColor: el.fgColor,
            bgColor: el.bgColor,
            displayValue: el.displayValue,
            fontSize: el.fontSize,
            fontFamily: el.fontFamily,
          });
          newBar[el.id] = url;
        }
      }

      if (active) {
        setQrCache((prev) => ({ ...prev, ...newQr }));
        setBarcodeCache((prev) => ({ ...prev, ...newBar }));
      }
    }

    loadPreviews();
    return () => {
      active = false;
    };
  }, [qrBarcodeSignature, previewVariables, sampleDataSignature]);

  // Track Mouse Movement over canvas surface
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!printableRef.current) return;
    const rect = printableRef.current.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const yPx = e.clientY - rect.top;
    const xMm = Math.max(0, Math.min(template.widthMm, Math.round(pxToMm(xPx) * 10) / 10));
    const yMm = Math.max(0, Math.min(template.heightMm, Math.round(pxToMm(yPx) * 10) / 10));
    setMouseCanvasPos({ xMm, yMm });
  };

  // Handle Double-Click on Canvas to Add Text at Mouse Position
  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    if (!printableRef.current || !onAddElement) return;

    const rect = printableRef.current.getBoundingClientRect();
    const clickXpx = e.clientX - rect.left;
    const clickYpx = e.clientY - rect.top;

    const xMm = pxToMm(clickXpx);
    const yMm = pxToMm(clickYpx);

    const newId = `el_${Date.now()}`;
    const width = 25;
    const height = 6;

    const constrainedX = Math.max(0, Math.min(template.widthMm - width, xMm));
    const constrainedY = Math.max(0, Math.min(template.heightMm - height, yMm));

    onAddElement({
      id: newId,
      type: 'text',
      name: 'Văn bản mới',
      content: 'Nhập nội dung...',
      x: Math.round(constrainedX * 10) / 10,
      y: Math.round(constrainedY * 10) / 10,
      width,
      height,
      fontSize: 9,
      fontFamily: 'sans-serif',
      fontWeight: 'normal',
      textAlign: 'left',
      color: '#0f172a',
    });

    onSelectElement(newId);
    setEditingTextId(newId);
  };

  // Right Click Context Menu Handler
  const handleContextMenu = (e: React.MouseEvent, elId: string | null = null) => {
    e.preventDefault();
    e.stopPropagation();

    if (!printableRef.current) return;
    const rect = printableRef.current.getBoundingClientRect();
    const clickXpx = e.clientX - rect.left;
    const clickYpx = e.clientY - rect.top;

    if (elId) {
      onSelectElement(elId);
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      canvasXMm: Math.round(pxToMm(clickXpx) * 10) / 10,
      canvasYMm: Math.round(pxToMm(clickYpx) * 10) / 10,
      elementId: elId,
    });
  };

  // Handle Mouse Drag / Move
  const handleMouseDownElement = (e: React.MouseEvent, el: LabelElement) => {
    if (el.locked || editingTextId === el.id) return;
    if (e.button !== 0) return; // Only primary left click
    e.stopPropagation();
    e.preventDefault();
    onSelectElement(el.id);
    if (editingTextId && editingTextId !== el.id) {
      setEditingTextId(null);
    }

    setDraggingId(el.id);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      elX: el.x,
      elY: el.y,
      elW: el.width,
      elH: el.height,
    });
  };

  // Handle Touch Drag / Move for Mobile & Tablet
  const handleTouchStartElement = (e: React.TouchEvent, el: LabelElement) => {
    if (el.locked || editingTextId === el.id) return;
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    const touch = e.touches[0];
    onSelectElement(el.id);
    if (editingTextId && editingTextId !== el.id) {
      setEditingTextId(null);
    }

    setDraggingId(el.id);
    setDragStart({
      x: touch.clientX,
      y: touch.clientY,
      elX: el.x,
      elY: el.y,
      elW: el.width,
      elH: el.height,
    });
  };

  // Handle Resize Handle Drag
  const handleMouseDownResize = (e: React.MouseEvent, el: LabelElement, handle: string) => {
    if (el.locked) return;
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    setResizingId(el.id);
    setResizeHandle(handle);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      elX: el.x,
      elY: el.y,
      elW: el.width,
      elH: el.height,
    });
  };

  // Handle Touch Resize for Mobile & Tablet
  const handleTouchStartResize = (e: React.TouchEvent, el: LabelElement, handle: string) => {
    if (el.locked) return;
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    const touch = e.touches[0];
    setResizingId(el.id);
    setResizeHandle(handle);
    setDragStart({
      x: touch.clientX,
      y: touch.clientY,
      elX: el.x,
      elY: el.y,
      elW: el.width,
      elH: el.height,
    });
  };

  // Stable Ref for Dragging state to avoid event listener recreation loop
  const dragRef = useRef({
    draggingId,
    resizingId,
    resizeHandle,
    dragStart,
    elements,
    snapToGrid,
    template,
    zoom,
    onUpdateElement,
  });

  useEffect(() => {
    dragRef.current = {
      draggingId,
      resizingId,
      resizeHandle,
      dragStart,
      elements,
      snapToGrid,
      template,
      zoom,
      onUpdateElement,
    };
  });

  useEffect(() => {
    if (!draggingId && !resizingId) return;

    const handlePointerMove = (clientX: number, clientY: number) => {
      const {
        draggingId,
        resizingId,
        resizeHandle,
        dragStart,
        elements,
        snapToGrid,
        zoom,
        onUpdateElement: updateFn,
      } = dragRef.current;

      const safeZoom = Math.max(0.1, zoom || 1);
      const pxToMmVal = (px: number) => px / ((96 / 25.4) * safeZoom);

      if (draggingId) {
        const dxPx = clientX - dragStart.x;
        const dyPx = clientY - dragStart.y;

        let newX = dragStart.elX + pxToMmVal(dxPx);
        let newY = dragStart.elY + pxToMmVal(dyPx);

        if (isNaN(newX) || !isFinite(newX)) newX = dragStart.elX;
        if (isNaN(newY) || !isFinite(newY)) newY = dragStart.elY;

        if (snapToGrid) {
          const gridStep = 1.0; // 1mm step
          newX = Math.round(newX / gridStep) * gridStep;
          newY = Math.round(newY / gridStep) * gridStep;
        }

        const el = elements.find((item) => item.id === draggingId);
        if (el) {
          updateFn(
            {
              ...el,
              x: Math.round(Math.max(0, newX) * 10) / 10,
              y: Math.round(Math.max(0, newY) * 10) / 10,
            },
            false
          );
        }
      } else if (resizingId && resizeHandle) {
        const dxPx = clientX - dragStart.x;
        const dyPx = clientY - dragStart.y;
        const dxMm = pxToMmVal(dxPx);
        const dyMm = pxToMmVal(dyPx);

        const el = elements.find((item) => item.id === resizingId);
        if (el) {
          let x = dragStart.elX;
          let y = dragStart.elY;
          let width = dragStart.elW;
          let height = dragStart.elH;

          if (resizeHandle.includes('e')) width += dxMm;
          if (resizeHandle.includes('s')) height += dyMm;
          if (resizeHandle.includes('w')) {
            width -= dxMm;
            x += dxMm;
          }
          if (resizeHandle.includes('n')) {
            height -= dyMm;
            y += dyMm;
          }

          if (isNaN(x) || !isFinite(x)) x = dragStart.elX;
          if (isNaN(y) || !isFinite(y)) y = dragStart.elY;
          if (isNaN(width) || !isFinite(width)) width = dragStart.elW;
          if (isNaN(height) || !isFinite(height)) height = dragStart.elH;

          width = Math.max(3, Math.round(width * 10) / 10);
          height = Math.max(3, Math.round(height * 10) / 10);
          x = Math.round(Math.max(0, x) * 10) / 10;
          y = Math.round(Math.max(0, y) * 10) / 10;

          updateFn(
            {
              ...el,
              x,
              y,
              width,
              height,
            },
            false
          );
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handlePointerUp = () => {
      const { draggingId, resizingId, elements, onUpdateElement: updateFn } = dragRef.current;
      const targetId = draggingId || resizingId;
      if (targetId) {
        const el = elements.find((item) => item.id === targetId);
        if (el) {
          updateFn({ ...el }, true);
        }
      }
      setDraggingId(null);
      setResizingId(null);
      setResizeHandle(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);
    window.addEventListener('touchcancel', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handlePointerUp);
      window.removeEventListener('touchcancel', handlePointerUp);
    };
  }, [draggingId, resizingId]);

  // Handle Drag & Drop from ElementPalette or Image File onto Canvas
  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOverCanvas) setIsDragOverCanvas(true);
  };

  const handleCanvasDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverCanvas(false);
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverCanvas(false);

    if (!onAddElement || !printableRef.current) return;

    const rect = printableRef.current.getBoundingClientRect();
    const dropXpx = e.clientX - rect.left;
    const dropYpx = e.clientY - rect.top;
    const xMm = pxToMm(dropXpx);
    const yMm = pxToMm(dropYpx);

    // 1. Image File Drop
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const src = event.target?.result as string;
          onAddElement({
            type: 'image',
            name: file.name.split('.')[0] || 'Hình ảnh',
            src,
            x: Math.max(0, Math.min(template.widthMm - 15, xMm - 7.5)),
            y: Math.max(0, Math.min(template.heightMm - 15, yMm - 7.5)),
            width: 15,
            height: 15,
          });
        };
        reader.readAsDataURL(file);
        return;
      }
    }

    // 2. Palette Variable Drop
    const jsonStr = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
    if (jsonStr) {
      try {
        const data = JSON.parse(jsonStr) as Partial<LabelElement>;
        const width = data.width || 25;
        const height = data.height || 6;

        const constrainedX = Math.max(0, Math.min(template.widthMm - width, xMm - width / 2));
        const constrainedY = Math.max(0, Math.min(template.heightMm - height, yMm - height / 2));

        onAddElement({
          ...data,
          x: Math.round(constrainedX * 10) / 10,
          y: Math.round(constrainedY * 10) / 10,
        });
      } catch (err) {
        console.error('Failed to parse dropped element data:', err);
      }
    }
  };

  const selectedElement = elements.find((el) => el.id === selectedElementId);
  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      ref={containerRef}
      onClick={() => {
        onSelectElement(null);
        setEditingTextId(null);
      }}
      className="flex-1 bg-slate-200 dark:bg-slate-950 overflow-auto relative flex items-center justify-center p-12 select-none"
    >
      {/* HUD Mouse Coordinates Indicator */}
      {mouseCanvasPos && (
        <div className="absolute top-4 left-4 bg-slate-900/80 text-white backdrop-blur-md px-3 py-1.5 rounded-xl text-[11px] font-mono border border-slate-700/60 shadow-lg flex items-center gap-2 z-40 pointer-events-none">
          <MousePointer className="w-3.5 h-3.5 text-blue-400" />
          <span>
            X: <b>{mouseCanvasPos.xMm}</b> mm | Y: <b>{mouseCanvasPos.yMm}</b> mm
          </span>
          {selectedElement && (
            <span className="text-slate-400 border-l border-slate-700 pl-2">
              Chọne: {selectedElement.width}x{selectedElement.height} mm
            </span>
          )}
        </div>
      )}

      {/* Wrapper box containing rulers and printable label */}
      <div className="relative shadow-2xl rounded-sm border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all">
        {/* Millimeter Rulers */}
        <RulerAndGrid widthMm={template.widthMm} heightMm={template.heightMm} zoom={zoom} />

        {/* Printable Canvas Surface */}
        <div
          ref={printableRef}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => setMouseCanvasPos(null)}
          onDoubleClick={handleCanvasDoubleClick}
          onContextMenu={(e) => handleContextMenu(e, null)}
          onDragOver={handleCanvasDragOver}
          onDragLeave={handleCanvasDragLeave}
          onDrop={handleCanvasDrop}
          className={`relative mt-6 ml-6 bg-white overflow-hidden transition-colors cursor-crosshair ${
            isDragOverCanvas ? 'ring-4 ring-blue-500 ring-offset-2 bg-blue-50/20' : ''
          }`}
          style={{
            width: `${canvasWidthPx}px`,
            height: `${canvasHeightPx}px`,
            backgroundImage: showGrid
              ? `radial-gradient(circle, #cbd5e1 1px, transparent 1px)`
              : 'none',
            backgroundSize: `${mmToPx(2)}px ${mmToPx(2)}px`,
          }}
        >
          {/* Empty Canvas Friendly Visual Hint */}
          {elements.length === 0 && !isDragOverCanvas && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center pointer-events-none">
              <Sparkles className="w-8 h-8 text-blue-400 mb-2 animate-bounce" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Khu Vực Thiết Kế Tem (Chưa có đối tượng)
              </p>
              <p className="text-[10px] text-slate-400 max-w-[240px] mt-1 leading-relaxed">
                👉 Double-click chuột vào đây để viết chữ <br />
                👉 Kéo thả các cột Excel hoặc logo vào khung này
              </p>
            </div>
          )}

          {/* Visual indicator when dragging over canvas */}
          {isDragOverCanvas && (
            <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 pointer-events-none flex items-center justify-center z-50">
              <div className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xl flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span>Thả đối tượng / hình ảnh vào vị trí này</span>
              </div>
            </div>
          )}

          {/* Elements Render Loop */}
          {sortedElements.map((el) => {
            if (el.visible === false) return null;

            const isSelected = el.id === selectedElementId;
            const isEditing = el.id === editingTextId;
            const xPx = mmToPx(el.x);
            const yPx = mmToPx(el.y);
            const wPx = mmToPx(el.width);
            const hPx = mmToPx(el.height);

            return (
              <div
                key={el.id}
                onMouseDown={(e) => handleMouseDownElement(e, el)}
                onTouchStart={(e) => handleTouchStartElement(e, el)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectElement(el.id);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (!el.locked && el.type === 'text') {
                    onSelectElement(el.id);
                    setEditingTextId(el.id);
                  }
                }}
                onContextMenu={(e) => handleContextMenu(e, el.id)}
                className={`absolute cursor-move group transition-shadow ${
                  isSelected
                    ? 'ring-2 ring-blue-500 ring-offset-1 z-30'
                    : 'hover:ring-1 hover:ring-blue-400/80'
                }`}
                style={{
                  left: `${xPx}px`,
                  top: `${yPx}px`,
                  width: `${wPx}px`,
                  height: `${hPx}px`,
                  transform: el.rotation ? `rotate(${el.rotation}deg)` : 'none',
                  zIndex: el.zIndex,
                }}
              >
                {/* Floating On-Canvas Quick Editing Toolbar for Selected Element */}
                {isSelected && !isEditing && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="absolute -top-11 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white backdrop-blur-md px-2 py-1 rounded-xl shadow-2xl border border-slate-700/60 flex items-center gap-1 text-xs z-50 pointer-events-auto whitespace-nowrap animate-fade-in"
                  >
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setEditingTextId(el.id)}
                      className="p-1 hover:bg-slate-700 rounded-lg text-slate-200 transition-colors cursor-pointer"
                      title="Sửa nội dung trực tiếp"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                    </button>

                    {el.type === 'text' && (
                      <>
                        <span className="w-px h-3 bg-slate-700" />
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() =>
                            onUpdateElement({
                              ...el,
                              fontSize: Math.max(1, el.fontSize - 0.5),
                            })
                          }
                          className="p-1 hover:bg-slate-700 rounded-lg text-slate-200 cursor-pointer"
                          title="Giảm cỡ chữ"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] font-mono font-bold px-0.5 text-blue-300">
                          {el.fontSize}pt
                        </span>
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() =>
                            onUpdateElement({
                              ...el,
                              fontSize: el.fontSize + 0.5,
                            })
                          }
                          className="p-1 hover:bg-slate-700 rounded-lg text-slate-200 cursor-pointer"
                          title="Tăng cỡ chữ"
                        >
                          <Plus className="w-3 h-3" />
                        </button>

                        <span className="w-px h-3 bg-slate-700" />
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() =>
                            onUpdateElement({
                              ...el,
                              fontWeight: el.fontWeight === 'bold' ? 'normal' : 'bold',
                            })
                          }
                          className={`p-1 rounded-lg transition-colors cursor-pointer ${
                            el.fontWeight === 'bold'
                              ? 'bg-blue-600 text-white'
                              : 'hover:bg-slate-700 text-slate-200'
                          }`}
                          title="In đậm"
                        >
                          <Bold className="w-3 h-3" />
                        </button>

                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() =>
                            onUpdateElement({
                              ...el,
                              textAlign:
                                el.textAlign === 'left'
                                  ? 'center'
                                  : el.textAlign === 'center'
                                  ? 'right'
                                  : 'left',
                            })
                          }
                          className="p-1 hover:bg-slate-700 rounded-lg text-slate-200 cursor-pointer"
                          title="Đổi căn lề"
                        >
                          {el.textAlign === 'center' ? (
                            <AlignCenter className="w-3 h-3" />
                          ) : el.textAlign === 'right' ? (
                            <AlignRight className="w-3 h-3" />
                          ) : (
                            <AlignLeft className="w-3 h-3" />
                          )}
                        </button>
                      </>
                    )}

                    {/* Quick Rotate 90 deg */}
                    <span className="w-px h-3 bg-slate-700" />
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() =>
                        onUpdateElement({
                          ...el,
                          rotation: ((el.rotation || 0) + 90) % 360,
                        })
                      }
                      className="p-1 hover:bg-slate-700 rounded-lg text-slate-200 cursor-pointer"
                      title="Xoay 90 độ"
                    >
                      <RotateCw className="w-3 h-3 text-indigo-400" />
                    </button>

                    {/* Duplicate */}
                    {onDuplicateElement && (
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onDuplicateElement(el.id)}
                        className="p-1 hover:bg-slate-700 rounded-lg text-slate-200 cursor-pointer"
                        title="Sao chép"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}

                    {/* Lock */}
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() =>
                        onUpdateElement({
                          ...el,
                          locked: !el.locked,
                        })
                      }
                      className="p-1 hover:bg-slate-700 rounded-lg text-slate-200 cursor-pointer"
                      title={el.locked ? 'Mở khóa' : 'Khóa vị trí'}
                    >
                      {el.locked ? (
                        <Lock className="w-3 h-3 text-amber-400" />
                      ) : (
                        <Unlock className="w-3 h-3" />
                      )}
                    </button>

                    {/* Delete */}
                    {onDeleteElement && (
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onDeleteElement(el.id)}
                        className="p-1 hover:bg-red-900/60 text-red-300 rounded-lg cursor-pointer"
                        title="Xóa đối tượng"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    )}
                  </div>
                )}

                {/* Direct On-Canvas Text Editing Input */}
                {isEditing && el.type === 'text' ? (
                  <div
                    className="w-full h-full relative z-40 bg-white/90 dark:bg-slate-900/90 rounded border-2 border-blue-600 p-0.5 shadow-lg flex items-center"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <textarea
                      autoFocus
                      value={el.content}
                      onChange={(e) =>
                        onUpdateElement({
                          ...el,
                          content: e.target.value,
                        })
                      }
                      onBlur={() => setEditingTextId(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          setEditingTextId(null);
                        } else if (e.key === 'Escape') {
                          setEditingTextId(null);
                        }
                      }}
                      className="w-full h-full bg-transparent resize-none border-none outline-none leading-tight font-sans text-slate-900 dark:text-slate-100 p-0"
                      style={{
                        fontSize: `${(el.fontSize || 9) * (zoom * 1.33)}px`,
                        fontFamily: el.fontFamily || 'sans-serif',
                        fontWeight: el.fontWeight || 'normal',
                        fontStyle: el.fontStyle || 'normal',
                        color: el.color || '#0f172a',
                        textAlign: el.textAlign || 'left',
                      }}
                    />
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setEditingTextId(null)}
                      className="absolute -right-6 top-0 p-1 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 cursor-pointer"
                      title="Lưu sửa"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Element Render Content */}
                    {el.type === 'text' && (
                      <div
                        className="w-full h-full flex items-start overflow-hidden leading-tight cursor-text"
                        style={{
                          fontSize: `${el.fontSize * (zoom * 1.33)}px`,
                          fontFamily: el.fontFamily || 'sans-serif',
                          fontWeight: el.fontWeight || 'normal',
                          fontStyle: el.fontStyle || 'normal',
                          color: el.color || '#0f172a',
                          justifyContent:
                            el.textAlign === 'center'
                              ? 'center'
                              : el.textAlign === 'right'
                              ? 'flex-end'
                              : 'flex-start',
                        }}
                      >
                        {previewVariables ? substituteVariables(el.content, sampleDataRow) : el.content}
                      </div>
                    )}

                    {el.type === 'qr' && (
                      <div className="w-full h-full flex items-center justify-center overflow-hidden">
                        {qrCache[el.id] ? (
                          <img
                            src={qrCache[el.id]}
                            alt="QR Code"
                            className="w-full h-full object-contain pointer-events-none"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[9px] text-slate-400 font-mono">
                            QR Preview
                          </div>
                        )}
                      </div>
                    )}

                    {el.type === 'barcode' && (
                      <div className="w-full h-full flex items-center justify-center overflow-hidden">
                        {barcodeCache[el.id] ? (
                          <img
                            src={barcodeCache[el.id]}
                            alt="Barcode"
                            className="w-full h-full object-contain pointer-events-none"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[9px] text-slate-400 font-mono">
                            Barcode
                          </div>
                        )}
                      </div>
                    )}

                    {el.type === 'rectangle' && (
                      <div
                        className="w-full h-full"
                        style={{
                          backgroundColor: el.fillColor || 'transparent',
                          borderColor: el.strokeColor || 'transparent',
                          borderWidth: `${mmToPx(el.strokeWidth || 0)}px`,
                          borderStyle: el.strokeWidth ? 'solid' : 'none',
                          borderRadius: el.cornerRadius ? `${mmToPx(el.cornerRadius)}px` : '0',
                        }}
                      />
                    )}

                    {el.type === 'line' && (
                      <div
                        className="w-full my-auto"
                        style={{
                          height: `${mmToPx(el.strokeWidth || 0.3)}px`,
                          backgroundColor: el.strokeColor || '#000000',
                        }}
                      />
                    )}

                    {el.type === 'circle' && (
                      <div
                        className="w-full h-full rounded-full"
                        style={{
                          backgroundColor: el.fillColor || '#2563eb',
                          borderColor: el.strokeColor || 'transparent',
                          borderWidth: `${mmToPx(el.strokeWidth || 0)}px`,
                        }}
                      />
                    )}

                    {el.type === 'image' && el.src && (
                      <img
                        src={el.src}
                        alt="Uploaded"
                        className="w-full h-full object-contain pointer-events-none"
                      />
                    )}
                  </>
                )}

                {/* 8-Point Resize Handles for Selected Element */}
                {isSelected && !el.locked && !isEditing && (
                  <>
                    {/* Corners */}
                    <div
                      onMouseDown={(e) => handleMouseDownResize(e, el, 'nw')}
                      onTouchStart={(e) => handleTouchStartResize(e, el, 'nw')}
                      className="absolute -top-2 -left-2 sm:-top-1.5 sm:-left-1.5 w-4 h-4 sm:w-3 sm:h-3 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize z-40 hover:scale-125 transition-transform shadow-xs"
                      title="Kéo giãn góc trên trái"
                    />
                    <div
                      onMouseDown={(e) => handleMouseDownResize(e, el, 'ne')}
                      onTouchStart={(e) => handleTouchStartResize(e, el, 'ne')}
                      className="absolute -top-2 -right-2 sm:-top-1.5 sm:-right-1.5 w-4 h-4 sm:w-3 sm:h-3 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize z-40 hover:scale-125 transition-transform shadow-xs"
                      title="Kéo giãn góc trên phải"
                    />
                    <div
                      onMouseDown={(e) => handleMouseDownResize(e, el, 'sw')}
                      onTouchStart={(e) => handleTouchStartResize(e, el, 'sw')}
                      className="absolute -bottom-2 -left-2 sm:-bottom-1.5 sm:-left-1.5 w-4 h-4 sm:w-3 sm:h-3 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize z-40 hover:scale-125 transition-transform shadow-xs"
                      title="Kéo giãn góc dưới trái"
                    />
                    <div
                      onMouseDown={(e) => handleMouseDownResize(e, el, 'se')}
                      onTouchStart={(e) => handleTouchStartResize(e, el, 'se')}
                      className="absolute -bottom-2 -right-2 sm:-bottom-1.5 sm:-right-1.5 w-4 h-4 sm:w-3 sm:h-3 bg-white border-2 border-blue-600 rounded-full cursor-se-resize z-40 hover:scale-125 transition-transform shadow-xs"
                      title="Kéo giãn góc dưới phải"
                    />

                    {/* Edges */}
                    <div
                      onMouseDown={(e) => handleMouseDownResize(e, el, 'n')}
                      onTouchStart={(e) => handleTouchStartResize(e, el, 'n')}
                      className="absolute -top-2 left-1/2 -translate-x-1/2 sm:-top-1.5 w-4 h-4 sm:w-3 sm:h-3 bg-white border-2 border-blue-600 rounded-full cursor-ns-resize z-40 hover:scale-125 transition-transform shadow-xs"
                      title="Kéo giãn chiều cao (trên)"
                    />
                    <div
                      onMouseDown={(e) => handleMouseDownResize(e, el, 's')}
                      onTouchStart={(e) => handleTouchStartResize(e, el, 's')}
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 sm:-bottom-1.5 w-4 h-4 sm:w-3 sm:h-3 bg-white border-2 border-blue-600 rounded-full cursor-ns-resize z-40 hover:scale-125 transition-transform shadow-xs"
                      title="Kéo giãn chiều cao (dưới)"
                    />
                    <div
                      onMouseDown={(e) => handleMouseDownResize(e, el, 'w')}
                      onTouchStart={(e) => handleTouchStartResize(e, el, 'w')}
                      className="absolute top-1/2 -translate-y-1/2 -left-2 sm:-left-1.5 w-4 h-4 sm:w-3 sm:h-3 bg-white border-2 border-blue-600 rounded-full cursor-ew-resize z-40 hover:scale-125 transition-transform shadow-xs"
                      title="Kéo giãn chiều rộng (trái)"
                    />
                    <div
                      onMouseDown={(e) => handleMouseDownResize(e, el, 'e')}
                      onTouchStart={(e) => handleTouchStartResize(e, el, 'e')}
                      className="absolute top-1/2 -translate-y-1/2 -right-2 sm:-right-1.5 w-4 h-4 sm:w-3 sm:h-3 bg-white border-2 border-blue-600 rounded-full cursor-ew-resize z-40 hover:scale-125 transition-transform shadow-xs"
                      title="Kéo giãn chiều rộng (phải)"
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Mouse Right-Click Context Menu */}
      {contextMenu && (
        <div
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          className="fixed z-50 bg-slate-900/95 text-slate-100 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/80 py-1.5 w-52 text-xs font-sans animate-fade-in divide-y divide-slate-800"
        >
          {contextMenu.elementId ? (
            <>
              <div className="px-3 py-1 text-[10px] text-blue-400 font-bold font-mono">
                TÙY CHỌN ĐỐI TƯỢNG
              </div>
              <div className="py-1">
                <button
                  onClick={() => setEditingTextId(contextMenu.elementId)}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Sửa nội dung (Double click)</span>
                </button>
                {onDuplicateElement && (
                  <button
                    onClick={() => onDuplicateElement(contextMenu.elementId!)}
                    className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Nhân bản đối tượng</span>
                  </button>
                )}
                {onLayerMove && (
                  <>
                    <button
                      onClick={() => onLayerMove('up')}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 transition-colors"
                    >
                      <ArrowUp className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Chuyển lên trên lớp khác</span>
                    </button>
                    <button
                      onClick={() => onLayerMove('down')}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 transition-colors"
                    >
                      <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Hạ xuống dưới lớp khác</span>
                    </button>
                  </>
                )}
                {selectedElement && (
                  <button
                    onClick={() =>
                      onUpdateElement({
                        ...selectedElement,
                        rotation: ((selectedElement.rotation || 0) + 90) % 360,
                      })
                    }
                    className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Xoay góc 90°</span>
                  </button>
                )}
              </div>
              <div className="py-1">
                {onDeleteElement && (
                  <button
                    onClick={() => onDeleteElement(contextMenu.elementId!)}
                    className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-red-900/40 text-red-300 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Xóa đối tượng này</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="px-3 py-1 text-[10px] text-emerald-400 font-bold font-mono">
                THÊM TẠI TỌA ĐỘ ({contextMenu.canvasXMm}, {contextMenu.canvasYMm} mm)
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    if (onAddElement) {
                      onAddElement({
                        type: 'text',
                        content: 'Văn bản mới',
                        x: contextMenu.canvasXMm,
                        y: contextMenu.canvasYMm,
                        width: 25,
                        height: 6,
                      });
                    }
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 transition-colors"
                >
                  <Type className="w-3.5 h-3.5 text-blue-400" />
                  <span>Thêm văn bản tại đây</span>
                </button>
                <button
                  onClick={() => {
                    if (onAddElement) {
                      onAddElement({
                        type: 'text',
                        content: 'IMEI: {{IMEI}}',
                        x: contextMenu.canvasXMm,
                        y: contextMenu.canvasYMm,
                        width: 30,
                        height: 5,
                        fontWeight: 'bold',
                      });
                    }
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 transition-colors"
                >
                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Thêm biến IMEI {'{{IMEI}}'}</span>
                </button>
                <button
                  onClick={() => {
                    if (onAddElement) {
                      onAddElement({
                        type: 'text',
                        content: 'GIÁ: {{Gia | currency}}',
                        x: contextMenu.canvasXMm,
                        y: contextMenu.canvasYMm,
                        width: 35,
                        height: 6,
                        color: '#dc2626',
                        fontWeight: 'bold',
                      });
                    }
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 transition-colors"
                >
                  <DollarSign className="w-3.5 h-3.5 text-red-400" />
                  <span>Thêm biến Giá Bán</span>
                </button>
                <button
                  onClick={() => {
                    if (onAddElement) {
                      onAddElement({
                        type: 'qr',
                        name: 'Mã QR Code IMEI',
                        content: 'https://check.shop.com/{{IMEI}}',
                        x: contextMenu.canvasXMm,
                        y: contextMenu.canvasYMm,
                        width: 14,
                        height: 14,
                      });
                    }
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5 text-purple-400" />
                  <span>Thêm mã QR Code</span>
                </button>
                <button
                  onClick={() => {
                    if (onAddElement) {
                      onAddElement({
                        type: 'barcode',
                        name: 'Mã vạch IMEI',
                        content: '{{IMEI}}',
                        x: contextMenu.canvasXMm,
                        y: contextMenu.canvasYMm,
                        width: 32,
                        height: 10,
                      });
                    }
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 transition-colors"
                >
                  <Barcode className="w-3.5 h-3.5 text-amber-400" />
                  <span>Thêm mã vạch Barcode</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};


