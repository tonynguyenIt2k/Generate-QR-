import React, { useState, useEffect } from 'react';
import {
  Database,
  Plus,
  Trash2,
  Download,
  Upload,
  FileSpreadsheet,
  Columns,
  Search,
  CheckSquare,
  Square,
  ArrowLeft,
  ArrowRight,
  Edit2,
  Copy,
  Check,
  Eye,
  EyeOff,
  SlidersHorizontal,
  X,
  AlertCircle,
  Save,
  Scan,
  Camera,
  Sparkles,
} from 'lucide-react';
import { DatasetRow, LabelElement, LabelTemplate } from '../../types/label';
import {
  generateSamplePhoneShopExcel,
  getSamplePhoneShopData,
  getTemplateColumnKeys,
} from '../../utils/excelHelper';
import {
  ConfirmModal,
  ToastNotification,
  ConfirmState,
  ToastState,
} from '../common/CustomAlert';
import { TextScannerModal, ScanTargetInfo } from '../scanner/TextScannerModal';
import { AddProductModal } from './AddProductModal';

interface DatasetViewProps {
  dataset: DatasetRow[];
  onSetDataset: React.Dispatch<React.SetStateAction<DatasetRow[]>>;
  onOpenImportModal: () => void;
  elements?: LabelElement[];
  template?: LabelTemplate;
}

