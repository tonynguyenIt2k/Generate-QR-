import * as XLSX from 'xlsx';
import { DatasetRow, LabelElement, LabelTemplate } from '../types/label';

/**
 * Extracts variable names (e.g. ['Model', 'Serial']) from label elements.
 */
export function extractVariablesFromElements(elements: LabelElement[]): string[] {
  const varsSet = new Set<string>();
  const regex = /\{\{\s*([^{}|]+?)(?:\s*\|\s*([a-zA-Z0-9_]+))?\s*\}\}/g;

  elements.forEach((el) => {
    if ('content' in el && typeof el.content === 'string') {
      let match;
      regex.lastIndex = 0;
      while ((match = regex.exec(el.content)) !== null) {
        if (match[1]) {
          varsSet.add(match[1].trim());
        }
      }
    }
  });

  return Array.from(varsSet);
}

/**
 * Gets all column keys/variables required by a template combining sampleData and elements.
 * Prioritizes variables explicitly referenced in template elements (e.g. {{Model}}, {{Serial}}).
 */
export function getTemplateColumnKeys(template?: LabelTemplate, elements?: LabelElement[]): string[] {
  const els = (elements && elements.length > 0) ? elements : (template?.elements || []);
  const varsFromElements = extractVariablesFromElements(els);

  // If template elements explicitly contain variables, return ONLY those variables!
  if (varsFromElements.length > 0) {
    return varsFromElements;
  }

  // Fallback if no variables in elements: use sampleData keys if available
  const sampleDataKeys = Object.keys(template?.sampleData || {}).filter((k) => !k.startsWith('_'));
  if (sampleDataKeys.length > 0) {
    return sampleDataKeys;
  }

  return ['Model', 'Serial'];
}

/**
 * Automatically converts or maps dataset rows when switching templates.
 * Renames column headers to match the new template's variable keys and strips unneeded columns.
 */
export function adaptDatasetToTemplate(
  template: LabelTemplate,
  currentDataset: DatasetRow[],
  overrideElements?: LabelElement[]
): DatasetRow[] {
  const targetKeys = getTemplateColumnKeys(template, overrideElements);
  const sampleData = template.sampleData || {};

  // Clean sample data object (remove internal keys starting with _)
  const cleanSampleData: Record<string, any> = {};
  targetKeys.forEach((key) => {
    if (sampleData[key] !== undefined) {
      cleanSampleData[key] = sampleData[key];
    } else if (sampleData._sampleOdd && sampleData._sampleOdd[key] !== undefined) {
      cleanSampleData[key] = sampleData._sampleOdd[key];
    } else {
      cleanSampleData[key] = `Mẫu ${key}`;
    }
  });

  if (!currentDataset || currentDataset.length === 0) {
    const row1 = { ...cleanSampleData };
    const row2 = { ...cleanSampleData };
    if (row2.Serial) row2.Serial = String(row2.Serial).replace(/1$/, '2');
    if (row2.IMEI) row2.IMEI = String(row2.IMEI).replace(/1$/, '2');
    if (row2.MaMay) row2.MaMay = `${row2.MaMay}-02`;
    return [row1, row2];
  }

  // If current dataset has rows, map existing column data to new target keys
  return currentDataset.map((oldRow, rowIndex) => {
    const oldKeys = Object.keys(oldRow).filter((k) => !k.startsWith('_'));
    const newRow: DatasetRow = {};

    targetKeys.forEach((targetKey, targetIdx) => {
      // 1. If oldRow already has targetKey with a non-empty value, retain it
      if (oldRow[targetKey] !== undefined && oldRow[targetKey] !== '') {
        newRow[targetKey] = oldRow[targetKey];
      } else {
        // 2. Try fuzzy key match (e.g. 'Serial' or 'IMEI' matches 'IMEI / Serial')
        const fuzzyKey = oldKeys.find(
          (k) =>
            k &&
            oldRow[k] !== undefined &&
            oldRow[k] !== '' &&
            (targetKey.toLowerCase().includes(k.toLowerCase()) ||
              k.toLowerCase().includes(targetKey.toLowerCase()))
        );

        if (fuzzyKey) {
          newRow[targetKey] = oldRow[fuzzyKey];
        }
        // 3. Otherwise if there's an old column at the same position, map its value
        else if (
          targetIdx < oldKeys.length &&
          oldRow[oldKeys[targetIdx]] !== undefined &&
          oldRow[oldKeys[targetIdx]] !== ''
        ) {
          newRow[targetKey] = oldRow[oldKeys[targetIdx]];
        }
        // 4. Otherwise use sample value default
        else {
          let sampleVal = cleanSampleData[targetKey] ?? '';
          if (rowIndex > 0 && typeof sampleVal === 'string') {
            if (
              targetKey.toLowerCase().includes('serial') ||
              targetKey.toLowerCase().includes('imei')
            ) {
              sampleVal = sampleVal.replace(/1$/, String(rowIndex + 1));
            }
          }
          newRow[targetKey] = sampleVal;
        }
      }
    });

    return newRow;
  });
}

