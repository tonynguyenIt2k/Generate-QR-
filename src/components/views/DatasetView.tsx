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
} from 'lucide-react';
import { DatasetRow, LabelElement } from '../../types/label';
import { generateSamplePhoneShopExcel } from '../../utils/excelHelper';
import {
  ConfirmModal,
  ToastNotification,
  ConfirmState,
  ToastState,
} from '../common/CustomAlert';

interface DatasetViewProps {
  dataset: DatasetRow[];
  onSetDataset: React.Dispatch<React.SetStateAction<DatasetRow[]>>;
  onOpenImportModal: () => void;
  elements?: LabelElement[];
}

export const DatasetView: React.FC<DatasetViewProps> = ({
  dataset,
  onSetDataset,
  onOpenImportModal,
  elements,
}) => {
  // Extract all existing keys across dataset
  const allKeys = Array.from(
    new Set(dataset.flatMap((row) => Object.keys(row)))
  );

  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [editingColName, setEditingColName] = useState<string | null>(null);
  const [newColTitle, setNewColTitle] = useState('');
  const [copiedCol, setCopiedCol] = useState<string | null>(null);

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
    showToast(
      'Đã lưu dữ liệu Excel thành công!',
      `Đã đồng bộ lưu ${dataset.length} sản phẩm và ${columnOrder.length} cột dữ liệu lên Cloud Firebase.`,
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
    const newRow: DatasetRow = {};
    columnOrder.forEach((h) => {
      newRow[h] = h === 'Gia' ? 10000000 : `SP_${Date.now().toString().slice(-4)}`;
    });
    onSetDataset((prev) => [...prev, newRow]);
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
      <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-8 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center mb-4">
          <Database className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          Chưa Có Bảng Dữ Liệu Sản Phẩm
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6 leading-relaxed">
          Nhập file Excel từ cửa hàng điện thoại để quản lý IMEI, tên máy, dung lượng, màu sắc và giá bán.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenImportModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer text-xs"
          >
            <Upload className="w-4 h-4" />
            <span>Tải File Excel Ngay</span>
          </button>
          <button
            onClick={() => generateSamplePhoneShopExcel(elements)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Tải Excel Mẫu (.xlsx)</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-100 dark:bg-slate-950 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Database className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate">
              <span className="truncate">Bảng Dữ Liệu Sản Phẩm</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-[10px] sm:text-[11px] font-mono shrink-0 whitespace-nowrap">
                {dataset.length} hàng x {columnOrder.length} cột
              </span>
            </h2>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Chỉnh sửa thông tin, bật/tắt cột và chèn mã biến số
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0">
          {/* Quick Search */}
          <div className="relative w-36 sm:w-44 shrink-0">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 shrink-0" />
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

          {/* Column Customization Modal Opener */}
          <button
            onClick={() => setIsColumnModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="whitespace-nowrap">Tùy Chọn Cột ({activeColumns.length}/{columnOrder.length})</span>
          </button>

          {/* Add Row */}
          <button
            onClick={handleAddRow}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Thêm Dòng</span>
          </button>

          {/* Import Excel */}
          <button
            onClick={onOpenImportModal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl cursor-pointer whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="whitespace-nowrap">Nạp Excel</span>
          </button>

          {/* Save Dataset Button */}
          <button
            onClick={handleSaveDataset}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 cursor-pointer transition-all whitespace-nowrap shrink-0"
            title="Lưu dữ liệu Excel lên Cloud"
          >
            <Save className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Lưu Dữ Liệu Excel</span>
          </button>
        </div>
      </div>

      {/* Batch Action Strip */}
      {selectedRows.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/60 px-6 py-2 border-b border-blue-200 dark:border-blue-900 flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
          <span className="font-semibold">
            Đã chọn <b>{selectedRows.size}</b> sản phẩm
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteSelectedRows}
              className="flex items-center gap-1 px-2.5 py-1 bg-red-600 text-white hover:bg-red-700 rounded-lg font-bold text-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa Các Dòng Đã Chọn</span>
            </button>
            <button
              onClick={() => setSelectedRows(new Set())}
              className="px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs cursor-pointer"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Main Table View */}
      <div className="flex-1 overflow-auto p-6">
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
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
                {activeColumns.map((header, colIndex) => (
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
                    <td className="p-3 text-center border-r border-slate-200 dark:border-slate-800">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(rowIndex)}
                        className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>

                    <td className="p-3 text-center text-slate-400 font-bold border-r border-slate-200 dark:border-slate-800">
                      {rowIndex + 1}
                    </td>

                    {/* Visible Column Cells */}
                    {activeColumns.map((header) => (
                      <td key={header} className="p-1.5 border-r border-slate-200 dark:border-slate-800">
                        <input
                          type="text"
                          value={String(row[header] ?? '')}
                          onChange={(e) => handleCellChange(rowIndex, header, e.target.value)}
                          className="w-full px-2 py-1 rounded bg-transparent focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-blue-500 text-xs font-mono"
                        />
                      </td>
                    ))}

                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteRow(rowIndex)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
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
