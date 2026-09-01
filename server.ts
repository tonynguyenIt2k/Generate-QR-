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

      const systemPrompt = `You are a high-precision OCR and barcode/product text scanner AI specialized in electronics, smartphones (iPhone, Samsung, Xiaomi, Nubia, Oppo, Vivo, Realme, iPad, etc.), retail product boxes, shipping labels, and store/warehouse inventory invoices.
Your task is to analyze the provided image, read all visible text accurately (Vietnamese, English, serial numbers, barcodes, numbers), and extract key structured fields.

Instructions:
1. Extract ALL visible text clearly line-by-line in "lines" and full text in "fullText".
2. MULTI-PRODUCT DETECTION (Phiếu xuất kho / kiểm kê / danh sách có nhiều sản phẩm):
   - If the image contains multiple product lines / rows (e.g. STT 1, STT 2, or multiple device models with their respective serials/IMEIs in parentheses), extract ALL of them into the "detectedProducts" array.
   - For each product in "detectedProducts":
     * "modelName": full device description without parentheses serial (e.g. "APPLE IPHONE 14 PRO MAX 256GB VÀNG CŨ - ĐẸP", "APPLE IPHONE 12 128GB XANH CŨ - ĐẸP").
     * "imei1": clean serial/IMEI inside parentheses (e.g. "JLJ63Y27D5", "FFML807V0F12", or 15-digit IMEI, stripping brackets/parentheses).
     * "serial": serial number (e.g. "JLJ63Y27D5").
     * "storage": storage if present (e.g. "256GB", "128GB").
     * "color": color if present (e.g. "VÀNG", "XANH", "ĐEN").
     * "price": price if present.
3. For single-field compatibility:
   - "detectedFields" should hold the first detected item's properties (IMEI, Model, Serial, DungLuong, MauSac, Gia).
   - If "targetField" is specified: provide the best matching value for the target in "extractedTarget".
4. "suggestedItems": include all clean IMEIs, Serials, Model names, Capacities, and individual clear lines so the user can easily tap to pick any value.`;

      const userPrompt = `Target Field requested by user: "${targetField || 'any'}".
Available dataset columns: ${Array.isArray(availableFields) ? availableFields.join(', ') : 'IMEI, Model, Serial, Gia, DungLuong, MauSac'}.
Please extract all products and structured text from this image.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
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
