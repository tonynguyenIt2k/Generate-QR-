import React, { useState } from 'react';
import {
  X,
  LayoutTemplate,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  Check,
  Smartphone,
  Tag,
  Warehouse,
  ShieldCheck,
} from 'lucide-react';
import { LabelTemplate } from '../../types/label';
import {
  deleteTemplate,
  exportTemplateToJson,
  importTemplateFromJson,
  saveTemplate,
} from '../../utils/templateStorage';
import { deleteTemplateFromFirebase, saveTemplateToFirebase } from '../../lib/firebase';
import {
  ConfirmModal,
  ToastNotification,
  ConfirmState,
  ToastState,
} from '../common/CustomAlert';

interface TemplateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: LabelTemplate[];
  currentTemplateId: string;
  onSelectTemplate: (template: LabelTemplate) => void;
  onRefreshTemplates: () => void;
}

export const TemplateGalleryModal: React.FC<TemplateGalleryModalProps> = ({
  isOpen,
  onClose,
  templates,
  currentTemplateId,
  onSelectTemplate,
  onRefreshTemplates,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

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

  if (!isOpen) return null;

  const filteredTemplates = templates.filter((t) => {
    if (activeCategory === 'all') return true;
    return t.category === activeCategory;
  });

  const handleDuplicate = (template: LabelTemplate) => {
    const cloned: LabelTemplate = {
      ...template,
      id: 'template_' + Date.now(),
      name: `${template.name} (Bản sao)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveTemplate(cloned);
    saveTemplateToFirebase(cloned);
    onRefreshTemplates();
    showToast('Tạo bản sao thành công', `Đã nhân bản mẫu "${cloned.name}".`, 'success');
  };

  const handleDelete = (templateId: string, name: string) => {
    if (templates.length <= 1) {
      showToast('Không thể xóa', 'Phải giữ lại tối thiểu 1 mẫu tem!', 'warning');
      return;
    }
    setConfirmState({
      isOpen: true,
      title: 'Xác Nhận Xóa Mẫu Tem',
      message: `Bạn có chắc chắn muốn xóa mẫu tem "${name}"? Hành động này sẽ đồng bộ xóa khỏi Cloud Firebase.`,
      type: 'danger',
      confirmText: 'Xóa Mẫu Tem',
      onConfirm: () => {
        deleteTemplate(templateId);
        deleteTemplateFromFirebase(templateId);
        onRefreshTemplates();
        showToast('Xóa thành công', `Đã xóa mẫu tem "${name}".`, 'success');
      },
    });
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await importTemplateFromJson(file);
      saveTemplateToFirebase(imported);
      onRefreshTemplates();
      onSelectTemplate(imported);
      showToast('Nhập JSON thành công', `Đã nhập mẫu tem "${imported.name}".`, 'success');
    } catch (err) {
      showToast('Lỗi nhập mẫu', 'Không thể đọc file JSON mẫu: ' + String(err), 'error');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'phone':
        return <Smartphone className="w-4 h-4 text-blue-500" />;
      case 'accessory':
        return <Tag className="w-4 h-4 text-emerald-500" />;
      case 'warehouse':
        return <Warehouse className="w-4 h-4 text-amber-500" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-indigo-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 gap-2 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <LayoutTemplate className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <h2 className="text-xs sm:text-base font-bold text-slate-800 dark:text-slate-100 truncate">
              Thư Viện Mẫu Tem Điện Thoại & Cửa Hàng
            </h2>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <label className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl cursor-pointer transition-colors whitespace-nowrap shrink-0">
              <Upload className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>Nhập File JSON</span>
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 gap-1.5 sm:gap-2 bg-white dark:bg-slate-900 text-xs font-semibold pt-2.5 pb-2 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'all', label: 'Tất Cả Mẫu' },
            { id: 'phone', label: 'Tem Điện Thoại' },
            { id: 'accessory', label: 'Tem Phụ Kiện' },
            { id: 'warehouse', label: 'Tem Kho & Serial' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Template Cards Grid */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.map((template) => {
            const isSelected = template.id === currentTemplateId;
            return (
              <div
                key={template.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 ring-2 ring-indigo-500/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        {getCategoryIcon(template.category)}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">
                          {template.name}
                        </h3>
                        <span className="inline-block mt-0.5 px-2 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[10px] rounded-md font-semibold">
                          {template.widthMm} x {template.heightMm} mm
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-extrabold bg-indigo-600 text-white rounded-full whitespace-nowrap shrink-0">
                        <Check className="w-3 h-3 shrink-0" />
                        <span>Đang Dùng</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                    {template.description || 'Mẫu tem được thiết kế sẵn cho việc in ấn.'}
                  </p>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleDuplicate(template)}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 cursor-pointer"
                      title="Nhân bản mẫu tem này"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => exportTemplateToJson(template)}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 cursor-pointer"
                      title="Xuất file JSON mẫu"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id, template.name)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-red-600 cursor-pointer"
                      title="Xóa mẫu tem"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      onSelectTemplate(template);
                      onClose();
                    }}
                    className={`px-3.5 sm:px-4 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {isSelected ? 'Đang Thiết Kế' : 'Chọn Mẫu Này'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
};
