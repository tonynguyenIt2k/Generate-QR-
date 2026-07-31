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
  Pencil,
  Heart,
  User,
} from 'lucide-react';
import { LabelTemplate } from '../../types/label';
import { TemplatePreviewThumbnail } from './TemplatePreviewThumbnail';
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
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('qr_label_favorite_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

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

  const toggleFavorite = (id: string, name: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    let updated: string[];
    if (favoriteIds.includes(id)) {
      updated = favoriteIds.filter((favId) => favId !== id);
      showToast('Đã bỏ yêu thích', `Đã xóa mẫu "${name}" khỏi danh sách Yêu Thích.`, 'info');
    } else {
      updated = [...favoriteIds, id];
      showToast('Đã thêm Yêu Thích', `Đã lưu mẫu "${name}" vào Yêu Thích!`, 'success');
    }
    setFavoriteIds(updated);
    localStorage.setItem('qr_label_favorite_ids', JSON.stringify(updated));
  };

  const DEFAULT_TEMPLATE_IDS = new Set([
    'template_dual_40x30',
    'template_phone_2col',
    'template_flagship_50x30',
    'template_vietqr_58x40',
    'template_accessory_40x30',
    'template_warehouse_70x50',
    'template_single_40x30',
    'template_2col_50x30',
  ]);

  const isMyTemplate = (t: LabelTemplate) => {
    return t.isCustom || !DEFAULT_TEMPLATE_IDS.has(t.id);
  };

  const favoriteCount = templates.filter((t) => favoriteIds.includes(t.id)).length;
  const myTemplatesCount = templates.filter(isMyTemplate).length;

  const filteredTemplates = templates.filter((t) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'favorites') return favoriteIds.includes(t.id);
    if (activeCategory === 'my_templates') return isMyTemplate(t);
    return t.category === activeCategory;
  });

  const handleDuplicate = (template: LabelTemplate) => {
    const cloned: LabelTemplate = {
      ...template,
      id: 'template_' + Date.now(),
      name: `${template.name} (Bản sao)`,
      isCustom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveTemplate(cloned);
    saveTemplateToFirebase(cloned);
    onRefreshTemplates();
    showToast('Tạo bản sao thành công', `Đã nhân bản mẫu "${cloned.name}" vào "Mẫu Của Tôi".`, 'success');
  };

  const handleCreateNewBlank = () => {
    const newTpl: LabelTemplate = {
      id: 'template_' + Date.now(),
      name: `Mẫu Tem Của Tôi ${myTemplatesCount + 1}`,
      description: 'Mẫu tem tự thiết kế cá nhân',
      category: 'phone',
      widthMm: 50,
      heightMm: 30,
      elements: [
        {
          id: 'el_' + Date.now() + '_1',
          name: 'Tên Cửa Hàng',
          type: 'text',
          x: 2,
          y: 2,
          width: 46,
          height: 6,
          rotation: 0,
          content: 'TÊN CỬA HÀNG / SẢN PHẨM',
          fontSize: 10,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fontStyle: 'normal',
          textAlign: 'center',
          color: '#000000',
          zIndex: 1,
        },
        {
          id: 'el_' + Date.now() + '_2',
          name: 'Mã QR',
          type: 'qr',
          x: 2,
          y: 10,
          width: 18,
          height: 18,
          rotation: 0,
          content: 'https://example.com',
          qrType: 'url',
          errorCorrection: 'M',
          fgColor: '#000000',
          bgColor: '#ffffff',
          zIndex: 2,
        },
        {
          id: 'el_' + Date.now() + '_3',
          name: 'Model',
          type: 'text',
          x: 22,
          y: 10,
          width: 26,
          height: 5,
          rotation: 0,
          content: 'Model: {{Model}}',
          fontSize: 8,
          fontFamily: 'Inter',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textAlign: 'left',
          color: '#000000',
          zIndex: 3,
        },
        {
          id: 'el_' + Date.now() + '_4',
          name: 'Giá',
          type: 'text',
          x: 22,
          y: 16,
          width: 26,
          height: 5,
          rotation: 0,
          content: 'Giá: {{Gia}}',
          fontSize: 9,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fontStyle: 'normal',
          textAlign: 'left',
          color: '#d97706',
          zIndex: 4,
        },
      ],
      sampleData: {
        Model: 'iPhone 15 Pro Max',
        Gia: '24,990,000đ',
        Serial: 'F2LXK982P01',
      },
      isCustom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveTemplate(newTpl);
    saveTemplateToFirebase(newTpl);
    onRefreshTemplates();
    onSelectTemplate(newTpl);
    onClose();
    showToast('Tạo mẫu mới thành công', `Đã tạo mẫu "${newTpl.name}".`, 'success');
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

  const handleSaveRename = (template: LabelTemplate) => {
    if (editingName.trim() && editingName.trim() !== template.name) {
      const updated: LabelTemplate = {
        ...template,
        name: editingName.trim(),
        updatedAt: new Date().toISOString(),
      };
      saveTemplate(updated);
      saveTemplateToFirebase(updated);
      onRefreshTemplates();
      if (template.id === currentTemplateId) {
        onSelectTemplate(updated);
      }
      showToast('Đổi tên thành công', `Đã đổi tên mẫu thành "${updated.name}".`, 'success');
    }
    setEditingTemplateId(null);
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
            <button
              onClick={handleCreateNewBlank}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs whitespace-nowrap shrink-0"
              title="Tạo mẫu tem mới trống"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Tạo Mẫu Mới</span>
            </button>

            <label className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl cursor-pointer transition-colors whitespace-nowrap shrink-0">
              <Upload className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>Nhập JSON</span>
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

        {/* Category & Section Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 gap-1.5 sm:gap-2 bg-white dark:bg-slate-900 text-xs font-semibold pt-2.5 pb-2 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'all', label: 'Tất Cả Mẫu', icon: null },
            {
              id: 'favorites',
              label: 'Mẫu Yêu Thích',
              icon: <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />,
              count: favoriteCount,
            },
            {
              id: 'my_templates',
              label: 'Mẫu Của Tôi',
              icon: <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />,
              count: myTemplatesCount,
            },
            { id: 'phone', label: 'Tem Điện Thoại', icon: null },
            { id: 'accessory', label: 'Tem Phụ Kiện', icon: null },
            { id: 'warehouse', label: 'Tem Kho & Serial', icon: null },
          ].map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30 font-bold'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
                {cat.count !== undefined && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {cat.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Template Cards Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3">
              {activeCategory === 'favorites' ? (
                <>
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-500 rounded-2xl">
                    <Heart className="w-8 h-8 fill-rose-500" />
                  </div>
                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                    Chưa Có Mẫu Tem Yêu Thích
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                    Bấm biểu tượng trái tim <Heart className="w-3.5 h-3.5 inline text-rose-500 fill-rose-500" /> ở bất kỳ mẫu tem nào để thêm vào danh sách yêu thích!
                  </p>
                </>
              ) : activeCategory === 'my_templates' ? (
                <>
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-2xl">
                    <User className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                    Chưa Có Mẫu Tem Của Tôi
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                    Bạn chưa có mẫu tem tự tạo nào. Bấm 'Tạo Mẫu Mới' hoặc 'Nhân Bản' một mẫu có sẵn để bắt đầu thiết kế.
                  </p>
                  <button
                    onClick={handleCreateNewBlank}
                    className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tạo Mẫu Mới Ngay</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl">
                    <LayoutTemplate className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                    Không Tìm Thấy Mẫu Tem
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Chưa có mẫu tem nào trong danh mục này.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((template) => {
                const isSelected = template.id === currentTemplateId;
                const isFav = favoriteIds.includes(template.id);
                const isCustom = isMyTemplate(template);

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
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-2.5 min-w-0 w-full">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 shadow-2xs">
                            {getCategoryIcon(template.category)}
                          </div>
                          <div className="flex-1 min-w-0">
                            {editingTemplateId === template.id ? (
                              <div className="flex items-center gap-1 mb-1">
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveRename(template);
                                    if (e.key === 'Escape') setEditingTemplateId(null);
                                  }}
                                  onBlur={() => handleSaveRename(template)}
                                  autoFocus
                                  className="px-2 py-0.5 text-xs font-bold bg-white dark:bg-slate-800 border border-indigo-500 rounded text-slate-900 dark:text-white focus:outline-none w-full"
                                />
                                <button
                                  onClick={() => handleSaveRename(template)}
                                  className="p-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 rounded cursor-pointer shrink-0"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 group min-w-0">
                                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight truncate">
                                  {template.name}
                                </h3>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTemplateId(template.id);
                                    setEditingName(template.name);
                                  }}
                                  className="p-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                                  title="Sửa tên mẫu tem"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="px-2 py-0.2 bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-mono text-[10px] rounded-md font-semibold">
                                {template.widthMm} x {template.heightMm} mm {template.isDualPart ? '• Tem Đôi' : ''}
                              </span>
                              {isCustom && (
                                <span className="px-1.5 py-0.2 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold rounded-md">
                                  Của tôi
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Heart Favorite Button */}
                          <button
                            type="button"
                            onClick={(e) => toggleFavorite(template.id, template.name, e)}
                            className={`p-1.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                              isFav
                                ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60'
                                : 'text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={isFav ? 'Bỏ khỏi Yêu Thích' : 'Thêm vào Yêu Thích'}
                          >
                            <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                          </button>

                          {isSelected && (
                            <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold bg-indigo-600 text-white rounded-full whitespace-nowrap shrink-0 shadow-xs">
                              <Check className="w-3 h-3 shrink-0" />
                              <span>Đang Dùng</span>
                            </span>
                          )}
                        </div>
                      </div>

                  {/* Label Result Visual Preview Box */}
                  <div
                    onClick={() => {
                      onSelectTemplate(template);
                      onClose();
                    }}
                    className="my-3 bg-slate-100/90 dark:bg-slate-900/90 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer group flex flex-col items-center justify-center min-h-[135px] shadow-inner relative"
                    title="Bấm để chọn mẫu tem này"
                  >
                    <TemplatePreviewThumbnail template={template} maxHeight={110} />
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">
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
      )}
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
