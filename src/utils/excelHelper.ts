import * as XLSX from 'xlsx';
import { DatasetRow, LabelElement } from '../types/label';

/**
 * Extracts variable names (e.g. ['Model', 'Serial']) from label elements.
 */
export function extractVariablesFromElements(elements: LabelElement[]): string[] {
  const varsSet = new Set<string>();
  const regex = /\{\{\s*([a-zA-Z0-9_]+)(?:\s*\|\s*[a-zA-Z0-9_]+)?\s*\}\}/g;

  elements.forEach((el) => {
    if ('content' in el && typeof el.content === 'string') {
      let match;
      // Reset regex index
      regex.lastIndex = 0;
      while ((match = regex.exec(el.content)) !== null) {
        if (match[1]) {
          varsSet.add(match[1]);
        }
      }
    }
  });

  return Array.from(varsSet);
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
 * Generates sample Phone Shop Data Excel workbook matching template variables.
 */
export function generateSamplePhoneShopExcel(elements?: LabelElement[]): void {
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
      MauSac: 'Đen Huyền Bổ',
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
  ];

  let keysToInclude: string[] = [];
  if (elements && elements.length > 0) {
    keysToInclude = extractVariablesFromElements(elements);
  }

  let finalSampleData: Record<string, string | number>[] = [];

  if (keysToInclude.length > 0) {
    // Dynamically filter columns to match ONLY variables present in current template
    finalSampleData = fullSampleRows.map((row) => {
      const filteredRow: Record<string, string | number> = {};
      keysToInclude.forEach((key) => {
        filteredRow[key] = row[key] !== undefined ? row[key] : `Mẫu ${key}`;
      });
      return filteredRow;
    });
  } else {
    // Default 10 standard columns
    finalSampleData = fullSampleRows.map((row) => ({
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

  return templateText.replace(/\{\{\s*([a-zA-Z0-9_]+)(?:\s*\|\s*([a-zA-Z0-9_]+))?\s*\}\}/g, (_, key, filter) => {
    let value = dataRow[key];
    if (value === undefined || value === null) {
      // Clean fallback for preview/display without raw {{...}}
      if (key === 'Model') return 'iPhone 15 Pro Max';
      if (key === 'Serial') return 'F2LXK982P01';
      if (key === 'IMEI') return '356782091234561';
      if (key === 'Gia') return filter === 'currency' ? '28.990.000 ₫' : '28990000';
      if (key === 'MaMay') return 'IP15P-256';
      if (key === 'TenShop') return 'MOBILE CITY';
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

