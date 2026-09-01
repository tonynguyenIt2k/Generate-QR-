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
  method: 'gemini' | 'local_tesseract' | 'barcode';
}

// Clean string helper
function cleanText(text: string): string {
  return text
    .replace(/^[:\s\-–—|/.,#*=]+/g, '')
    .replace(/[:\s\-–—|/.,#*=]+$/g, '')
    .trim();
}

// Helper to extract common phone & retail fields from text using regex & heuristics
export function parsePhoneAndLabelFields(
  rawText: string,
  targetField?: string,
  availableColumns: string[] = []
): ExtractedOCRData {
  const lines = rawText
    .split(/[\r\n]+/)
    .map((l) => l.trim())
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
    // Check if line contains a device model
    if (
      /(?:APPLE\s+)?(?:iPhone\s+(?:16|15|14|13|12|11|XS|XR|X|SE|8|7)|iPad|Apple\s+Watch|Samsung\s+Galaxy|Galaxy\s+[SZNAM]\d|Nubia|Red\s*Magic|POCO|Xiaomi|Redmi|Oppo|Realme|Vivo|Pixel|Sony\s+Xperia)/i.test(
        rawLine
      )
    ) {
      // 1. Clean product name
      let cleanModel = rawLine
        .replace(/^[\d\s|.*#\-–—]+\s*(?:Tên\s*vật\s*tư|Tên\s*hàng|Tên\s*SP)?[:\s\-–—]*/i, '') // strip leading STT e.g. "1 " or "2 "
        .replace(/\s*[([{\uff08][A-Z0-9]{7,20}[)}\]\uff09]\s*$/i, '') // strip inline trailing (SERIAL)
        .trim();

      // 2. Check for inline or adjacent Serial/IMEI
      let serialOrImei = '';
      const inlineParenMatch = rawLine.match(/[([{\uff08]\s*([A-Z0-9]{7,20})\s*[)}\]\uff09]/i);
      if (inlineParenMatch && inlineParenMatch[1]) {
        serialOrImei = cleanText(inlineParenMatch[1]);
      } else if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const nextParenMatch = nextLine.match(/^[([{\uff08]\s*([A-Z0-9]{7,20})\s*[)}\]\uff09]/i);
        if (nextParenMatch && nextParenMatch[1]) {
          serialOrImei = cleanText(nextParenMatch[1]);
          i++; // skip next line as it was consumed as serial for this product
        }
      }

      // 3. Extract storage
      let storage = '';
      const stM = cleanModel.match(/\b(16|32|64|128|256|512)\s*(?:GB|G)\b/i) || cleanModel.match(/\b(1|2)\s*TB\b/i);
      if (stM) {
        storage = stM[0].toUpperCase().replace(/\s+/, '');
      }

      // 4. Extract color
      let color = '';
      const colM = cleanModel.match(/\b(Vàng|Vang|Xanh|Xanh\s*dương|Xanh\s*lá|Xanh\s*lục|Đen|Den|Trắng|Trang|Tím|Tim|Hồng|Hong|Bạc|Bac|Xám|Xam|Gold|Silver|Space\s*Gray|Titan|Titanium|Black|White|Blue|Green|Purple|Red|Yellow)\b/i);
      if (colM) {
        color = colM[1].toUpperCase();
      }

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
      }
    }
  }

  // ==========================================
  // 8. ADD SHORT RELEVANT LINES TO SUGGESTIONS
  // ==========================================
  lines.forEach((line) => {
    const clean = cleanText(line);
    if (clean.length >= 3 && clean.length <= 40 && !suggestedSet.has(clean)) {
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
      (lower.includes('model') || lower.includes('ten') || lower.includes('máy') || lower.includes('hàng') || lower.includes('san_pham')) &&
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

// Local Tesseract OCR processing with progress callback
export async function performLocalTesseractOCR(
  imageDataUrl: string,
  targetField?: string,
  availableColumns: string[] = [],
  onProgress?: (progress: number, statusText: string) => void
): Promise<ExtractedOCRData> {
  // 1. Scan for QR / Barcode in image
  const qrBarcode = await scanQrBarcodeFromImageData(imageDataUrl);

  onProgress?.(0.15, 'Khởi động bộ nhận diện OCR tiếng Việt & tiếng Anh...');

  let worker: any = null;
  try {
    worker = await createWorker('vie+eng', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          const p = 0.2 + (m.progress || 0) * 0.75;
          onProgress?.(Math.min(0.95, p), `Đang quét văn bản tem máy (${Math.round((m.progress || 0) * 100)}%)...`);
        }
      },
    });

    const ret = await worker.recognize(imageDataUrl);
    const recognizedText = ret?.data?.text || '';

    await worker.terminate();
    worker = null;

    onProgress?.(1.0, 'Đã nhận diện xong!');

    const parsed = parsePhoneAndLabelFields(recognizedText, targetField, availableColumns);

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
