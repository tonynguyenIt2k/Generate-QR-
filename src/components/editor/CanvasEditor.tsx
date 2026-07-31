import React, { useRef, useState, useEffect, useCallback } from 'react';
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
  Pencil,
  X,
  Group,
  Ungroup,
  Folder,
  Component,
} from 'lucide-react';

interface CanvasEditorProps {
  template: LabelTemplate;
  elements: LabelElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (updated: LabelElement, saveHistory?: boolean) => void;
  onUpdateElements?: (updated: LabelElement[], saveHistory?: boolean) => void;
  onAddElement?: (element: Partial<LabelElement>) => void;
  onDeleteElement?: (id?: string) => void;
  onDuplicateElement?: (id?: string) => void;
  onLayerMove?: (direction: 'up' | 'down') => void;
  zoom: number;
  onZoomChange?: (newZoom: number) => void;
  showGrid: boolean;
  snapToGrid: boolean;
  previewVariables: boolean;
  sampleDataRow: DatasetRow;
  secondDataRow?: DatasetRow;
  dataset?: DatasetRow[];
  onUpdateDatasetValue?: (key: string, value: string) => void;
}

export const CanvasEditor: React.FC<CanvasEditorProps> = ({
  template,
  elements,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onUpdateElements,
  onAddElement,
  onDeleteElement,
  onDuplicateElement,
  onLayerMove,
  zoom,
  onZoomChange,
  showGrid,
  snapToGrid,
  previewVariables,
  sampleDataRow,
  secondDataRow,
  dataset,
  onUpdateDatasetValue,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const printableRef = useRef<HTMLDivElement>(null);
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const modalOpenTimeRef = useRef<number>(0);

  useEffect(() => {
    if (editingTextId) {
      modalOpenTimeRef.current = Date.now();
    }
  }, [editingTextId]);
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

  // Multi-Selection & Grouping States
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [marqueeStart, setMarqueeStart] = useState<{ xPx: number; yPx: number } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<{ xPx: number; yPx: number } | null>(null);
  const [multiDragStart, setMultiDragStart] = useState<{
    x: number;
    y: number;
    positions: Record<string, { x: number; y: number }>;
  } | null>(null);

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

  // Sync selectedElementIds when selectedElementId prop or elements change
  useEffect(() => {
    if (selectedElementId) {
      const target = elements.find((e) => e.id === selectedElementId);
      if (target?.groupId) {
        const groupMembers = elements.filter((e) => e.groupId === target.groupId).map((e) => e.id);
        setSelectedElementIds(groupMembers);
      } else {
        setSelectedElementIds((prev) => (prev.includes(selectedElementId) ? prev : [selectedElementId]));
      }
    } else {
      setSelectedElementIds([]);
    }
  }, [selectedElementId, elements]);

  // Helper to select an element or its group with Shift key support
  const selectElementOrGroup = useCallback(
    (id: string | null, isShift: boolean = false) => {
      if (!id) {
        setSelectedElementIds([]);
        onSelectElement(null);
        return;
      }
      const target = elements.find((e) => e.id === id);
      if (!target) return;

      const targetGroupIds = target.groupId
        ? elements.filter((e) => e.groupId === target.groupId).map((e) => e.id)
        : [target.id];

      if (isShift) {
        setSelectedElementIds((prev) => {
          const alreadyIn = targetGroupIds.every((gId) => prev.includes(gId));
          let updated: string[];
          if (alreadyIn) {
            updated = prev.filter((gId) => !targetGroupIds.includes(gId));
          } else {
            updated = Array.from(new Set([...prev, ...targetGroupIds]));
          }
          onSelectElement(updated[0] || null);
          return updated;
        });
      } else {
        setSelectedElementIds(targetGroupIds);
        onSelectElement(targetGroupIds[0] || null);
      }
    },
    [elements, onSelectElement]
  );

  // Grouping Action Handler
  const handleGroupElements = useCallback(() => {
    if (selectedElementIds.length < 2) return;
    const newGroupId = `group_${Date.now()}`;
    const updated = elements.map((el) => {
      if (selectedElementIds.includes(el.id)) {
        return { ...el, groupId: newGroupId };
      }
      return el;
    });

    if (onUpdateElements) {
      onUpdateElements(updated, true);
    } else {
      updated.forEach((el) => {
        if (selectedElementIds.includes(el.id)) {
          onUpdateElement(el, true);
        }
      });
    }
  }, [selectedElementIds, elements, onUpdateElements, onUpdateElement]);

  // Ungrouping Action Handler
  const handleUngroupElements = useCallback(() => {
    if (selectedElementIds.length === 0) return;
    const groupIds = new Set(
      elements
        .filter((el) => selectedElementIds.includes(el.id) && el.groupId)
        .map((el) => el.groupId!)
    );

    if (groupIds.size === 0) return;

    const updated = elements.map((el) => {
      if (el.groupId && groupIds.has(el.groupId)) {
        const copy = { ...el };
        delete copy.groupId;
        return copy;
      }
      return el;
    });

    if (onUpdateElements) {
      onUpdateElements(updated, true);
    } else {
      updated.forEach((el) => {
        if (el.groupId && groupIds.has(el.groupId)) {
          const copy = { ...el };
          delete copy.groupId;
          onUpdateElement(copy, true);
        }
      });
    }
  }, [selectedElementIds, elements, onUpdateElements, onUpdateElement]);

  // Group Alignment Action Handler
  const handleAlignSelected = useCallback(
    (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      if (selectedElementIds.length === 0) return;
      const selectedEls = elements.filter((el) => selectedElementIds.includes(el.id));
      if (selectedEls.length === 0) return;

      const minX = Math.min(...selectedEls.map((e) => e.x));
      const maxX = Math.max(...selectedEls.map((e) => e.x + e.width));
      const minY = Math.min(...selectedEls.map((e) => e.y));
      const maxY = Math.max(...selectedEls.map((e) => e.y + e.height));

      const centerX = minX + (maxX - minX) / 2;
      const centerY = minY + (maxY - minY) / 2;

      const updated = elements.map((el) => {
        if (!selectedElementIds.includes(el.id) || el.locked) return el;
        let x = el.x;
        let y = el.y;

        if (direction === 'left') x = minX;
        else if (direction === 'center') x = centerX - el.width / 2;
        else if (direction === 'right') x = maxX - el.width;
        else if (direction === 'top') y = minY;
        else if (direction === 'middle') y = centerY - el.height / 2;
        else if (direction === 'bottom') y = maxY - el.height;

        x = Math.round(Math.max(0, x) * 10) / 10;
        y = Math.round(Math.max(0, y) * 10) / 10;

        return { ...el, x, y };
      });

      if (onUpdateElements) {
        onUpdateElements(updated, true);
      } else {
        updated.forEach((el) => {
          if (selectedElementIds.includes(el.id)) {
            onUpdateElement(el, true);
          }
        });
      }
    },
    [selectedElementIds, elements, onUpdateElements, onUpdateElement]
  );

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

  // Helper for dual-part template element dataset resolution (Odd/Row 1 = Top, Even/Row 2 = Bottom)
  const getElementDataRow = useCallback(
    (el: LabelElement): Record<string, any> => {
      const isDual = template.isDualPart || template.id.includes('dual');
      if (!isDual) return sampleDataRow;

      const isTop = el.id.startsWith('top-') || el.y + el.height / 2 < template.heightMm / 2;

      // 1. If explicit dataset passed with >= 2 rows
      if (dataset && dataset.length >= 2) {
        return isTop ? dataset[0] : dataset[1];
      }
      if (secondDataRow && Object.keys(secondDataRow).length > 0) {
        return isTop ? sampleDataRow : secondDataRow;
      }

      // 2. If row has _oddRow or _evenRow attached
      if (sampleDataRow._oddRow || sampleDataRow._evenRow) {
        return isTop ? sampleDataRow._oddRow || sampleDataRow : sampleDataRow._evenRow || {};
      }

      // 3. If template has sampleData._sampleOdd / _sampleEven
      if (sampleDataRow._sampleOdd || sampleDataRow._sampleEven) {
        return isTop ? sampleDataRow._sampleOdd || sampleDataRow : sampleDataRow._sampleEven || sampleDataRow;
      }

      // 4. Default fallback: Top gets sampleDataRow, Bottom gets modified Serial/IMEI
      if (isTop) return sampleDataRow;
      return {
        ...sampleDataRow,
        Serial: sampleDataRow.Serial
          ? String(sampleDataRow.Serial).includes('01')
            ? String(sampleDataRow.Serial).replace('01', '02')
            : `${sampleDataRow.Serial}-2`
          : 'F2LXK982P02',
        IMEI: sampleDataRow.IMEI
          ? String(sampleDataRow.IMEI).replace(/1$/, '2')
          : '356782091234562',
      };
    },
    [template, sampleDataRow, secondDataRow, dataset]
  );

  // Load QR & Barcode preview data URLs
  useEffect(() => {
    let active = true;

    async function loadPreviews() {
      const newQr: Record<string, string> = {};
      const newBar: Record<string, string> = {};

      for (const el of elements) {
        const elDataRow = getElementDataRow(el);
        if (el.type === 'qr') {
          const content = previewVariables ? substituteVariables(el.content, elDataRow) : el.content;
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
          const content = previewVariables ? substituteVariables(el.content, elDataRow) : el.content;
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
  }, [qrBarcodeSignature, previewVariables, sampleDataSignature, getElementDataRow]);

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

  // Rubber-band marquee selection handlers
  useEffect(() => {
    if (!marqueeStart) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!printableRef.current) return;
      const rect = printableRef.current.getBoundingClientRect();
      const xPx = e.clientX - rect.left;
      const yPx = e.clientY - rect.top;
      setMarqueeEnd({ xPx, yPx });
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      if (marqueeStart && marqueeEnd && printableRef.current) {
        const dx = Math.abs(marqueeEnd.xPx - marqueeStart.xPx);
        const dy = Math.abs(marqueeEnd.yPx - marqueeStart.yPx);

        if (dx > 5 || dy > 5) {
          const minXmm = pxToMm(Math.min(marqueeStart.xPx, marqueeEnd.xPx));
          const maxXmm = pxToMm(Math.max(marqueeStart.xPx, marqueeEnd.xPx));
          const minYmm = pxToMm(Math.min(marqueeStart.yPx, marqueeEnd.yPx));
          const maxYmm = pxToMm(Math.max(marqueeStart.yPx, marqueeEnd.yPx));

          const hit = elements.filter((el) => {
            if (el.visible === false) return false;
            const elRight = el.x + el.width;
            const elBottom = el.y + el.height;
            return !(el.x > maxXmm || elRight < minXmm || el.y > maxYmm || elBottom < minYmm);
          });

          const hitGroupIds = new Set<string>();
          hit.forEach((el) => {
            if (el.groupId) {
              elements.filter((e) => e.groupId === el.groupId).forEach((e) => hitGroupIds.add(e.id));
            } else {
              hitGroupIds.add(el.id);
            }
          });

          const finalIds = Array.from(hitGroupIds);
          if (finalIds.length > 0) {
            setSelectedElementIds(finalIds);
            onSelectElement(finalIds[0]);
          } else if (!e.shiftKey) {
            setSelectedElementIds([]);
            onSelectElement(null);
          }
        }
      }
      setMarqueeStart(null);
      setMarqueeEnd(null);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [marqueeStart, marqueeEnd, elements, pxToMm, onSelectElement]);

  // Global Hotkeys Listener for Grouping, Delete, Arrow Nudge
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          handleUngroupElements();
        } else {
          handleGroupElements();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const allIds = elements.filter((el) => el.visible !== false && !el.locked).map((el) => el.id);
        setSelectedElementIds(allIds);
        if (allIds.length > 0) onSelectElement(allIds[0]);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementIds.length > 0 && !editingTextId) {
          e.preventDefault();
          if (onDeleteElement) {
            selectedElementIds.forEach((id) => onDeleteElement(id));
          }
          setSelectedElementIds([]);
          onSelectElement(null);
        }
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedElementIds.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 2.0 : 0.5;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;

        const updated = elements.map((el) => {
          if (selectedElementIds.includes(el.id) && !el.locked) {
            return {
              ...el,
              x: Math.round(Math.max(0, el.x + dx) * 10) / 10,
              y: Math.round(Math.max(0, el.y + dy) * 10) / 10,
            };
          }
          return el;
        });

        if (onUpdateElements) {
          onUpdateElements(updated, true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedElementIds,
    elements,
    editingTextId,
    handleGroupElements,
    handleUngroupElements,
    onDeleteElement,
    onSelectElement,
    onUpdateElements,
  ]);

  // Handle Mouse Drag / Move
  const handleMouseDownElement = (e: React.MouseEvent, el: LabelElement) => {
    if (el.locked) return;
    if (e.button !== 0) return; // Only primary left click
    e.stopPropagation();

    // Direct inline text editing on double click
    if (e.detail === 2 && el.type === 'text') {
      e.preventDefault();
      onSelectElement(el.id);
      setEditingTextId(el.id);
      setDraggingId(null);
      return;
    }

    if (editingTextId === el.id) return;

    e.preventDefault();

    const isShift = e.shiftKey || e.metaKey || e.ctrlKey;
    let currentSelection = selectedElementIds;

    if (!selectedElementIds.includes(el.id) && !isShift) {
      selectElementOrGroup(el.id, false);
      currentSelection = el.groupId
        ? elements.filter((item) => item.groupId === el.groupId).map((item) => item.id)
        : [el.id];
    } else if (isShift) {
      selectElementOrGroup(el.id, true);
      currentSelection = selectedElementIds.includes(el.id)
        ? selectedElementIds.filter((id) => id !== el.id)
        : [...selectedElementIds, el.id];
    }

    if (editingTextId && editingTextId !== el.id) {
      setEditingTextId(null);
    }

    setDraggingId(el.id);

    // Store start positions of ALL items in currentSelection
    const startPositions: Record<string, { x: number; y: number }> = {};
    elements.forEach((item) => {
      if (currentSelection.includes(item.id)) {
        startPositions[item.id] = { x: item.x, y: item.y };
      }
    });

    setMultiDragStart({
      x: e.clientX,
      y: e.clientY,
      positions: startPositions,
    });

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

    selectElementOrGroup(el.id, false);
    if (editingTextId && editingTextId !== el.id) {
      setEditingTextId(null);
    }

    setDraggingId(el.id);
    const startPositions: Record<string, { x: number; y: number }> = {};
    elements.forEach((item) => {
      if (selectedElementIds.includes(item.id) || item.id === el.id) {
        startPositions[item.id] = { x: item.x, y: item.y };
      }
    });

    setMultiDragStart({
      x: touch.clientX,
      y: touch.clientY,
      positions: startPositions,
    });

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
    multiDragStart,
    elements,
    snapToGrid,
    template,
    zoom,
    onUpdateElement,
    onUpdateElements,
  });

  useEffect(() => {
    dragRef.current = {
      draggingId,
      resizingId,
      resizeHandle,
      dragStart,
      multiDragStart,
      elements,
      snapToGrid,
      template,
      zoom,
      onUpdateElement,
      onUpdateElements,
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
        multiDragStart,
        elements,
        snapToGrid,
        zoom,
        onUpdateElement: updateFn,
        onUpdateElements: updateFnPlural,
      } = dragRef.current;

      const safeZoom = Math.max(0.1, zoom || 1);
      const pxToMmVal = (px: number) => px / ((96 / 25.4) * safeZoom);

      if (draggingId && multiDragStart && Object.keys(multiDragStart.positions).length > 0) {
        const dxPx = clientX - multiDragStart.x;
        const dyPx = clientY - multiDragStart.y;
        const dxMm = pxToMmVal(dxPx);
        const dyMm = pxToMmVal(dyPx);

        const updatedEls = elements.map((item) => {
          if (multiDragStart.positions[item.id] && !item.locked) {
            const start = multiDragStart.positions[item.id];
            let newX = start.x + dxMm;
            let newY = start.y + dyMm;
            if (snapToGrid) {
              const gridStep = 1.0;
              newX = Math.round(newX / gridStep) * gridStep;
              newY = Math.round(newY / gridStep) * gridStep;
            }
            return {
              ...item,
              x: Math.round(Math.max(0, newX) * 10) / 10,
              y: Math.round(Math.max(0, newY) * 10) / 10,
            };
          }
          return item;
        });

        if (updateFnPlural) {
          updateFnPlural(updatedEls, false);
        } else {
          const el = updatedEls.find((item) => item.id === draggingId);
          if (el) updateFn(el, false);
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
      const {
        draggingId,
        resizingId,
        elements,
        onUpdateElement: updateFn,
        onUpdateElements: updateFnPlural,
      } = dragRef.current;

      if (draggingId && updateFnPlural) {
        updateFnPlural(elements, true);
      } else if (resizingId) {
        const el = elements.find((item) => item.id === resizingId);
        if (el) {
          updateFn({ ...el }, true);
        }
      }
      setDraggingId(null);
      setMultiDragStart(null);
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

  const handleFitCanvas = () => {
    if (!containerRef.current || !onZoomChange) return;
    const contW = containerRef.current.clientWidth - 80;
    const contH = containerRef.current.clientHeight - 80;
    if (contW <= 0 || contH <= 0) return;
    const pxPerMm = 96 / 25.4; // ~3.7795
    const zoomW = contW / (template.widthMm * pxPerMm);
    const zoomH = contH / (template.heightMm * pxPerMm);
    const idealZoom = Math.min(zoomW, zoomH);
    const clampedZoom = Math.max(1.0, Math.min(10.0, Math.round(idealZoom * 10) / 10));
    onZoomChange(clampedZoom);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleFitCanvas();
    }, 150);
    return () => clearTimeout(timer);
  }, [template.widthMm, template.heightMm, template.id]);

  const handleWheelZoom = (e: React.WheelEvent) => {
    if ((e.ctrlKey || e.metaKey) && onZoomChange) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.2 : -0.2;
      const nextZoom = Math.max(0.5, Math.min(5.0, Math.round((zoom + delta) * 100) / 100));
      onZoomChange(nextZoom);
    }
  };

  const selectedEls = elements.filter((el) => selectedElementIds.includes(el.id));
  const hasGroupSelected = selectedEls.some((e) => e.groupId);
  const multiSelectionBoundingBox =
    selectedEls.length > 1
      ? {
          minX: Math.min(...selectedEls.map((e) => e.x)),
          maxX: Math.max(...selectedEls.map((e) => e.x + e.width)),
          minY: Math.min(...selectedEls.map((e) => e.y)),
          maxY: Math.max(...selectedEls.map((e) => e.y + e.height)),
        }
      : null;

  return (
    <div
      ref={containerRef}
      onWheel={handleWheelZoom}
      onClick={(e) => {
        if (Date.now() - modalOpenTimeRef.current < 350) return;
        if (e.target === containerRef.current) {
          selectElementOrGroup(null);
          setEditingTextId(null);
        }
      }}
      className="flex-1 bg-slate-200 dark:bg-slate-950 overflow-auto relative flex items-center justify-center p-6 sm:p-8 select-none"
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
              Chọn: {selectedElement.width}x{selectedElement.height} mm
            </span>
          )}
        </div>
      )}

      {/* Floating Action Toolbar for Multi-Selection & Grouping */}
      {selectedElementIds.length > 1 && (
        <div className="absolute top-4 right-4 bg-slate-900/90 text-slate-100 backdrop-blur-md px-3.5 py-2 rounded-2xl text-xs font-sans border border-slate-700/80 shadow-2xl flex items-center gap-2 z-40 animate-fade-in">
          <span className="font-bold text-blue-400 text-[11px] font-mono mr-1">
            Đã chọn {selectedElementIds.length} phần tử
          </span>
          <button
            onClick={handleGroupElements}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-[11px] flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            title="Nhóm các phần tử (Ctrl+G)"
          >
            <Group className="w-3.5 h-3.5" />
            <span>Nhóm (Group)</span>
          </button>
          {hasGroupSelected && (
            <button
              onClick={handleUngroupElements}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium text-[11px] flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer border border-slate-700"
              title="Bỏ nhóm (Ctrl+Shift+G)"
            >
              <Ungroup className="w-3.5 h-3.5" />
              <span>Bỏ Nhóm</span>
            </button>
          )}
          <div className="w-px h-4 bg-slate-700 mx-1" />
          {/* Alignment Buttons */}
          <button
            onClick={() => handleAlignSelected('left')}
            className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Căn lề trái"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleAlignSelected('center')}
            className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Căn giữa ngang"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleAlignSelected('right')}
            className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Căn lề phải"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Wrapper box containing rulers and printable label */}
      <div className="relative shadow-2xl rounded-sm border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all m-auto shrink-0">
        {/* Millimeter Rulers */}
        <RulerAndGrid widthMm={template.widthMm} heightMm={template.heightMm} zoom={zoom} />

        {/* Printable Canvas Surface */}
        <div
          ref={printableRef}
          onMouseDown={(e) => {
            if (e.button === 0 && e.target === printableRef.current) {
              const rect = printableRef.current.getBoundingClientRect();
              setMarqueeStart({ xPx: e.clientX - rect.left, yPx: e.clientY - rect.top });
              setMarqueeEnd({ xPx: e.clientX - rect.left, yPx: e.clientY - rect.top });
              selectElementOrGroup(null);
            }
          }}
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

          {/* Rubber-band Marquee Box Overlay */}
          {marqueeStart && marqueeEnd && (
            <div
              className="absolute border border-blue-500 bg-blue-500/15 z-50 pointer-events-none rounded-xs"
              style={{
                left: `${Math.min(marqueeStart.xPx, marqueeEnd.xPx)}px`,
                top: `${Math.min(marqueeStart.yPx, marqueeEnd.yPx)}px`,
                width: `${Math.abs(marqueeEnd.xPx - marqueeStart.xPx)}px`,
                height: `${Math.abs(marqueeEnd.yPx - marqueeStart.yPx)}px`,
              }}
            />
          )}

          {/* Multi-selection Bounding Box Outline Overlay */}
          {multiSelectionBoundingBox && (
            <div
              className="absolute border-2 border-dashed border-blue-500 z-30 pointer-events-none rounded-xs bg-blue-500/5"
              style={{
                left: `${mmToPx(multiSelectionBoundingBox.minX)}px`,
                top: `${mmToPx(multiSelectionBoundingBox.minY)}px`,
                width: `${mmToPx(multiSelectionBoundingBox.maxX - multiSelectionBoundingBox.minX)}px`,
                height: `${mmToPx(multiSelectionBoundingBox.maxY - multiSelectionBoundingBox.minY)}px`,
              }}
            />
          )}

          {/* Elements Render Loop */}
          {sortedElements.map((el) => {
            if (el.visible === false) return null;

            const isSelected = selectedElementIds.includes(el.id) || el.id === selectedElementId;
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTextId(el.id);
                      }}
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

                {/* Element Render Content */}
                {el.type === 'text' && (
                  <div
                    className="w-full h-full flex flex-col justify-start overflow-hidden leading-tight cursor-text whitespace-pre-wrap break-words select-none"
                        style={{
                          fontSize: `${el.fontSize * (zoom * 1.33)}px`,
                          fontFamily: el.fontFamily || 'sans-serif',
                          fontWeight: el.fontWeight || 'normal',
                          fontStyle: el.fontStyle || 'normal',
                          color: el.color || '#0f172a',
                          lineHeight: el.lineHeight || 1.15,
                          textAlign: el.textAlign || 'left',
                        }}
                      >
                        {previewVariables ? substituteVariables(el.content, getElementDataRow(el)) : el.content}
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
                {selectedElementIds.length >= 2 && (
                  <button
                    onClick={handleGroupElements}
                    className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 transition-colors text-blue-300"
                  >
                    <Group className="w-3.5 h-3.5 text-blue-400" />
                    <span>Nhóm đối tượng (Ctrl+G)</span>
                  </button>
                )}
                {hasGroupSelected && (
                  <button
                    onClick={handleUngroupElements}
                    className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-slate-800 transition-colors text-amber-300"
                  >
                    <Ungroup className="w-3.5 h-3.5 text-amber-400" />
                    <span>Bỏ nhóm đối tượng (Ctrl+Shift+G)</span>
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

      {/* Global Floating Text Editing Modal Overlay */}
      {(() => {
        if (!editingTextId) return null;
        const editingEl = elements.find((e) => e.id === editingTextId);
        if (!editingEl || editingEl.type !== 'text') return null;

        const varMatch = (editingEl.content || '').match(/\{\{\s*([a-zA-Z0-9_]+)(?:\s*\|\s*[a-zA-Z0-9_]+)?\s*\}\}/);
        const linkedVar = varMatch ? varMatch[1] : null;
        const isVarMode = Boolean(linkedVar && previewVariables && onUpdateDatasetValue);
        const currentValue = isVarMode
          ? String(sampleDataRow[linkedVar!] ?? '')
          : editingEl.content;

        return (
          <div
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
            onClick={(e) => {
              e.stopPropagation();
              if (e.target === e.currentTarget && Date.now() - modalOpenTimeRef.current > 350) {
                setEditingTextId(null);
              }
            }}
          >
            <div
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl max-w-md w-full ring-1 ring-black/10 dark:ring-white/10 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {isVarMode ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50">
                      <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>Sửa Biến Dữ Liệu: <b className="text-indigo-700 dark:text-indigo-200">{linkedVar}</b></span>
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Pencil className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>Sửa Nội Dung Văn Bản</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isVarMode && (
                    <button
                      type="button"
                      onClick={() => {
                        const staticVal = substituteVariables(editingEl.content, sampleDataRow);
                        onUpdateElement({ ...editingEl, content: staticVal });
                      }}
                      className="text-xs font-semibold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                      title="Chuyển biến thành văn bản tĩnh"
                    >
                      Tĩnh hóa
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingTextId(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Text Area */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  {isVarMode ? `Nội dung giá trị thực tế cho {{${linkedVar}}}:` : 'Nội dung văn bản hiển thị:'}
                </label>
                <textarea
                  autoFocus
                  rows={4}
                  value={currentValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (isVarMode && linkedVar && onUpdateDatasetValue) {
                      onUpdateDatasetValue(linkedVar, val);
                    } else {
                      onUpdateElement({
                        ...editingEl,
                        content: val,
                      });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      setEditingTextId(null);
                    } else if (e.key === 'Escape') {
                      setEditingTextId(null);
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 p-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none text-sm font-medium leading-relaxed resize-y transition-all"
                  placeholder="Nhập nội dung văn bản..."
                  style={{
                    fontFamily: editingEl.fontFamily && editingEl.fontFamily !== 'sans-serif' ? editingEl.fontFamily : 'Inter, system-ui, sans-serif',
                    fontWeight: editingEl.fontWeight || 'normal',
                    fontStyle: editingEl.fontStyle || 'normal',
                  }}
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 select-none">
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  Ctrl + Enter để lưu
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTextId(null)}
                    className="px-3.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTextId(null)}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>Lưu Dữ Liệu</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};


