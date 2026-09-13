import { createWorker } from 'tesseract.js';
import jsQR from 'jsqr';

export interface DevicePairResult {
  modelName: string;
  imei1: string;
  imei2?: string;
  serial?: string;
  storage?: string;
  color?: string;
  price?: string;
}

export interface DeviceProductItem {
  id?: string;
  modelName: string;
  imei1?: string;
  imei2?: string;
  serial?: string;
  storage?: string;
  color?: string;
  price?: string;
  rawText?: string;
}

export interface ExtractedOCRData {
  fullText: string;
  lines: string[];
  extractedTarget?: string;
  detectedFields: Record<string, string>;
  suggestedItems: string[];
  devicePair: DevicePairResult;
  detectedProducts?: DeviceProductItem[];
  allImeis: string[];
  allModels: string[];
  method: 'gemini' | 'local_tesseract' | 'barcode' | 'tesseract-vie' | 'tesseract-vie-eng';
}

// Clean string helper
function cleanText(text: string): string {
  return text
    .replace(/^[:\s\-–—|/.,#*=]+/g, '')
    .replace(/[:\s\-–—|/.,#*=]+$/g, '')
    .trim();
}

/**
 * Tự động phục hồi và chuẩn hóa dấu tiếng Việt cho các từ chuyên ngành điện thoại,
 * bảng kê, phiếu xuất kho và tem sản phẩm bị OCR nhận diện thiếu hoặc sai dấu
 * (Ví dụ: "TÌM" -> "TÍM", "CU" -> "CŨ", "TRAY XƯỚC" -> "TRẦY XƯỚC", "DEN" -> "ĐEN", v.v.)
 */
export function restoreVietnameseDiacritics(text: string): string {
  if (!text) return '';
  let res = text;

  // 1. Phục hồi cụm từ tình trạng máy (Condition phrases) - đặc biệt xử lý lỗi Tesseract tách chữ như "TRAY XU OC"
  // Bắt các biến thể: "TRAY XU OC", "TRẦY XU OC", "TRAY XƯ OC", "TRAY XU ỚC", "TRAY XUOC", "TRAY XƯỚC"
  res = res.replace(/\b(?:CU|CỦ|CŨ)\s*([\-–—])\s*(?:TRAY|TRÂY|TRÁY|TRẦY)\s*(?:XƯỚC|XUOC|XƯƠC|XUỚC|XU\s*OC|XƯ\s*OC|XU\s*ỚC|XƯ\s*ỚC)\b/gi, 'CŨ $1 TRẦY XƯỚC');
  res = res.replace(/\b(?:TRAY|TRÂY|TRÁY|TRẦY)\s*(?:XƯỚC|XUOC|XƯƠC|XUỚC|XU\s*OC|XƯ\s*OC|XU\s*ỚC|XƯ\s*ỚC)\b/gi, 'TRẦY XƯỚC');
  res = res.replace(/\bTRẦY\s*(?:XUOC|XƯƠC|XUỚC|XU\s*OC|XƯ\s*OC|XU\s*ỚC)\b/gi, 'TRẦY XƯỚC');
  res = res.replace(/\b(?:XU\s*OC|XƯ\s*OC|XU\s*ỚC|XƯ\s*ỚC|XUOC|XƯƠC|XUỚC)\b/gi, 'XƯỚC');
  res = res.replace(/\b(?:TRAY|TRÂY|TRÁY)\b/gi, 'TRẦY');

  res = res.replace(/\b(?:CU|CỦ|CŨ)\s*([\-–—])\s*(?:DEP|ĐEP|ĐẸP)\b/gi, 'CŨ $1 ĐẸP');
  res = res.replace(/\b(?:CU|CỦ|CŨ)\s*([\-–—])\s*(?:PHAY|PHẨY)\b/gi, 'CŨ $1 PHẨY');
  res = res.replace(/\b(?:CU|CỦ|CŨ)\s*([\-–—])\s*(?:KINH|KÍNH)\b/gi, 'CŨ $1 KÍNH');
  res = res.replace(/\b(?:CU|CỦ|CŨ)\s*([\-–—])\s*(?:CAN|CẤN)\s*(?:MOP|MÓP)\b/gi, 'CŨ $1 CẤN MÓP');
  res = res.replace(/\b(?:CAN|CẤN)\s*(?:MOP|MÓP)\b/gi, 'CẤN MÓP');
  res = res.replace(/\b(?:PHAY|PHẨY)\s*(?:KINH|KÍNH)\b/gi, 'PHẨY KÍNH');
  res = res.replace(/\b(?:TRẦY|TRAY)\s*(?:KINH|KÍNH)\b/gi, 'TRẦY KÍNH');
  res = res.replace(/\b(?:CU|CỦ|CŨ)\s*([\-–—])\s*(?:XAU|XẤU)\b/gi, 'CŨ $1 XẤU');
  res = res.replace(/\b(?:CU|CỦ)\s*([\-–—])\s*XƯỚC\b/gi, 'CŨ $1 XƯỚC');

  // Chữ CŨ đứng trước gạch nối hoặc sau cấu hình/màu sắc máy
  res = res.replace(/\b(?:CU|CỦ)\s*([\-–—])/gi, 'CŨ $1');
  res = res.replace(/([\-–—])\s*(?:CU|CỦ)\b/gi, '$1 CŨ');
  res = res.replace(/\b(PRO|MAX|PLUS|MINI|GB|TB|TÍM|ĐEN|TRẮNG|VÀNG|XANH|HỒNG|BẠC|XÁM)\s+(?:CU|CỦ)\b/gi, '$1 CŨ');
  res = res.replace(/\b(?:MAY|HANG)\s+(?:CU|CỦ)\b/gi, '$1 CŨ');
  res = res.replace(/\b(?:CU|CỦ)\s+(?:TRẦY|MỚI|ĐẸP|PHẨY|KÍNH|CẤN|MÓP|XẤU|99%)\b/gi, 'CŨ $1');

  // Tình trạng Mới, Like New, Chính Hãng, Việt Nam
  res = res.replace(/\bMOI\s*100%/gi, 'MỚI 100%');
  res = res.replace(/\b(?:MAY|HANG)\s+MOI\b/gi, '$1 MỚI');
  res = res.replace(/\bCHINH\s+HANG\b/gi, 'CHÍNH HÃNG');
  res = res.replace(/\bCHÍNH\s+HANG\b/gi, 'CHÍNH HÃNG');
  res = res.replace(/\bCHINH\s+HÃNG\b/gi, 'CHÍNH HÃNG');
  res = res.replace(/\bVIET\s+NAM\b/gi, 'VIỆT NAM');
  res = res.replace(/\bVIỆT\s+NAM\b/gi, 'VIỆT NAM');

  // 2. Phục hồi Màu Sắc (Colors)
  // Tesseract thường nhận diện "TÍM" thành "TÌM" hoặc "TIM"
  res = res.replace(/\b(?:TÌM|TIM)\b/gi, 'TÍM');
  res = res.replace(/\bTRANG\b/gi, 'TRẮNG');
  res = res.replace(/\bDEN\b/gi, 'ĐEN');
  res = res.replace(/\bVANG\b/gi, 'VÀNG');
  res = res.replace(/\bHONG\b/gi, 'HỒNG');
  res = res.replace(/\bBAC\b/gi, 'BẠC');
  res = res.replace(/\bXAM\b/gi, 'XÁM');
  res = res.replace(/\bXANH\s+DUONG\b/gi, 'XANH DƯƠNG');
  res = res.replace(/\bXANH\s+LA\b/gi, 'XANH LÁ');
  res = res.replace(/\bXANH\s+LUC\b/gi, 'XANH LỤC');
  res = res.replace(/\bXANH\s+DEN\b/gi, 'XANH ĐEN');
  res = res.replace(/\bXANH\s+NGOC\b/gi, 'XANH NGỌC');

  // 3. Phục hồi Thuật Ngữ Bảng Kê / Phiếu Kho / Tiêu Đề
  res = res.replace(/\bTEN\s+VAT\s+TU\b/gi, 'TÊN VẬT TƯ');
  res = res.replace(/\bVAT\s+TU\b/gi, 'VẬT TƯ');
  res = res.replace(/\bTEN\s+HANG\b/gi, 'TÊN HÀNG');
  res = res.replace(/\bHANG\s+HOA\b/gi, 'HÀNG HÓA');
  res = res.replace(/\bBANG\s+KE\s+CHI\s+TIET\b/gi, 'BẢNG KÊ CHI TIẾT');
  res = res.replace(/\bBANG\s+KE\s+HANG\s+HOA\b/gi, 'BẢNG KÊ HÀNG HÓA');
  res = res.replace(/\bBANG\s+KE\b/gi, 'BẢNG KÊ');
  res = res.replace(/\bCHI\s+TIET\b/gi, 'CHI TIẾT');
  res = res.replace(/\bPHIEU\s+XUAT\s+KHO\b/gi, 'PHIẾU XUẤT KHO');
  res = res.replace(/\bPHIEU\s+DIEU\s+CHUYEN\b/gi, 'PHIẾU ĐIỀU CHUYỂN');
  res = res.replace(/\bPHIEU\s+NHAP\s+KHO\b/gi, 'PHIẾU NHẬP KHO');
  res = res.replace(/\bPHIEU\s+KIEM\s+KE\b/gi, 'PHIẾU KIỂM KÊ');
  res = res.replace(/\bHOA\s+DON\b/gi, 'HÓA ĐƠN');
  res = res.replace(/\bBO\s+NHO\b/gi, 'BỘ NHỚ');
  res = res.replace(/\bDUNG\s+LUONG\b/gi, 'DUNG LƯỢNG');
  res = res.replace(/\bMA\s+SO\b/gi, 'MÃ SỐ');
  res = res.replace(/\bDON\s+VI\s+TINH\b/gi, 'ĐƠN VỊ TÍNH');
  res = res.replace(/\bSO\s+LUONG\b/gi, 'SỐ LƯỢNG');
  res = res.replace(/\bTINH\s+TRANG\b/gi, 'TÌNH TRẠNG');
  res = res.replace(/\bDIEN\s+THOAI\b/gi, 'ĐIỆN THOẠI');
  res = res.replace(/\bXUAT\s+XU\b/gi, 'XUẤT XỨ');
  res = res.replace(/\bNGAY\s+NHAP\b/gi, 'NGÀY NHẬP');
  res = res.replace(/\bNGAY\s+XUAT\b/gi, 'NGÀY XUẤT');
  res = res.replace(/\bBAO\s+HANH\b/gi, 'BẢO HÀNH');
  res = res.replace(/\bTHU\s+KHO\b/gi, 'THỦ KHO');
  res = res.replace(/\bNGUOI\s+LAP\b/gi, 'NGƯỜI LẬP');
  res = res.replace(/\bQUAN\s+LY\b/gi, 'QUẢN LÝ');
  res = res.replace(/\bTONG\s+CONG\b/gi, 'TỔNG CỘNG');
  res = res.replace(/\bDON\s+GIA\b/gi, 'ĐƠN GIÁ');
  res = res.replace(/\bTHANH\s+TIEN\b/gi, 'THÀNH TIỀN');
  res = res.replace(/\bXAC\s+NHAN\b/gi, 'XÁC NHẬN');
  res = res.replace(/\bGIAO\s+NHAN\b/gi, 'GIAO NHẬN');
  res = res.replace(/\bKHACH\s+HANG\b/gi, 'KHÁCH HÀNG');

  return res;
}

// Preprocess image for OCR: scale up small cropped rows and enhance contrast for diacritic sharpness
export function preprocessImageForOCR(imageDataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(imageDataUrl);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        let scale = 1;
        if (height < 250) {
          scale = Math.min(2.5, 350 / height);
        } else if (height > 2500 || width > 2500) {
          scale = Math.min(2500 / width, 2500 / height);
        }

        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageDataUrl);
          return;
        }

        // Apply contrast & sharpness enhancement
        ctx.filter = 'contrast(135%) brightness(102%)';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch {
        resolve(imageDataUrl);
      }
    };
    img.onerror = () => resolve(imageDataUrl);
    img.src = imageDataUrl;
  });
}

