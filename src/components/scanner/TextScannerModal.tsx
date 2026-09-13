import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Upload,
  X,
  Scan,
  RefreshCw,
  Zap,
  ZapOff,
  SwitchCamera,
  Check,
  Copy,
  Sparkles,
  AlertCircle,
  Barcode,
  Layers,
  ArrowRight,
  Cpu,
  Smartphone,
  Hash,
  PlusCircle,
  CheckCircle2,
  ListPlus,
  Crop,
  Target,
  FileSpreadsheet,
  Maximize2,
} from 'lucide-react';
import { DatasetRow } from '../../types/label';
import {
  performLocalTesseractOCR,
  restoreVietnameseDiacritics,
  ExtractedOCRData,
  DevicePairResult,
  DeviceProductItem,
} from '../../utils/clientOcr';

export interface ScanTargetInfo {
  rowIndex: number;
  fieldName: string;
  currentValue?: string;
  allRowData?: DatasetRow;
  availableColumns?: string[];
}

interface TextScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: ScanTargetInfo | null;
  onApplyValue: (rowIndex: number, fieldName: string, value: string) => void;
  onApplyMultiFields?: (rowIndex: number, fields: Record<string, string>) => void;
  onAddNewRowWithFields?: (fields: Record<string, string>) => void;
  onAddMultipleRowsWithFields?: (products: Array<Record<string, string>>) => void;
}

interface OCRResult {
  fullText: string;
  lines: string[];
  extractedTarget?: string;
  detectedFields?: Record<string, string>;
  suggestedItems: string[];
  devicePair?: DevicePairResult;
  detectedProducts?: DeviceProductItem[];
  allImeis?: string[];
  allModels?: string[];
  engine?: 'gemini' | 'local_tesseract' | 'barcode' | 'tesseract-vie' | 'tesseract-vie-eng';
}