/**
 * Parses uploaded Excel or CSV file into an array of key-value dataset rows.
 */
export async function parseExcelOrCsvFile(file: File): Promise<{ rows: DatasetRow[]; headers: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonRows = XLSX.utils.sheet_to_json<DatasetRow>(worksheet, { defval: '' });
        if (!jsonRows.length) {
          return resolve({ rows: [], headers: [] });
        }

        const headers = Object.keys(jsonRows[0] || {});
        // Clean key names (trim whitespace)
        const cleanedRows: DatasetRow[] = jsonRows.map((row) => {
          const newRow: DatasetRow = {};
          Object.keys(row).forEach((k) => {
            const cleanKey = k.trim();
            newRow[cleanKey] = row[k];
          });
          return newRow;
        });

        resolve({ rows: cleanedRows, headers });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Returns structured sample Phone Shop Data matching template variables.
 */
export function getSamplePhoneShopData(elements?: LabelElement[], template?: LabelTemplate): DatasetRow[] {
  const fullSampleRows: Record<string, string | number>[] = [
    {
      MaMay: 'IP15P-256-NT',
      Model: 'iPhone 15 Pro Max',
      DungLuong: '256GB',
      MauSac: 'Titan Tự Nhiên',
      IMEI: '356782091234561',
      Serial: 'F2LXK982P01',
      Gia: 28990000,
      NhaManh: 'Chính Hãng VN/A',
      BaoHanh: '12 Tháng',
      MaKho: 'KHO-HANOI-01',
      TenShop: 'MOBILE CITY',
      Website: 'mobilecity.vn',
      STK: '190388888888',
      NganHang: 'Techcombank',
    },
    {
      MaMay: 'SS-S24U-512-X',
      Model: 'Samsung Galaxy S24 Ultra',
      DungLuong: '512GB',
      MauSac: 'Xám Titan',
      IMEI: '358901029384751',
      Serial: 'R5CW109283X',
      Gia: 29990000,
      NhaManh: 'SSVN',
      BaoHanh: '12 Tháng',
      MaKho: 'KHO-HCM-02',
      TenShop: 'SAMSUNG STORE',
      Website: 'samsung.com',
      STK: '190399999999',
      NganHang: 'Vietcombank',
    },
    {
      MaMay: 'IP14-128-D',
      Model: 'iPhone 14',
      DungLuong: '128GB',
      MauSac: 'Đen Huyền Bí',
      IMEI: '354321098765432',
      Serial: 'F12K0019283',
      Gia: 16990000,
      NhaManh: 'Chính Hãng VN/A',
      BaoHanh: '12 Tháng',
      MaKho: 'KHO-HANOI-01',
      TenShop: 'APPLE AUTHORIZED',
      Website: 'apple.vn',
      STK: '190377777777',
      NganHang: 'MBBank',
    },
    {
      MaMay: 'IP13-128-X',
      Model: 'iPhone 13 128GB',
      DungLuong: '128GB',
      MauSac: 'Xanh Midnight',
      IMEI: '359871029384756',
      Serial: 'K98PLX0192M',
      Gia: 13490000,
      NhaManh: 'Chính Hãng VN/A',
      BaoHanh: '12 Tháng',
      MaKho: 'KHO-DANANG-01',
      TenShop: 'APPLE STORE',
      Website: 'apple.vn',
      STK: '190366666666',
      NganHang: 'Vietinbank',
    },
  ];

  let keysToInclude: string[] = [];
  if (template || (elements && elements.length > 0)) {
    keysToInclude = getTemplateColumnKeys(template, elements);
  }

  if (keysToInclude.length > 0) {
    return fullSampleRows.map((row) => {
      const filteredRow: Record<string, string | number> = {};
      keysToInclude.forEach((key) => {
        filteredRow[key] = row[key] !== undefined ? row[key] : (template?.sampleData?.[key] ?? `Mẫu ${key}`);
      });
      return filteredRow;
    });
  }

  return fullSampleRows.map((row) => ({
    MaMay: row.MaMay,
    Model: row.Model,
    DungLuong: row.DungLuong,
    MauSac: row.MauSac,
    IMEI: row.IMEI,
    Serial: row.Serial,
    Gia: row.Gia,
    NhaManh: row.NhaManh,
    BaoHanh: row.BaoHanh,
    MaKho: row.MaKho,
  }));
}

/**
 * Generates sample Phone Shop Data Excel workbook matching template variables.
 */
export function generateSamplePhoneShopExcel(elements?: LabelElement[], template?: LabelTemplate): void {
  const finalSampleData = getSamplePhoneShopData(elements, template);
  const keysToInclude = (template || (elements && elements.length > 0))
    ? getTemplateColumnKeys(template, elements)
    : [];

  const worksheet = XLSX.utils.json_to_sheet(finalSampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachTem');

  const fileName = keysToInclude.length === 2 && keysToInclude.includes('Model') && keysToInclude.includes('Serial')
    ? 'Mau_Excel_2_Cot_Model_Serial.xlsx'
    : 'Mau_Danh_Sach_Tem_Excel.xlsx';

  XLSX.writeFile(workbook, fileName);
}

/**
 * Replaces Mustache variables e.g. {{Model}} or {{Gia | currency}} in text content cleanly.
 */
export function substituteVariables(templateText: string, dataRow: DatasetRow): string {
  if (!templateText) return '';
  if (dataRow && (dataRow._isEmpty || dataRow._isEvenEmpty && !dataRow._oddRow)) return '';

  return templateText.replace(/\{\{\s*([^{}|]+?)(?:\s*\|\s*([a-zA-Z0-9_]+))?\s*\}\}/g, (_, rawKey, filter) => {
    const key = rawKey.trim();
    let value = dataRow ? dataRow[key] : undefined;

    // Fuzzy matching if key has space or case mismatch e.g. "IMEI / Serial" vs "IMEI/Serial"
    if ((value === undefined || value === null) && dataRow) {
      const normalizedKey = key.replace(/\s+/g, '').toLowerCase();
      const matchedDataKey = Object.keys(dataRow).find(
        (k) => k.replace(/\s+/g, '').toLowerCase() === normalizedKey
      );
      if (matchedDataKey) {
        value = dataRow[matchedDataKey];
      }
    }

    if (value === undefined || value === null) {
      // Clean fallback for preview/display without raw {{...}}
      if (key === 'Model') return 'iPhone 15 Pro Max';
      if (key === 'Serial') return 'F2LXK982P01';
      if (key === 'IMEI') return '356782091234561';
      if (key.includes('IMEI') || key.includes('Serial')) return '356782091234561';
      if (key === 'Gia' || key === 'Giá') return filter === 'currency' ? '28.990.000 ₫' : '28990000';
      if (key === 'MaMay' || key === 'Mã Máy') return 'IP15P-256';
      if (key === 'TenShop' || key === 'Tên Shop') return 'MOBILE CITY';
      return `[${key}]`;
    }

    // Apply formatting filters
    if (filter === 'currency') {
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      if (!isNaN(num)) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
      }
    } else if (filter === 'uppercase') {
      return String(value).toUpperCase();
    } else if (filter === 'lowercase') {
      return String(value).toLowerCase();
    } else if (filter === 'imei') {
      // Format 356782-09-123456-1
      const str = String(value).replace(/\D/g, '');
      if (str.length === 15) {
        return `${str.slice(0, 6)}-${str.slice(6, 8)}-${str.slice(8, 14)}-${str.slice(14)}`;
      }
    }

    return String(value);
  });
}

