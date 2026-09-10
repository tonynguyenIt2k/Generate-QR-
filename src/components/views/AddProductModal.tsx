import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Scan,
  Smartphone,
  Check,
  Sparkles,
  Barcode,
  Save,
  RefreshCw,
  Tag,
  Hash,
  Coins,
  ShieldCheck,
} from 'lucide-react';
import { DatasetRow, LabelElement, LabelTemplate } from '../../types/label';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: DatasetRow, continueAdding?: boolean) => void;
  columns: string[];
  template?: LabelTemplate;
  elements?: LabelElement[];
  onOpenScanner?: (fieldName: string, currentValue: string) => void;
}

interface QuickPhonePreset {
  name: string;
  shortName: string;
  storage: string;
  color: string;
  price: string;
}

const POPULAR_PRESETS: QuickPhonePreset[] = [
  { name: 'iPhone 15 Pro Max', shortName: '15 Pro Max', storage: '256GB', color: 'Titan Tự Nhiên', price: '25490000' },
  { name: 'iPhone 15 Pro', shortName: '15 Pro', storage: '128GB', color: 'Titan Xanh', price: '21990000' },
  { name: 'iPhone 15', shortName: 'iPhone 15', storage: '128GB', color: 'Đen Huyền Bí', price: '16990000' },
  { name: 'iPhone 14 Pro Max', shortName: '14 Pro Max', storage: '128GB', color: 'Tím Deep Purple', price: '20490000' },
  { name: 'iPhone 14', shortName: 'iPhone 14', storage: '128GB', color: 'Trắng Tinh Khôi', price: '14290000' },
  { name: 'iPhone 13 128GB', shortName: 'iPhone 13', storage: '128GB', color: 'Xanh Midnight', price: '12490000' },
  { name: 'Samsung Galaxy S24 Ultra', shortName: 'S24 Ultra', storage: '256GB', color: 'Xám Titan', price: '23990000' },
  { name: 'Samsung Galaxy Z Flip5', shortName: 'Z Flip5', storage: '256GB', color: 'Xanh Mint', price: '13990000' },
  { name: 'Xiaomi 14 Ultra', shortName: 'Xiaomi 14U', storage: '512GB', color: 'Đen Da Thuần', price: '21990000' },
  { name: 'iPad Air 5 64GB', shortName: 'iPad Air 5', storage: '64GB', color: 'Xám Space Gray', price: '12990000' },
];

const STORAGE_OPTIONS = ['64GB', '128GB', '256GB', '512GB', '1TB'];

const COLOR_OPTIONS = [
  'Titan Tự Nhiên',
  'Titan Đen',
  'Titan Xanh',
  'Titan Sa Mạc',
  'Đen Huyền Bí',
  'Trắng Tinh Khôi',
  'Vàng Gold',
  'Tím Deep Purple',
  'Xám Titan',
];

