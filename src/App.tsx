import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

const EMPTY_ROW: DatasetRow = {};
import {
  DatasetRow,
  GeneratedLabel,
  LabelElement,
  LabelSizePreset,
  LabelTemplate,
} from './types/label';
import { DEFAULT_TEMPLATES } from './utils/defaultTemplates';
import { getAllTemplates, saveTemplate, saveAllTemplates } from './utils/templateStorage';
import { AppBackupData } from './utils/backupStorage';
import {
  saveAppSettingsToFirebase,
  subscribeAppSettingsFromFirebase,
  saveTemplateToFirebase,
  subscribeTemplatesFromFirebase,
  subscribeAuthState,
  logoutUser,
} from './lib/firebase';
import { User } from 'firebase/auth';
import { AuthModal } from './components/auth/AuthModal';
import { ToastNotification, ToastState } from './components/common/CustomAlert';
import { useLabelHistory } from './hooks/useLabelHistory';
import { useHotkeys } from './hooks/useHotkeys';

import { Header } from './components/layout/Header';
import { Sidebar, MainTab } from './components/layout/Sidebar';
import { Toolbar } from './components/layout/Toolbar';

import { ElementPalette } from './components/editor/ElementPalette';
import { CanvasEditor } from './components/editor/CanvasEditor';
import { PropertiesPanel } from './components/editor/PropertiesPanel';
import { LayerManager } from './components/editor/LayerManager';

import { DataImportModal } from './components/import/DataImportModal';
import { PrintModal } from './components/print/PrintModal';
import { TemplateGalleryModal } from './components/templates/TemplateGalleryModal';
import { ExportModal } from './components/export/ExportModal';
import { UpdateManagerModal } from './components/common/UpdateManagerModal';

