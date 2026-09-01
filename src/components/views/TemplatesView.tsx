import React, { useState, useRef, useEffect } from 'react';
import {
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
  Search,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  X,
} from 'lucide-react';
import { LabelTemplate } from '../../types/label';
import { TemplatePreviewThumbnail } from '../templates/TemplatePreviewThumbnail';
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

interface TemplatesViewProps {
  templates: LabelTemplate[];
  currentTemplateId: string;
  onSelectTemplate: (template: LabelTemplate) => void;
  onRefreshTemplates: () => void;
  onNavigateToEditor?: () => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  templates,
  currentTemplateId,
  onSelectTemplate,
  onRefreshTemplates,
  onNavigateToEditor,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isSearchOpen]);

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
    const matchesSearch =
      !searchQuery.trim() ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${t.widthMm}x${t.heightMm}`.includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

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
    onNavigateToEditor?.();
    showToast('Tạo mẫu mới thành công', `Đã tạo mẫu "${newTpl.name}" và chuyển sang Thiết Kế.`, 'success');
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
        if (templateId === currentTemplateId) {
          const remaining = templates.filter((t) => t.id !== templateId);
          if (remaining.length > 0) {
            onSelectTemplate(remaining[0]);
          }
        }
        showToast('Đã xóa mẫu tem', `Mẫu tem "${name}" đã được xóa thành công.`, 'success');
      },
    });
  };

  const handleStartRename = (template: LabelTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTemplateId(template.id);
    setEditingName(template.name);
  };

  const handleSaveRename = (template: LabelTemplate) => {
    if (!editingName.trim()) {
      setEditingTemplateId(null);
      return;
    }
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
    setEditingTemplateId(null);
    showToast('Đổi tên thành công', `Đã cập nhật tên thành "${updated.name}".`, 'success');
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await importTemplateFromJson(file);
      saveTemplateToFirebase(imported);
      onRefreshTemplates();
      onSelectTemplate(imported);
      showToast('Nhập thành công', `Đã nạp mẫu tem "${imported.name}" từ file JSON.`, 'success');
    } catch (err: any) {
      showToast('Lỗi nhập file', err.message || 'File JSON không hợp lệ.', 'error');
    }
    e.target.value = '';
  };

  const handleSelectAndEdit = (template: LabelTemplate) => {
    onSelectTemplate(template);
    onNavigateToEditor?.();
    showToast('Đã chọn mẫu tem', `Đang mở thiết kế "${template.name}".`, 'info');
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'phone':
        return { label: 'Điện Thoại', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60' };
      case 'accessory':
        return { label: 'Phụ Kiện', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60' };
      case 'warehouse':
        return { label: 'Kho & Vận Chuyển', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60' };
      default:
        return { label: 'Tiêu Chuẩn', color: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800' };
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50 dark:bg-slate-950">
      {/* Top Banner / Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-2.5 sm:py-3.5 shrink-0 shadow-xs">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Title & Stats */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20 shrink-0">
              <LayoutTemplate className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                  Thư Viện Mẫu Tem
                </h1>
                <span className="px-1.5 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] sm:text-xs font-bold font-mono shrink-0">
                  {templates.length} mẫu
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Chọn mẫu tem có sẵn hoặc tự tạo mẫu tem mới để in ấn hàng loạt
              </p>
            </div>
          </div>

          {/* Action Buttons: Icon-Only for clean compact header */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Search Trigger */}
            <button
              onClick={() => setIsSearchOpen((prev) => !prev)}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                isSearchOpen || searchQuery
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
              title={isSearchOpen ? 'Đóng ô tìm kiếm' : 'Tìm kiếm mẫu tem'}
            >
              <Search className="w-4 h-4 shrink-0" />
            </button>

            {/* Import JSON */}
            <label
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors border border-slate-200 dark:border-slate-700 active:scale-95 shadow-xs"
              title="Nhập mẫu tem từ file JSON"
            >
              <Upload className="w-4 h-4 text-indigo-500 shrink-0" />
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>

            {/* Create New Template */}
            <button
              onClick={handleCreateNewBlank}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center bg-gradient-to-tr from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 active:scale-95 text-white transition-all cursor-pointer shadow-md shadow-indigo-500/25 shrink-0"
              title="Tạo mẫu tem mới từ đầu"
            >
              <Plus className="w-4.5 h-4.5 shrink-0" />
            </button>
          </div>
        </div>

        {/* Expandable Search Bar (Chỉ hiển thị khi bấm icon Search hoặc khi đang có nội dung tìm kiếm) */}
        {(isSearchOpen || searchQuery) && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="relative flex items-center">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Tìm tên mẫu, kích thước (50x30, 40x30), loại tem..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-20 py-2 bg-slate-100 dark:bg-slate-800/90 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-inner"
              />
              <div className="absolute right-2 flex items-center gap-1.5">
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 cursor-pointer transition-colors"
                    title="Xóa tìm kiếm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
                  className="px-2 py-1 bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
            {searchQuery && (
              <div className="flex items-center justify-between px-1 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span>Tìm thấy <strong className="text-indigo-600 dark:text-indigo-400">{filteredTemplates.length}</strong> mẫu phù hợp</span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-medium"
                >
                  Đặt lại
                </button>
              </div>
            )}
          </div>
        )}

        {/* Category Tabs (Thanh trượt ngang bộ lọc) */}
        <div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar scroll-smooth py-0.5 -mx-1 px-1">
          {[
            { id: 'all', label: 'Tất Cả Mẫu', icon: null, count: templates.length },
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
            { id: 'phone', label: 'Tem Điện Thoại', icon: <Smartphone className="w-3.5 h-3.5 text-blue-500 shrink-0" /> },
            { id: 'accessory', label: 'Tem Phụ Kiện', icon: <Tag className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> },
            { id: 'warehouse', label: 'Tem Kho & Serial', icon: <Warehouse className="w-3.5 h-3.5 text-amber-500 shrink-0" /> },
          ].map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm shadow-indigo-500/30 font-bold'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold border border-transparent'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
                {cat.count !== undefined && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      isActive
                        ? 'bg-white/25 text-white'
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
      </div>

      {/* Main Grid View */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 pb-28">
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-lg mx-auto mt-6">
            {activeCategory === 'favorites' ? (
              <>
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 text-rose-500 rounded-3xl">
                  <Heart className="w-10 h-10 fill-rose-500" />
                </div>
                <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                  Chưa Có Mẫu Tem Yêu Thích
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                  Nhấn biểu tượng trái tim <Heart className="w-3.5 h-3.5 inline text-rose-500 fill-rose-500" /> ở bất kỳ mẫu tem nào để thêm vào danh sách yêu thích truy cập nhanh.
                </p>
              </>
            ) : activeCategory === 'my_templates' ? (
              <>
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-3xl">
                  <User className="w-10 h-10" />
                </div>
                <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                  Chưa Có Mẫu Tem Tự Tạo
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                  Bạn chưa có mẫu tem tự tạo nào. Bấm 'Tạo Mẫu Mới' hoặc 'Nhân Bản' từ mẫu có sẵn để bắt đầu thiết kế.
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
                <div className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-3xl">
                  <LayoutTemplate className="w-10 h-10" />
                </div>
                <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
                  Không Tìm Thấy Mẫu Tem
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                  Không có mẫu tem nào phù hợp với bộ lọc hoặc từ khóa tìm kiếm "{searchQuery}".
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('all');
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Xóa bộ lọc tìm kiếm
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filteredTemplates.map((template) => {
              const isSelected = template.id === currentTemplateId;
              const isFav = favoriteIds.includes(template.id);
              const isCustom = isMyTemplate(template);
              const categoryBadge = getCategoryBadge(template.category);

              return (
                <div
                  key={template.id}
                  className={`p-4 rounded-3xl border transition-all flex flex-col justify-between group relative bg-white dark:bg-slate-900 shadow-xs hover:shadow-lg ${
                    isSelected
                      ? 'border-indigo-600 ring-2 ring-indigo-500/30 bg-indigo-50/20 dark:bg-indigo-950/20'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  {/* Top Bar inside Card */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      {editingTemplateId === template.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(template);
                              if (e.key === 'Escape') setEditingTemplateId(null);
                            }}
                            autoFocus
                            className="px-2 py-1 text-xs font-bold bg-white dark:bg-slate-800 border border-indigo-500 rounded-lg text-slate-900 dark:text-white w-full focus:outline-none"
                          />
                          <button
                            onClick={() => handleSaveRename(template)}
                            className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer shrink-0"
                            title="Lưu tên"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <h3
                            className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
                            onClick={() => handleSelectAndEdit(template)}
                            title={template.name}
                          >
                            {template.name}
                          </h3>
                          {isCustom && (
                            <button
                              onClick={(e) => handleStartRename(template, e)}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 transition-opacity p-0.5 cursor-pointer"
                              title="Đổi tên mẫu"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Dimensions & Category Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {template.widthMm} × {template.heightMm} mm
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${categoryBadge.color}`}
                        >
                          {categoryBadge.label}
                        </span>
                        {isCustom && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                            Của tôi
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right action icons (Favorite & Active status) */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isSelected && (
                        <span
                          className="flex items-center gap-1 px-2 py-0.5 bg-indigo-600 text-white rounded-full text-[10px] font-bold shadow-xs"
                          title="Mẫu tem đang được mở thiết kế"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span className="hidden sm:inline">Đang Dùng</span>
                        </span>
                      )}
                      <button
                        onClick={(e) => toggleFavorite(template.id, template.name, e)}
                        className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                          isFav
                            ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100'
                            : 'text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title={isFav ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
                      >
                        <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail Preview Area */}
                  <div
                    onClick={() => handleSelectAndEdit(template)}
                    className="my-2 p-3 bg-slate-100/70 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 cursor-pointer flex items-center justify-center min-h-[140px] hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors group/preview overflow-hidden relative"
                  >
                    <TemplatePreviewThumbnail template={template} maxHeight={120} />

                    {/* Quick Hover Overlay */}
                    <div className="absolute inset-0 bg-indigo-900/10 dark:bg-indigo-950/20 backdrop-blur-[0.5px] opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="px-3 py-1.5 bg-white/90 dark:bg-slate-900/90 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5">
                        <span>Chỉnh Sửa Mẫu</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                  {/* Description or Elements Info */}
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 my-1 min-h-[30px]">
                    {template.description || `Mẫu tem tiêu chuẩn gồm ${template.elements?.length || 0} thành phần thiết kế.`}
                  </p>

                  {/* Bottom Action Footer */}
                  <div className="pt-3 mt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                    {/* Secondary Actions (Duplicate, Export, Delete) */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDuplicate(template)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Nhân bản mẫu này"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => exportTemplateToJson(template)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Xuất file JSON"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {isCustom && (
                        <button
                          onClick={() => handleDelete(template.id, template.name)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                          title="Xóa mẫu tem"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Primary Button: Select & Design */}
                    <button
                      onClick={() => handleSelectAndEdit(template)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
                        isSelected
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                          : 'bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-indigo-600'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isSelected ? 'Đang Thiết Kế' : 'Dùng Mẫu Này'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirm Action Modal & Toast Notifications */}
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