const WARRANTY_OPTIONS = ['12 Tháng', '6 Tháng', '3 Tháng', 'Bao Test 30 Ngày', 'Chính Hãng VN/A'];

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onAddProduct,
  columns,
  template,
  elements,
  onOpenScanner,
}) => {
  // Determine effective fields
  const effectiveColumns = React.useMemo(() => {
    if (columns && columns.length > 0) return columns;
    return ['Model', 'DungLuong', 'MauSac', 'IMEI', 'Gia'];
  }, [columns]);

  // Form state
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [addedCount, setAddedCount] = useState(0);

  // Initialize form when opened
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, string> = {};
      effectiveColumns.forEach((col) => {
        const lower = col.toLowerCase();
        if (lower.includes('gia') || lower.includes('price')) {
          initial[col] = '24990000';
        } else if (lower.includes('dung') || lower.includes('storage')) {
          initial[col] = '256GB';
        } else if (lower.includes('mau') || lower.includes('color')) {
          initial[col] = 'Titan Tự Nhiên';
        } else if (lower.includes('imei')) {
          initial[col] = generateRandomImei();
        } else if (lower.includes('serial') || lower.includes('sn')) {
          initial[col] = generateRandomSerial();
        } else if (lower.includes('baohanh')) {
          initial[col] = '12 Tháng';
        } else if (lower.includes('model') || lower.includes('ten')) {
          initial[col] = 'iPhone 15 Pro Max';
        } else {
          initial[col] = '';
        }
      });
      setFormData(initial);
      setAddedCount(0);
    }
  }, [isOpen, effectiveColumns]);

  if (!isOpen) return null;

  function generateRandomImei(): string {
    const prefix = '35';
    let imei = prefix;
    for (let i = 0; i < 13; i++) {
      imei += Math.floor(Math.random() * 10).toString();
    }
    return imei;
  }

  function generateRandomSerial(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    let res = 'F2';
    for (let i = 0; i < 9; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  }

  const handleFieldChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = (continueAdding = false) => {
    // Validate that at least one identifying field is entered
    const hasData = Object.values(formData).some((v) => v && v.trim());
    if (!hasData) {
      alert('Vui lòng nhập ít nhất một thông tin sản phẩm!');
      return;
    }

    const cleanRow: DatasetRow = {};
    effectiveColumns.forEach((col) => {
      const val = formData[col] ?? '';
      const lower = col.toLowerCase();
      if ((lower.includes('gia') || lower.includes('price')) && !isNaN(Number(val)) && val.trim() !== '') {
        cleanRow[col] = Number(val);
      } else {
        cleanRow[col] = val.trim();
      }
    });

    onAddProduct(cleanRow, continueAdding);
    setAddedCount((c) => c + 1);

    if (continueAdding) {
      // Prepare for next product: keep model, storage, color, warranty but generate new IMEI/Serial
      setFormData((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          const lower = k.toLowerCase();
          if (lower.includes('imei')) {
            next[k] = generateRandomImei();
          } else if (lower.includes('serial') || lower.includes('sn')) {
            next[k] = generateRandomSerial();
          } else if (lower.includes('mamay') || lower.includes('sku')) {
            next[k] = '';
          }
        });
        return next;
      });
    } else {
      onClose();
    }
  };

  const formatVnd = (val: string) => {
    const num = parseInt(val.replace(/\D/g, ''), 10);
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
  };

  const getFieldMeta = (key: string) => {
    const lower = key.toLowerCase();
    if (lower.includes('model') || lower.includes('ten')) {
      return {
        label: 'Tên Máy / Model',
        icon: <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
        placeholder: 'Ví dụ: iPhone 15 Pro Max',
        type: 'model',
      };
    }
    if (lower.includes('imei')) {
      return {
        label: 'Số IMEI (15 chữ số)',
        icon: <Barcode className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
        placeholder: 'Ví dụ: 356782091234561',
        type: 'imei',
      };
    }
    if (lower.includes('serial') || lower === 'sn' || lower === 's/n') {
      return {
        label: 'Số Serial / Mã máy',
        icon: <Hash className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
        placeholder: 'Ví dụ: F2LXK982P01',
        type: 'serial',
      };
    }
    if (lower.includes('dung') || lower.includes('storage') || lower.includes('rom')) {
      return {
        label: 'Dung Lượng (Bộ nhớ)',
        icon: <Tag className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
        placeholder: 'Ví dụ: 256GB',
        type: 'storage',
      };
    }
    if (lower.includes('mau') || lower.includes('color')) {
      return {
        label: 'Màu Sắc Thiết Bị',
        icon: <Sparkles className="w-4 h-4 text-pink-600 dark:text-pink-400" />,
        placeholder: 'Ví dụ: Titan Tự Nhiên',
        type: 'color',
      };
    }
    if (lower.includes('gia') || lower.includes('price')) {
      return {
        label: 'Giá Bán (VNĐ)',
        icon: <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
        placeholder: 'Ví dụ: 24990000',
        type: 'price',
      };
    }
    if (lower.includes('baohanh') || lower.includes('warranty')) {
      return {
        label: 'Thời Hạn Bảo Hành',
        icon: <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
        placeholder: 'Ví dụ: 12 Tháng',
        type: 'warranty',
      };
    }
    return {
      label: key,
      icon: <Tag className="w-4 h-4 text-slate-500" />,
      placeholder: `Nhập giá trị cho cột ${key}...`,
      type: 'text',
    };
  };

  // Apply preset
  const applyPreset = (preset: QuickPhonePreset) => {
    setFormData((prev) => {
      const next = { ...prev };
      effectiveColumns.forEach((col) => {
        const l = col.toLowerCase();
        if (l.includes('model') || l.includes('ten')) {
          next[col] = preset.name;
        } else if (l.includes('dung') || l.includes('storage')) {
          next[col] = preset.storage;
        } else if (l.includes('mau') || l.includes('color')) {
          next[col] = preset.color;
        } else if ((l.includes('gia') || l.includes('price')) && (!next[col] || next[col] === '24990000')) {
          next[col] = preset.price;
        }
      });
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                  Thêm Sản Phẩm Mới
                </h2>
                {addedCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                    +{addedCount} SP
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[220px] sm:max-w-sm">
                {template ? `Mẫu: ${template.name}` : 'Nhập thông tin sản phẩm để in tem nhãn'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-4 flex-1 no-scrollbar">
          {/* Quick Model Presets - 1 Single Horizontal Scroll Row */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Mẫu máy gợi ý nhanh</span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">Vuốt ngang để xem thêm →</span>
            </div>
            <div className="flex overflow-x-auto no-scrollbar gap-1.5 pb-1 -mx-1 px-1">
              {POPULAR_PRESETS.map((preset) => {
                const isSelected = Object.values(formData).some((v) => v === preset.name);
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 border border-slate-200/80 dark:border-slate-700 active:scale-95'
                    }`}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Fields List */}
          <div className="space-y-3.5 pt-0.5">
            {effectiveColumns.map((colKey) => {
              const meta = getFieldMeta(colKey);
              const val = formData[colKey] ?? '';

              return (
                <div key={colKey} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 min-w-0">
                      <span className="shrink-0">{meta.icon}</span>
                      <span className="truncate">{meta.label}</span>
                    </label>

                    {/* Field-specific helper action */}
                    {meta.type === 'imei' && (
                      <button
                        type="button"
                        onClick={() => handleFieldChange(colKey, generateRandomImei())}
                        className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer shrink-0 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-2 py-0.5 rounded-lg active:scale-95 transition-all"
                        title="Tạo IMEI ngẫu nhiên 15 số"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Tạo ngẫu nhiên</span>
                      </button>
                    )}
                    {meta.type === 'serial' && (
                      <button
                        type="button"
                        onClick={() => handleFieldChange(colKey, generateRandomSerial())}
                        className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 flex items-center gap-1 cursor-pointer shrink-0 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 px-2 py-0.5 rounded-lg active:scale-95 transition-all"
                        title="Tạo Serial ngẫu nhiên"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Tạo ngẫu nhiên</span>
                      </button>
                    )}
                  </div>

                  {/* Input Wrapper */}
                  <div className="relative flex items-center">
                    <input
                      type={meta.type === 'price' ? 'number' : 'text'}
                      value={val}
                      onChange={(e) => handleFieldChange(colKey, e.target.value)}
                      placeholder={meta.placeholder}
                      className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all font-medium ${
                        (meta.type === 'imei' || meta.type === 'serial' || meta.type === 'model') && onOpenScanner
                          ? 'pr-20'
                          : ''
                      }`}
                    />

                    {/* Camera Scan button for IMEI / Barcode / Model */}
                    {(meta.type === 'imei' || meta.type === 'serial' || meta.type === 'model') && onOpenScanner && (
                      <button
                        type="button"
                        onClick={() => onOpenScanner(colKey, val)}
                        className="absolute right-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-transform active:scale-95 shadow-xs"
                        title="Quét camera / barcode"
                      >
                        <Scan className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span className="text-[11px] font-bold">Quét</span>
                      </button>
                    )}
                  </div>

                  {/* Quick Options for Storage */}
                  {meta.type === 'storage' && (
                    <div className="flex overflow-x-auto no-scrollbar gap-1 pt-0.5">
                      {STORAGE_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleFieldChange(colKey, opt)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                            val === opt
                              ? 'bg-teal-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Quick Options for Color */}
                  {meta.type === 'color' && (
                    <div className="flex overflow-x-auto no-scrollbar gap-1 pt-0.5">
                      {COLOR_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleFieldChange(colKey, opt)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                            val === opt
                              ? 'bg-pink-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Quick Options for Warranty */}
                  {meta.type === 'warranty' && (
                    <div className="flex overflow-x-auto no-scrollbar gap-1 pt-0.5">
                      {WARRANTY_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleFieldChange(colKey, opt)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                            val === opt
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Currency Preview for Price */}
                  {meta.type === 'price' && val && (
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold pl-1">
                      Thành tiền hiển thị tem: {formatVnd(val)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.85rem)' }}
          className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/95 flex items-center justify-between gap-2 shrink-0 pb-safe"
        >
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95 shrink-0"
          >
            Hủy
          </button>

          <div className="flex items-center gap-2 flex-1 justify-end">
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs border border-slate-300/80 dark:border-slate-700 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
              title="Thêm sản phẩm này và tiếp tục nhập sản phẩm tiếp theo"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5] text-blue-600 dark:text-blue-400" />
              <span className="text-[11.5px] sm:text-xs">Lưu & Thêm Tiếp</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave(false)}
              className="flex items-center justify-center gap-1.5 px-4 sm:px-6 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span className="text-[11.5px] sm:text-xs">Lưu Sản Phẩm</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
