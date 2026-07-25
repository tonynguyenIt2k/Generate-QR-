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
import { DatasetRow, LabelElement } from '../../types/label';
import { generateSamplePhoneShopExcel, parseExcelOrCsvFile } from '../../utils/excelHelper';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: DatasetRow[];
  onSetDataset: (rows: DatasetRow[]) => void;
  elements?: LabelElement[];
}

export const DataImportModal: React.FC<DataImportModalProps> = ({
  isOpen,
  onClose,
  dataset,
  onSetDataset,
  elements,
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h2 className="text-xs sm:text-base font-bold text-slate-800 dark:text-slate-100 truncate">
              Nhập Dữ Liệu Hàng Loạt (Excel / CSV)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 gap-2 sm:gap-4 bg-white dark:bg-slate-900 text-xs font-semibold overflow-x-auto no-scrollbar shrink-0">
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
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-4">
          {activeSubTab === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-emerald-300 dark:border-emerald-800/80 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 transition-all">
                <Upload className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mb-2" />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Kéo thả file Excel (.xlsx, .xls) hoặc CSV vào đây
                </p>
                <p className="text-slate-500 dark:text-slate-400 mt-1 mb-4">
                  Hệ thống sẽ tự động quét cột IMEI, Model, Giá, Mã Máy làm biến chèn vào tem.
                </p>

                <div className="flex items-center gap-3">
                  <label className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl cursor-pointer shadow-md shadow-emerald-500/20 transition-all">
                    <span>Chọn File Excel Từ Máy</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    onClick={() => generateSamplePhoneShopExcel(elements)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>Tải File Excel Mẫu (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Dataset Summary */}
              {dataset.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Đã Nhập: {dataset.length} Dòng Dữ Liệu
                    </span>
                    <button
                      onClick={() => onSetDataset([])}
                      className="text-red-600 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa dữ liệu cũ</span>
                    </button>
                  </div>

                  {/* Table preview */}
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl max-h-48">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0">
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
              <label className="font-semibold text-slate-800 dark:text-slate-200 block">
                Dán Dữ Liệu Tách Dấu Tab Hoặc Dấu Phẩy (Dòng 1 là Tiêu Đề Cột)
              </label>
              <textarea
                rows={10}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                className="w-full p-3 font-mono border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 leading-relaxed"
              />
              <button
                onClick={handleParseManualText}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer"
              >
                Chuyển Thành Danh Sách Tem
              </button>
            </div>
          )}

          {activeSubTab === 'help' && (
            <div className="space-y-4 leading-relaxed text-slate-700 dark:text-slate-300">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-2">
                <Code className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-1">
                    Cú Pháp Thay Thế Biến Tự Động
                  </h4>
                  <p>
                    Bạn có thể tạo mẫu tem duy nhất và dùng biến dạng <code className="bg-white dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-blue-600">{'{{TênCột}}'}</code>. Khi tạo tem hàng loạt, hệ thống sẽ tự động điền giá trị từ file Excel vào từng tem!
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-slate-100">Ví dụ Các Bộ Lọc Định Dạng:</h4>
                <ul className="space-y-2">
                  <li className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-800/60 font-mono">
                    <span className="font-bold text-emerald-600">{'{{Gia | currency}}'}</span> &rarr; Định dạng tiền VND chuẩn (ví dụ: <span className="font-bold">28.990.000&nbsp;₫</span>).
                  </li>
                  <li className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-800/60 font-mono">
                    <span className="font-bold text-emerald-600">{'{{IMEI | imei}}'}</span> &rarr; Tự động tách nhóm số IMEI (ví dụ: <span className="font-bold">356782-09-123456-1</span>).
                  </li>
                  <li className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-800/60 font-mono">
                    <span className="font-bold text-emerald-600">{'{{Model | uppercase}}'}</span> &rarr; In hoa toàn bộ chuỗi.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold rounded-xl cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