// Detect invoice noise lines (headers, addresses, tax codes, table footers)
export function isInvoiceNoise(text: string): boolean {
  const t = text.trim();
  if (!t || t.length < 2) return true;
  if (/^(?:CÔNG TY|CHI NHÁNH|DOANH NGHIỆP|TNHH|CỔ PHẦN)/i.test(t)) return true;
  if (/^(?:Số\s*\d+|Đường|Phường|Quận|Huyện|Thành phố|Việt Nam|Địa chỉ)/i.test(t)) return true;
  if (/^(?:MST|Mã số thuế|Tax ID|DC\.HN|HĐ KVCNB|Số HĐ|Điện thoại|Hotline)/i.test(t)) return true;
  if (/^(?:BẢNG KÊ CHI TIẾT|BẢNG KÊ HÀNG HÓA|PHIẾU XUẤT KHO|PHIẾU ĐIỀU CHUYỂN|PHIẾU NHẬP KHO|PHIẾU KIỂM KÊ|HÓA ĐƠN)/i.test(t)) return true;
  if (/^(?:Từ kho|Đến kho|Lý do điều chuyển|Người lập phiếu|Tổng số lượng|Cộng\s*\d*|Thủ kho|Quản lý cửa hàng|Nhân viên giao nhận|Ký,\s*họ tên)/i.test(t)) return true;
  if (/^(?:STT\s+Tên\s+vật\s+tư|STT\s+Tên\s+hàng|ĐVT\s+SL|Mã số\s+ĐVT|Số lượng|Đơn vị tính)/i.test(t)) return true;
  return false;
}

