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
import { getAllTemplates, saveTemplate } from './utils/templateStorage';
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Templates state
  const [allTemplates, setAllTemplates] = useState<LabelTemplate[]>(() => getAllTemplates());
  const [currentTemplate, setCurrentTemplate] = useState<LabelTemplate>(
    () => allTemplates[0] || DEFAULT_TEMPLATES[0]
  );

  // Label editor elements state with history
  const {
    elements,
    updateElements,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
  } = useLabelHistory(currentTemplate.elements);

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Editor viewport settings
  const [zoom, setZoom] = useState(1.5);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [previewVariables, setPreviewVariables] = useState(true);

  // Dataset & Bulk generator state
  const [dataset, setDataset] = useState<DatasetRow[]>([
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
  ]);

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
        }
      }
      if (remoteSettings.currentTemplate) {
        if (JSON.stringify(remoteSettings.currentTemplate) !== JSON.stringify(currentTemplateRef.current)) {
          setCurrentTemplate(remoteSettings.currentTemplate);
        }
      }
      if (remoteSettings.dataset) {
        if (JSON.stringify(remoteSettings.dataset) !== JSON.stringify(datasetRef.current)) {
          setDataset(remoteSettings.dataset);
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

  // Debounced Auto-save App Settings to Firebase
  useEffect(() => {
    const stateObj = {
      currentTemplate,
      elements,
      dataset,
      darkMode,
    };
    const serialized = JSON.stringify(stateObj);

    if (serialized === lastSavedSettingsRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      lastSavedSettingsRef.current = serialized;
      saveAppSettingsToFirebase(stateObj);
    }, 1500);

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

  return (
    <div className={`h-screen w-screen flex flex-col font-sans overflow-hidden select-none ${darkMode ? 'dark' : ''}`}>
      <div className="h-full w-full bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
        {/* Top Header */}
        <Header
          currentTemplate={currentTemplate}
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

              {/* Desktop Layout (lg: flex) */}
              <div className="hidden lg:flex flex-1 overflow-hidden">
                <ElementPalette onAddElement={handleAddElement} sampleVariables={sampleVariables} />

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
                  showGrid={showGrid}
                  snapToGrid={snapToGrid}
                  previewVariables={previewVariables}
                  sampleDataRow={sampleDataRow}
                />

                <LayerManager
                  elements={elements}
                  selectedElementId={selectedElementId}
                  onSelectElement={setSelectedElementId}
                  onUpdateElements={(newEls) => updateElements(newEls)}
                />

                <PropertiesPanel
                  selectedElement={selectedElement}
                  onUpdateElement={handleUpdateElement}
                  onDeleteElement={handleDeleteElement}
                  onDuplicateElement={handleDuplicateElement}
                  sampleVariables={sampleVariables}
                />
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
                    showGrid={showGrid}
                    snapToGrid={snapToGrid}
                    previewVariables={previewVariables}
                    sampleDataRow={sampleDataRow}
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
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
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
        generatedLabels={generatedLabels}
        sampleDataRow={sampleDataRow}
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
