import * as XLSX from 'xlsx';
import { DatasetRow } from '../types/label';

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
 * Generates sample Phone Shop Data Excel workbook and triggers download.
 */
export function generateSamplePhoneShopExcel(): void {
  const sampleData = [
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
    },
    {
      MaMay: 'IP15P-512-X',
      Model: 'iPhone 15 Pro Max',
      DungLuong: '512GB',
      MauSac: 'Titan Xanh',
      IMEI: '356782091234562',
      Serial: 'F2LXK982P02',
      Gia: 33490000,
      NhaManh: 'Chính Hãng VN/A',
      BaoHanh: '12 Tháng',
      MaKho: 'KHO-HANOI-01',
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
    },
    {
      MaMay: 'PK-ANKER-65W',
      Model: 'Củ Sạc Anker GaNPrime 65W',
      DungLuong: '65W',
      MauSac: 'Đen Matte',
      IMEI: '8936000100231',
      Serial: 'ANK65W00921',
      Gia: 890000,
      NhaManh: 'Phụ Kiện',
      BaoHanh: '18 Tháng',
      MaKho: 'KHO-PHUKIEN',
    },
    {
      MaMay: 'PK-AIRPODS-P2',
      Model: 'Tai Nghe Apple AirPods Pro 2',
      DungLuong: 'USB-C',
      MauSac: 'Trắng',
      IMEI: '8936000100559',
      Serial: 'H02KP910293',
      Gia: 5690000,
      NhaManh: 'Chính Hãng Apple',
      BaoHanh: '12 Tháng',
      MaKho: 'KHO-PHUKIEN',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachTemDienThoai');

  XLSX.writeFile(workbook, 'Mau_Danh_Sach_Tem_Dien_Thoai.xlsx');
}

/**
 * Replaces Mustache variables e.g. {{Model}} or {{Gia | currency}} in text content.
 */
export function substituteVariables(templateText: string, dataRow: DatasetRow): string {
  if (!templateText) return '';

  return templateText.replace(/\{\{\s*([a-zA-Z0-9_]+)(?:\s*\|\s*([a-zA-Z0-9_]+))?\s*\}\}/g, (_, key, filter) => {
    let value = dataRow[key];
    if (value === undefined || value === null) {
      return `{{${key}}}`; // keep placeholder if not found
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