// Clean and extract product details from an invoice table row (e.g. "1 APPLE IPHONE 14 PRO 256GB TÍM CŨ - TRẦY XƯỚC APP-IP14-PRO- Cái 1")
export function cleanInvoiceProductRow(rawLine: string, nextLine: string = '') {
  // Normalize & restore Vietnamese diacritics first
  const fixedRaw = restoreVietnameseDiacritics(rawLine);
  const fixedNext = restoreVietnameseDiacritics(nextLine);

  // 1. Check for serial in parentheses in rawLine or nextLine
  let serial = '';
  const pM1 = fixedRaw.match(/[([{\uff08]\s*([A-Z0-9]{7,20})\s*[)}\]\uff09]/i);
  if (pM1) {
    serial = pM1[1].trim();
  } else if (fixedNext) {
    const pM2 = fixedNext.match(/[([{\uff08]\s*([A-Z0-9]{7,20})\s*[)}\]\uff09]/i);
    if (pM2) serial = pM2[1].trim();
  }

  // 2. Clean device name: remove row number (STT), column names, trailing table cell data
  let name = fixedRaw
    .replace(/^[\d\s|.*#\-–—]+\s*(?:Tên\s*vật\s*tư|Tên\s*hàng|Tên\s*SP)?[:\s\-–—]*/i, '')
    .replace(/[([{\uff08]\s*[A-Z0-9]{7,20}\s*[)}\]\uff09]/gi, '')
    .trim();

  // Strip table column artifacts:
  // e.g. 'APP-IP14-PRO- Cái 1' or 'Cái 1'
  name = name.replace(/\s+[A-Z0-9_\-]+(?:\-[A-Z0-9_\-]+)*\s+(?:Cái|Chiếc|Bộ|Hộp|Cây|Kg|Chiếc)\s+\d+.*$/i, '');
  name = name.replace(/\s+(?:Cái|Chiếc|Bộ|Hộp|Cây|Kg)\s+\d+.*$/i, '');
  name = name.replace(/\s+[A-Z]{2,}\-[A-Z0-9\-]+\s*$/i, '');
  name = restoreVietnameseDiacritics(name.trim());

  // 3. Storage
  const stM = name.match(/\b(\d{1,2}GB\s*[\/|+]\s*\d{2,4}GB|\d{2,4}GB|\d{1,2}TB)\b/i);
  const storage = stM ? stM[0].toUpperCase().replace(/\s+/g, '') : '';

  // 4. Color
  const colM = name.match(/\b(Tím|Tim|Vàng|Vang|Xanh|Xanh\s*dương|Xanh\s*lá|Xanh\s*lục|Đen|Den|Trắng|Trang|Hồng|Hong|Bạc|Bac|Xám|Xam|Gold|Silver|Space\s*Gray|Titan|Titanium|Black|White|Blue|Green|Purple|Red|Yellow)\b/i);
  const color = colM ? restoreVietnameseDiacritics(colM[0].toUpperCase()) : '';

  // 5. Condition (e.g. CŨ - TRẦY XƯỚC, CŨ - ĐẸP, 99%, MỚI 100%)
  const condM = name.match(/\b(Cũ\s*[\-–—]\s*(?:Trầy\s*xước|Đẹp|Phẩy|Kính|Xấu|Cấn|Móp)|Mới\s*100%|\d{2}%)\b/i);
  const condition = condM ? restoreVietnameseDiacritics(condM[0].toUpperCase()) : '';

  // 6. SKU code
  let sku = '';
  const combined = fixedRaw + ' ' + fixedNext;
  const skuWrap = combined.match(/\b([A-Z]{2,}\-[A-Z0-9\-]+)[\s\-]+(?:\([A-Z0-9]+\)\s+)?([A-Z0-9]{2,}\-[A-Z0-9\-]+)\b/i);
  if (skuWrap) {
    sku = skuWrap[1].replace(/\-$/, '') + '-' + skuWrap[2].replace(/^\-/, '');
  } else {
    const singleSku = combined.match(/\b([A-Z]{2,}\-[A-Z0-9\-]{4,30})\b/i);
    if (singleSku) sku = singleSku[1];
  }

  return { name, serial, storage, color, condition, sku };
}

// Helper to extract common phone & retail fields from text using regex & heuristics
export function parsePhoneAndLabelFields(
  rawText: string,
  targetField?: string,
  availableColumns: string[] = []
): ExtractedOCRData {
  const normalizedRaw = restoreVietnameseDiacritics(rawText);
  const lines = normalizedRaw
    .split(/[\r\n]+/)
    .map((l) => restoreVietnameseDiacritics(l.trim()))
    .filter((l) => l.length > 0);

  const detectedFields: Record<string, string> = {};
  const suggestedSet = new Set<string>();
  const detectedImeis: string[] = [];
  const detectedSerials: string[] = [];
  const detectedModels: string[] = [];

  // ==========================================
  // 1. IMEI & SERIAL DETECTION (Parentheses, 14-16 digits, 8-16 alphanumeric serials)
  // ==========================================

  // 1.1 Priority: IMEIs or Serials explicitly enclosed in parentheses or brackets:
  // e.g. (351234567890123), (H45G7NQXFL), (IMEI: 35...), (S/N: H45G7NQXFL), (21)35...
  const parenPatterns = [
    // Alphanumeric serial inside parentheses e.g. (H45G7NQXFL) or (F2LZN12345) or (351234567890123)
    /[([{\uff08]\s*([A-Z0-9]{7,20})\s*[)}\]\uff09]/g,
    // (IMEI: 351234567890123) or (IMEI 1: 35...) or (S/N: H45G7NQXFL) or (SN: H45G7NQXFL)
    /[([{\uff08]\s*(?:IMEI\s*[1I2]?|MEID|TAC|S\/N|SN|Serial\s*(?:No)?|Mã\s*máy)?[\s:./\-–—]*([A-Z0-9]{7,20})\s*[)}\]\uff09]/gi,
    // (IMEI) 351234567890123 or (S/N) H45G7NQXFL
    /[([{\uff08]\s*(?:IMEI\s*[1I2]?|MEID|TAC|S\/N|SN|Serial)\s*[)}\]\uff09][\s:./\-–—]*([A-Z0-9]{7,20})/gi,
    // GSMA AI Application Identifier format e.g. (21)351234567890123 or (91)351234567890123
    /[([{\uff08]\s*(?:21|91|8004|01)\s*[)}\]\uff09][\s:./\-–—]*([A-Z0-9]{7,20})/gi,
    // IMEI: (351234567890123) or SN: (H45G7NQXFL)
    /(?:IMEI\s*[1I2]?|MEID|TAC|S\/N|SN|Serial)[\s:./\-–—]*[([{\uff08]\s*([A-Z0-9]{7,20})\s*[)}\]\uff09]/gi,
  ];

  for (const pattern of parenPatterns) {
    let pMatch: RegExpExecArray | null;
    while ((pMatch = pattern.exec(rawText)) !== null) {
      if (pMatch[1]) {
        const val = cleanText(pMatch[1]);
        if (/^\d{14,16}$/.test(val)) {
          if (!detectedImeis.includes(val)) {
            detectedImeis.push(val);
            suggestedSet.add(val);
          }
        } else if (/^[A-Z0-9]{7,18}$/i.test(val) && !/^(STT|TEN|VATTU|HANGHOA|TONG|VND)$/i.test(val)) {
          if (!detectedSerials.includes(val)) {
            detectedSerials.push(val);
            suggestedSet.add(val);
          }
        }
      }
    }
  }

  // 1.2 Lines or segments explicitly marked with IMEI / MEID
  const imeiLineRegex = /(?:IMEI\s*[1I]?|IMEI\s*2|MEID|TAC)?[\s:./\-–—]*(\b\d{14,16}\b)/gi;
  let match: RegExpExecArray | null;
  while ((match = imeiLineRegex.exec(rawText)) !== null) {
    if (match[1] && !detectedImeis.includes(match[1])) {
      detectedImeis.push(match[1]);
      suggestedSet.add(match[1]);
    }
  }

  // 1.3 Pure 15-digit sequences (standard GSMA IMEI)
  const pure15Digits = rawText.match(/\b\d{15}\b/g) || [];
  pure15Digits.forEach((im) => {
    if (!detectedImeis.includes(im)) {
      detectedImeis.push(im);
      suggestedSet.add(im);
    }
  });

  // 1.4 Also check for spaced IMEIs like "35 123456 789012 3" or "(35 123456 789012 3)"
  const spacedImeis = rawText.match(/(?:[([{\uff08])?\b(\d{2,8}\s+\d{2,8}\s+\d{2,8}(?:\s+\d{1,4})?)\b(?:[)}\]\uff09])?/g);
  if (spacedImeis) {
    spacedImeis.forEach((sp) => {
      const compacted = sp.replace(/[\s()[\]{}\uff08\uff09]/g, '');
      if (compacted.length >= 14 && compacted.length <= 16 && !detectedImeis.includes(compacted)) {
        detectedImeis.push(compacted);
        suggestedSet.add(compacted);
      }
    });
  }

  // 1.5 Explicit Serial numbers (S/N, SN, Serial, etc.)
  const snMatches = [
    /(?:S\/N|SN|Serial\s*(?:No|Number)?|Số\s*Serial|Mã\s*máy)[:\s\-–—]*([A-Z0-9]{7,20})/gi,
    /\b([A-Z0-9]{2}[0-9A-Z]{8,12})\b/g,
  ];
  for (const reg of snMatches) {
    let snM: RegExpExecArray | null;
    while ((snM = reg.exec(rawText)) !== null) {
      if (snM[1] && !/^\d{14,16}$/.test(snM[1])) {
        const snVal = cleanText(snM[1]);
        if (snVal.length >= 7 && snVal.length <= 18 && !/^(IPHONE|SAMSUNG|GALAXY|XIAOMI|NUBIA|REDMI|REALME)$/i.test(snVal)) {
          if (!detectedSerials.includes(snVal)) {
            detectedSerials.push(snVal);
            suggestedSet.add(snVal);
          }
        }
      }
    }
  }

  // Map primary IMEI & Serial fields
  if (detectedImeis.length > 0) {
    detectedFields['IMEI'] = detectedImeis[0];
    detectedFields['IMEI 1'] = detectedImeis[0];
    detectedFields['IMEI / Serial'] = detectedImeis[0];
    if (detectedImeis.length > 1) {
      detectedFields['IMEI 2'] = detectedImeis[1];
    }
  }

  if (detectedSerials.length > 0) {
    detectedFields['Serial'] = detectedSerials[0];
    if (!detectedFields['IMEI']) {
      detectedFields['IMEI'] = detectedSerials[0];
      detectedFields['IMEI 1'] = detectedSerials[0];
    }
    if (!detectedFields['IMEI / Serial']) {
      detectedFields['IMEI / Serial'] = detectedSerials[0];
    }
  }

  // ==========================================
  // 3. MODEL NAME / DEVICE NAME DETECTION
  // ==========================================

  // 3.1 Check invoice / table lines containing device brands and full descriptive titles
  // e.g. "APPLE IPHONE 14 PRO MAX 128GB ĐEN CŨ - ĐẸP", "Samsung Galaxy S24 Ultra 512GB Xám"
  for (const line of lines) {
    let cleanLine = line
      .replace(/^[\d\s|.*#\-–—]+\s*(?:Tên\s*vật\s*tư|Tên\s*hàng|Tên\s*SP)?[:\s\-–—]*/i, '') // strip leading STT or column titles
      .replace(/\s*[([{\uff08][A-Z0-9]{7,20}[)}\]\uff09]\s*$/i, '') // strip trailing (H45G7NQXFL)
      .trim();

    if (
      /(?:APPLE\s+)?(?:iPhone\s+(?:16|15|14|13|12|11|XS|XR|X|SE|8|7)|iPad|Apple\s+Watch|Samsung\s+Galaxy|Galaxy\s+[SZNAM]\d|Nubia|Red\s*Magic|POCO|Xiaomi|Redmi|Oppo|Realme|Vivo|Pixel|Sony\s+Xperia)/i.test(
        cleanLine
      )
    ) {
      if (cleanLine.length >= 5 && cleanLine.length <= 65 && !detectedModels.includes(cleanLine)) {
        detectedModels.push(cleanLine);
        suggestedSet.add(cleanLine);
        break;
      }
    }
  }

  const brandPatterns = [
    // Apple iPhone, iPad, Apple Watch with full variant name e.g. APPLE IPHONE 14 PRO MAX 128GB ĐEN CŨ - ĐẸP
    /((?:APPLE\s+)?iPhone\s+(?:16\s*(?:Pro\s*Max|Pro|Plus)?|15\s*(?:Pro\s*Max|Pro|Plus)?|14\s*(?:Pro\s*Max|Pro|Plus)?|13\s*(?:Pro\s*Max|Pro|mini)?|12\s*(?:Pro\s*Max|Pro|mini)?|11\s*(?:Pro\s*Max|Pro)?|XS\s*Max|XS|XR|X|SE\s*(?:2020|2022|\d{4})?|8\s*Plus|8|7)[^\n\r()]{0,50})/i,
    /(iPad\s+(?:Pro|Air|Mini|\d+[\w\s+]*))/i,
    /(Apple\s+Watch\s+[\w\s+]+)/i,

    // Nubia / ZTE / Red Magic
    /(Nubia\s+(?:Z60\s*(?:Ultra|S\s*Pro)?|Z50\s*(?:Ultra|S\s*Pro)?|Focus\s*Pro\s*5G|Neo\s*(?:2|1)\s*5G|Flip\s*5G|Music|V60[\w\s+]*)[^\n\r()]{0,40})/i,
    /(Red\s*Magic\s+(?:9S\s*Pro\+|9S\s*Pro|9\s*Pro\+|9\s*Pro|8S\s*Pro|8\s*Pro|7\s*Pro)[^\n\r()]{0,40})/i,
    /(ZTE\s+[\w\s+]{3,35})/i,

    // Samsung Galaxy
    /(Samsung\s+Galaxy\s+[SZNAM]\d{1,2}[\w\s+]*|Galaxy\s+[SZNAM]\d{1,2}[\w\s+]*|Galaxy\s+Z\s*(?:Fold|Flip)\s*\d[\w\s+]*[^\n\r()]{0,40})/i,

    // Xiaomi / Redmi / POCO
    /(Xiaomi\s+(?:14\s*Ultra|14T\s*Pro|14T|14|13T\s*Pro|13T|13\s*Ultra|13\s*Pro|13|12T|12)[^\n\r()]{0,40})/i,
    /(Redmi\s+Note\s+\d{1,2}[\w\s+]*|Redmi\s+K\d{2}[\w\s+]*|Redmi\s+[A-Z0-9]{1,5}[^\n\r()]{0,40})/i,
    /(POCO\s+[FXM]\d[^\n\r()]{0,40})/i,

    // Oppo / Realme / Vivo / OnePlus
    /(Oppo\s+(?:Find\s*X\d[\w\s+]*|Reno\s*\d{1,2}[\w\s+]*|A\d{1,2}[\w\s+]*)[^\n\r()]{0,40})/i,
    /(Realme\s+(?:GT\s*\d[\w\s+]*|\d{1,2}\s*Pro\+?|C\d{2}[\w\s+]*)[^\n\r()]{0,40})/i,
    /(Vivo\s+(?:X\d{2,3}[\w\s+]*|V\d{2}[\w\s+]*|Y\d{2}[\w\s+]*|iQOO\s*[\w\s+]+)[^\n\r()]{0,40})/i,
    /(OnePlus\s+(?:12\s*R?|11\s*R?|10\s*Pro|Nord\s*[\w\s+]+))/i,

    // Sony / Google Pixel / Honor / Asus / Tecno / Infinix
    /(Sony\s+Xperia\s+[\w\s+]+|Xperia\s+[\w\s+]+)/i,
    /(Google\s+Pixel\s+\d[\w\s+]*|Pixel\s+\d[\w\s+]*)/i,
    /(Honor\s+(?:Magic\s*\d[\w\s+]*|\d{2,3}[\w\s+]*|X\d[\w\s+]*))/i,
    /(ROG\s+Phone\s+\d[\w\s+]*|Asus\s+[\w\s+]+)/i,
    /(Tecno\s+(?:Camon|Pova|Spark)\s*[\w\s+]+)/i,
    /(Infinix\s+(?:Note|Hot|Zero)\s*[\w\s+]+)/i,
    /(Bphone\s+[\w\s+]+|Vsmart\s+[\w\s+]+)/i,
  ];

  // Specific labeled name patterns e.g. "Tên SP:", "Tên máy:", "Model:", "Tên vật tư:"
  const labeledModelPatterns = [
    /(?:Model|Kiểu\s*máy|Tên\s*máy|Tên\s*sản\s*phẩm|Tên\s*thiết\s*bị|Tên\s*vật\s*tư|Tên\s*hàng|Mặt\s*hàng|Product\s*Name|Device\s*Name)[:\s\-–—]+([A-Za-z0-9\s+/.\-–—()À-ỹ]{3,60})/i,
  ];

  // Check labeled first
  for (const reg of labeledModelPatterns) {
    const lm = rawText.match(reg);
    if (lm && lm[1]) {
      const clean = cleanText(lm[1].replace(/[\r\n]+/g, ' '));
      if (clean.length >= 3 && clean.length <= 45 && !/^\d{14,16}$/.test(clean)) {
        detectedModels.push(clean);
        suggestedSet.add(clean);
        break;
      }
    }
  }

  // Check brand patterns
  for (const reg of brandPatterns) {
    const bm = rawText.match(reg);
    if (bm && bm[1]) {
      const clean = cleanText(bm[1].replace(/[\r\n]+/g, ' '));
      if (clean.length >= 3 && clean.length <= 45 && !detectedModels.includes(clean)) {
        detectedModels.push(clean);
        suggestedSet.add(clean);
      }
    }
  }

  // If no brand pattern matched, look for top lines that look like product titles
  if (detectedModels.length === 0) {
    for (const line of lines.slice(0, 5)) {
      const clean = cleanText(line);
      if (
        clean.length >= 4 &&
        clean.length <= 40 &&
        !/^\d+$/.test(clean) &&
        !/IMEI|Serial|MEID|MAC|Made\s*in|FCC|CE|Volt/i.test(clean)
      ) {
        detectedModels.push(clean);
        suggestedSet.add(clean);
        break;
      }
    }
  }

  if (detectedModels.length > 0) {
    detectedFields['Model'] = detectedModels[0];
    detectedFields['Ten_SP'] = detectedModels[0];
  }

  // ==========================================
  // 4. STORAGE / RAM (e.g. 8GB/256GB, 256GB, 512GB, 1TB)
  // ==========================================
  const storageMatch = rawText.match(/\b(\d{1,2}GB\s*[\/|+]\s*\d{2,4}GB|\d{2,4}GB|\d{1,2}TB)\b/i);
  if (storageMatch && storageMatch[1]) {
    const st = storageMatch[1].toUpperCase().replace(/\s+/g, '');
    detectedFields['DungLuong'] = st;
    suggestedSet.add(st);
  }

  // ==========================================
  // 5. COLOR DETECTION
  // ==========================================
  const colorRegex = /(?:Màu|Color|Màu\s*sắc)[:\s\-–—]*([A-Za-zÀ-ỹ\s]{2,20})|(\b(?:Titan\s+Tự\s+Nhiên|Titan\s+Đen|Titan\s+Trắng|Titan\s+Sa\s+Mạc|Space\s+Gray|Midnight|Starlight|Silver|Gold|Black|Blue|Green|White|Yellow|Pink|Purple|Xanh\s+Dương|Xanh\s+Lá|Xanh\s+Titan|Xanh\s+Midnight|Xám\s+Không\s+Gian|Bạc|Vàng|Đen|Trắng|Tím|Hồng|Đỏ)\b)/i;
  const colorM = rawText.match(colorRegex);
  if (colorM) {
    const col = cleanText(colorM[1] || colorM[2] || '');
    if (col && col.length >= 2 && col.length <= 25) {
      detectedFields['MauSac'] = col;
      suggestedSet.add(col);
    }
  }

  // ==========================================
  // 6. PRICE DETECTION
  // ==========================================
  const priceRegex = /(?:Giá|Price|Đơn\s*giá)?[:\s\-–—]*(\b\d{1,3}(?:[.,]\d{3})+(?:\s*đ|\s*VND|\s*VNĐ)?\b)/i;
  const priceM = rawText.match(priceRegex);
  if (priceM && priceM[1]) {
    const pr = cleanText(priceM[1]);
    detectedFields['Gia'] = pr;
    suggestedSet.add(pr);
  }

  // ==========================================
  // 7. MULTI-PRODUCT DETECTION (Multiple items/rows in invoice or list)
  // ==========================================
  const detectedProducts: DeviceProductItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';

    // Check if line contains a device model or product table row
    if (
      /(?:APPLE\s+)?(?:iPhone\s+(?:16|15|14|13|12|11|XS|XR|X|SE|8|7)|iPad|Apple\s+Watch|Samsung\s+Galaxy|Galaxy\s+[SZNAM]\d|Nubia|Red\s*Magic|POCO|Xiaomi|Redmi|Oppo|Realme|Vivo|Pixel|Sony\s+Xperia)/i.test(
        rawLine
      )
    ) {
      // Use cleanInvoiceProductRow to accurately parse device name and strip table artifacts
      const parsedRow = cleanInvoiceProductRow(rawLine, nextLine);
      const cleanModel = parsedRow.name;
      let serialOrImei = parsedRow.serial;

      if (!serialOrImei && nextLine) {
        const nextParenMatch = nextLine.match(/^[([{\uff08]\s*([A-Z0-9]{7,20})\s*[)}\]\uff09]/i);
        if (nextParenMatch && nextParenMatch[1]) {
          serialOrImei = cleanText(nextParenMatch[1]);
          i++; // skip next line as it was consumed
        }
      }

      const storage = parsedRow.storage;
      const color = parsedRow.color;
      const condition = parsedRow.condition;
      const sku = parsedRow.sku;

      if (cleanModel.length >= 5) {
        detectedProducts.push({
          id: `prod_${detectedProducts.length + 1}`,
          modelName: cleanModel,
          imei1: serialOrImei || undefined,
          serial: serialOrImei || undefined,
          storage: storage || undefined,
          color: color || undefined,
          rawText: rawLine,
        });

        // Set primary fields if first product
        if (detectedProducts.length === 1) {
          detectedFields['Model'] = cleanModel;
          detectedFields['Ten_SP'] = cleanModel;
          detectedFields['Tên vật tư'] = cleanModel;
          if (serialOrImei) {
            detectedFields['Serial'] = serialOrImei;
            detectedFields['IMEI'] = serialOrImei;
            detectedFields['IMEI 1'] = serialOrImei;
            detectedFields['IMEI / Serial'] = serialOrImei;
          }
          if (storage) detectedFields['DungLuong'] = storage;
          if (color) detectedFields['MauSac'] = color;
          if (condition) detectedFields['TinhTrang'] = condition;
          if (sku) {
            detectedFields['MaSo'] = sku;
            detectedFields['Mã số'] = sku;
          }
        }
      }
    }
  }

  // ==========================================
  // 8. ADD RELEVANT LINES TO SUGGESTIONS (FILTERING INVOICE NOISE)
  // ==========================================
  lines.forEach((line) => {
    const clean = cleanText(line);
    // Ignore warehouse / company / table footer noise lines
    if (!isInvoiceNoise(clean) && clean.length >= 3 && clean.length <= 60 && !suggestedSet.has(clean)) {
      suggestedSet.add(clean);
    }
  });

  // Pick target best extracted value
  let extractedTarget = '';
  if (targetField) {
    const lower = targetField.toLowerCase();
    if ((lower.includes('imei') || lower.includes('mã')) && detectedFields['IMEI']) {
      extractedTarget = detectedFields['IMEI'];
    } else if (
      (lower.includes('model') || lower.includes('ten') || lower.includes('máy') || lower.includes('hàng') || lower.includes('san_pham') || lower.includes('vật tư')) &&
      detectedFields['Model']
    ) {
      extractedTarget = detectedFields['Model'];
    } else if (lower.includes('serial') && detectedFields['Serial']) {
      extractedTarget = detectedFields['Serial'];
    } else if ((lower.includes('gia') || lower.includes('giá')) && detectedFields['Gia']) {
      extractedTarget = detectedFields['Gia'];
    } else if ((lower.includes('dung') || lower.includes('lượng') || lower.includes('storage')) && detectedFields['DungLuong']) {
      extractedTarget = detectedFields['DungLuong'];
    } else if ((lower.includes('mau') || lower.includes('màu') || lower.includes('color')) && detectedFields['MauSac']) {
      extractedTarget = detectedFields['MauSac'];
    } else if (detectedFields[targetField]) {
      extractedTarget = detectedFields[targetField];
    } else {
      const matched = Object.entries(detectedFields).find(
        ([k]) => k.toLowerCase().includes(lower) || lower.includes(k.toLowerCase())
      );
      if (matched) {
        extractedTarget = matched[1];
      }
    }
  }

  if (!extractedTarget && suggestedSet.size > 0) {
    extractedTarget = detectedFields['IMEI'] || detectedFields['Model'] || Array.from(suggestedSet)[0];
  }

  const devicePair: DevicePairResult = {
    modelName: (detectedProducts.length > 0 ? detectedProducts[0].modelName : undefined) || detectedFields['Model'] || (detectedModels.length > 0 ? detectedModels[0] : ''),
    imei1: (detectedProducts.length > 0 ? detectedProducts[0].imei1 : undefined) || detectedFields['IMEI'] || (detectedImeis.length > 0 ? detectedImeis[0] : ''),
    imei2: detectedFields['IMEI 2'] || (detectedImeis.length > 1 ? detectedImeis[1] : undefined),
    serial: (detectedProducts.length > 0 ? detectedProducts[0].serial : undefined) || detectedFields['Serial'],
    storage: (detectedProducts.length > 0 ? detectedProducts[0].storage : undefined) || detectedFields['DungLuong'],
    color: (detectedProducts.length > 0 ? detectedProducts[0].color : undefined) || detectedFields['MauSac'],
    price: detectedFields['Gia'],
  };

  return {
    fullText: rawText,
    lines,
    extractedTarget,
    detectedFields,
    suggestedItems: Array.from(suggestedSet).slice(0, 15),
    devicePair,
    detectedProducts: detectedProducts.length > 0 ? detectedProducts : undefined,
    allImeis: detectedImeis,
    allModels: detectedModels,
    method: 'local_tesseract',
  };
}

// Perform client-side QR/Barcode decode using jsQR and Canvas
export function scanQrBarcodeFromImageData(imageDataUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'dontInvert',
        });
        if (code && code.data) {
          resolve(code.data.trim());
        } else {
          resolve(null);
        }
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageDataUrl;
  });
}