export const TextScannerModal: React.FC<TextScannerModalProps> = ({
  isOpen,
  onClose,
  target,
  onApplyValue,
  onApplyMultiFields,
  onAddNewRowWithFields,
  onAddMultipleRowsWithFields,
}) => {
  const [activeMode, setActiveMode] = useState<'camera' | 'upload'>('camera');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [rawOriginalImage, setRawOriginalImage] = useState<string | null>(null);
  const [isCropMode, setIsCropMode] = useState<boolean>(false);
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 5,
    y: 35,
    width: 90,
    height: 24,
  });
  const [viewfinderShape, setViewfinderShape] = useState<'box' | 'table_row'>('table_row');
  const [autoCropViewfinder, setAutoCropViewfinder] = useState<boolean>(false);
  const [ocrLanguage, setOcrLanguage] = useState<'vie' | 'vie+eng'>('vie');

  const cropContainerRef = useRef<HTMLDivElement | null>(null);
  const [isDraggingBox, setIsDraggingBox] = useState(false);
  const [isResizingBox, setIsResizingBox] = useState(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; startX: number; startY: number; startW: number; startH: number } | null>(null);

  const handleBoxPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsDraggingBox(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: cropBox.x,
      startY: cropBox.y,
      startW: cropBox.width,
      startH: cropBox.height,
    };
  };

  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsResizingBox(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: cropBox.x,
      startY: cropBox.y,
      startW: cropBox.width,
      startH: cropBox.height,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current || !cropContainerRef.current) return;
    const rect = cropContainerRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const deltaXPercent = ((e.clientX - dragStartRef.current.clientX) / rect.width) * 100;
    const deltaYPercent = ((e.clientY - dragStartRef.current.clientY) / rect.height) * 100;

    if (isDraggingBox) {
      const newX = Math.max(0, Math.min(100 - dragStartRef.current.startW, dragStartRef.current.startX + deltaXPercent));
      const newY = Math.max(0, Math.min(100 - dragStartRef.current.startH, dragStartRef.current.startY + deltaYPercent));
      setCropBox((prev) => ({ ...prev, x: Math.round(newX), y: Math.round(newY) }));
    } else if (isResizingBox) {
      const newW = Math.max(15, Math.min(100 - dragStartRef.current.startX, dragStartRef.current.startW + deltaXPercent));
      const newH = Math.max(10, Math.min(100 - dragStartRef.current.startY, dragStartRef.current.startH + deltaYPercent));
      setCropBox((prev) => ({ ...prev, width: Math.round(newW), height: Math.round(newH) }));
    }
  };

  const handlePointerUp = () => {
    setIsDraggingBox(false);
    setIsResizingBox(false);
    dragStartRef.current = null;
  };

  const handlePerformCrop = (customBox?: { x: number; y: number; width: number; height: number }) => {
    const box = customBox || cropBox;
    const sourceImg = rawOriginalImage || capturedImage;
    if (!sourceImg) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const sx = (box.x / 100) * img.naturalWidth;
      const sy = (box.y / 100) * img.naturalHeight;
      const sw = (box.width / 100) * img.naturalWidth;
      const sh = (box.height / 100) * img.naturalHeight;

      canvas.width = Math.max(10, Math.round(sw));
      canvas.height = Math.max(10, Math.round(sh));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedImage(croppedDataUrl);
      setIsCropMode(false);
      processImageWithOCR(croppedDataUrl);
    };
    img.src = sourceImg;
  };

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('Đang phân tích hình ảnh...');
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(true);

  // Dedicated Name & IMEI Pair States for easy user confirmation and tweaks
  const [pairModelName, setPairModelName] = useState<string>('');
  const [pairImei1, setPairImei1] = useState<string>('');
  const [pairImei2, setPairImei2] = useState<string>('');
  const [pairSerial, setPairSerial] = useState<string>('');

  // Live Barcode / QR Detection state
  const [liveBarcode, setLiveBarcode] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const barcodeIntervalRef = useRef<any>(null);

  // Stop camera stream helper
  const stopCamera = useCallback(() => {
    if (barcodeIntervalRef.current) {
      clearInterval(barcodeIntervalRef.current);
      barcodeIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch {}
    }
    trackRef.current = null;
    setIsCameraActive(false);
    setTorchOn(false);
  }, []);

  // Helper to reliably bind stream to video element
  const bindStreamToVideo = useCallback((video: HTMLVideoElement | null, stream: MediaStream | null) => {
    if (!video || !stream) return;
    try {
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.muted = true;

      const onLoaded = () => {
        video
          .play()
          .then(() => {
            setIsCameraLoading(false);
            setIsCameraActive(true);
          })
          .catch((e) => {
            console.warn('Video play was rejected:', e);
            // Retry play on user interaction or next frame
            setTimeout(() => {
              video.play().catch(() => {});
            }, 300);
          });
      };

      if (video.readyState >= 2) {
        onLoaded();
      } else {
        video.onloadedmetadata = onLoaded;
        video.oncanplay = onLoaded;
      }
    } catch (e) {
      console.error('Error attaching stream to video:', e);
    }
  }, []);

  // Start camera stream with progressive fallback constraints
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setIsCameraLoading(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ mở Camera trực tiếp. Vui lòng sử dụng tính năng Chụp ảnh bằng Camera máy.');
      }

      let stream: MediaStream | null = null;

      // Level 1: Try ideal rear camera
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (err1) {
        console.warn('Initial camera constraint failed, trying basic facingMode...', err1);
        try {
          // Level 2: Simple facingMode
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: facingMode === 'environment' ? 'environment' : 'user',
            },
            audio: false,
          });
        } catch (err2) {
          console.warn('FacingMode constraint failed, trying generic video...', err2);
          // Level 3: Simple video true
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (!stream) {
        throw new Error('Không thể khởi tạo luồng camera.');
      }

      streamRef.current = stream;
      const videoTrack = stream.getVideoTracks()[0];
      trackRef.current = videoTrack;

      if (videoRef.current) {
        bindStreamToVideo(videoRef.current, stream);
      }

      setIsCameraActive(true);

      // Check for torch capability
      if (videoTrack) {
        try {
          const capabilities: any = videoTrack.getCapabilities?.() || {};
          setHasTorch(!!capabilities.torch);
        } catch {}
      }

      // Start live barcode detector if supported
      startBarcodeDetection();
    } catch (err: any) {
      console.error('Camera startup error:', err);
      let msg = err.message || 'Không thể truy cập máy ảnh';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Quyền truy cập máy ảnh bị từ chối. Bạn có thể bấm "Chụp Nhanh Bằng Camera Máy" bên dưới để quét.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'Không tìm thấy thiết bị máy ảnh trên thiết bị.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Máy ảnh đang được sử dụng bởi ứng dụng khác hoặc cần khởi động lại.';
      }
      setCameraError(msg);
      setIsCameraActive(false);
      setIsCameraLoading(false);
    }
  }, [facingMode, stopCamera, bindStreamToVideo]);

  // Live Barcode detection using BarcodeDetector API if available
  const startBarcodeDetection = () => {
    if (typeof (window as any).BarcodeDetector === 'undefined') {
      return;
    }

    try {
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: [
          'code_128',
          'code_39',
          'code_93',
          'ean_13',
          'ean_8',
          'qr_code',
          'upc_a',
          'upc_e',
          'data_matrix',
          'itf',
        ],
      });

      barcodeIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            if (rawValue && rawValue.trim()) {
              setLiveBarcode(rawValue.trim());
              try {
                navigator.vibrate?.(50);
              } catch {}
            }
          }
        } catch {
          // Ignore frame detection errors
        }
      }, 500);
    } catch (e) {
      console.log('BarcodeDetector init error', e);
    }
  };

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!trackRef.current) return;
    try {
      const newTorch = !torchOn;
      await (trackRef.current as any).applyConstraints({
        advanced: [{ torch: newTorch }],
      });
      setTorchOn(newTorch);
    } catch (err) {
      console.error('Torch toggle failed', err);
    }
  };

  // Switch between front and rear cameras
  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Initialize or cleanup camera when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setOcrResult(null);
      setLiveBarcode(null);
      setSelectedText('');
      setPairModelName('');
      setPairImei1('');
      setPairImei2('');
      setPairSerial('');
      setCameraError(null);
      if (activeMode === 'camera') {
        startCamera();
      }
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeMode, facingMode, startCamera, stopCamera]);

  // Capture frame from live video
  const handleCaptureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

    try {
      navigator.vibrate?.(50);
    } catch {}

    setRawOriginalImage(dataUrl);
    stopCamera();

    // Auto-crop to viewfinder if enabled
    if (autoCropViewfinder) {
      const cropCanvas = document.createElement('canvas');
      const cw = Math.round(canvas.width * (viewfinderShape === 'table_row' ? 0.90 : 0.75));
      const ch = Math.round(canvas.height * (viewfinderShape === 'table_row' ? 0.26 : 0.50));
      const cx = Math.round((canvas.width - cw) / 2);
      const cy = Math.round((canvas.height - ch) / 2);
      cropCanvas.width = cw;
      cropCanvas.height = ch;
      const cropCtx = cropCanvas.getContext('2d');
      if (cropCtx) {
        cropCtx.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
        const croppedUrl = cropCanvas.toDataURL('image/jpeg', 0.92);
        setCapturedImage(croppedUrl);
        processImageWithOCR(croppedUrl);
        return;
      }
    }

    setCapturedImage(dataUrl);
    processImageWithOCR(dataUrl);
  };

  // Handle file upload
  const handleFileUpload = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setRawOriginalImage(dataUrl);
        setCapturedImage(dataUrl);
        stopCamera();
        processImageWithOCR(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Populate Name & IMEI pair state from results
  const syncPairFromData = (data: {
    detectedFields?: Record<string, string>;
    devicePair?: DevicePairResult;
    detectedProducts?: DeviceProductItem[];
    allModels?: string[];
    allImeis?: string[];
    suggestedItems?: string[];
    extractedTarget?: string;
  }) => {
    const firstProduct =
      data.detectedProducts && data.detectedProducts.length > 0 ? data.detectedProducts[0] : null;

    const modelRaw =
      firstProduct?.modelName ||
      data.devicePair?.modelName ||
      data.detectedFields?.['Model'] ||
      data.detectedFields?.['Ten_SP'] ||
      data.detectedFields?.['Tên vật tư'] ||
      (data.allModels && data.allModels.length > 0 ? data.allModels[0] : '');

    const model = restoreVietnameseDiacritics(modelRaw);

    const serial =
      firstProduct?.serial || data.devicePair?.serial || data.detectedFields?.['Serial'] || '';

    let imei =
      firstProduct?.imei1 ||
      data.devicePair?.imei1 ||
      data.detectedFields?.['IMEI'] ||
      data.detectedFields?.['IMEI 1'] ||
      data.detectedFields?.['IMEI / Serial'] ||
      (data.allImeis && data.allImeis.length > 0 ? data.allImeis[0] : '');

    if (!imei && serial) {
      imei = serial;
    }

    const imei2 =
      data.devicePair?.imei2 ||
      data.detectedFields?.['IMEI 2'] ||
      (data.allImeis && data.allImeis.length > 1 ? data.allImeis[1] : '');

    setPairModelName(model || '');
    setPairImei1(imei || serial || '');
    setPairImei2(imei2 || '');
    setPairSerial(serial || '');

    if (data.extractedTarget) {
      setSelectedText(data.extractedTarget);
    } else if (imei) {
      setSelectedText(imei);
    } else if (serial) {
      setSelectedText(serial);
    } else if (model) {
      setSelectedText(model);
    } else if (data.suggestedItems && data.suggestedItems.length > 0) {
      setSelectedText(data.suggestedItems[0]);
    }
  };

  // OCR Processing with Automatic Local Fallback
  const processImageWithOCR = async (imageDataUrl: string) => {
    setIsProcessing(true);
    setOcrResult(null);
    setProcessingStatus('Đang gửi hình ảnh nhận diện văn bản...');

    let usedLocalFallback = false;

    try {
      // 1. First attempt: Server OCR endpoint (Gemini AI)
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageDataUrl,
          targetField: target?.fieldName || 'IMEI',
          availableFields: target?.availableColumns || [
            'Ten_SP',
            'Model',
            'IMEI',
            'IMEI 1',
            'IMEI 2',
            'Serial',
            'Gia',
            'DungLuong',
            'MauSac',
          ],
        }),
      });

      const json = await res.json();

      if (json.success && json.data) {
        const result: OCRResult = {
          ...json.data,
          engine: 'gemini',
        };
        setOcrResult(result);
        syncPairFromData(result);
        setIsProcessing(false);
        return;
      } else {
        usedLocalFallback = true;
      }
    } catch {
      usedLocalFallback = true;
    }

    // 2. Second attempt: Client-side Local OCR engine (Tesseract.js + jsQR + Regex)
    if (usedLocalFallback) {
      try {
        setProcessingStatus('Đang nhận diện Tên Máy & IMEI bằng bộ xử lý cục bộ...');
        const localData: ExtractedOCRData = await performLocalTesseractOCR(
          imageDataUrl,
          target?.fieldName || 'IMEI',
          target?.availableColumns || [
            'Ten_SP',
            'Model',
            'IMEI',
            'IMEI 1',
            'IMEI 2',
            'Serial',
            'Gia',
            'DungLuong',
            'MauSac',
          ],
          (progress, statusText) => {
            setProcessingStatus(statusText);
          },
          ocrLanguage
        );

        setOcrResult({
          fullText: localData.fullText || (liveBarcode ? liveBarcode : 'Đã quét xong ảnh.'),
          lines: localData.lines,
          extractedTarget: localData.extractedTarget,
          detectedFields: localData.detectedFields,
          suggestedItems: localData.suggestedItems,
          devicePair: localData.devicePair,
          detectedProducts: localData.detectedProducts,
          allImeis: localData.allImeis,
          allModels: localData.allModels,
          engine: localData.method,
        });

        syncPairFromData(localData);
      } catch (localErr: any) {
        console.error('Local OCR error:', localErr);
        const fallbackRes: OCRResult = {
          fullText: liveBarcode || 'Không đọc được văn bản rõ ràng. Bạn có thể tự nhập bên dưới.',
          lines: liveBarcode ? [liveBarcode] : [],
          suggestedItems: liveBarcode ? [liveBarcode] : [],
          extractedTarget: liveBarcode || '',
          engine: 'barcode',
          detectedFields: liveBarcode
            ? /^\d{14,16}$/.test(liveBarcode)
              ? { IMEI: liveBarcode }
              : { 'Mã vạch': liveBarcode }
            : {},
        };
        setOcrResult(fallbackRes);
        syncPairFromData(fallbackRes);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Retake or pick new image
  const handleRetake = () => {
    setCapturedImage(null);
    setRawOriginalImage(null);
    setIsCropMode(false);
    setOcrResult(null);
    setSelectedText('');
    setPairModelName('');
    setPairImei1('');
    setPairImei2('');
    setPairSerial('');
    setLiveBarcode(null);
    if (activeMode === 'camera') {
      startCamera();
    }
  };

  // Copy text helper
  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1500);
  };

  // Apply single field value
  const handleApplySingle = (value: string) => {
    if (!target) return;
    onApplyValue(target.rowIndex, target.fieldName, value);
    try {
      navigator.vibrate?.(50);
    } catch {}
    onClose();
  };

  // Apply Name & IMEI pair specifically to current row
  const handleApplyModelAndImeiPair = () => {
    if (!target) return;
    const fieldsToApply: Record<string, string> = {};

    if (pairModelName.trim()) {
      fieldsToApply['Model'] = pairModelName.trim();
      fieldsToApply['Ten_SP'] = pairModelName.trim();
      fieldsToApply['Tên SP'] = pairModelName.trim();
      fieldsToApply['Tên vật tư'] = pairModelName.trim();
      fieldsToApply['Tên hàng'] = pairModelName.trim();
    }

    if (pairImei1.trim()) {
      fieldsToApply['IMEI'] = pairImei1.trim();
      fieldsToApply['IMEI 1'] = pairImei1.trim();
      fieldsToApply['Serial'] = pairImei1.trim();
      fieldsToApply['IMEI / Serial'] = pairImei1.trim();
      fieldsToApply['Imei/serial'] = pairImei1.trim();
    }

    if (pairImei2.trim()) {
      fieldsToApply['IMEI 2'] = pairImei2.trim();
    }

    if (pairSerial.trim()) {
      fieldsToApply['Serial'] = pairSerial.trim();
    }

    // Merge other detected fields if available
    if (ocrResult?.detectedFields) {
      if (ocrResult.detectedFields['DungLuong']) fieldsToApply['DungLuong'] = ocrResult.detectedFields['DungLuong'];
      if (ocrResult.detectedFields['MauSac']) fieldsToApply['MauSac'] = ocrResult.detectedFields['MauSac'];
      if (ocrResult.detectedFields['Gia']) fieldsToApply['Gia'] = ocrResult.detectedFields['Gia'];
    }

    if (onApplyMultiFields) {
      onApplyMultiFields(target.rowIndex, fieldsToApply);
    } else {
      if (pairImei1 && target.fieldName.toLowerCase().includes('imei')) {
        onApplyValue(target.rowIndex, target.fieldName, pairImei1);
      } else if (pairModelName) {
        onApplyValue(target.rowIndex, target.fieldName, pairModelName);
      }
    }

    try {
      navigator.vibrate?.([40, 40, 40]);
    } catch {}
    onClose();
  };

  // Add brand new row to dataset with detected Name & IMEI
  const handleCreateNewRowWithPair = () => {
    const fieldsToApply: Record<string, string> = {};

    if (pairModelName.trim()) {
      fieldsToApply['Model'] = pairModelName.trim();
      fieldsToApply['Ten_SP'] = pairModelName.trim();
    }
    if (pairImei1.trim()) {
      fieldsToApply['IMEI'] = pairImei1.trim();
    }
    if (pairImei2.trim()) {
      fieldsToApply['IMEI 2'] = pairImei2.trim();
    }
    if (pairSerial.trim()) {
      fieldsToApply['Serial'] = pairSerial.trim();
    }
    if (ocrResult?.detectedFields) {
      if (ocrResult.detectedFields['DungLuong']) fieldsToApply['DungLuong'] = ocrResult.detectedFields['DungLuong'];
      if (ocrResult.detectedFields['MauSac']) fieldsToApply['MauSac'] = ocrResult.detectedFields['MauSac'];
      if (ocrResult.detectedFields['Gia']) fieldsToApply['Gia'] = ocrResult.detectedFields['Gia'];
    }

    if (onAddNewRowWithFields) {
      onAddNewRowWithFields(fieldsToApply);
    } else if (target && onApplyMultiFields) {
      onApplyMultiFields(target.rowIndex, fieldsToApply);
    }

    try {
      navigator.vibrate?.([50, 50]);
    } catch {}
    onClose();
  };

  // Add ALL detected products into the dataset simultaneously
  const handleAddAllProductsToDataset = () => {
    if (!ocrResult?.detectedProducts || ocrResult.detectedProducts.length === 0) return;

    const productRows: Array<Record<string, string>> = ocrResult.detectedProducts.map((p) => {
      const fields: Record<string, string> = {};
      if (p.modelName) {
        fields['Model'] = p.modelName;
        fields['Ten_SP'] = p.modelName;
        fields['Tên vật tư'] = p.modelName;
        fields['Tên hàng'] = p.modelName;
      }
      const imeiOrSerial = p.imei1 || p.serial || '';
      if (imeiOrSerial) {
        fields['IMEI'] = imeiOrSerial;
        fields['IMEI 1'] = imeiOrSerial;
        fields['Serial'] = imeiOrSerial;
        fields['IMEI / Serial'] = imeiOrSerial;
        fields['Imei/serial'] = imeiOrSerial;
      }
      if (p.storage) fields['DungLuong'] = p.storage;
      if (p.color) fields['MauSac'] = p.color;
      if (p.price) fields['Gia'] = p.price;
      return fields;
    });

    if (onAddMultipleRowsWithFields) {
      onAddMultipleRowsWithFields(productRows);
    } else if (onAddNewRowWithFields) {
      productRows.forEach((r) => onAddNewRowWithFields(r));
    }

    try {
      navigator.vibrate?.([60, 40, 60]);
    } catch {}
    onClose();
  };

  // Select a specific product item from the multi-list to populate form
  const handleSelectProductItem = (p: DeviceProductItem) => {
    if (p.modelName) setPairModelName(p.modelName);
    const imeiOrSerial = p.imei1 || p.serial || '';
    if (imeiOrSerial) setPairImei1(imeiOrSerial);
    if (p.storage && ocrResult?.detectedFields) ocrResult.detectedFields['DungLuong'] = p.storage;
    if (p.color && ocrResult?.detectedFields) ocrResult.detectedFields['MauSac'] = p.color;
    setSelectedText(imeiOrSerial || p.modelName);
  };

  // Add a single product from the multi-product list as a new row
  const handleAddSingleProductRow = (p: DeviceProductItem) => {
    const fields: Record<string, string> = {};
    if (p.modelName) {
      fields['Model'] = p.modelName;
      fields['Ten_SP'] = p.modelName;
      fields['Tên vật tư'] = p.modelName;
      fields['Tên hàng'] = p.modelName;
    }
    const imeiOrSerial = p.imei1 || p.serial || '';
    if (imeiOrSerial) {
      fields['IMEI'] = imeiOrSerial;
      fields['IMEI 1'] = imeiOrSerial;
      fields['Serial'] = imeiOrSerial;
      fields['IMEI / Serial'] = imeiOrSerial;
      fields['Imei/serial'] = imeiOrSerial;
    }
    if (p.storage) fields['DungLuong'] = p.storage;
    if (p.color) fields['MauSac'] = p.color;
    if (p.price) fields['Gia'] = p.price;

    if (onAddNewRowWithFields) {
      onAddNewRowWithFields(fields);
    } else if (target && onApplyMultiFields) {
      onApplyMultiFields(target.rowIndex, fields);
    }

    try {
      navigator.vibrate?.([50, 50]);
    } catch {}
    onClose();
  };

  // Apply all detected fields at once
  const handleApplyAllDetected = () => {
    if (!target) return;
    const detected: Record<string, string> = {
      ...(ocrResult?.detectedFields || {}),
    };

    if (pairModelName) {
      detected['Model'] = pairModelName;
      detected['Ten_SP'] = pairModelName;
    }
    if (pairImei1) {
      detected['IMEI'] = pairImei1;
    }

    if (onApplyMultiFields) {
      onApplyMultiFields(target.rowIndex, detected);
    } else {
      if (selectedText) {
        onApplyValue(target.rowIndex, target.fieldName, selectedText);
      }
    }
    try {
      navigator.vibrate?.([40, 40, 40]);
    } catch {}
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Scan className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
                <span>Quét & Nhận Diện Tên Máy + IMEI</span>
              </h3>
              {target && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                  Đang chọn ô: <span className="font-bold text-blue-600 dark:text-blue-400">{target.fieldName}</span> (SP #{target.rowIndex + 1})
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (Camera Web vs Native Camera vs Photo Upload) */}
        {!capturedImage && (
          <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold gap-1">
            <button
              onClick={() => {
                setActiveMode('camera');
                startCamera();
              }}
              className={`flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeMode === 'camera'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera Trực Tiếp</span>
            </button>
            <button
              onClick={() => {
                nativeCameraInputRef.current?.click();
              }}
              className="flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 bg-emerald-100/60 dark:bg-emerald-900/30 font-bold"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Mở Camera Máy</span>
            </button>
            <button
              onClick={() => {
                setActiveMode('upload');
                stopCamera();
              }}
              className={`flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeMode === 'upload'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Tải Ảnh Lên</span>
            </button>
          </div>
        )}

        {/* Language & OCR Engine Control Bar */}
        <div className="px-3 py-1.5 bg-cyan-50/70 dark:bg-cyan-950/30 border-b border-cyan-200/80 dark:border-cyan-800/80 flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-cyan-950 dark:text-cyan-200 font-semibold min-w-0 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span className="truncate">Bộ nhận diện:</span>
            <span className="font-bold text-cyan-800 dark:text-cyan-300">
              {ocrLanguage === 'vie' ? '🇻🇳 Tiếng Việt Chuyên Sâu (Chuẩn Dấu)' : '🌐 Song Ngữ Tiếng Việt & Anh'}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setOcrLanguage('vie');
                if (capturedImage && !isProcessing) {
                  processImageWithOCR(capturedImage);
                }
              }}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                ocrLanguage === 'vie'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-white'
              }`}
              title="Tối ưu 100% dấu tiếng Việt cho phiếu kho, tem máy"
            >
              🇻🇳 Tiếng Việt
            </button>
            <button
              type="button"
              onClick={() => {
                setOcrLanguage('vie+eng');
                if (capturedImage && !isProcessing) {
                  processImageWithOCR(capturedImage);
                }
              }}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                ocrLanguage === 'vie+eng'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-white'
              }`}
              title="Song ngữ Tiếng Việt & Tiếng Anh"
            >
              🌐 Song ngữ
            </button>
          </div>
        </div>

        {/* Hidden inputs for Native Camera & Gallery */}
        <input
          ref={nativeCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
        />

        {/* Modal Main Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {/* CAMERA / CAPTURE VIEW */}
          {!capturedImage ? (
            activeMode === 'camera' ? (
              <div className="relative w-full aspect-4/3 sm:aspect-16/10 rounded-2xl bg-black overflow-hidden flex items-center justify-center shadow-inner">
                {/* Always-mounted Video for guaranteed WebRTC stream rendering */}
                <video
                  ref={(el) => {
                    videoRef.current = el;
                    if (el && streamRef.current) {
                      bindStreamToVideo(el, streamRef.current);
                    }
                  }}
                  playsInline
                  muted
                  autoPlay
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    isCameraActive ? 'opacity-100 block' : 'opacity-0 hidden'
                  }`}
                />

                {isCameraActive && (
                  <>
                    {/* Top Mode Selector for Viewfinder (Tem Hộp vs Ô Bảng Kê) */}
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/20">
                      <button
                        type="button"
                        onClick={() => setViewfinderShape('table_row')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          viewfinderShape === 'table_row'
                            ? 'bg-cyan-500 text-white shadow-xs'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        <FileSpreadsheet className="w-3 h-3" />
                        <span>Ô Bảng Kê / Phiếu</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewfinderShape('box')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          viewfinderShape === 'box'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        <Smartphone className="w-3 h-3" />
                        <span>Tem Hộp</span>
                      </button>
                    </div>

                    {/* Scanner Target Guide Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4 sm:p-6">
                      <div
                        className={`w-full relative shadow-2xl transition-all duration-300 ${
                          viewfinderShape === 'table_row'
                            ? 'max-w-[340px] sm:max-w-[380px] aspect-[3.8/1] border-2 border-dashed border-cyan-400/90 shadow-cyan-500/20 rounded-xl'
                            : 'max-w-[280px] sm:max-w-[340px] aspect-3/2 border-2 border-dashed border-blue-400/80 shadow-blue-500/10 rounded-2xl'
                        }`}
                      >
                        {/* Target Corner Accents */}
                        <div className={`absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 rounded-tl-lg ${viewfinderShape === 'table_row' ? 'border-cyan-400' : 'border-blue-500'}`} />
                        <div className={`absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 rounded-tr-lg ${viewfinderShape === 'table_row' ? 'border-cyan-400' : 'border-blue-500'}`} />
                        <div className={`absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 rounded-bl-lg ${viewfinderShape === 'table_row' ? 'border-cyan-400' : 'border-blue-500'}`} />
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 rounded-br-lg ${viewfinderShape === 'table_row' ? 'border-cyan-400' : 'border-blue-500'}`} />

                        {/* Laser Scan Animation Line */}
                        <div className={`absolute left-2 right-2 top-0 h-0.5 shadow-md animate-bounce opacity-85 ${viewfinderShape === 'table_row' ? 'bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-400 shadow-cyan-400' : 'bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-400 shadow-blue-400'}`} />

                        <div className="absolute -bottom-6 left-0 right-0 text-center whitespace-nowrap">
                          <span className="bg-black/70 text-white text-[10px] font-mono px-2.5 py-0.5 rounded-full backdrop-blur-xs border border-white/10">
                            {viewfinderShape === 'table_row'
                              ? '🎯 Căn đúng ô Tên vật tư & Serial trong ngoặc'
                              : 'Căn chỉnh tem vỏ hộp (Tên máy & dãy 15 số IMEI)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Camera Control Overlays (Torch & Switch Camera & Native Camera) */}
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAutoCropViewfinder((v) => !v)}
                        className={`px-2 py-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer text-[10px] font-bold flex items-center gap-1 border ${
                          autoCropViewfinder
                            ? 'bg-cyan-500 text-white border-cyan-300 shadow-md'
                            : 'bg-black/40 text-slate-300 border-white/10 hover:text-white'
                        }`}
                        title="Tự động cắt đúng ô khi bấm chụp để đạt độ chính xác 100%"
                      >
                        <Crop className="w-3 h-3" />
                        <span className="hidden sm:inline">Cắt theo ô: {autoCropViewfinder ? 'BẬT' : 'TẮT'}</span>
                      </button>
                      {hasTorch && (
                        <button
                          onClick={toggleTorch}
                          className={`p-2.5 rounded-full backdrop-blur-md transition-all cursor-pointer ${
                            torchOn ? 'bg-amber-500 text-white shadow-lg' : 'bg-black/40 text-white hover:bg-black/60'
                          }`}
                          title="Bật/Tắt Đèn Flash"
                        >
                          {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                        </button>
                      )}
                      <button
                        onClick={toggleCameraFacing}
                        className="p-2.5 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-md transition-all cursor-pointer"
                        title="Đổi camera trước / sau"
                      >
                        <SwitchCamera className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Live Barcode Detected Pill Alert */}
                    {liveBarcode && (
                      <div className="absolute bottom-16 left-3 right-3 flex items-center justify-between p-2 bg-emerald-950/90 border border-emerald-500 text-emerald-100 rounded-xl shadow-lg backdrop-blur-md animate-fade-in">
                        <div className="flex items-center gap-1.5 min-w-0 font-mono text-xs">
                          <Barcode className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="truncate font-bold">{liveBarcode}</span>
                        </div>
                        <button
                          onClick={() => handleApplySingle(liveBarcode)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg shrink-0 cursor-pointer shadow-xs"
                        >
                          Dùng Ngay
                        </button>
                      </div>
                    )}

                    {/* Capture Frame Button at Bottom Center */}
                    <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2 px-3 pointer-events-auto">
                      <button
                        onClick={handleCaptureFrame}
                        className="flex-1 max-w-[220px] flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-full shadow-xl shadow-blue-500/40 border-2 border-white cursor-pointer active:scale-95 transition-all"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Chụp & Nhận Diện</span>
                      </button>
                      <button
                        onClick={() => nativeCameraInputRef.current?.click()}
                        className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-xl border-2 border-white cursor-pointer active:scale-95 transition-all"
                        title="Mở camera gốc của điện thoại"
                      >
                        <Smartphone className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}

                {/* Loading State */}
                {isCameraLoading && !cameraError && (
                  <div className="p-6 text-center text-white flex flex-col items-center justify-center space-y-3 z-10">
                    <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                    <p className="text-xs text-slate-300 font-medium">Đang khởi động Camera...</p>
                  </div>
                )}

                {/* Camera Error or Denied State */}
                {cameraError && (
                  <div className="p-6 text-center text-white flex flex-col items-center justify-center space-y-3 z-10">
                    <AlertCircle className="w-8 h-8 text-amber-400" />
                    <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                      {cameraError}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-xs">
                      <button
                        onClick={() => nativeCameraInputRef.current?.click()}
                        className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/30"
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>Mở Camera Máy Để Chụp</span>
                      </button>
                      <button
                        onClick={startCamera}
                        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Thử Lại Camera Web</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* PHOTO UPLOAD DRAG & DROP ZONE */
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className="w-full aspect-4/3 sm:aspect-16/10 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-800/40 flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-colors group"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                  Chọn ảnh tem hộp hoặc kéo thả vào đây
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
                  Tự động phân tích và ghép cặp đúng <strong>Tên Máy</strong> và <strong>Số IMEI 15 số</strong> tương ứng.
                </p>
                <div className="mt-3 px-3 py-1.5 rounded-xl bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold">
                  Bấm để chọn ảnh từ thư viện
                </div>
              </div>
            )
          ) : (
            /* CAPTURED IMAGE + OCR PROCESSING & RESULTS */
            <div className="space-y-3">
              {/* Image Preview Strip */}
              <div className="relative rounded-2xl overflow-hidden bg-black/90 max-h-48 flex items-center justify-center border border-slate-200 dark:border-slate-800">
                <img
                  src={capturedImage}
                  alt="Captured scan"
                  className="max-h-48 w-auto object-contain"
                />
                <div className="absolute top-2 right-2 flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsCropMode(true)}
                    className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[11px] font-bold backdrop-blur-md flex items-center gap-1 cursor-pointer shadow-md shadow-cyan-600/30 active:scale-95 transition-all"
                    title="Khoanh vùng đúng ô Tên & Serial để nhận diện chính xác 100%"
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>Khoanh Đúng Ô Này (100%)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="px-2.5 py-1 bg-black/60 hover:bg-black/80 text-white rounded-lg text-[11px] font-bold backdrop-blur-md flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Chụp / Tải Lại</span>
                  </button>
                </div>
              </div>

              {/* INTERACTIVE CROPPER VIEW */}
              {isCropMode && (rawOriginalImage || capturedImage) && (
                <div className="p-3 bg-slate-900 border-2 border-cyan-400/80 rounded-2xl shadow-2xl text-white space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-cyan-600 text-white">
                        <Target className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>Kéo Ô Trùng Với Ô Cần Nhận Diện</span>
                          <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded text-[10px] font-mono border border-cyan-400/30">
                            100% Chính Xác
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-300">
                          Kéo ô bao quanh phần <strong>Tên vật tư & Serial/IMEI trong ngoặc</strong>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCropMode(false)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Crop interactive viewport */}
                  <div
                    ref={cropContainerRef}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className="relative w-full aspect-4/3 sm:aspect-16/10 bg-black rounded-xl overflow-hidden select-none touch-none flex items-center justify-center shadow-inner"
                  >
                    <img
                      src={rawOriginalImage || capturedImage || ''}
                      alt="To crop"
                      className="w-full h-full object-contain pointer-events-none"
                    />
                    {/* Dimmed backdrop mask */}
                    <div className="absolute inset-0 pointer-events-none bg-black/55" />

                    {/* Interactive Crop Box */}
                    <div
                      onPointerDown={handleBoxPointerDown}
                      style={{
                        left: `${cropBox.x}%`,
                        top: `${cropBox.y}%`,
                        width: `${cropBox.width}%`,
                        height: `${cropBox.height}%`,
                      }}
                      className={`absolute border-2 rounded-lg cursor-move shadow-2xl transition-all pointer-events-auto ${
                        isDraggingBox
                          ? 'border-emerald-400 shadow-emerald-500/40 ring-2 ring-emerald-400/50'
                          : 'border-cyan-400 hover:border-cyan-300 shadow-cyan-500/20'
                      }`}
                    >
                      {/* Cutout highlight */}
                      <div className="absolute inset-0 bg-white/10 backdrop-brightness-125" />

                      {/* Banner Label inside box */}
                      <div className="absolute -top-6 left-0 flex items-center gap-1 bg-cyan-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-t-md shadow-sm whitespace-nowrap">
                        <Target className="w-3 h-3" />
                        <span>Ô Cần Quét (Tên & IMEI)</span>
                      </div>

                      {/* 4 Corner Markers */}
                      <div className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-300" />
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-300" />
                      <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-cyan-300" />

                      {/* Resizer Handle at Bottom-Right */}
                      <div
                        onPointerDown={handleResizePointerDown}
                        className="absolute -bottom-2.5 -right-2.5 w-6 h-6 bg-cyan-500 hover:bg-cyan-400 text-white rounded-full flex items-center justify-center cursor-nwse-resize shadow-lg hover:scale-110 active:scale-95 transition-transform border border-white"
                        title="Kéo để thay đổi kích thước ô"
                      >
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    </div>
                  </div>

                  {/* Quick Presets & Confirm Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
                      <span className="text-slate-400">Khung mẫu:</span>
                      <button
                        type="button"
                        onClick={() => setCropBox({ x: 5, y: 35, width: 90, height: 24 })}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
                      >
                        Ô Bảng Kê (Ngang)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCropBox({ x: 6, y: 46, width: 88, height: 38 })}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
                      >
                        Vùng Bảng Hàng
                      </button>
                      <button
                        type="button"
                        onClick={() => setCropBox({ x: 0, y: 0, width: 100, height: 100 })}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
                      >
                        Toàn Bộ Ảnh
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCropMode(false);
                          if (rawOriginalImage) {
                            setCapturedImage(rawOriginalImage);
                            processImageWithOCR(rawOriginalImage);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        Quét Toàn Ảnh
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePerformCrop()}
                        className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-500/30 cursor-pointer active:scale-95 transition-all"
                      >
                        <Check className="w-4 h-4" />
                        <span>Quét Đúng Ô Này (100% Chính Xác)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Processing Loader */}
              {isProcessing && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-blue-900 dark:text-blue-200">
                      {processingStatus}
                    </p>
                    <p className="text-blue-700 dark:text-blue-300 text-[11px]">
                      Trích xuất Tên máy, số IMEI 1/2, Serial, Bộ nhớ và Màu sắc...
                    </p>
                  </div>
                </div>
              )}

              {/* OCR RESULTS PANEL */}
              {!isProcessing && ocrResult && (
                <div className="space-y-3">
                  {/* Engine Indicator Badge */}
                  <div className="flex items-center justify-between text-[11px] px-1 text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-blue-500" />
                      <span>
                        Chế độ OCR:{' '}
                        <strong className="text-slate-700 dark:text-slate-300">
                          {ocrResult.engine === 'gemini'
                            ? 'AI Cloud Gemini 3.7'
                            : 'Bộ Nhận Diện Cục Bộ Tesseract (Tiếng Việt/Anh)'}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* MULTI-PRODUCT DETECTED BANNER & LIST (When 2+ products are found on the same slip) */}
                  {ocrResult.detectedProducts && ocrResult.detectedProducts.length > 1 && (
                    <div className="p-3.5 bg-gradient-to-br from-emerald-50 via-teal-50/70 to-emerald-50 dark:from-emerald-950/60 dark:via-teal-950/50 dark:to-emerald-950/60 border-2 border-emerald-400 dark:border-emerald-700/80 rounded-2xl shadow-sm space-y-3 animate-fade-in">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                            {ocrResult.detectedProducts.length}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
                              <span>Phát Hiện {ocrResult.detectedProducts.length} Sản Phẩm Trong Cùng 1 Phiếu</span>
                            </h4>
                            <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                              Đã bóc tách riêng từng dòng Tên máy & Số Serial / IMEI tương ứng
                            </p>
                          </div>
                        </div>
                        {onAddMultipleRowsWithFields && (
                          <button
                            type="button"
                            onClick={handleAddAllProductsToDataset}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer active:scale-98 transition-all shrink-0"
                          >
                            <ListPlus className="w-4 h-4" />
                            <span>Thêm Tất Cả {ocrResult.detectedProducts.length} SP Vào Bảng Excel</span>
                          </button>
                        )}
                      </div>

                      {/* Product Cards List */}
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {ocrResult.detectedProducts.map((prod, pIdx) => {
                          const isCurrentPair =
                            pairModelName === prod.modelName &&
                            pairImei1 === (prod.imei1 || prod.serial);
                          return (
                            <div
                              key={prod.id || pIdx}
                              className={`p-2.5 rounded-xl border transition-all ${
                                isCurrentPair
                                  ? 'bg-white dark:bg-slate-900 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                                  : 'bg-white/90 dark:bg-slate-900/90 border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-400'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-mono text-[10px] font-bold">
                                      SP #{pIdx + 1}
                                    </span>
                                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                                      {prod.modelName}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    {(prod.imei1 || prod.serial) && (
                                      <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200">
                                        <Hash className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                        <span>{prod.imei1 || prod.serial}</span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCopy(prod.imei1 || prod.serial || '');
                                          }}
                                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-0.5 cursor-pointer"
                                          title="Sao chép Serial/IMEI"
                                        >
                                          <Copy className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}

                                    {prod.storage && (
                                      <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded">
                                        {prod.storage}
                                      </span>
                                    )}
                                    {prod.color && (
                                      <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-[10px] font-bold rounded">
                                        {prod.color}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Action Buttons for this single product */}
                                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleSelectProductItem(prod)}
                                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg cursor-pointer transition-colors ${
                                      isCurrentPair
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                    }`}
                                    title="Chọn sản phẩm này để xem và áp dụng"
                                  >
                                    {isCurrentPair ? 'Đang Chọn' : 'Chọn SP Này'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAddSingleProductRow(prod)}
                                    className="p-1.5 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900/80 rounded-lg cursor-pointer transition-colors"
                                    title="Thêm riêng sản phẩm này thành dòng mới trong bảng"
                                  >
                                    <PlusCircle className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SPECIFIC INVOICE CELL IDENTIFICATION BANNER */}
                  {(ocrResult.detectedFields?.['Tên vật tư'] || ocrResult.detectedFields?.['TinhTrang'] || ocrResult.detectedFields?.['MaSo'] || pairSerial) && (
                    <div className="p-3 bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-950/40 dark:to-teal-950/30 border-2 border-cyan-400 dark:border-cyan-600 rounded-2xl space-y-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-950 dark:text-cyan-100 flex items-center gap-1.5">
                          <Target className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                          <span>Ô Bảng Kê Đã Bóc Tách (Chính Xác 100%):</span>
                        </span>
                        <span className="text-[10px] font-mono bg-cyan-500 text-white px-2 py-0.5 rounded-full font-bold shadow-xs">
                          Khớp Tuyệt Đối
                        </span>
                      </div>

                      <div className="text-xs space-y-1 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-cyan-200 dark:border-cyan-800">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[11px] font-semibold text-slate-500 shrink-0">Tên vật tư:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100 break-words">
                            {restoreVietnameseDiacritics(pairModelName || ocrResult.detectedFields?.['Tên vật tư'] || '—')}
                          </span>
                        </div>
                        {pairSerial && (
                          <div className="flex items-baseline gap-2">
                            <span className="text-[11px] font-semibold text-slate-500 shrink-0">Serial / IMEI:</span>
                            <span className="font-mono font-bold text-cyan-700 dark:text-cyan-300">
                              {pairSerial}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Quick Attribute Tags */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {ocrResult.detectedFields?.['DungLuong'] && (
                          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-[10px] font-bold border border-cyan-200 dark:border-cyan-800">
                            Bộ nhớ: {ocrResult.detectedFields['DungLuong']}
                          </span>
                        )}
                        {ocrResult.detectedFields?.['MauSac'] && (
                          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-[10px] font-bold border border-cyan-200 dark:border-cyan-800">
                            Màu: {restoreVietnameseDiacritics(ocrResult.detectedFields['MauSac'])}
                          </span>
                        )}
                        {ocrResult.detectedFields?.['TinhTrang'] && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold border border-amber-300 dark:border-amber-800">
                            Tình trạng: {restoreVietnameseDiacritics(ocrResult.detectedFields['TinhTrang'])}
                          </span>
                        )}
                        {(ocrResult.detectedFields?.['MaSo'] || ocrResult.detectedFields?.['Mã số']) && (
                          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[10px] font-mono border border-cyan-200 dark:border-cyan-800">
                            SKU: {ocrResult.detectedFields['MaSo'] || ocrResult.detectedFields['Mã số']}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* PROMINENT NAME & IMEI CORRESPONDING PAIR CARD */}
                  <div className="p-3.5 bg-gradient-to-br from-blue-50 to-indigo-50/70 dark:from-blue-950/50 dark:to-indigo-950/40 border-2 border-blue-300 dark:border-blue-700/80 rounded-2xl shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-blue-900 dark:text-blue-200 font-bold text-xs">
                        <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Cặp Tên Thiết Bị & IMEI Tương Ứng:</span>
                      </div>
                      {target && (
                        <span className="text-[10px] font-mono text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-900/60 px-2 py-0.5 rounded-md">
                          Dòng SP #{target.rowIndex + 1}
                        </span>
                      )}
                    </div>

                    {/* Pair Form Inputs (Editable) */}
                    <div className="space-y-2">
                      {/* Model Name Input Row */}
                      <div className="flex items-center gap-2">
                        <div className="w-24 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 shrink-0">
                          <Smartphone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Tên Máy:</span>
                        </div>
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            placeholder="Nhận diện tên model máy..."
                            value={pairModelName}
                            onChange={(e) => setPairModelName(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        {pairModelName && (
                          <button
                            type="button"
                            onClick={() => handleCopy(pairModelName)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer"
                            title="Sao chép tên máy"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Alternate Model Name Candidates */}
                      {ocrResult.allModels && ocrResult.allModels.length > 1 && (
                        <div className="flex items-center gap-1.5 pl-24 text-[10px]">
                          <span className="text-slate-500 shrink-0">Gợi ý khác:</span>
                          <div className="flex flex-wrap gap-1">
                            {ocrResult.allModels.map((m, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setPairModelName(m)}
                                className={`px-2 py-0.5 rounded border text-[10px] font-medium cursor-pointer ${
                                  pairModelName === m
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Clean Name without condition helper */}
                      {pairModelName && pairModelName.replace(/\s*[\-–—]\s*(CŨ|MỚI|TRẦY|XƯỚC|ĐẸP|99%|LIKENEW|CHÍNH HÃNG|VN\/A).*$/i, '').trim() !== pairModelName && (
                        <div className="flex items-center gap-1.5 pl-24 text-[10px]">
                          <span className="text-slate-500 shrink-0">Bỏ tình trạng:</span>
                          <button
                            type="button"
                            onClick={() => setPairModelName(pairModelName.replace(/\s*[\-–—]\s*(CŨ|MỚI|TRẦY|XƯỚC|ĐẸP|99%|LIKENEW|CHÍNH HÃNG|VN\/A).*$/i, '').trim())}
                            className="px-2 py-0.5 rounded border border-cyan-300 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-200 font-bold hover:bg-cyan-100 cursor-pointer"
                          >
                            {pairModelName.replace(/\s*[\-–—]\s*(CŨ|MỚI|TRẦY|XƯỚC|ĐẸP|99%|LIKENEW|CHÍNH HÃNG|VN\/A).*$/i, '').trim()}
                          </button>
                        </div>
                      )}

                      {/* Vietnamese Diacritics Restoration Helper */}
                      {pairModelName && restoreVietnameseDiacritics(pairModelName) !== pairModelName && (
                        <div className="flex items-center gap-1.5 pl-24 text-[10px]">
                          <span className="text-amber-600 dark:text-amber-400 font-semibold shrink-0">Sửa thiếu dấu:</span>
                          <button
                            type="button"
                            onClick={() => setPairModelName(restoreVietnameseDiacritics(pairModelName))}
                            className="px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 font-bold hover:bg-amber-100 cursor-pointer flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>{restoreVietnameseDiacritics(pairModelName)}</span>
                          </button>
                        </div>
                      )}

                      {/* IMEI 1 Input Row */}
                      <div className="flex items-center gap-2">
                        <div className="w-24 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 shrink-0">
                          <Hash className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Mã IMEI:</span>
                        </div>
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            placeholder="Nhận diện 15 số IMEI..."
                            value={pairImei1}
                            onChange={(e) => setPairImei1(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700/80 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        {pairImei1 && (
                          <button
                            type="button"
                            onClick={() => handleCopy(pairImei1)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer"
                            title="Sao chép IMEI"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Alternate IMEI Candidates (IMEI 2, Barcode) */}
                      {ocrResult.allImeis && ocrResult.allImeis.length > 1 && (
                        <div className="flex items-center gap-1.5 pl-24 text-[10px]">
                          <span className="text-slate-500 shrink-0">IMEI khác:</span>
                          <div className="flex flex-wrap gap-1">
                            {ocrResult.allImeis.map((im, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setPairImei1(im)}
                                className={`px-2 py-0.5 rounded border text-[10px] font-mono font-semibold cursor-pointer ${
                                  pairImei1 === im
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {idx === 0 ? 'IMEI 1: ' : idx === 1 ? 'IMEI 2: ' : ''}{im}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Serial / Mã Máy Input Row */}
                      <div className="flex items-center gap-2">
                        <div className="w-24 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 shrink-0">
                          <Barcode className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                          <span>Serial/Mã:</span>
                        </div>
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            placeholder="Mã Serial trong ngoặc (VD: CDQF44NTDH)..."
                            value={pairSerial}
                            onChange={(e) => setPairSerial(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-cyan-300 dark:border-cyan-700/80 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500"
                          />
                        </div>
                        {pairSerial && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setPairImei1(pairSerial)}
                              className="px-2 py-1 bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-950/80 dark:hover:bg-cyan-900 text-cyan-800 dark:text-cyan-200 text-[10px] font-bold rounded-lg shrink-0 cursor-pointer"
                              title="Dùng Serial làm mã IMEI/Thiết bị"
                            >
                              Gán sang IMEI
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(pairSerial)}
                              className="p-1.5 text-slate-500 hover:text-cyan-600 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer"
                              title="Sao chép Serial"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Primary Pair Action Button */}
                    <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <button
                        type="button"
                        onClick={handleApplyModelAndImeiPair}
                        disabled={!pairModelName && !pairImei1 && !pairSerial}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/25 cursor-pointer active:scale-98 transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          Áp Dụng Cặp Tên & IMEI{' '}
                          {target ? `(SP #${target.rowIndex + 1})` : ''}
                        </span>
                      </button>

                      {onAddNewRowWithFields && (
                        <button
                          type="button"
                          onClick={handleCreateNewRowWithPair}
                          disabled={!pairModelName && !pairImei1 && !pairSerial}
                          className="px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 hover:bg-blue-50 text-blue-700 dark:text-blue-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0"
                          title="Tạo thêm 1 dòng mới vào bảng với Tên & IMEI vừa quét"
                        >
                          <PlusCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span>Thêm Dòng Mới</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Multi-Field Auto-Detection Card */}
                  {ocrResult.detectedFields && Object.keys(ocrResult.detectedFields).length > 0 && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-blue-600" />
                          <span>Chi tiết tất cả trường bóc tách được:</span>
                        </span>
                        {onApplyMultiFields && (
                          <button
                            onClick={handleApplyAllDetected}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg cursor-pointer flex items-center gap-1 shadow-xs"
                          >
                            <span>Điền tất cả cột</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {Object.entries(ocrResult.detectedFields).map(([k, v]) => (
                          <div
                            key={k}
                            onClick={() => {
                              setSelectedText(v);
                              if (k.toLowerCase().includes('model') || k.toLowerCase().includes('ten')) {
                                setPairModelName(v);
                              } else if (k.toLowerCase().includes('imei')) {
                                setPairImei1(v);
                              }
                            }}
                            className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between text-xs cursor-pointer hover:border-blue-500 transition-colors"
                          >
                            <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase font-bold">
                              {k}:
                            </span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                              {v}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Single Value Direct Insert Strip */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-bold">
                        Điền riêng 1 giá trị vào ô [{target?.fieldName || 'hiện tại'}]:
                      </span>
                      {selectedText && (
                        <button
                          onClick={() => handleCopy(selectedText)}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] flex items-center gap-0.5"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedText === selectedText ? 'Đã chép!' : 'Chép'}</span>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={selectedText}
                        onChange={(e) => setSelectedText(e.target.value)}
                        placeholder="Chọn hoặc nhập giá trị cần điền..."
                        className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => handleApplySingle(selectedText)}
                        disabled={!selectedText}
                        className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Điền Ô Này</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick-Pick Recognized Items Chips */}
                  {ocrResult.suggestedItems && ocrResult.suggestedItems.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Chạm vào một cụm từ để chọn nhanh:
                      </label>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                        {ocrResult.suggestedItems.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSelectedText(item);
                              if (/^\d{14,16}$/.test(item)) {
                                setPairImei1(item);
                              } else {
                                setPairModelName(item);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer truncate max-w-full ${
                              selectedText === item
                                ? 'bg-blue-600 text-white font-bold shadow-xs'
                                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-blue-400'
                            }`}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Full Recognized Raw Text Accordion / Collapsible */}
                  {ocrResult.fullText && (
                    <details className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                      <summary className="font-semibold text-[11px] select-none hover:text-blue-500">
                        Xem toàn bộ văn bản gốc OCR nhận diện được ({ocrResult.lines?.length || 0} dòng)
                      </summary>
                      <pre className="mt-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-mono whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto select-text">
                        {ocrResult.fullText}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs cursor-pointer transition-colors"
          >
            Đóng
          </button>

          {capturedImage && (pairModelName || pairImei1 || selectedText) && (
            <button
              onClick={handleApplyModelAndImeiPair}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Xác Nhận & Điền Vào Bảng</span>
            </button>
          )}
        </div>
      </div>
      {/* Hidden canvas for video snapshots */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