export const DatasetView: React.FC<DatasetViewProps> = ({
  dataset,
  onSetDataset,
  onOpenImportModal,
  elements,
  template,
}) => {
  // Extract all existing keys across dataset
  const allKeys = Array.from(
    new Set(dataset.flatMap((row) => Object.keys(row)))
  );

  // Detect mobile device
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'cards';
    }
    return 'table';
  });

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setViewMode('cards');
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [editingColName, setEditingColName] = useState<string | null>(null);
  const [newColTitle, setNewColTitle] = useState('');
  const [copiedCol, setCopiedCol] = useState<string | null>(null);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);

  // Compute effective columns dynamically based on existing columns or template variables
  const effectiveColumns = React.useMemo(() => {
    if (columnOrder.length > 0) return columnOrder;
    const fromTemplate = getTemplateColumnKeys(template, elements);
    if (fromTemplate.length > 0) return fromTemplate;
    return ['Model', 'DungLuong', 'MauSac', 'IMEI', 'Gia'];
  }, [columnOrder, template, elements]);

  const handleAddProduct = (product: DatasetRow, continueAdding = false) => {
    onSetDataset((prev) => [...prev, product]);
    const keys = Object.keys(product);
    setColumnOrder((prev) => {
      const missing = keys.filter((k) => !prev.includes(k));
      return missing.length > 0 ? [...prev, ...missing] : prev;
    });
    showToast(
      'Đã thêm sản phẩm thành công!',
      `Đã thêm "${product.Model || product.Ten_SP || 'Sản phẩm mới'}" vào danh sách in tem.`,
      'success'
    );
  };

  const handleLoadSampleDataset = () => {
    const sampleRows = getSamplePhoneShopData(elements, template);
    onSetDataset(sampleRows);
    if (sampleRows.length > 0) {
      setColumnOrder(Object.keys(sampleRows[0]));
    }
    showToast(
      'Đã nạp dữ liệu mẫu!',
      `Đã nạp thành công ${sampleRows.length} sản phẩm điện thoại mẫu sẵn sàng in tem.`,
      'success'
    );
  };

  // Scanner & OCR State
  const [scannerTarget, setScannerTarget] = useState<ScanTargetInfo | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleOpenScanModal = (
    rowIndex: number,
    fieldName: string,
    currentValue: string,
    allRowData: DatasetRow
  ) => {
    setScannerTarget({
      rowIndex,
      fieldName,
      currentValue,
      allRowData,
      availableColumns: columnOrder,
    });
    setIsScannerOpen(true);
  };

  const handleApplyScannedValue = (rowIndex: number, fieldName: string, value: string) => {
    handleCellChange(rowIndex, fieldName, value);
    showToast('Đã quét thành công!', `Đã điền "${value}" vào cột ${fieldName} (SP #${rowIndex + 1}).`, 'success');
  };

  // Helper to map scanned keys to column names intelligently
  const findMatchingColumn = (key: string, columns: string[]): string | undefined => {
    const k = key.toLowerCase().trim();

    // Direct exact match
    const exact = columns.find((c) => c.toLowerCase().trim() === k);
    if (exact) return exact;

    // Model / Product Name mappings
    if (
      ['model', 'ten_sp', 'tên sp', 'tên máy', 'tên thiết bị', 'tên hàng', 'tên vật tư', 'vật tư', 'vattu', 'sản phẩm', 'tenhang', 'mặt hàng', 'name', 'product'].some(
        (p) => k === p || k.includes(p)
      )
    ) {
      const match = columns.find((c) => {
        const cl = c.toLowerCase();
        return cl.includes('ten') || cl.includes('model') || cl.includes('máy') || cl.includes('hàng') || cl.includes('vật tư') || cl.includes('name') || cl.includes('sp');
      });
      if (match) return match;
    }

    // IMEI 1 & Serial / IMEI mappings
    if (
      ['imei', 'imei 1', 'imei_1', 'imei1', 'mã imei', 'imei/serial', 'imei / serial', 'imei_serial', 'serial/imei', 'mã máy'].some(
        (p) => k === p || k.includes(p)
      )
    ) {
      const match = columns.find((c) => {
        const cl = c.toLowerCase();
        return ((cl.includes('imei') || cl.includes('serial')) && !cl.includes('2')) || cl.includes('mã') || cl.includes('sn');
      });
      if (match) return match;
    }

    // IMEI 2 mappings
    if (['imei 2', 'imei_2', 'imei2', 'imei_phụ'].some((p) => k === p || k.includes(p))) {
      const match = columns.find((c) => {
        const cl = c.toLowerCase();
        return cl.includes('imei') && cl.includes('2');
      });
      if (match) return match;
    }

    // Serial mappings
    if (['serial', 's/n', 'sn', 'số serial', 'imei/serial', 'imei / serial'].some((p) => k === p || k.includes(p))) {
      const match = columns.find((c) => {
        const cl = c.toLowerCase();
        return cl.includes('serial') || cl.includes('imei') || cl === 'sn' || cl === 's/n';
      });
      if (match) return match;
    }

    // Storage mappings
    if (
      ['dungluong', 'dung lượng', 'bộ nhớ', 'storage', 'ram', 'rom', 'ram_rom'].some(
        (p) => k === p || k.includes(p)
      )
    ) {
      const match = columns.find((c) => {
        const cl = c.toLowerCase();
        return cl.includes('dung') || cl.includes('lượng') || cl.includes('bộ nhớ') || cl.includes('storage') || cl.includes('ram');
      });
      if (match) return match;
    }

    // Color mappings
    if (['mausac', 'màu sắc', 'màu', 'color'].some((p) => k === p || k.includes(p))) {
      const match = columns.find((c) => {
        const cl = c.toLowerCase();
        return cl.includes('mau') || cl.includes('màu') || cl.includes('color');
      });
      if (match) return match;
    }

    // Price mappings
    if (['gia', 'giá', 'don_gia', 'đơn giá', 'price'].some((p) => k === p || k.includes(p))) {
      const match = columns.find((c) => {
        const cl = c.toLowerCase();
        return cl.includes('gia') || cl.includes('giá') || cl.includes('price');
      });
      if (match) return match;
    }

    // Generic partial match
    return columns.find((c) => c.toLowerCase().includes(k) || k.includes(c.toLowerCase()));
  };

  const handleApplyMultiScannedFields = (rowIndex: number, fields: Record<string, string>) => {
    onSetDataset((prev) => {
      const next = [...prev];
      if (rowIndex < 0 || rowIndex >= next.length) return prev;
      const updatedRow = { ...next[rowIndex] };

      Object.entries(fields).forEach(([k, v]) => {
        if (!v || !v.trim()) return;
        const targetCol = findMatchingColumn(k, columnOrder);
        if (targetCol) {
          updatedRow[targetCol] = v.trim();
        } else if (columnOrder.includes(k)) {
          updatedRow[k] = v.trim();
        }
      });

      next[rowIndex] = updatedRow;
      return next;
    });

    const modelName = fields['Model'] || fields['Ten_SP'] || '';
    const imei = fields['IMEI'] || fields['IMEI 1'] || '';
    const summary = [modelName, imei].filter(Boolean).join(' | ');

    showToast(
      'Ghép cặp Tên máy & IMEI thành công!',
      `Đã cập nhật [${summary || 'thông số'}] vào dòng SP #${rowIndex + 1}.`,
      'success'
    );
  };

  const handleAddNewRowWithFields = (fields: Record<string, string>) => {
    const newRow: DatasetRow = {};
    columnOrder.forEach((col) => {
      newRow[col] = '';
    });

    Object.entries(fields).forEach(([k, v]) => {
      if (!v || !v.trim()) return;
      const targetCol = findMatchingColumn(k, columnOrder);
      if (targetCol) {
        newRow[targetCol] = v.trim();
      } else if (columnOrder.includes(k)) {
        newRow[k] = v.trim();
      }
    });

    onSetDataset((prev) => [...prev, newRow]);
    const modelName = fields['Model'] || fields['Ten_SP'] || '';
    const imei = fields['IMEI'] || fields['IMEI 1'] || '';
    showToast(
      'Đã tạo dòng sản phẩm mới!',
      `Đã thêm [${modelName || 'Thiết bị mới'}${imei ? ` - ${imei}` : ''}] vào danh sách.`,
      'success'
    );
  };

  const handleAddMultipleRowsWithFields = (products: Array<Record<string, string>>) => {
    if (!products || products.length === 0) return;

    const newRows: DatasetRow[] = products.map((fields) => {
      const newRow: DatasetRow = {};
      columnOrder.forEach((col) => {
        newRow[col] = '';
      });

      Object.entries(fields).forEach(([k, v]) => {
        if (!v || !v.trim()) return;
        const targetCol = findMatchingColumn(k, columnOrder);
        if (targetCol) {
          newRow[targetCol] = v.trim();
        } else if (columnOrder.includes(k)) {
          newRow[k] = v.trim();
        }
      });
      return newRow;
    });

    onSetDataset((prev) => [...prev, ...newRows]);
    showToast(
      'Thêm hàng loạt thành công!',
      `Đã tạo mới ${newRows.length} sản phẩm từ phiếu quét vào bảng Excel.`,
      'success'
    );
  };

  // Custom Confirm & Toast Alert States
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

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

  // Save Dataset
  const handleSaveDataset = () => {
    try {
      localStorage.setItem('qr_label_pro_dataset', JSON.stringify(dataset));
    } catch (e) {
      console.error('Failed to save dataset to localStorage', e);
    }
    showToast(
      'Đã lưu dữ liệu Excel thành công!',
      `Đã lưu vĩnh viễn ${dataset.length} sản phẩm và ${columnOrder.length} cột dữ liệu vào thiết bị & đồng bộ Cloud!`,
      'success'
    );
  };

  // Sync column order when dataset keys change
  useEffect(() => {
    setColumnOrder((prevOrder) => {
      const existing = prevOrder.filter((k) => allKeys.includes(k));
      const missing = allKeys.filter((k) => !existing.includes(k));
      const updated = [...existing, ...missing];
      if (
        prevOrder.length === updated.length &&
        prevOrder.every((val, idx) => val === updated[idx])
      ) {
        return prevOrder;
      }
      return updated;
    });
  }, [dataset]);

  // Active visible columns
  const activeColumns = columnOrder.filter((col) => !hiddenColumns.has(col));

  // Cell change
  const handleCellChange = (rowIndex: number, headerKey: string, newValue: string) => {
    onSetDataset((prev) => {
      const next = [...prev];
      next[rowIndex] = {
        ...next[rowIndex],
        [headerKey]: newValue,
      };
      return next;
    });
  };

  // Add Row
  const handleAddRow = () => {
    const cols = columnOrder.length > 0 ? columnOrder : effectiveColumns;
    const newRow: DatasetRow = {};
    cols.forEach((h) => {
      const lower = h.toLowerCase();
      if (lower.includes('gia') || lower.includes('price')) {
        newRow[h] = 10000000;
      } else if (lower.includes('imei')) {
        newRow[h] = '35' + Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
      } else {
        newRow[h] = `SP_${Date.now().toString().slice(-4)}`;
      }
    });
    onSetDataset((prev) => [...prev, newRow]);
    if (columnOrder.length === 0) {
      setColumnOrder(cols);
    }
    showToast('Thêm dòng thành công', 'Đã chèn 1 dòng sản phẩm mới.', 'success');
  };

  // Delete Row
  const handleDeleteRow = (index: number) => {
    setConfirmState({
      isOpen: true,
      title: 'Xóa Dòng Dữ Liệu',
      message: `Bạn có chắc muốn xóa dòng dữ liệu #${index + 1}?`,
      type: 'danger',
      confirmText: 'Xóa Dòng',
      onConfirm: () => {
        onSetDataset((prev) => prev.filter((_, idx) => idx !== index));
        setSelectedRows((prev) => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
        showToast('Đã xóa dòng', `Đã xóa thành công dòng #${index + 1}.`, 'success');
      },
    });
  };

  // Delete Selected Rows
  const handleDeleteSelectedRows = () => {
    if (selectedRows.size === 0) return;
    setConfirmState({
      isOpen: true,
      title: 'Xóa Dòng Đã Chọn',
      message: `Bạn có chắc chắn muốn xóa ${selectedRows.size} dòng dữ liệu đã chọn?`,
      type: 'danger',
      confirmText: 'Xóa Hàng Hàng Loạt',
      onConfirm: () => {
        onSetDataset((prev) => prev.filter((_, idx) => !selectedRows.has(idx)));
        setSelectedRows(new Set());
        showToast('Xóa dữ liệu thành công', `Đã xóa ${selectedRows.size} dòng sản phẩm.`, 'success');
      },
    });
  };

  // Add Column
  const handleAddColumn = (nameToAdd?: string) => {
    const colName = nameToAdd || newColTitle;
    if (!colName || !colName.trim()) {
      showToast('Cảnh báo', 'Vui lòng nhập tên cột mới!', 'warning');
      return;
    }

    const cleanName = colName.trim().replace(/\s+/g, '_');
    if (allKeys.includes(cleanName) || columnOrder.includes(cleanName)) {
      showToast('Tên cột trùng lặp', `Cột "${cleanName}" đã tồn tại!`, 'error');
      return;
    }

    onSetDataset((prev) => {
      if (prev.length === 0) {
        return [{ [cleanName]: '' }];
      }
      return prev.map((row) => ({
        ...row,
        [cleanName]: '',
      }));
    });
    setColumnOrder((prev) => [...prev, cleanName]);
    setNewColTitle('');
    showToast('Thêm cột thành công', `Đã thêm cột "${cleanName}" vào danh sách.`, 'success');
  };

  // Rename Column Key
  const handleRenameColumn = (oldName: string, newName: string) => {
    const cleanNew = newName.trim().replace(/\s+/g, '_');
    if (!cleanNew || cleanNew === oldName) {
      setEditingColName(null);
      return;
    }
    if (allKeys.includes(cleanNew) || columnOrder.includes(cleanNew)) {
      showToast('Trùng tên cột', `Tên cột "${cleanNew}" đã tồn tại!`, 'error');
      return;
    }

    onSetDataset((prev) =>
      prev.map((row) => {
        const updatedRow: DatasetRow = {};
        Object.keys(row).forEach((k) => {
          if (k === oldName) {
            updatedRow[cleanNew] = row[oldName];
          } else {
            updatedRow[k] = row[k];
          }
        });
        return updatedRow;
      })
    );

    setColumnOrder((prev) => prev.map((col) => (col === oldName ? cleanNew : col)));
    setEditingColName(null);
    showToast('Đổi tên cột thành công', `Đã đổi tên cột từ "${oldName}" thành "${cleanNew}".`, 'success');
  };

  // Delete Column
  const handleDeleteColumn = (colToDelete: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Xác Nhận Xóa Cột Dữ Liệu',
      message: `Bạn có chắc chắn muốn xóa cột "${colToDelete}" khỏi toàn bộ ${dataset.length} dòng dữ liệu? Các biến liên quan trên tem có thể bị mất giá trị.`,
      type: 'danger',
      confirmText: 'Xóa Cột Ngay',
      onConfirm: () => {
        onSetDataset((prev) =>
          prev.map((row) => {
            const updatedRow = { ...row };
            delete updatedRow[colToDelete];
            return updatedRow;
          })
        );
        setColumnOrder((prev) => prev.filter((col) => col !== colToDelete));
        setHiddenColumns((prev) => {
          const next = new Set(prev);
          next.delete(colToDelete);
          return next;
        });
        showToast('Xóa cột thành công', `Đã xóa hoàn toàn cột "${colToDelete}".`, 'success');
      },
    });
  };

  // Move Column Position
  const handleMoveColumn = (index: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= columnOrder.length) return;

    const newOrder = [...columnOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;
    setColumnOrder(newOrder);
  };

  // Toggle Column Visibility
  const toggleColumnVisibility = (colName: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(colName)) {
        next.delete(colName);
      } else {
        if (columnOrder.length - next.size <= 1) {
          alert('Bảng phải có ít nhất 1 cột hiển thị!');
          return prev;
        }
        next.add(colName);
      }
      return next;
    });
  };

  // Copy variable tag
  const copyVariableTag = (colName: string) => {
    navigator.clipboard.writeText(`{{${colName}}}`);
    setCopiedCol(colName);
    setTimeout(() => setCopiedCol(null), 1500);
  };

  // Filter dataset rows by search query
  const filteredDataset = dataset.filter((row) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return Object.values(row).some((val) =>
      String(val ?? '').toLowerCase().includes(query)
    );
  });

  // Checkbox select all
  const isAllSelected =
    filteredDataset.length > 0 && selectedRows.size === filteredDataset.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredDataset.map((_, idx) => idx)));
    }
  };

  const toggleSelectRow = (idx: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  if (!dataset.length) {
    return (
      <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-4 sm:p-8 flex flex-col items-center justify-center text-center overflow-y-auto">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25">
            <Database className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Chưa Có Bảng Dữ Liệu Sản Phẩm
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Bạn có thể thêm sản phẩm thủ công, nạp ngay dữ liệu mẫu điện thoại, hoặc nhập file Excel để in tem.
            </p>
          </div>

          {/* Main Action Buttons */}
          <div className="space-y-2.5 pt-1">
            {/* Primary: Add Product Directly */}
            <button
              onClick={() => setIsAddProductModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/25 transition-all cursor-pointer text-xs sm:text-sm active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Thêm Sản Phẩm Mới (Thủ Công / Quét)</span>
            </button>

            {/* Quick Load Sample Phone Data */}
            <button
              onClick={handleLoadSampleDataset}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-bold rounded-2xl transition-all cursor-pointer text-xs active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>⚡ Nạp Dữ Liệu Mẫu Điện Thoại (Thử Ngay)</span>
            </button>

            {/* Camera Scan OCR */}
            <button
              onClick={() => {
                handleAddRow();
                setTimeout(() => {
                  handleOpenScanModal(0, effectiveColumns[0] || 'IMEI', '', {});
                }, 50);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 font-semibold rounded-2xl transition-all cursor-pointer text-xs active:scale-[0.98]"
            >
              <Scan className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>📷 Quét Camera / Barcode OCR</span>
            </button>
          </div>

          {/* Secondary Excel Options */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
            <button
              onClick={onOpenImportModal}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold rounded-xl transition-all cursor-pointer text-[11px] sm:text-xs"
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span>Tải File Excel Lên</span>
            </button>

            <button
              onClick={() => generateSamplePhoneShopExcel(elements, template)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-[11px] sm:text-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Tải Excel Mẫu</span>
            </button>
          </div>
        </div>

        {/* Modals available in empty state */}
        <AddProductModal
          isOpen={isAddProductModalOpen}
          onClose={() => setIsAddProductModalOpen(false)}
          onAddProduct={handleAddProduct}
          columns={effectiveColumns}
          template={template}
          elements={elements}
          onOpenScanner={(fieldName, currentValue) => {
            setScannerTarget({
              rowIndex: dataset.length,
              fieldName,
              currentValue,
              allRowData: {},
              availableColumns: effectiveColumns,
            });
            setIsScannerOpen(true);
          }}
        />

        <TextScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          target={scannerTarget}
          onApplyValue={handleApplyScannedValue}
          onApplyMultiFields={handleApplyMultiScannedFields}
          onAddNewRowWithFields={handleAddNewRowWithFields}
          onAddMultipleRowsWithFields={handleAddMultipleRowsWithFields}
        />

        <ConfirmModal
          state={confirmState}
          onClose={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
        />

        <ToastNotification
          state={toastState}
          onClose={() => setToastState((prev) => ({ ...prev, isOpen: false }))}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-100 dark:bg-slate-950 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="p-2 sm:p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div className="flex items-center justify-between min-w-0 w-full sm:w-auto">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Database className="w-4 h-4 shrink-0" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
                <span className="truncate">Sản Phẩm Excel</span>
                <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-mono shrink-0 whitespace-nowrap">
                  {dataset.length} sp x {columnOrder.length} cột
                </span>
              </h2>
            </div>
          </div>

          {/* View Mode: On mobile always show Card badge; On desktop allow toggle */}
          {isMobile ? (
            <div className="flex items-center px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[11px] font-bold shrink-0">
              Dạng Thẻ
            </div>
          ) : (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                title="Chế độ Xem Bảng Grid"
              >
                Bảng Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                title="Chế độ Xem Dạng Thẻ"
              >
                Dạng Thẻ
              </button>
            </div>
          )}
        </div>

        {/* Action Controls Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 touch-pan-x min-w-0 w-full shrink-0">
          {/* Quick Search */}
          <div className="relative w-28 sm:w-40 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 shrink-0" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Scan Button */}
          <button
            onClick={() => {
              if (dataset.length === 0) {
                handleAddRow();
                setTimeout(() => {
                  handleOpenScanModal(0, activeColumns[0] || 'IMEI', '', {});
                }, 50);
              } else {
                handleOpenScanModal(0, activeColumns[0] || 'IMEI', String(dataset[0]?.[activeColumns[0]] ?? ''), dataset[0]);
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-blue-500/20 cursor-pointer whitespace-nowrap shrink-0 active:scale-95"
            title="Mở Camera quét mã vạch / IMEI / Nhận diện văn bản OCR"
          >
            <Scan className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap text-[11px] sm:text-xs">Quét Scan OCR</span>
          </button>

          {/* Column Customization Opener */}
          <button
            onClick={() => setIsColumnModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="whitespace-nowrap text-[11px] sm:text-xs">Cột ({activeColumns.length}/{columnOrder.length})</span>
          </button>

          {/* Add Product Modal Opener (Primary) */}
          <button
            onClick={() => setIsAddProductModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 cursor-pointer whitespace-nowrap shrink-0 active:scale-95"
            title="Mở form thêm sản phẩm mới (Có gợi ý & quét camera)"
          >
            <Plus className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
            <span className="whitespace-nowrap text-[11px] sm:text-xs">Thêm Sản Phẩm</span>
          </button>

          {/* Quick Insert Blank Row */}
          <button
            onClick={handleAddRow}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-xl cursor-pointer whitespace-nowrap shrink-0 active:scale-95"
            title="Chèn nhanh 1 dòng trống vào cuối bảng"
          >
            <Plus className="w-3 h-3 shrink-0" />
            <span className="whitespace-nowrap text-[10.5px]">Dòng Trống</span>
          </button>

          {/* Import Excel */}
          <button
            onClick={onOpenImportModal}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl cursor-pointer whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="whitespace-nowrap text-[11px] sm:text-xs">Nạp Excel</span>
          </button>

          {/* Save Dataset Button */}
          <button
            onClick={handleSaveDataset}
            className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 cursor-pointer transition-all whitespace-nowrap shrink-0 active:scale-95"
            title="Lưu dữ liệu Excel lên Cloud"
          >
            <Save className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap text-[11px] sm:text-xs">Lưu Dữ Liệu</span>
          </button>
        </div>
      </div>

      {/* Batch Action Strip */}
      {selectedRows.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/60 px-3 sm:px-6 py-1.5 border-b border-blue-200 dark:border-blue-900 flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
          <span className="font-semibold text-[11px] sm:text-xs">
            Đã chọn <b>{selectedRows.size}</b> sản phẩm
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteSelectedRows}
              className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white hover:bg-red-700 rounded-lg font-bold text-[11px] cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa Đã Chọn</span>
            </button>
            <button
              onClick={() => setSelectedRows(new Set())}
              className="px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] cursor-pointer"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-2 sm:p-4 md:p-6 pb-28">
        {viewMode === 'cards' || isMobile ? (
          /* MOBILE CARD VIEW: Clean touch cards for mobile phones */
          <div className="space-y-3 pb-24">
            {filteredDataset.map((row, rowIndex) => {
              const isSelected = selectedRows.has(rowIndex);
              return (
                <div
                  key={rowIndex}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-blue-50/90 dark:bg-blue-950/80 border-blue-400 dark:border-blue-600 shadow-md'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(rowIndex)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-500 font-mono">
                        Sản Phẩm #{rowIndex + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenScanModal(
                            rowIndex,
                            activeColumns[0] || 'IMEI',
                            String(row[activeColumns[0]] ?? ''),
                            row
                          )
                        }
                        className="p-1 px-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-lg cursor-pointer flex items-center gap-1 text-[11px] font-bold border border-blue-200 dark:border-blue-800 shadow-2xs"
                        title="Quét ảnh tem hoặc vỏ hộp để nhận diện tự động"
                      >
                        <Scan className="w-3.5 h-3.5" />
                        <span>Quét Hộp/Tem</span>
                      </button>

                      <button
                        onClick={() => handleDeleteRow(rowIndex)}
                        className="p-1.5 text-red-500 hover:text-red-700 bg-red-50 dark:bg-red-950/40 rounded-lg cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {activeColumns.map((header) => {
                      const cellVal = String(row[header] ?? '');
                      return (
                        <div key={header} className="space-y-1">
                          <label className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 font-mono flex items-center justify-between">
                            <span className="truncate mr-1">{header}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenScanModal(rowIndex, header, cellVal, row)}
                                className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 flex items-center gap-1 text-[10px] font-sans font-bold cursor-pointer transition-colors shadow-2xs active:scale-95"
                                title={`Quét Camera / Nhận diện văn bản OCR cho ${header}`}
                              >
                                <Scan className="w-3 h-3" />
                                <span>Scan</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => copyVariableTag(header)}
                                className="text-slate-400 hover:text-blue-500 p-0.5"
                                title="Sao chép biến"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </label>
                          <div className="relative flex items-center">
                            <textarea
                              rows={Math.max(1, Math.min(4, Math.ceil((cellVal.length || 1) / 32)))}
                              value={cellVal}
                              onChange={(e) => handleCellChange(rowIndex, header, e.target.value)}
                              placeholder={`Nhập ${header}...`}
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:outline-none pr-8"
                            />
                            <button
                              type="button"
                              onClick={() => handleOpenScanModal(rowIndex, header, cellVal, row)}
                              className="absolute right-2 top-2 p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded cursor-pointer"
                              title={`Bấm để quét mã / chụp ảnh nhận diện cho ${header}`}
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* TABLE GRID VIEW */
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs min-w-[600px]">
              <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 font-bold sticky top-0 z-10">
                <tr>
                  {/* Checkbox Select All */}
                  <th className="p-3 w-10 text-center border-r border-slate-200 dark:border-slate-800">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>

                  <th className="p-3 w-12 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400">
                    #
                  </th>

                  {/* Visible Column Headers */}
                  {activeColumns.map((header) => (
                    <th
                      key={header}
                      className="p-3 font-mono border-r border-slate-200 dark:border-slate-800 group relative hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <span className="text-emerald-700 dark:text-emerald-300 font-bold truncate">
                            {header}
                          </span>
                          {copiedCol === header && (
                            <span className="text-[10px] text-blue-600 font-sans font-bold bg-blue-50 px-1 rounded">
                              Đã chép!
                            </span>
                          )}
                        </div>

                        {/* Header Quick Action Dropdown Icons */}
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
                          <button
                            onClick={() => copyVariableTag(header)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded cursor-pointer"
                            title="Sao chép mã {{mã biến}}"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleColumnVisibility(header)}
                            className="p-1 text-slate-400 hover:text-amber-600 rounded cursor-pointer"
                            title="Ẩn cột này"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteColumn(header)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                            title="Xóa cột này khỏi toàn bộ dữ liệu"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </th>
                  ))}

                  <th className="p-3 w-16 text-center">Xóa</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-slate-800 dark:text-slate-200">
                {filteredDataset.map((row, rowIndex) => {
                  const isSelected = selectedRows.has(rowIndex);
                  return (
                    <tr
                      key={rowIndex}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-blue-50/70 dark:bg-blue-950/40'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Select Row Checkbox */}
                      <td className="p-3 text-center border-r border-slate-200 dark:border-slate-800 vertical-top">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(rowIndex)}
                          className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer mt-1"
                        />
                      </td>

                      <td className="p-3 text-center text-slate-400 font-bold border-r border-slate-200 dark:border-slate-800 vertical-top">
                        <span className="mt-1 block">{rowIndex + 1}</span>
                      </td>

                      {/* Visible Column Cells */}
                      {activeColumns.map((header) => {
                        const cellVal = String(row[header] ?? '');
                        const lineCount = cellVal.split('\n').length;
                        const charLength = cellVal.length;
                        // Dynamically compute rows to avoid vertical text clipping
                        const estimatedRows = Math.max(
                          lineCount,
                          Math.ceil(charLength / 22)
                        );
                        const computedRows = Math.max(1, Math.min(4, estimatedRows));

                        return (
                          <td key={header} className="p-1 border-r border-slate-200 dark:border-slate-800 align-top group/cell relative">
                            <div className="relative flex items-center">
                              <textarea
                                rows={computedRows}
                                value={cellVal}
                                onChange={(e) => handleCellChange(rowIndex, header, e.target.value)}
                                className="w-full px-2 py-1.5 rounded bg-transparent focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-blue-500 text-xs font-mono resize-y leading-relaxed min-h-[36px] pr-6"
                                placeholder="..."
                              />
                              <button
                                type="button"
                                onClick={() => handleOpenScanModal(rowIndex, header, cellVal, row)}
                                className="opacity-0 group-hover/cell:opacity-100 absolute right-1 top-1.5 p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-white/80 dark:bg-slate-900/80 rounded transition-opacity cursor-pointer shadow-2xs"
                                title={`Quét scan cho ô ${header}`}
                              >
                                <Scan className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        );
                      })}

                      <td className="p-3 text-center align-top">
                        <button
                          onClick={() => handleDeleteRow(rowIndex)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer mt-0.5"
                          title="Xóa dòng này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Column Customization Modal */}
      {isColumnModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Tuỳ Chọn & Quản Lý Các Cột Dữ Liệu
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Bật/tắt hiển thị, đổi tên, thay đổi thứ tự hoặc xóa cột Excel
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsColumnModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Add New Column Form */}
              <div className="flex items-center gap-2 p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                <input
                  type="text"
                  placeholder="Nhập tên cột mới (VD: DungLuong, BaoHanh)..."
                  value={newColTitle}
                  onChange={(e) => setNewColTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newColTitle.trim()) {
                      handleAddColumn(newColTitle);
                      setNewColTitle('');
                    }
                  }}
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => {
                    if (newColTitle.trim()) {
                      handleAddColumn(newColTitle);
                      setNewColTitle('');
                    }
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Cột</span>
                </button>
              </div>

              {/* Column List with Toggles & Order Controls */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
                  <span>DANH SÁCH CỘT ({columnOrder.length})</span>
                  <span className="text-[11px] font-normal">Tùy chỉnh hiển thị</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  {columnOrder.map((colName, index) => {
                    const isVisible = !hiddenColumns.has(colName);
                    const isEditing = editingColName === colName;

                    return (
                      <div
                        key={colName}
                        className={`p-2.5 flex items-center justify-between gap-3 transition-colors ${
                          isVisible
                            ? 'bg-white dark:bg-slate-900'
                            : 'bg-slate-50 dark:bg-slate-800/40 text-slate-400'
                        }`}
                      >
                        {/* Visibility Checkbox & Name */}
                        <div className="flex items-center gap-2.5 flex-1 overflow-hidden">
                          <button
                            onClick={() => toggleColumnVisibility(colName)}
                            className={`p-1 rounded cursor-pointer transition-colors ${
                              isVisible
                                ? 'text-blue-600 bg-blue-50 dark:bg-blue-950'
                                : 'text-slate-400 bg-slate-100 dark:bg-slate-800'
                            }`}
                            title={isVisible ? 'Ẩn cột' : 'Hiện cột'}
                          >
                            {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>

                          {isEditing ? (
                            <input
                              autoFocus
                              type="text"
                              defaultValue={colName}
                              onBlur={(e) => handleRenameColumn(colName, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleRenameColumn(colName, e.currentTarget.value);
                                } else if (e.key === 'Escape') {
                                  setEditingColName(null);
                                }
                              }}
                              className="px-2 py-0.5 bg-blue-50 dark:bg-slate-800 border border-blue-500 rounded text-xs font-mono font-bold outline-none"
                            />
                          ) : (
                            <span
                              onClick={() => setEditingColName(colName)}
                              className={`font-mono text-xs font-bold cursor-pointer hover:underline truncate ${
                                isVisible ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 line-through'
                              }`}
                              title="Click để đổi tên cột"
                            >
                              {`{{${colName}}}`}
                            </span>
                          )}
                        </div>

                        {/* Action Buttons: Rename, Order Up/Down, Delete */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => copyVariableTag(colName)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="Sao chép mã"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setEditingColName(colName)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="Đổi tên cột"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            disabled={index === 0}
                            onClick={() => handleMoveColumn(index, 'left')}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="Chuyển lên trước"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>

                          <button
                            disabled={index === columnOrder.length - 1}
                            onClick={() => handleMoveColumn(index, 'right')}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="Chuyển xuống sau"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteColumn(colName)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="Xóa cột này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Hiển thị {activeColumns.length} / {columnOrder.length} cột
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleSaveDataset();
                    setIsColumnModalOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-500/20 cursor-pointer transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu Cấu Hình Cột</span>
                </button>
                <button
                  onClick={() => setIsColumnModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-xl text-xs cursor-pointer"
                >
                  Đóng Modal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        onAddProduct={handleAddProduct}
        columns={effectiveColumns}
        template={template}
        elements={elements}
        onOpenScanner={(fieldName, currentValue) => {
          setScannerTarget({
            rowIndex: dataset.length,
            fieldName,
            currentValue,
            allRowData: {},
            availableColumns: effectiveColumns,
          });
          setIsScannerOpen(true);
        }}
      />

      {/* Text & Barcode Scanner Modal */}
      <TextScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        target={scannerTarget}
        onApplyValue={handleApplyScannedValue}
        onApplyMultiFields={handleApplyMultiScannedFields}
        onAddNewRowWithFields={handleAddNewRowWithFields}
        onAddMultipleRowsWithFields={handleAddMultipleRowsWithFields}
      />

      {/* Confirmation Dialog */}
      <ConfirmModal
        state={confirmState}
        onClose={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Toast Notification */}
      <ToastNotification
        state={toastState}
        onClose={() => setToastState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