// Local Tesseract OCR processing with progress callback & language selection
export async function performLocalTesseractOCR(
  imageDataUrl: string,
  targetField?: string,
  availableColumns: string[] = [],
  onProgress?: (progress: number, statusText: string) => void,
  ocrLanguage: string = 'vie'
): Promise<ExtractedOCRData> {
  // 1. Scan for QR / Barcode in image
  const qrBarcode = await scanQrBarcodeFromImageData(imageDataUrl);

  onProgress?.(0.12, 'Chuẩn hóa độ sắc nét ảnh & dấu tiếng Việt...');
  const optimizedImageUrl = await preprocessImageForOCR(imageDataUrl);

  const langLabel = ocrLanguage === 'vie' ? 'Bộ nhận diện tiếng Việt chuyên sâu (VIE)' : 'Bộ nhận diện tiếng Việt & Anh (VIE+ENG)';
  onProgress?.(0.2, `Khởi động ${langLabel}...`);

  let worker: any = null;
  try {
    worker = await createWorker(ocrLanguage, 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          const p = 0.2 + (m.progress || 0) * 0.75;
          const statusMsg = ocrLanguage === 'vie' 
            ? `Đang nhận diện tiếng Việt có dấu (${Math.round((m.progress || 0) * 100)}%)...`
            : `Đang quét văn bản (${Math.round((m.progress || 0) * 100)}%)...`;
          onProgress?.(Math.min(0.95, p), statusMsg);
        }
      },
    });

    try {
      await worker.setParameters({
        preserve_interword_spaces: '1',
      });
    } catch {}

    const ret = await worker.recognize(optimizedImageUrl);
    const rawRecognizedText = ret?.data?.text || '';
    const recognizedText = restoreVietnameseDiacritics(rawRecognizedText);

    await worker.terminate();
    worker = null;

    onProgress?.(1.0, 'Đã nhận diện xong văn bản tiếng Việt!');

    const parsed = parsePhoneAndLabelFields(recognizedText, targetField, availableColumns);
    parsed.method = ocrLanguage === 'vie' ? 'tesseract-vie' : 'tesseract-vie-eng';

    // If QR / Barcode is present
    if (qrBarcode) {
      parsed.suggestedItems.unshift(qrBarcode);
      // Check if barcode contains 15 digits (pure, or inside parentheses like (21)35... or (35...))
      const barcodeImeiMatch = qrBarcode.match(/(?:[([{\uff08](?:21|91|8004|01)?[)}\]\uff09])?(\d{14,16})/);
      if (barcodeImeiMatch && barcodeImeiMatch[1]) {
        const cleanImei = barcodeImeiMatch[1];
        if (!parsed.detectedFields['IMEI']) {
          parsed.detectedFields['IMEI'] = cleanImei;
          parsed.devicePair.imei1 = cleanImei;
        }
      } else if (/^\d{14,16}$/.test(qrBarcode)) {
        if (!parsed.detectedFields['IMEI']) {
          parsed.detectedFields['IMEI'] = qrBarcode;
          parsed.devicePair.imei1 = qrBarcode;
        }
      } else {
        parsed.detectedFields['Barcode / QR'] = qrBarcode;
      }
      if (
        !parsed.extractedTarget ||
        (targetField && (targetField.toLowerCase().includes('imei') || targetField.toLowerCase().includes('serial') || targetField.toLowerCase().includes('mã')))
      ) {
        parsed.extractedTarget = qrBarcode;
      }
    }

    return parsed;
  } catch (err) {
    if (worker) {
      try {
        await worker.terminate();
      } catch {}
    }
    if (qrBarcode) {
      const isImei = /^\d{14,16}$/.test(qrBarcode);
      return {
        fullText: qrBarcode,
        lines: [qrBarcode],
        extractedTarget: qrBarcode,
        detectedFields: isImei ? { IMEI: qrBarcode } : { 'Mã vạch / QR': qrBarcode },
        suggestedItems: [qrBarcode],
        devicePair: {
          modelName: '',
          imei1: isImei ? qrBarcode : '',
        },
        allImeis: isImei ? [qrBarcode] : [],
        allModels: [],
        method: 'barcode',
      };
    }
    throw err;
  }
}
