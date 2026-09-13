import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy-initialized Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getGeminiAI(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    try {
      aiClient = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch {
      return null;
    }
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser with high limit for image payloads
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // OCR & Text Recognition API
  app.post('/api/ocr', async (req, res) => {
    try {
      const { image, targetField, availableFields } = req.body;

      if (!image) {
        return res.status(400).json({ error: 'Image data is required' });
      }

      // Extract MIME type and base64 string
      let mimeType = 'image/jpeg';
      let base64Data = image;

      if (image.startsWith('data:')) {
        const matches = image.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
      }

      const ai = getGeminiAI();
      if (!ai) {
        return res.json({
          success: false,
          useLocalFallback: true,
          message: 'Local OCR fallback active',
        });
      }

      const systemPrompt = `You are an ultra-high precision OCR AI specialized in electronics, smartphones (iPhone, Samsung, Xiaomi, Nubia, Oppo, Vivo, Realme, iPad, etc.), retail product boxes, and store/warehouse inventory invoices (BẢNG KÊ CHI TIẾT HÀNG HÓA / PHIẾU XUẤT KHO / PHIẾU ĐIỀU CHUYỂN).

CRITICAL DIRECTIVE - INVENTORY & TRANSFER SHEETS:
When the image is an inventory / transfer sheet or if the user highlights/circles a specific table cell:
1. FOCUS ON THE PRODUCT CELL ("Tên vật tư"):
   - Extract the full clean device name (e.g. "APPLE IPHONE 14 PRO 256GB TÍM CŨ - TRẦY XƯỚC").
   - Strip out table column artifacts (do NOT include SKU codes like "APP-IP14-PRO-", units like "Cái", or quantities like "1" in the model name).
2. IMEI / SERIAL:
   - Extract the exact alphanumeric code inside the parentheses (e.g. "(CDQF44NTDH)" -> "CDQF44NTDH", or 15-digit IMEI). Ensure 100% character accuracy.
3. IGNORE ALL PERIPHERAL NOISE:
   - Completely ignore company headers ("CÔNG TY...", "CHI NHÁNH..."), addresses, tax IDs ("MST:..."), voucher numbers ("DC.HN...", "HĐ KVCNB"), warehouse names ("Từ kho:", "Đến kho:"), transfer reasons, signatures, and QR codes.
4. Extract structured attributes:
   - "storage": capacity (e.g. "256GB")
   - "color": color name (e.g. "TÍM", "VÀNG", "ĐEN")
   - "condition": condition if stated (e.g. "CŨ - TRẦY XƯỚC", "CŨ - ĐẸP", "99%")
   - "sku": product code if present (e.g. "APP-IP14-PRO-256G-TI-95")
5. VIETNAMESE ACCENT & DIACRITIC ACCURACY:
   - Always retain and accurately output full Vietnamese accents and diacritics (e.g., "TÍM CŨ - TRẦY XƯỚC", "VÀNG", "ĐEN", "TRẮNG", "HỒNG", "XÁM", "CŨ - ĐẸP", never miss accents like "TIM CU - TRAY XUOC" or misclassify "TÍM" as "TÌM").

For single-field matching:
- If targetField is 'Model' or 'Ten_SP': provide the clean device name.
- If targetField is 'IMEI' or 'Serial': provide the exact serial/IMEI inside parentheses.`;

      const userPrompt = `Target Field requested by user: "${targetField || 'any'}".
Available dataset columns: ${Array.isArray(availableFields) ? availableFields.join(', ') : 'IMEI, Model, Serial, Gia, DungLuong, MauSac, TinhTrang'}.
Please extract all products and structured text from this image with 100% precision on the product name and serial/IMEI.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: userPrompt,
            },
          ],
        },
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              fullText: {
                type: Type.STRING,
                description: 'Complete recognized text from the image',
              },
              lines: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Recognized text broken down line by line',
              },
              extractedTarget: {
                type: Type.STRING,
                description: 'The best matching value for the requested targetField',
              },
              detectedProducts: {
                type: Type.ARRAY,
                description: 'List of all individual products found on this invoice / image',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    modelName: { type: Type.STRING, description: 'Full device name' },
                    imei1: { type: Type.STRING, description: 'Primary IMEI or Serial' },
                    serial: { type: Type.STRING, description: 'Serial code if present' },
                    storage: { type: Type.STRING, description: 'Storage capacity e.g. 256GB' },
                    color: { type: Type.STRING, description: 'Color e.g. VÀNG, XANH' },
                    price: { type: Type.STRING, description: 'Price if shown' },
                  },
                  required: ['modelName'],
                },
              },
              detectedFields: {
                type: Type.OBJECT,
                description: 'Key-value map of primary recognized fields e.g. IMEI, Model, Serial, DungLuong, MauSac, Gia',
                properties: {
                  IMEI: { type: Type.STRING },
                  Serial: { type: Type.STRING },
                  Model: { type: Type.STRING },
                  DungLuong: { type: Type.STRING },
                  MauSac: { type: Type.STRING },
                  Gia: { type: Type.STRING },
                  Ten_SP: { type: Type.STRING },
                },
              },
              suggestedItems: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'List of quick-pick text snippets (IMEI, model, barcodes, lines)',
              },
            },
            required: ['fullText', 'lines', 'suggestedItems'],
          },
        },
      });

      const jsonText = response.text || '{}';
      let parsedResult;
      try {
        parsedResult = JSON.parse(jsonText);
      } catch (parseErr) {
        parsedResult = {
          fullText: jsonText,
          lines: jsonText.split('\n').filter(Boolean),
          extractedTarget: jsonText.trim(),
          suggestedItems: jsonText.split('\n').filter(Boolean),
        };
      }

      return res.json({
        success: true,
        data: parsedResult,
        engine: 'gemini',
      });
    } catch (err: any) {
      return res.status(200).json({
        success: false,
        useLocalFallback: true,
        isKeyError: true,
        error: 'Chuyển sang bộ nhận diện OCR cục bộ.',
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