import { GalleryView } from './components/views/GalleryView';
import { DatasetView } from './components/views/DatasetView';
import { SettingsView } from './components/views/SettingsView';
import { generateBulkLabelsAsync } from './utils/bulkEngine';
import { PanelLeft, PanelRight, Layers, QrCode, RefreshCw } from 'lucide-react';

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('qr_label_dark_mode');
      if (saved !== null) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  const handleToggleDarkMode = (newVal?: boolean) => {
    const nextVal = newVal !== undefined ? newVal : !darkMode;
    setDarkMode(nextVal);
    darkModeRef.current = nextVal;
    if (nextVal) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    try {
      localStorage.setItem('qr_label_dark_mode', JSON.stringify(nextVal));
    } catch {
      // ignore
    }
    saveAppSettingsToFirebase({
      currentTemplate: currentTemplateRef.current,
      elements: elementsRef.current,
      dataset: datasetRef.current,
      darkMode: nextVal,
    });
  };

  const [activeTab, setActiveTab] = useState<MainTab>('editor');
  const [mobileEditorTab, setMobileEditorTab] = useState<'canvas' | 'palette' | 'layers' | 'properties'>('canvas');

  // Auth state
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const isLoggedIn = !!authUser && !authUser.isAnonymous;

  // Templates state
  const [allTemplates, setAllTemplates] = useState<LabelTemplate[]>(() => getAllTemplates());
  const [currentTemplate, setCurrentTemplate] = useState<LabelTemplate>(() => {
    try {
      const saved = localStorage.getItem('qr_label_pro_current_template');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) return parsed;
      }
    } catch (e) {
      console.error('Error loading current template from localStorage', e);
    }
    return allTemplates[0] || DEFAULT_TEMPLATES[0];
  });

  const initialElements = useMemo(() => {
    try {
      const saved = localStorage.getItem('qr_label_pro_elements');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading elements from localStorage', e);
    }
    return currentTemplate.elements;
  }, []);

  // Label editor elements state with history
  const {
    elements,
    updateElements,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
  } = useLabelHistory(initialElements);

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Editor viewport settings
  const [zoom, setZoom] = useState(2.5);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [previewVariables, setPreviewVariables] = useState(true);

  // Resizable & Collapsible Sidebars State with LocalStorage Persistence
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('qr_label_pro_panel_left_w');
      return saved ? Number(saved) : 224;
    } catch {
      return 224;
    }
  });
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(() => {
    try {
      return localStorage.getItem('qr_label_pro_panel_left_col') === 'true';
    } catch {
      return false;
    }
  });

  const [layersPanelWidth, setLayersPanelWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('qr_label_pro_panel_layers_w');
      return saved ? Number(saved) : 192;
    } catch {
      return 192;
    }
  });
  const [isLayersCollapsed, setIsLayersCollapsed] = useState(() => {
    try {
      return localStorage.getItem('qr_label_pro_panel_layers_col') === 'true';
    } catch {
      return false;
    }
  });

  const [propertiesPanelWidth, setPropertiesPanelWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('qr_label_pro_panel_props_w');
      return saved ? Number(saved) : 260;
    } catch {
      return 260;
    }
  });
  const [isPropertiesCollapsed, setIsPropertiesCollapsed] = useState(() => {
    try {
      return localStorage.getItem('qr_label_pro_panel_props_col') === 'true';
    } catch {
      return false;
    }
  });

  const [draggingPanel, setDraggingPanel] = useState<'left' | 'layers' | 'properties' | null>(null);

  // Sync panels layout configuration to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('qr_label_pro_panel_left_w', String(leftPanelWidth));
      localStorage.setItem('qr_label_pro_panel_left_col', String(isLeftCollapsed));
      localStorage.setItem('qr_label_pro_panel_layers_w', String(layersPanelWidth));
      localStorage.setItem('qr_label_pro_panel_layers_col', String(isLayersCollapsed));
      localStorage.setItem('qr_label_pro_panel_props_w', String(propertiesPanelWidth));
      localStorage.setItem('qr_label_pro_panel_props_col', String(isPropertiesCollapsed));
    } catch (e) {
      console.error('Error saving panel layout settings', e);
    }
  }, [
    leftPanelWidth,
    isLeftCollapsed,
    layersPanelWidth,
    isLayersCollapsed,
    propertiesPanelWidth,
    isPropertiesCollapsed,
  ]);

  // Handle panel resizing via drag mouse events
  const handleStartResize = (panel: 'left' | 'layers' | 'properties', e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingPanel(panel);
    const startX = e.clientX;
    const startWidth =
      panel === 'left'
        ? leftPanelWidth
        : panel === 'layers'
        ? layersPanelWidth
        : propertiesPanelWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      if (panel === 'left') {
        const newW = Math.max(160, Math.min(500, startWidth + deltaX));
        setLeftPanelWidth(newW);
      } else if (panel === 'layers') {
        const newW = Math.max(140, Math.min(400, startWidth - deltaX));
        setLayersPanelWidth(newW);
      } else if (panel === 'properties') {
        const newW = Math.max(180, Math.min(550, startWidth - deltaX));
        setPropertiesPanelWidth(newW);
      }
    };

    const handleMouseUp = () => {
      setDraggingPanel(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Local Storage loaders & initial state defaults
  const [dataset, setDataset] = useState<DatasetRow[]>(() => {
    try {
      const saved = localStorage.getItem('qr_label_pro_dataset');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading dataset from localStorage', e);
    }
    return [
      {
        MaMay: 'IP15P-256-NT',
        Model: 'iPhone 15 Pro Max',
        DungLuong: '256GB',
        MauSac: 'Titan Tự Nhiên',
        IMEI: '356782091234561',
        Serial: 'F2LXK982P01',
        Gia: 28990000,
        TenShop: 'MOBILE CITY',
        BaoHanh: '12 Tháng',
        MaKho: 'KHO-HN-01',
      },
      {
        MaMay: 'IP15P-512-X',
        Model: 'iPhone 15 Pro Max',
        DungLuong: '512GB',
        MauSac: 'Titan Xanh',
        IMEI: '356782091234562',
        Serial: 'F2LXK982P02',
        Gia: 33490000,
        TenShop: 'MOBILE CITY',
        BaoHanh: '12 Tháng',
        MaKho: 'KHO-HN-01',
      },
      {
        MaMay: 'SS-S24U-512-X',
        Model: 'Samsung Galaxy S24 Ultra',
        DungLuong: '512GB',
        MauSac: 'Xám Titan',
        IMEI: '358901029384751',
        Serial: 'R5CW109283X',
        Gia: 29990000,
        TenShop: 'MOBILE CITY',
        BaoHanh: '12 Tháng',
        MaKho: 'KHO-HCM-02',
      },
    ];
  });

  const [generatedLabels, setGeneratedLabels] = useState<GeneratedLabel[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Modals visibility
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [autoPrintTrigger, setAutoPrintTrigger] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  const handleOpenPrintModal = (autoPrint = false) => {
    setAutoPrintTrigger(autoPrint);
    setIsPrintModalOpen(true);
  };

  // State Refs to prevent stale closure and infinite sync loops
  const elementsRef = useRef(elements);
  elementsRef.current = elements;
  const datasetRef = useRef(dataset);
  datasetRef.current = dataset;
  const currentTemplateRef = useRef(currentTemplate);
  currentTemplateRef.current = currentTemplate;
  const darkModeRef = useRef(darkMode);
  darkModeRef.current = darkMode;

  const lastSavedSettingsRef = useRef<string>('');
  const lastBulkSignatureRef = useRef<string>('');

  // Refresh bulk rendered labels whenever template elements or dataset change
  useEffect(() => {
    let active = true;

    if (!dataset.length) {
      setGeneratedLabels([]);
      return;
    }

    const currentSignature = JSON.stringify({
      tId: currentTemplate.id,
      w: currentTemplate.widthMm,
      h: currentTemplate.heightMm,
      elements,
      datasetLength: dataset.length,
      sample: dataset[0],
    });

    if (currentSignature === lastBulkSignatureRef.current) {
      return;
    }

    const timer = setTimeout(async () => {
      lastBulkSignatureRef.current = currentSignature;
      setIsGenerating(true);

      const updatedTemplate: LabelTemplate = {
        ...currentTemplate,
        elements,
      };

      const results = await generateBulkLabelsAsync({
        template: updatedTemplate,
        dataset,
        renderPreviewThumbnails: true,
      });

      if (active) {
        setGeneratedLabels(results);
        setIsGenerating(false);
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [elements, dataset, currentTemplate]);

  // Auth state listener
  useEffect(() => {
    const unsub = subscribeAuthState((u) => {
      setAuthUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Firebase Realtime Subscriptions (re-run when authUser changes)
  useEffect(() => {
    // 1. Subscribe to Remote Custom Templates
    const unsubscribeTemplates = subscribeTemplatesFromFirebase((remoteTemplates) => {
      if (remoteTemplates && remoteTemplates.length > 0) {
        const localTemplates = getAllTemplates();
        const mergedMap = new Map<string, LabelTemplate>();
        localTemplates.forEach((t) => mergedMap.set(t.id, t));
        remoteTemplates.forEach((t) => mergedMap.set(t.id, t));
        const mergedList = Array.from(mergedMap.values());
        setAllTemplates(mergedList);
      }
    });

    // 2. Subscribe to Remote App Settings (active template, elements, dataset)
    const unsubscribeSettings = subscribeAppSettingsFromFirebase((remoteSettings) => {
      const currentSerialized = JSON.stringify({
        currentTemplate: remoteSettings.currentTemplate || currentTemplateRef.current,
        elements: remoteSettings.elements || elementsRef.current,
        dataset: remoteSettings.dataset || datasetRef.current,
        darkMode: remoteSettings.darkMode ?? darkModeRef.current,
      });

      if (currentSerialized === lastSavedSettingsRef.current) {
        return;
      }
      lastSavedSettingsRef.current = currentSerialized;

      if (remoteSettings.elements && remoteSettings.elements.length > 0) {
        if (JSON.stringify(remoteSettings.elements) !== JSON.stringify(elementsRef.current)) {
          updateElements(remoteSettings.elements, false);
          try {
            localStorage.setItem('qr_label_pro_elements', JSON.stringify(remoteSettings.elements));
          } catch {}
        }
      }
      if (remoteSettings.currentTemplate) {
        if (JSON.stringify(remoteSettings.currentTemplate) !== JSON.stringify(currentTemplateRef.current)) {
          setCurrentTemplate(remoteSettings.currentTemplate);
          try {
            localStorage.setItem('qr_label_pro_current_template', JSON.stringify(remoteSettings.currentTemplate));
          } catch {}
        }
      }
      if (remoteSettings.dataset && Array.isArray(remoteSettings.dataset) && remoteSettings.dataset.length > 0) {
        if (JSON.stringify(remoteSettings.dataset) !== JSON.stringify(datasetRef.current)) {
          setDataset(remoteSettings.dataset);
          try {
            localStorage.setItem('qr_label_pro_dataset', JSON.stringify(remoteSettings.dataset));
          } catch {}
        }
      }
      if (remoteSettings.darkMode !== undefined && remoteSettings.darkMode !== darkModeRef.current) {
        setDarkMode(remoteSettings.darkMode);
      }
    });

    return () => {
      unsubscribeTemplates();
      unsubscribeSettings();
    };
  }, [authUser]);

  // Debounced Auto-save App Settings to LocalStorage & Firebase
  useEffect(() => {
    const stateObj = {
      currentTemplate,
      elements,
      dataset,
      darkMode,
    };
    const serialized = JSON.stringify(stateObj);

    // Save to LocalStorage immediately
    try {
      localStorage.setItem('qr_label_pro_dataset', JSON.stringify(dataset));
      localStorage.setItem('qr_label_pro_current_template', JSON.stringify(currentTemplate));
      localStorage.setItem('qr_label_pro_elements', JSON.stringify(elements));
    } catch (e) {
      console.error('Error writing to localStorage:', e);
    }

    if (serialized === lastSavedSettingsRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      lastSavedSettingsRef.current = serialized;
      saveAppSettingsToFirebase(stateObj);
    }, 1200);

    return () => clearTimeout(timer);
  }, [currentTemplate, elements, dataset, darkMode]);

  // Selected element object
  const selectedElement = elements.find((el) => el.id === selectedElementId) || null;

  // Add new element to canvas
  const handleAddElement = useCallback(
    (newElProps: Partial<LabelElement>) => {
      const newId = `el_${Date.now()}`;
      const maxZIndex = elements.reduce((max, el) => Math.max(max, el.zIndex), 0);

      const elementToAdd: LabelElement = {
        id: newId,
        type: newElProps.type || 'text',
        name: newElProps.name || 'Đối Tượng Mới',
        x: newElProps.x ?? 2,
        y: newElProps.y ?? 2,
        width: newElProps.width ?? 20,
        height: newElProps.height ?? 5,
        rotation: 0,
        zIndex: maxZIndex + 1,
        locked: false,
        visible: true,
        ...newElProps,
      } as LabelElement;

      const updated = [...elements, elementToAdd];
      updateElements(updated);
      setSelectedElementId(newId);
      // Auto-switch to canvas view on mobile/tablet after adding element
      setMobileEditorTab('canvas');
    },
    [elements, updateElements]
  );

  // Update single element
  const handleUpdateElement = useCallback(
    (updatedEl: LabelElement, saveHistory = true) => {
      const updated = elements.map((el) => (el.id === updatedEl.id ? updatedEl : el));
      updateElements(updated, saveHistory);
    },
    [elements, updateElements]
  );

  // Delete element
  const handleDeleteElement = useCallback(
    (idToDelete?: string) => {
      const id = idToDelete || selectedElementId;
      if (!id) return;
      const updated = elements.filter((el) => el.id !== id);
      updateElements(updated);
      setSelectedElementId(null);
    },
    [elements, selectedElementId, updateElements]
  );

  // Duplicate element
  const handleDuplicateElement = useCallback(
    (idToDup?: string) => {
      const id = idToDup || selectedElementId;
      if (!id) return;
      const target = elements.find((el) => el.id === id);
      if (!target) return;

      const maxZ = elements.reduce((m, el) => Math.max(m, el.zIndex), 0);
      const cloned: LabelElement = {
        ...target,
        id: `el_${Date.now()}`,
        name: `${target.name} (Bản sao)`,
        x: Math.min(currentTemplate.widthMm - target.width, target.x + 2),
        y: Math.min(currentTemplate.heightMm - target.height, target.y + 2),
        zIndex: maxZ + 1,
      };

      updateElements([...elements, cloned]);
      setSelectedElementId(cloned.id);
    },
    [elements, selectedElementId, currentTemplate, updateElements]
  );

  // Alignment helpers
  const handleAlign = useCallback(
    (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      if (!selectedElement) return;

      let newX = selectedElement.x;
      let newY = selectedElement.y;

      if (alignment === 'left') newX = 1;
      else if (alignment === 'center') newX = (currentTemplate.widthMm - selectedElement.width) / 2;
      else if (alignment === 'right') newX = currentTemplate.widthMm - selectedElement.width - 1;
      else if (alignment === 'top') newY = 1;
      else if (alignment === 'middle') newY = (currentTemplate.heightMm - selectedElement.height) / 2;
      else if (alignment === 'bottom') newY = currentTemplate.heightMm - selectedElement.height - 1;

      handleUpdateElement({
        ...selectedElement,
        x: Math.max(0, newX),
        y: Math.max(0, newY),
      });
    },
    [selectedElement, currentTemplate, handleUpdateElement]
  );

  // Layer move
  const handleLayerMove = useCallback(
    (direction: 'up' | 'down') => {
      if (!selectedElement) return;
      const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex((el) => el.id === selectedElement.id);
      if (idx === -1) return;

      const targetIdx = direction === 'up' ? idx + 1 : idx - 1;
      if (targetIdx < 0 || targetIdx >= sorted.length) return;

      const itemA = sorted[idx];
      const itemB = sorted[targetIdx];

      const tempZ = itemA.zIndex;
      itemA.zIndex = itemB.zIndex;
      itemB.zIndex = tempZ;

      updateElements([...elements]);
    },
    [selectedElement, elements, updateElements]
  );

  // Keyboard Shortcuts Hook
  useHotkeys({
    onUndo: undo,
    onRedo: redo,
    onDelete: () => handleDeleteElement(),
    onDuplicate: () => handleDuplicateElement(),
    onNudge: (dx, dy) => {
      if (!selectedElement || selectedElement.locked) return;
      handleUpdateElement({
        ...selectedElement,
        x: Math.max(0, Math.min(currentTemplate.widthMm - selectedElement.width, selectedElement.x + dx)),
        y: Math.max(0, Math.min(currentTemplate.heightMm - selectedElement.height, selectedElement.y + dy)),
      });
    },
  });

  // Toast State
  const [toastState, setToastState] = useState<ToastState>({
    isOpen: false,
    title: '',
  });

  const showToast = (title: string, message?: string, type: ToastState['type'] = 'success') => {
    setToastState({ isOpen: true, title, message, type });
    setTimeout(() => {
      setToastState((prev) => ({ ...prev, isOpen: false }));
    }, 3500);
  };

  // Save current template to LocalStorage & Firebase Firestore
  const handleSaveCurrentTemplate = () => {
    const templateToSave: LabelTemplate = {
      ...currentTemplate,
      elements,
      updatedAt: new Date().toISOString(),
    };
    saveTemplate(templateToSave);
    saveTemplateToFirebase(templateToSave);
    setAllTemplates(getAllTemplates());
    showToast('Đã lưu mẫu tem', `Đã lưu thành công mẫu "${templateToSave.name}" lên Cloud Firebase!`, 'success');
  };

  // Handle restoring JSON backup
  const handleRestoreBackup = (backup: AppBackupData) => {
    if (backup.allTemplates && Array.isArray(backup.allTemplates) && backup.allTemplates.length > 0) {
      saveAllTemplates(backup.allTemplates);
      setAllTemplates(backup.allTemplates);
    }

    if (backup.currentTemplate) {
      const t = backup.currentTemplate;
      setCurrentTemplate(t);
      if (Array.isArray(t.elements)) {
        resetHistory(t.elements);
      }
      try {
        localStorage.setItem('qr_label_pro_current_template', JSON.stringify(t));
        localStorage.setItem('qr_label_pro_elements', JSON.stringify(t.elements));
      } catch {
        // ignore
      }
    }

    if (backup.dataset && Array.isArray(backup.dataset)) {
      setDataset(backup.dataset);
      try {
        localStorage.setItem('qr_label_pro_dataset', JSON.stringify(backup.dataset));
      } catch {
        // ignore
      }
    }

    // Sync restored data to Firebase
    saveAppSettingsToFirebase({
      currentTemplate: backup.currentTemplate || currentTemplate,
      elements: backup.currentTemplate?.elements || elements,
      dataset: backup.dataset || dataset,
      darkMode,
    });

    if (backup.currentTemplate) {
      saveTemplateToFirebase(backup.currentTemplate);
    }

    showToast(
      'Khôi phục dữ liệu dự phòng thành công!',
      'Tất cả mẫu tem nhãn và danh sách dữ liệu Excel đã được tải và đồng bộ thành công.',
      'success'
    );
  };

  // Handle updating template properties (name, size, dual-part, etc.)
  const handleUpdateTemplate = (updated: LabelTemplate) => {
    setCurrentTemplate(updated);
    saveTemplate(updated);
    saveTemplateToFirebase(updated);
    setAllTemplates(getAllTemplates());
  };

  const handleUpdateTemplateName = (newName: string) => {
    if (!newName.trim()) return;
    const updated: LabelTemplate = {
      ...currentTemplate,
      name: newName.trim(),
      updatedAt: new Date().toISOString(),
    };
    handleUpdateTemplate(updated);
    showToast('Đã đổi tên mẫu', `Tên mẫu tem đã đổi thành "${newName.trim()}".`, 'success');
  };

  // Switch Active Template
  const handleSelectTemplate = (tpl: LabelTemplate) => {
    setCurrentTemplate(tpl);
    resetHistory(tpl.elements);
    setSelectedElementId(null);
  };

  // Change Label Size Preset
  const handleSelectPresetSize = (preset: LabelSizePreset) => {
    const updated: LabelTemplate = {
      ...currentTemplate,
      widthMm: preset.widthMm,
      heightMm: preset.heightMm,
    };
    setCurrentTemplate(updated);
  };

  const handleUpdateCustomSize = (widthMm: number, heightMm: number) => {
    const updated: LabelTemplate = {
      ...currentTemplate,
      widthMm,
      heightMm,
    };
    setCurrentTemplate(updated);
  };

  const sampleDataRow = useMemo(() => dataset[0] || EMPTY_ROW, [dataset]);
  const sampleVariables = useMemo(() => Object.keys(sampleDataRow), [sampleDataRow]);

  const handleUpdateDatasetValue = (key: string, value: string) => {
    setDataset((prev) => {
      if (prev.length === 0) {
        return [{ [key]: value }];
      }
      const updated = [...prev];
      updated[0] = { ...updated[0], [key]: value };
      return updated;
    });
  };

  if (authLoading) {
    return (
      <div className={`h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans ${darkMode ? 'dark' : ''}`}>
        <div className="flex flex-col items-center gap-4 animate-fade-in p-6 text-center">
          <div className="p-4 rounded-3xl bg-indigo-600 text-white shadow-2xl shadow-indigo-500/30">
            <QrCode className="w-10 h-10 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">QR Label Pro</h1>
            <p className="text-xs text-slate-400 mt-0.5">Hệ Thống Thiết Kế & In Tem Nhãn Nhiệt</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 mt-2 px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700/80">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Đang kiểm tra quyền đăng nhập...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-screen flex flex-col font-sans overflow-hidden select-none ${darkMode ? 'dark' : ''}`}>
      <div className="h-full w-full bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
        {/* Top Header */}
        <Header
          currentTemplate={currentTemplate}
          onUpdateTemplateName={handleUpdateTemplateName}
          darkMode={darkMode}
          setDarkMode={handleToggleDarkMode}
          onOpenTemplates={() => setIsTemplatesModalOpen(true)}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          onOpenPrintModal={handleOpenPrintModal}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          onSaveTemplate={handleSaveCurrentTemplate}
          onNewTemplate={() => setIsTemplatesModalOpen(true)}
          datasetCount={dataset.length}
          authUser={authUser}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
          onLogout={async () => {
            await logoutUser();
            showToast('Đã đăng xuất', 'Bạn đã quay về phiên làm việc Khách.', 'info');
          }}
        />

        {/* Main Workspace Body */}
        <div className="flex-1 flex overflow-hidden pb-14 md:pb-0">
          {/* Main Navigation Sidebar */}
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            datasetCount={dataset.length}
          />

          {/* TAB 1: DESIGN CANVAS EDITOR */}
          {activeTab === 'editor' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Quick Toolbar */}
              <Toolbar
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={undo}
                onRedo={redo}
                zoom={zoom}
                setZoom={setZoom}
                showGrid={showGrid}
                setShowGrid={setShowGrid}
                snapToGrid={snapToGrid}
                setSnapToGrid={setSnapToGrid}
                previewVariables={previewVariables}
                setPreviewVariables={setPreviewVariables}
                selectedElementId={selectedElementId}
                selectedElementLocked={selectedElement?.locked}
                onAlign={handleAlign}
                onLockToggle={() => {
                  if (selectedElement) {
                    handleUpdateElement({
                      ...selectedElement,
                      locked: !selectedElement.locked,
                    });
                  }
                }}
                onDuplicate={() => handleDuplicateElement()}
                onDelete={() => handleDeleteElement()}
                onLayerMove={handleLayerMove}
              />

              {/* Mobile & Tablet Editor Sub-Tab Switcher (< lg screens) */}
              <div className="lg:hidden flex items-center justify-around bg-slate-200/90 dark:bg-slate-800/90 p-1 border-b border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0 gap-1">
                <button
                  onClick={() => setMobileEditorTab('canvas')}
                  className={`flex-1 py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer text-[11px] sm:text-xs ${
                    mobileEditorTab === 'canvas'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                      : 'hover:bg-slate-300/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <span>🎨 Khung Tem</span>
                </button>
                <button
                  onClick={() => setMobileEditorTab('palette')}
                  className={`flex-1 py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer text-[11px] sm:text-xs ${
                    mobileEditorTab === 'palette'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                      : 'hover:bg-slate-300/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <span>➕ Thêm Đ.Tượng</span>
                </button>
                <button
                  onClick={() => setMobileEditorTab('layers')}
                  className={`flex-1 py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer text-[11px] sm:text-xs ${
                    mobileEditorTab === 'layers'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                      : 'hover:bg-slate-300/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <span>📑 Lớp ({elements.length})</span>
                </button>
                <button
                  onClick={() => setMobileEditorTab('properties')}
                  className={`flex-1 py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer text-[11px] sm:text-xs relative ${
                    mobileEditorTab === 'properties'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                      : 'hover:bg-slate-300/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <span>⚙️ Thuộc Tính</span>
                  {selectedElementId && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
                  )}
                </button>
              </div>

              {/* Desktop Layout (lg: flex) with Resizable and Collapsible Sidebars */}
              <div className="hidden lg:flex flex-1 overflow-hidden relative select-none">
                {/* Uncollapse Quick Buttons if panels are collapsed */}
                {isLeftCollapsed && (
                  <button
                    type="button"
                    onClick={() => setIsLeftCollapsed(false)}
                    className="absolute left-2 top-2 z-20 p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-md hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 cursor-pointer flex items-center gap-1.5 text-xs font-bold transition-all"
                    title="Mở thanh Thêm đối tượng"
                  >
                    <PanelLeft className="w-4 h-4" />
                    <span>Thêm Đối Tượng</span>
                  </button>
                )}

                {/* Left Panel: Element Palette */}
                {!isLeftCollapsed && (
                  <>
                    <div
                      style={{ width: `${leftPanelWidth}px` }}
                      className="h-full flex-shrink-0 relative"
                    >
                      <ElementPalette
                        onAddElement={handleAddElement}
                        sampleVariables={sampleVariables}
                        onToggleCollapse={() => setIsLeftCollapsed(true)}
                        onWidthChange={setLeftPanelWidth}
                        currentWidth={leftPanelWidth}
                      />
                    </div>
                    {/* Resizer Handle 1 (Left) */}
                    <div
                      onMouseDown={(e) => handleStartResize('left', e)}
                      onDoubleClick={() => setIsLeftCollapsed(true)}
                      title="Kéo sang trái/phải để thay đổi kích thước | Nhấp kép để thu gọn"
                      className={`w-1 -mx-0.5 relative z-30 cursor-col-resize select-none shrink-0 transition-colors ${
                        draggingPanel === 'left'
                          ? 'bg-blue-600'
                          : 'hover:bg-blue-500/60 bg-slate-200/60 dark:bg-slate-800/60'
                      }`}
                    />
                  </>
                )}

                {/* Main Canvas Editor Area */}
                <div className="flex-1 h-full overflow-hidden">
                  <CanvasEditor
                    template={currentTemplate}
                    elements={elements}
                    selectedElementId={selectedElementId}
                    onSelectElement={setSelectedElementId}
                    onUpdateElement={handleUpdateElement}
                    onUpdateElements={updateElements}
                    onAddElement={handleAddElement}
                    onDeleteElement={handleDeleteElement}
                    onDuplicateElement={handleDuplicateElement}
                    onLayerMove={handleLayerMove}
                    zoom={zoom}
                    onZoomChange={setZoom}
                    showGrid={showGrid}
                    snapToGrid={snapToGrid}
                    previewVariables={previewVariables}
                    sampleDataRow={sampleDataRow}
                    secondDataRow={dataset[1]}
                    dataset={dataset}
                    onUpdateDatasetValue={handleUpdateDatasetValue}
                  />
                </div>

                {/* Right Side Collapsed Panel Openers */}
                {(isLayersCollapsed || isPropertiesCollapsed) && (
                  <div className="absolute right-2 top-2 z-20 flex items-center gap-2">
                    {isLayersCollapsed && (
                      <button
                        type="button"
                        onClick={() => setIsLayersCollapsed(false)}
                        className="p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-md hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1.5 text-xs font-bold transition-all"
                        title="Mở danh sách lớp"
                      >
                        <Layers className="w-4 h-4 text-slate-500" />
                        <span>Lớp ({elements.length})</span>
                      </button>
                    )}
                    {isPropertiesCollapsed && (
                      <button
                        type="button"
                        onClick={() => setIsPropertiesCollapsed(false)}
                        className="p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-md hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 cursor-pointer flex items-center gap-1.5 text-xs font-bold transition-all"
                        title="Mở bảng Thuộc tính"
                      >
                        <PanelRight className="w-4 h-4" />
                        <span>Thuộc Tính</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Right Panel 1: Layer Manager */}
                {!isLayersCollapsed && (
                  <>
                    {/* Resizer Handle 2 (Layers) */}
                    <div
                      onMouseDown={(e) => handleStartResize('layers', e)}
                      onDoubleClick={() => setIsLayersCollapsed(true)}
                      title="Kéo để thay đổi kích thước | Nhấp kép để thu gọn"
                      className={`w-1 -mx-0.5 relative z-30 cursor-col-resize select-none shrink-0 transition-colors ${
                        draggingPanel === 'layers'
                          ? 'bg-blue-600'
                          : 'hover:bg-blue-500/60 bg-slate-200/60 dark:bg-slate-800/60'
                      }`}
                    />
                    <div
                      style={{ width: `${layersPanelWidth}px` }}
                      className="h-full flex-shrink-0 relative"
                    >
                      <LayerManager
                        elements={elements}
                        selectedElementId={selectedElementId}
                        onSelectElement={setSelectedElementId}
                        onUpdateElements={(newEls) => updateElements(newEls)}
                        onToggleCollapse={() => setIsLayersCollapsed(true)}
                        onWidthChange={setLayersPanelWidth}
                        currentWidth={layersPanelWidth}
                      />
                    </div>
                  </>
                )}

                {/* Right Panel 2: Properties Panel */}
                {!isPropertiesCollapsed && (
                  <>
                    {/* Resizer Handle 3 (Properties) */}
                    <div
                      onMouseDown={(e) => handleStartResize('properties', e)}
                      onDoubleClick={() => setIsPropertiesCollapsed(true)}
                      title="Kéo để thay đổi kích thước | Nhấp kép để thu gọn"
                      className={`w-1 -mx-0.5 relative z-30 cursor-col-resize select-none shrink-0 transition-colors ${
                        draggingPanel === 'properties'
                          ? 'bg-blue-600'
                          : 'hover:bg-blue-500/60 bg-slate-200/60 dark:bg-slate-800/60'
                      }`}
                    />
                    <div
                      style={{ width: `${propertiesPanelWidth}px` }}
                      className="h-full flex-shrink-0 relative"
                    >
                      <PropertiesPanel
                        selectedElement={selectedElement}
                        onUpdateElement={handleUpdateElement}
                        onDeleteElement={handleDeleteElement}
                        onDuplicateElement={handleDuplicateElement}
                        sampleVariables={sampleVariables}
                        sampleDataRow={sampleDataRow}
                        onUpdateDatasetValue={handleUpdateDatasetValue}
                        onToggleCollapse={() => setIsPropertiesCollapsed(true)}
                        onWidthChange={setPropertiesPanelWidth}
                        currentWidth={propertiesPanelWidth}
                        template={currentTemplate}
                        onUpdateTemplate={handleUpdateTemplate}
                        elementsCount={elements.length}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Mobile & Tablet Single Active Panel Layout (< lg screens) */}
              <div className="lg:hidden flex-1 flex overflow-hidden">
                {mobileEditorTab === 'palette' && (
                  <div className="w-full h-full overflow-y-auto">
                    <ElementPalette onAddElement={handleAddElement} sampleVariables={sampleVariables} />
                  </div>
                )}

                {mobileEditorTab === 'canvas' && (
                  <CanvasEditor
                    template={currentTemplate}
                    elements={elements}
                    selectedElementId={selectedElementId}
                    onSelectElement={setSelectedElementId}
                    onUpdateElement={handleUpdateElement}
                    onAddElement={handleAddElement}
                    onDeleteElement={handleDeleteElement}
                    onDuplicateElement={handleDuplicateElement}
                    onLayerMove={handleLayerMove}
                    zoom={zoom}
                    onZoomChange={setZoom}
                    showGrid={showGrid}
                    snapToGrid={snapToGrid}
                    previewVariables={previewVariables}
                    sampleDataRow={sampleDataRow}
                    secondDataRow={dataset[1]}
                    dataset={dataset}
                    onUpdateDatasetValue={handleUpdateDatasetValue}
                  />
                )}

                {mobileEditorTab === 'layers' && (
                  <div className="w-full h-full overflow-y-auto bg-white dark:bg-slate-900">
                    <LayerManager
                      elements={elements}
                      selectedElementId={selectedElementId}
                      onSelectElement={setSelectedElementId}
                      onUpdateElements={(newEls) => updateElements(newEls)}
                    />
                  </div>
                )}

                {mobileEditorTab === 'properties' && (
                  <div className="w-full h-full overflow-y-auto bg-white dark:bg-slate-900">
                    <PropertiesPanel
                      selectedElement={selectedElement}
                      onUpdateElement={handleUpdateElement}
                      onDeleteElement={handleDeleteElement}
                      onDuplicateElement={handleDuplicateElement}
                      sampleVariables={sampleVariables}
                      sampleDataRow={sampleDataRow}
                      onUpdateDatasetValue={handleUpdateDatasetValue}
                      template={currentTemplate}
                      onUpdateTemplate={handleUpdateTemplate}
                      elementsCount={elements.length}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DATASET TABLE VIEW */}
          {activeTab === 'dataset' && (
            <DatasetView
              dataset={dataset}
              onSetDataset={setDataset}
              onOpenImportModal={() => setIsImportModalOpen(true)}
              elements={elements}
            />
          )}

          {/* TAB 3: BATCH PRINT GALLERY */}
          {activeTab === 'gallery' && (
            <GalleryView
              template={currentTemplate}
              generatedLabels={generatedLabels}
              onSetGeneratedLabels={setGeneratedLabels}
              onOpenPrintModal={() => setIsPrintModalOpen(true)}
              onOpenExportModal={() => setIsExportModalOpen(true)}
              onOpenImportModal={() => setIsImportModalOpen(true)}
              isGenerating={isGenerating}
            />
          )}

          {/* TAB 4: TEMPLATE LIBRARY */}
          {activeTab === 'templates' && (
            <div className="flex-1 flex justify-center items-center p-6 bg-slate-100 dark:bg-slate-950">
              <TemplateGalleryModal
                isOpen={true}
                onClose={() => setActiveTab('editor')}
                templates={allTemplates}
                currentTemplateId={currentTemplate.id}
                onSelectTemplate={handleSelectTemplate}
                onRefreshTemplates={() => setAllTemplates(getAllTemplates())}
              />
            </div>
          )}

          {/* TAB 5: PRINTER SETTINGS & SIZES */}
          {activeTab === 'settings' && (
            <SettingsView
              activePresetId="custom"
              onSelectPreset={handleSelectPresetSize}
              customWidthMm={currentTemplate.widthMm}
              customHeightMm={currentTemplate.heightMm}
              onUpdateCustomSize={handleUpdateCustomSize}
              currentTemplate={{ ...currentTemplate, elements }}
              allTemplates={allTemplates}
              dataset={dataset}
              onRestoreBackup={handleRestoreBackup}
            />
          )}
        </div>
      </div>

      {/* POPUP MODALS */}
      <DataImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        dataset={dataset}
        onSetDataset={setDataset}
        elements={elements}
      />

      <AuthModal
        isOpen={isAuthModalOpen || (!authLoading && !isLoggedIn)}
        onClose={() => setIsAuthModalOpen(false)}
        required={!isLoggedIn}
        onSuccess={(msg) => showToast('Đăng nhập thành công', msg, 'success')}
      />

      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        template={{ ...currentTemplate, elements }}
        generatedLabels={generatedLabels}
        sampleDataRow={sampleDataRow}
        autoPrintTrigger={autoPrintTrigger}
      />

      <TemplateGalleryModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        templates={allTemplates}
        currentTemplateId={currentTemplate.id}
        onSelectTemplate={handleSelectTemplate}
        onRefreshTemplates={() => setAllTemplates(getAllTemplates())}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        template={{ ...currentTemplate, elements }}
        allTemplates={allTemplates}
        dataset={dataset}
        generatedLabels={generatedLabels}
        sampleDataRow={sampleDataRow}
        onRestoreBackup={handleRestoreBackup}
      />

      <UpdateManagerModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
      />

      <ToastNotification
        state={toastState}
        onClose={() => setToastState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
