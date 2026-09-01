import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  Download,
  Plus,
  Trash2,
  HelpCircle,
  CheckCircle2,
  Code,
} from 'lucide-react';
import { DatasetRow, LabelElement, LabelTemplate } from '../../types/label';
import { generateSamplePhoneShopExcel, parseExcelOrCsvFile } from '../../utils/excelHelper';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: DatasetRow[];
  onSetDataset: (rows: DatasetRow[]) => void;
  elements?: LabelElement[];
  template?: LabelTemplate;
}

export const DataImportModal: React.FC<DataImportModalProps> = ({
  isOpen,
  onClose,
  dataset,
  onSetDataset,
  elements,
  template,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'upload' | 'manual' | 'help'>('upload');
  const [manualText, setManualText] = useState<string>(
    'MaMay\tIMEI\tModel\tGia\nIP15-001\t356782091234561\tiPhone 15 Pro Max\t28990000\nIP15-002\t356782091234562\tiPhone 15 Pro Max\t33490000\nSS-S24-01\t358901029384751\tSamsung Galaxy S24 Ultra\t29990000'
  );
  const [loading, setLoading] = useState(false);
  const [headers, setHeaders] = useState<string[]>(
    dataset.length ? Object.keys(dataset[0]) : ['MaMay', 'IMEI', 'Model', 'Gia']
  );

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const parsed = await parseExcelOrCsvFile(file);
      onSetDataset(parsed.rows);
      setHeaders(parsed.headers);
    } catch (err) {
      alert('Không thể đọc file Excel / CSV. Vui lòng kiểm tra lại định dạng file!');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleParseManualText = () => {
    const lines = manualText.trim().split('\n');
    if (lines.length < 2) {
      alert('Vui lòng nhập tối thiểu 1 dòng tiêu đề và 1 dòng dữ liệu!');
      return;
    }

    const firstLine = lines[0];
    const separator = firstLine.includes('\t') ? '\t' : firstLine.includes(',') ? ',' : ';';
    const parsedHeaders = firstLine.split(separator).map((h) => h.trim());

    const rows: DatasetRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = line.split(separator).map((v) => v.trim());
      const row: DatasetRow = {};
      parsedHeaders.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      rows.push(row);
    }

    onSetDataset(rows);
    setHeaders(parsedHeaders);
    alert(`Đã nhập thành công ${rows.length} dòng dữ liệu!`);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 dark:bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fade-in">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t sm:border border-slate-200/80 dark:border-slate-800/80 rounded-t-[28px] sm:rounded-3xl shadow-2xl shadow-black/30 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90dvh] sm:max-h-[85vh]">
        {/* Mobile Pull Handle Bar */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 shrink-0" />

        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900 backdrop-blur-sm gap-2 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 truncate">
                Nhập Dữ Liệu Hàng Loạt
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                Excel (.xlsx, .xls) hoặc CSV để tự động điền tem
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 cursor-pointer shrink-0 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200/80 dark:border-slate-800/80 px-3 sm:px-6 gap-2 sm:gap-4 bg-white/50 dark:bg-slate-900/50 text-xs font-semibold overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setActiveSubTab('upload')}
            className={`py-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeSubTab === 'upload'
                ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Tải File Excel / CSV
          </button>
          <button
            onClick={() => setActiveSubTab('manual')}
            className={`py-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeSubTab === 'manual'
                ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Nhập Văn Bản / Copy Cột
          </button>
          <button
            onClick={() => setActiveSubTab('help')}
            className={`py-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeSubTab === 'help'
                ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Cú Pháp Biến Dynamic {'{{...}}'}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-xs space-y-4">
          {activeSubTab === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-emerald-300 dark:border-emerald-800/80 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 transition-all">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 rounded-2xl mb-3 shadow-xs">
                  <Upload className="w-8 h-8 sm:w-10 sm:h-10" />
                </div>
                <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
                  Kéo thả file Excel (.xlsx, .xls) hoặc CSV vào đây
                </p>
                <p className="text-slate-500 dark:text-slate-400 mt-1 mb-4 text-[11px] sm:text-xs max-w-md">
                  Hệ thống tự động nhận diện cột IMEI, Model, Giá, Mã Máy làm biến chèn vào tem.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                  <label className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl cursor-pointer shadow-md shadow-emerald-500/25 transition-all text-center flex items-center justify-center gap-2 active:scale-98">
                    <Upload className="w-4 h-4" />
                    <span>Chọn File Excel Từ Máy</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    onClick={() => generateSamplePhoneShopExcel(elements, template)}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer text-center shadow-xs"
                  >
                    <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Tải File Excel Mẫu</span>
                  </button>
                </div>
              </div>

              {/* Dataset Summary */}
              {dataset.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Đã Nhập: {dataset.length} Dòng Dữ Liệu</span>
                    </span>
                    <button
                      onClick={() => onSetDataset([])}
                      className="text-red-600 hover:underline flex items-center gap-1 font-medium cursor-pointer text-[11px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa dữ liệu cũ</span>
                    </button>
                  </div>

                  {/* Table preview */}
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl max-h-48">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 sticky top-0 backdrop-blur-xs">
                        <tr>
                          <th className="p-2 border-b font-bold">#</th>
                          {headers.map((h) => (
                            <th key={h} className="p-2 border-b font-bold font-mono text-emerald-600 dark:text-emerald-400">
                              {'{{' + h + '}}'}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                        {dataset.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-2 text-slate-400">{idx + 1}</td>
                            {headers.map((h) => (
                              <td key={h} className="p-2 truncate max-w-xs">
                                {String(row[h] || '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'manual' && (
            <div className="space-y-3">
              <label className="font-semibold text-slate-800 dark:text-slate-200 block text-xs">
                Dán Dữ Liệu Tách Dấu Tab Hoặc Dấu Phẩy (Dòng 1 là Tiêu Đề Cột)
              </label>
              <textarea
                rows={9}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                className="w-full p-3 font-mono border border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50/70 dark:bg-slate-800 text-slate-900 dark:text-slate-100 leading-relaxed text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <button
                onClick={handleParseManualText}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl cursor-pointer shadow-md shadow-emerald-500/20"
              >
                Chuyển Thành Danh Sách Tem
              </button>
            </div>
          )}

          {activeSubTab === 'help' && (
            <div className="space-y-3.5 leading-relaxed text-slate-700 dark:text-slate-300">
              <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-start gap-2.5">
                <Code className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-1 text-xs">
                    Cú Pháp Thay Thế Biến Tự Động
                  </h4>
                  <p className="text-[11px] leading-relaxed">
                    Bạn chỉ cần tạo mẫu tem 1 lần và dùng biến dạng <code className="bg-white dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-blue-600 dark:text-blue-400 font-bold">{'{{TênCột}}'}</code>. Khi in ấn, hệ thống sẽ tự động điền giá trị từng dòng vào tem!
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">Ví dụ Các Bộ Lọc Định Dạng:</h4>
                <ul className="space-y-2 text-[11px]">
                  <li className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-mono">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{'{{Gia | currency}}'}</span> &rarr; Định dạng tiền VND chuẩn (ví dụ: <span className="font-bold">28.990.000&nbsp;₫</span>).
                  </li>
                  <li className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-800/60 font-mono">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{'{{IMEI | imei}}'}</span> &rarr; Tự động tách nhóm số IMEI (ví dụ: <span className="font-bold">356782-09-123456-1</span>).
                  </li>
                  <li className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-800/60 font-mono">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{'{{Model | uppercase}}'}</span> &rarr; In hoa toàn bộ chuỗi.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold rounded-xl cursor-pointer text-xs transition-all text-center"
          >
            Đóng / Quay Lại
          </button>
        </div>
      </div>
    </div>
  );
};
